const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const qrcodeLib = require('qrcode');
const config = require('../config');
const NodeCache = require('node-cache');
const lidMap = require('./lid-map');

const msgRetryCounterCache = new NodeCache();

// Map to hold all active sessions: sessionId -> { sock, badSessionRetryCount, saveCreds }
const sessions = new Map();

let messageHandler = null;
let groupHandler = null;
let currentIo = null;
const BAD_SESSION_MAX_RETRY = 3;

// ============================================================
// GLOBAL ERROR HANDLERS — mencegah crash dari Bad MAC / decrypt
// ============================================================
process.on('uncaughtException', (err) => {
    const msg = err?.message || String(err);
    if (msg.includes('Bad MAC') || msg.includes('decryp') || msg.includes('SignalError')) {
        console.log('⚠️ [IGNORED] Decrypt/Bad MAC exception:', msg.slice(0, 100));
        return;
    }
    console.error('❌ Uncaught Exception:', msg);
});

process.on('unhandledRejection', (reason) => {
    const msg = reason?.message || String(reason);
    if (msg.includes('Bad MAC') || msg.includes('decryp') || msg.includes('SignalError')) {
        console.log('⚠️ [IGNORED] Decrypt/Bad MAC rejection:', msg.slice(0, 100));
        return;
    }
    console.error('❌ Unhandled Rejection:', msg);
});

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
async function gracefulShutdown(signal) {
    console.log(`\n⏹️ Menerima ${signal}. Menyimpan session sebelum shutdown...`);
    for (const [sessionId, sessionData] of sessions.entries()) {
        try {
            if (sessionData.saveCreds) {
                await sessionData.saveCreds();
                console.log(`✅ Session ${sessionId} berhasil disimpan.`);
            }
            if (sessionData.sock) {
                sessionData.sock.ev.removeAllListeners();
                sessionData.sock.ws?.terminate?.();
            }
        } catch (e) {
            console.log(`⚠️ Gagal mematikan session ${sessionId}:`, e.message);
        }
    }
    process.exit(0);
}

process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Memulai koneksi untuk sesi tertentu.
 * @param {object} io - Socket.io instance untuk dashboard
 * @param {string} sessionId - ID Unik sesi (misal: nomor WA)
 * @param {string} pairingNumber - Opsional, nomor HP untuk pairing code (format: 628xxx)
 */
async function startConnection(io, sessionId = 'default', pairingNumber = null) {
    currentIo = io;
    const sessionDir = path.join(config.paths.sessions, sessionId);
    
    // Pastikan folder sesi ada
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();
    const logger = pino({ level: 'silent' });
    
    // Konfigurasi socket
    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        logger,
        // fingerprint browser yang diizinkan WA untuk Pairing Code
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        getMessage: async (key) => ({ conversation: '' }),
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(message.buttonsMessage || message.templateMessage || message.listMessage);
            if (requiresPatch) {
                message = { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} }, ...message } } };
            }
            return message;
        },
        msgRetryCounterCache,
        defaultQueryTimeoutMs: undefined,
        retryRequestDelayMs: 250,
        maxMsgRetryCount: 5,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
    });
    
    // Simpan ke memory map
    sessions.set(sessionId, {
        sock,
        saveCreds,
        badSessionRetryCount: sessions.get(sessionId)?.badSessionRetryCount || 0
    });

    // Request Pairing Code bila diminta dan belum registered
    if (pairingNumber && !sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let formattedNumber = pairingNumber.replace(/[^0-9]/g, '');
                if (formattedNumber.startsWith('0')) formattedNumber = '62' + formattedNumber.substring(1);
                
                const code = await sock.requestPairingCode(formattedNumber);
                console.log(`\n🔑 KODE PAIRING [${sessionId}]:`, code, '\n');
                if (io) {
                    io.emit('pairing_code', { sessionId, code });
                }
            } catch (err) {
                console.error(`❌ Gagal request pairing code untuk ${sessionId}:`, err.message);
                if (io) io.emit('pairing_error', { sessionId, error: err.message });
            }
        }, 3000);
    }
    
    bindHandlers(sessionId);
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('messages.update', (updates) => {
        for (const update of updates) {
            if (update.update?.messageStubType === 2) {
                // Log abaikan message revoked/decrypt error
            }
        }
    });
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // QR Code
        if (qr && !pairingNumber) {
            console.log(`\nScan QR Code untuk sesi: ${sessionId}`);
            qrcode.generate(qr, { small: true });
            if (io) {
                qrcodeLib.toDataURL(qr).then(url => {
                    io.emit('qr', { sessionId, qr: url });
                }).catch(() => {});
            }
        }
        
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const errMsg = lastDisconnect?.error?.message || '';
            const reason = DisconnectReason;
            
            console.log(`❌ Koneksi [${sessionId}] terputus. Status: ${statusCode}, Reason: ${errMsg}`);
            
            if (io) io.emit('connection', { sessionId, status: 'close' });
            
            if (errMsg.includes('Bad MAC') && statusCode !== reason.loggedOut) {
                setTimeout(() => reconnect(io, sessionId), 3000);
                return;
            }
            
            const sessionData = sessions.get(sessionId);
            
            if (statusCode === reason.loggedOut) {
                console.log(`🚫 Sesi [${sessionId}] logged out. Menghapus data...`);
                if (io) io.emit('connection', { sessionId, status: 'logged_out' });
                try {
                    fs.rmSync(sessionDir, { recursive: true, force: true });
                } catch (e) {}
                sessions.delete(sessionId);
                // Kita tidak reconnect otomatis kalau logged out. Harus scan ulang.
            } else if (statusCode === reason.badSession) {
                if (sessionData) {
                    sessionData.badSessionRetryCount++;
                    if (sessionData.badSessionRetryCount >= BAD_SESSION_MAX_RETRY) {
                        console.log(`🔑 Bad session [${sessionId}] mencapai batas. Menghapus...`);
                        if (io) io.emit('connection', { sessionId, status: 'logged_out' });
                        try {
                            fs.rmSync(sessionDir, { recursive: true, force: true });
                        } catch (e) {}
                        sessions.delete(sessionId);
                    } else {
                        console.log(`🔑 Bad session [${sessionId}]. Retry ${sessionData.badSessionRetryCount}/${BAD_SESSION_MAX_RETRY}`);
                        if (io) io.emit('connection', { sessionId, status: 'bad_session' });
                        setTimeout(() => reconnect(io, sessionId), 5000);
                    }
                }
            } else if (statusCode === reason.connectionLost || statusCode === reason.timedOut) {
                setTimeout(() => reconnect(io, sessionId), 3000);
            } else if (statusCode === reason.restartRequired) {
                setTimeout(() => reconnect(io, sessionId), 1000);
            } else {
                setTimeout(() => reconnect(io, sessionId), 8000);
            }
        } else if (connection === 'connecting') {
            console.log(`🔄 [${sessionId}] Menghubungkan ke WhatsApp...`);
            if (io) io.emit('connection', { sessionId, status: 'connecting' });
        } else if (connection === 'open') {
            const sessionData = sessions.get(sessionId);
            if (sessionData) sessionData.badSessionRetryCount = 0;
            
            console.log(`✅ [${sessionId}] Terhubung!`);
            console.log(`📱 Bot: ${sock.user?.name || config.bot.name}`);
            console.log(`📞 Nomor: ${sock.user?.id?.replace(/:\d+/, '')}`);
            if (io) io.emit('connection', {
                sessionId,
                status: 'open',
                user: {
                    name: sock.user?.name,
                    id: sock.user?.id?.replace(/:\d+/, ''),
                }
            });

            if (sock.contacts && Object.keys(sock.contacts).length > 0) {
                lidMap.updateFromContacts(sock.contacts);
            }
        }
    });
    
    return sock;
}

