const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { handleMessage } = require('../lib/handler');

// Store active jadibot sessions
const jadibotSessions = new Map();

module.exports = [
    {
        name: 'jadibot',
        category: 'bot',
        desc: 'Jadikan nomor kamu sebagai bot menggunakan Pairing Code',
        usage: '(nomor whatsapp)',
        premiumOnly: true,
        noLimit: true,
        async execute({ sock, m, args }) {
            const phoneNumber = args[0]?.replace(/[^0-9]/g, '');
            if (!phoneNumber) return m.reply('❌ Masukkan nomor WhatsApp kamu!\nContoh: *.jadibot 6281234567890*');

            if (jadibotSessions.has(m.sender)) {
                return m.reply('❌ Kamu sudah memiliki session jadibot yang aktif!\nKetik *.stopjadibot* untuk menghentikan.');
            }

            const sessionDir = path.join(config.paths.sessions, `jadibot_${m.sender.split('@')[0]}`);
            if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

            try {
                const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

                const jadibotSock = makeWASocket({
                    auth: state,
                    logger: pino({ level: 'silent' }),
                    browser: ['Ubuntu', 'Chrome', '120.0.0'], // Required for pairing code
                });

                jadibotSock.ev.on('creds.update', saveCreds);

                // Request Pairing Code
                if (!jadibotSock.authState.creds.registered) {
                    setTimeout(async () => {
                        try {
                            const code = await jadibotSock.requestPairingCode(phoneNumber);
                            await sock.sendMessage(m.chat, {
                                text: `🔑 *KODE PAIRING JADIBOT*\n\nNomor: ${phoneNumber}\nKode: *${code}*\n\n💡 _Cara login:_\n1. Buka aplikasi WhatsApp kamu\n2. Klik Tiga Titik > Perangkat Taut\n3. Pilih "Tautkan dengan Nomor Telepon Saja"\n4. Masukkan kode di atas.`
                            }, { quoted: m.raw });
                        } catch (e) {
                            await sock.sendMessage(m.chat, { text: '❌ Gagal meminta pairing code: ' + e.message });
                        }
                    }, 3000);
                }

                jadibotSock.ev.on('connection.update', async (update) => {
                    const { connection, lastDisconnect } = update;

                    if (connection === 'open') {
                        jadibotSessions.set(m.sender, jadibotSock);
                        await sock.sendMessage(m.chat, {
                            text: `✅ *JadiBot Aktif!*\n\n📱 Nomor: ${jadibotSock.user?.id?.split(':')[0]}\n👤 Nama: ${jadibotSock.user?.name || m.pushName}\n\n_Bot akan berjalan di nomor kamu. Ketik .stopjadibot untuk menghentikan._`
                        });
                    }

                    if (connection === 'close') {
                        const statusCode = lastDisconnect?.error?.output?.statusCode;
                        if (statusCode === DisconnectReason.loggedOut) {
                            jadibotSessions.delete(m.sender);
                            await sock.sendMessage(m.chat, { text: '❌ JadiBot logout. Session dihapus.' });
                        }
                    }
                });

                // Handle messages on jadibot
                jadibotSock.ev.on('messages.upsert', async ({ messages, type }) => {
                    if (type !== 'notify') return;
                    for (const msg of messages) {
                        if (!msg.message) continue;
                        await handleMessage(jadibotSock, msg, null);
                    }
                });

            } catch (e) {
                await m.reply('❌ Gagal membuat session JadiBot: ' + e.message);
            }
        }
    },
    {
        name: 'stopjadibot',
        category: 'bot',
        desc: 'Hentikan jadibot',
        noLimit: true,
        async execute({ m }) {
            const session = jadibotSessions.get(m.sender);
            if (!session) return m.reply('❌ Kamu tidak memiliki session jadibot yang aktif.');

            try {
                await session.logout();
            } catch {}
            jadibotSessions.delete(m.sender);
            await m.reply('✅ JadiBot berhasil dihentikan!');
        }
    },
    {
        name: 'listjadibot',
        category: 'bot',
        desc: 'Lihat daftar jadibot aktif',
        noLimit: true,
        async execute({ m }) {
            if (jadibotSessions.size === 0) return m.reply('📋 Tidak ada JadiBot yang aktif.');
            let text = `📋 *JADIBOT AKTIF* (${jadibotSessions.size})\n\n`;
            let i = 1;
            for (const [jid, sess] of jadibotSessions) {
                text += `${i}. ${sess.user?.name || 'Unknown'} (${jid.split('@')[0]})\n`;
                i++;
            }
            await m.reply(text);
        }
    },
];
