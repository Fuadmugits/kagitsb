const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const qrcode = require('qrcode-terminal');
const qrcodeLib = require('qrcode');
const config = require('../config');
const NodeCache = require('node-cache');

const msgRetryCounterCache = new NodeCache();

let sock = null;
let messageHandler = null;
let groupHandler = null;
let badSessionRetryCount = 0;
const BAD_SESSION_MAX_RETRY = 3;

async function startConnection(io) {
    const { state, saveCreds } = await useMultiFileAuthState(config.paths.sessions);
    const { version } = await fetchLatestBaileysVersion();

    const logger = pino({ level: 'silent' });
    
    sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        logger,
        // Pakai fingerprint WA Web agar berjalan sebagai linked device (mencegah HP offline)
        browser: ['WhatsApp Web', 'Chrome', '2.2412.54'],
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        getMessage: async (key) => {
            return undefined;
        },
        msgRetryCounterCache,
        defaultQueryTimeoutMs: undefined,
        retryRequestDelayMs: 250,
        maxMsgRetryCount: 5,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
    });
    
    // Save credentials on every update (critical for session stability)
    sock.ev.on('creds.update', saveCreds);
    
    // Handle message decrypt errors gracefully
    sock.ev.on('messages.update', (updates) => {
        for (const update of updates) {
            if (update.update?.messageStubType === 2) {
                console.log('⚠️ Message revoked or decrypt error handled');
            }
        }
    });
    
    // Connection updates
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // Send QR to dashboard via Socket.IO and print to terminal
        if (qr) {
            qrcode.generate(qr, { small: true });
            if (io) {
                qrcodeLib.toDataURL(qr).then(url => {
                    io.emit('qr', url);
                }).catch(() => {});
            }
        }
        
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const reason = DisconnectReason;
            
            console.log(`❌ Koneksi terputus. Status: ${statusCode}`);
            
            if (io) io.emit('connection', { status: 'close' });
            
            // Handle specific disconnect reasons
            if (statusCode === reason.loggedOut) {
                // Logged out - clear session and restart
                console.log('🚫 Logged out. Menghapus session...');
                if (io) io.emit('connection', { status: 'logged_out' });
                try {
                    const fs = require('fs');
                    fs.rmSync(config.paths.sessions, { recursive: true, force: true });
                } catch (e) {}
                setTimeout(() => reconnect(io), 5000);
            } else if (statusCode === reason.badSession) {
                // Bad session / Bad MAC
                badSessionRetryCount++;
                if (badSessionRetryCount >= BAD_SESSION_MAX_RETRY) {
                    // Session is truly corrupt — wipe it and force a fresh QR scan
                    console.log(`🔑 Bad session ${badSessionRetryCount}x berturut-turut. Menghapus session dan meminta scan QR ulang...`);
                    if (io) io.emit('connection', { status: 'logged_out' });
                    try {
                        const fs = require('fs');
                        const flagPath = require('path').join(require('path').dirname(config.paths.sessions), '.session_cleared_v1');
                        fs.rmSync(config.paths.sessions, { recursive: true, force: true });
                        // Remove the "cleared" flag so index.js doesn't interfere on next boot
                        if (fs.existsSync(flagPath)) fs.unlinkSync(flagPath);
                    } catch (e) {}
                    badSessionRetryCount = 0;
                    setTimeout(() => reconnect(io), 3000);
                } else {
                    // Might be a temporary WA server hiccup — retry without wiping
                    console.log(`🔑 Bad session terdeteksi (${badSessionRetryCount}/${BAD_SESSION_MAX_RETRY}). Mencoba reconnect tanpa menghapus session...`);
                    if (io) io.emit('connection', { status: 'bad_session' });
                    setTimeout(() => reconnect(io), 5000);
                }
            } else if (statusCode === reason.connectionLost || statusCode === reason.timedOut) {
                // Connection lost / timeout - just reconnect
                console.log('🔄 Reconnecting...');
                setTimeout(() => reconnect(io), 3000);
            } else if (statusCode === reason.restartRequired) {
                console.log('🔄 Restart diperlukan. Reconnecting...');
                setTimeout(() => reconnect(io), 1000);
            } else {
                // Other reasons - try to reconnect
                console.log('🔄 Mencoba reconnect...');
                setTimeout(() => reconnect(io), 5000);
            }
        } else if (connection === 'connecting') {
            console.log('🔄 Menghubungkan ke WhatsApp...');
            if (io) io.emit('connection', { status: 'connecting' });
        } else if (connection === 'open') {
            // Reset bad session counter on successful connection
            badSessionRetryCount = 0;
            console.log('✅ Terhubung ke WhatsApp!');
            console.log(`📱 Bot: ${sock.user?.name || config.bot.name}`);
            console.log(`📞 Nomor: ${sock.user?.id?.replace(/:\d+/, '')}`);
            if (io) io.emit('connection', {
                status: 'open',
                user: {
                    name: sock.user?.name,
                    id: sock.user?.id?.replace(/:\d+/, ''),
                }
            });
            
            // Re-bind message & group handlers after reconnect
            bindHandlers();
        }
    });
    
    return sock;
}

// Reconnect function that updates the shared sock reference
async function reconnect(io) {
    try {
        if (sock) {
            // Only close the websocket, don't wipe all listeners
            // (removeAllListeners kills creds.update & connection.update)
            sock.ws?.terminate?.();
        }
    } catch (e) {}
    
    return startConnection(io);
}

// Register external message handler
function onMessage(handler) {
    messageHandler = handler;
    bindHandlers();
}

// Register external group participants handler
function onGroupParticipants(handler) {
    groupHandler = handler;
    bindHandlers();
}

// Bind handlers to current sock (called after each reconnect)
function bindHandlers() {
    if (!sock) return;
    
    // Remove old listeners first to prevent duplicates
    sock.ev.removeAllListeners('messages.upsert');
    sock.ev.removeAllListeners('group-participants.update');
    
    if (messageHandler) {
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            for (const msg of messages) {
                if (!msg.message) continue;
                try {
                    await messageHandler(sock, msg);
                } catch (err) {
                    if (err.message?.includes('Bad MAC') || err.message?.includes('decrypt')) {
                        console.log('⚠️ Pesan gagal di-decrypt, mengabaikan...');
                    } else {
                        console.error('❌ Error handling message:', err.message);
                    }
                }
            }
        });
    }
    
    if (groupHandler) {
        sock.ev.on('group-participants.update', async (update) => {
            try {
                await groupHandler(sock, update);
            } catch (err) {
                console.error('❌ Error handling group update:', err.message);
            }
        });
    }
}

function getSocket() {
    return sock;
}

module.exports = { startConnection, getSocket, onMessage, onGroupParticipants };