// Reconnect fungsi per sesi
async function reconnect(io, sessionId) {
    const sessionData = sessions.get(sessionId);
    if (sessionData && sessionData.sock) {
        try { sessionData.sock.ev.removeAllListeners(); } catch (e) {}
        try { sessionData.sock.ws?.terminate?.(); } catch (e) {}
        try { sessionData.sock.end?.(); } catch (e) {}
    }
    await new Promise(r => setTimeout(r, 1000));
    return startConnection(io, sessionId);
}

function onMessage(handler) {
    messageHandler = handler;
    // Bind ke semua session yang ada
    for (const sessionId of sessions.keys()) {
        bindHandlers(sessionId);
    }
}

function onGroupParticipants(handler) {
    groupHandler = handler;
    for (const sessionId of sessions.keys()) {
        bindHandlers(sessionId);
    }
}

function bindHandlers(sessionId) {
    const sessionData = sessions.get(sessionId);
    if (!sessionData || !sessionData.sock) return;
    
    const sock = sessionData.sock;
    
    sock.ev.removeAllListeners('messages.upsert');
    sock.ev.removeAllListeners('group-participants.update');
    sock.ev.removeAllListeners('contacts.upsert');
    sock.ev.removeAllListeners('contacts.update');
    
    if (messageHandler) {
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            for (const msg of messages) {
                if (!msg.message) continue;
                try {
                    await messageHandler(sock, msg, sessionId);
                } catch (err) {
                    if (!err.message?.includes('Bad MAC') && !err.message?.includes('decrypt')) {
                        console.error(`❌ [${sessionId}] Error handling message:`, err.message);
                    }
                }
            }
        });
    }

    sock.ev.on('contacts.upsert', (contacts) => lidMap.updateFromContacts(contacts));
    sock.ev.on('contacts.update', (contacts) => lidMap.updateFromContacts(contacts));

    if (groupHandler) {
        sock.ev.on('group-participants.update', async (update) => {
            try {
                await groupHandler(sock, update, sessionId);
            } catch (err) {
                console.error(`❌ [${sessionId}] Error handling group update:`, err.message);
            }
        });
    }
}

/**
 * Mengambil socket instance berdasarkan sessionId
 */
function getSocket(sessionId = 'default') {
    return sessions.get(sessionId)?.sock || null;
}

/**
 * Mengambil semua sesi aktif
 */
function getAllSessions() {
    return Array.from(sessions.entries()).map(([id, data]) => ({
        sessionId: id,
        user: data.sock?.user || null
    }));
}

/**
 * Menghapus sesi
 */
function deleteSession(sessionId) {
    const sessionData = sessions.get(sessionId);
    if (sessionData && sessionData.sock) {
        try { sessionData.sock.logout(); } catch (e) {}
        try { sessionData.sock.ws?.terminate?.(); } catch (e) {}
    }
    sessions.delete(sessionId);
    const sessionDir = path.join(config.paths.sessions, sessionId);
    try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (e) {}
}

module.exports = { 
    startConnection, 
    getSocket, 
    getAllSessions,
    deleteSession,
    onMessage, 
    onGroupParticipants 
};
