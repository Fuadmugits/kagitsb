const { isOwner, formatNumber } = require('../lib/functions');
const { Users } = require('../database');
const config = require('../config');

// Panel commands - simulated hosting/VPS panel features
module.exports = [
    {
        name: 'createadmin',
        category: 'panel',
        desc: 'Buat admin panel',
        ownerOnly: true,
        noLimit: true,
        async execute({ m }) {
            await m.reply('🔧 *Create Admin*\n\nGunakan dashboard web untuk membuat admin baru.\n🌐 /login → Settings');
        }
    },
    {
        name: 'listusr',
        category: 'panel',
        desc: 'List semua user bot',
        ownerOnly: true,
        noLimit: true,
        async execute({ m }) {
            const users = Users.getAll();
            if (!users.length) return m.reply('📋 Belum ada user terdaftar.');
            let text = `📋 *LIST USER* (${users.length})\n\n`;
            users.slice(0, 30).forEach((u, i) => {
                const status = u.is_banned ? '🔴' : u.role === 'premium' ? '💎' : '⚪';
                text += `${i + 1}. ${status} ${u.name} (${u.jid.split('@')[0]})\n`;
                text += `   💰 ${formatNumber(u.balance)} | 📉 ${u.limit_count} | ⚡ ${u.total_commands}\n`;
            });
            if (users.length > 30) text += `\n_...dan ${users.length - 30} user lainnya_`;
            await m.reply(text);
        }
    },
    {
        name: 'delusr',
        category: 'panel',
        desc: 'Hapus data user',
        usage: '(@tag/62xxx)',
        ownerOnly: true,
        noLimit: true,
        async execute({ m, args }) {
            const jid = m.mentionedJid?.[0] || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);
            if (!jid) return m.reply('❌ Tag atau masukkan nomor user!');
            await m.reply(`✅ Data user @${jid.split('@')[0]} dihapus dari database.`);
        }
    },
    {
        name: 'listsrv',
        category: 'panel',
        desc: 'List server/session aktif',
        ownerOnly: true,
        noLimit: true,
        async execute({ m }) {
            const uptime = process.uptime();
            const memUsage = process.memoryUsage();
            let text = `🖥️ *SERVER INFO*\n\n`;
            text += `📡 Status: 🟢 Online\n`;
            text += `⏰ Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m\n`;
            text += `💾 RAM: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)} MB / ${(memUsage.heapTotal / 1024 / 1024).toFixed(1)} MB\n`;
            text += `🔧 Node: ${process.version}\n`;
            text += `💻 Platform: ${process.platform}\n`;
            text += `📊 Users: ${Users.count()}\n`;
            text += `💎 Premium: ${Users.countPremium()}\n`;
            await m.reply(text);
        }
    },
    {
        name: 'delsrv',
        category: 'panel',
        desc: 'Hapus server/session',
        ownerOnly: true,
        noLimit: true,
        async execute({ m }) {
            await m.reply('⚠️ Fitur ini akan menghapus session bot. Gunakan dengan hati-hati.');
        }
    },
    {
        name: 'backup',
        category: 'panel',
        desc: 'Backup database',
        ownerOnly: true,
        noLimit: true,
        async execute({ sock, m }) {
            try {
                const fs = require('fs');
                const dbPath = config.paths.database;
                if (fs.existsSync(dbPath)) {
                    const buffer = fs.readFileSync(dbPath);
                    await sock.sendMessage(m.chat, {
                        document: buffer,
                        fileName: `backup_${Date.now()}.db`,
                        mimetype: 'application/octet-stream',
                        caption: '💾 Database backup'
                    }, { quoted: m.raw });
                } else {
                    await m.reply('❌ Database file tidak ditemukan.');
                }
            } catch (e) {
                await m.reply('❌ Error backup: ' + e.message);
            }
        }
    },
    {
        name: 'upsw',
        category: 'panel',
        desc: 'Update status/story WhatsApp',
        usage: '(text)',
        ownerOnly: true,
        noLimit: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan teks untuk status!');
            try {
                await sock.sendMessage('status@broadcast', { text });
                await m.reply('✅ Status WhatsApp diperbarui!');
            } catch {
                await m.reply('❌ Gagal update status.');
            }
        }
    },
    {
        name: 'addowner',
        category: 'panel',
        desc: 'Tambah co-owner',
        usage: '(62xxx)',
        ownerOnly: true,
        noLimit: true,
        async execute({ m, args }) {
            if (!args[0]) return m.reply('❌ Masukkan nomor!');
            const num = args[0].replace(/[^0-9]/g, '');
            if (!config.bot.ownerNumber.includes(num)) {
                config.bot.ownerNumber.push(num);
                await m.reply(`✅ ${num} ditambahkan sebagai co-owner!`);
            } else {
                await m.reply('❌ Nomor sudah menjadi owner.');
            }
        }
    },
    {
        name: 'delowner',
        category: 'panel',
        desc: 'Hapus co-owner',
        usage: '(62xxx)',
        ownerOnly: true,
        noLimit: true,
        async execute({ m, args }) {
            if (!args[0]) return m.reply('❌ Masukkan nomor!');
            const num = args[0].replace(/[^0-9]/g, '');
            const idx = config.bot.ownerNumber.indexOf(num);
            if (idx > 0) {
                config.bot.ownerNumber.splice(idx, 1);
                await m.reply(`✅ ${num} dihapus dari owner.`);
            } else {
                await m.reply('❌ Nomor bukan co-owner atau merupakan owner utama.');
            }
        }
    },
    {
        name: 'getsession',
        category: 'panel',
        desc: 'Kirim file session bot',
        ownerOnly: true,
        noLimit: true,
        async execute({ sock, m }) {
            try {
                const fs = require('fs');
                const path = require('path');
                const credsPath = path.join(config.paths.sessions, 'creds.json');
                if (fs.existsSync(credsPath)) {
                    const buffer = fs.readFileSync(credsPath);
                    await sock.sendMessage(m.chat, {
                        document: buffer,
                        fileName: 'creds.json',
                        mimetype: 'application/json',
                        caption: '🔑 Session credentials\n⚠️ JANGAN SHARE FILE INI!'
                    }, { quoted: m.raw });
                } else {
                    await m.reply('❌ Session file tidak ditemukan.');
                }
            } catch (e) {
                await m.reply('❌ Error: ' + e.message);
            }
        }
    },
    {
        name: 'delsession',
        category: 'panel',
        desc: 'Hapus session bot',
        ownerOnly: true,
        noLimit: true,
        async execute({ m }) {
            await m.reply('⚠️ Menghapus session akan me-logout bot.\n\nGunakan .> process.exit() untuk restart bot dan scan QR baru.');
        }
    },
    {
        name: 'delsampah',
        category: 'panel',
        desc: 'Bersihkan file temporary',
        ownerOnly: true,
        noLimit: true,
        async execute({ m }) {
            const { cleanTemp } = require('../lib/functions');
            cleanTemp();
            await m.reply('✅ File temporary dibersihkan!');
        }
    },
    {
        name: '$',
        category: 'panel',
        desc: 'Execute JavaScript (owner)',
        ownerOnly: true,
        noLimit: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan kode JS!');
            try {
                const result = eval(text);
                await m.reply(`📟 *Result:*\n${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`);
            } catch (e) {
                await m.reply(`❌ Error: ${e.message}`);
            }
        }
    },
    {
        name: '>',
        category: 'panel',
        desc: 'Eval async (owner)',
        ownerOnly: true,
        noLimit: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan kode!');
            try {
                const result = await eval(`(async () => { ${text} })()`);
                await m.reply(`📟 *Result:*\n${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`);
            } catch (e) {
                await m.reply(`❌ Error: ${e.message}`);
            }
        }
    },
    {
        name: '<',
        category: 'panel',
        desc: 'Exec command (owner)',
        ownerOnly: true,
        noLimit: true,
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan command!');
            try {
                const { exec } = require('child_process');
                exec(text, (err, stdout, stderr) => {
                    if (err) return m.reply(`❌ Error:\n${err.message}`);
                    if (stderr) return m.reply(`⚠️ Stderr:\n${stderr}`);
                    m.reply(`📟 *Output:*\n${stdout || 'No output'}`);
                });
            } catch (e) {
                await m.reply(`❌ Error: ${e.message}`);
            }
        }
    },
];
