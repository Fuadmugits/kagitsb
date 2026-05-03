const { Settings } = require('../database');

module.exports = [
    {
        name: 'antilink', category: 'group', desc: 'Auto-kick member kirim link grup', usage: 'on/off',
        groupOnly: true, adminOnly: true, botAdminOnly: true,
        async execute({ m, args }) {
            const mode = args[0]?.toLowerCase();
            if (mode === 'on') {
                Settings.set(`antilink_${m.chat}`, 'true');
                await m.reply('✅ *Anti-Link diaktifkan!*\nMember yang mengirim link chat.whatsapp.com akan otomatis di-kick.');
            } else if (mode === 'off') {
                Settings.set(`antilink_${m.chat}`, 'false');
                await m.reply('❌ *Anti-Link dinonaktifkan!*');
            } else {
                const current = Settings.get(`antilink_${m.chat}`) === 'true' ? 'ON' : 'OFF';
                await m.reply(`🔰 Status Anti-Link: *${current}*\nGunakan .antilink on/off`);
            }
        }
    },
    {
        name: 'antitoxic', category: 'group', desc: 'Auto-delete pesan toxic', usage: 'on/off',
        groupOnly: true, adminOnly: true, botAdminOnly: true,
        async execute({ m, args }) {
            const mode = args[0]?.toLowerCase();
            if (mode === 'on') {
                Settings.set(`antitoxic_${m.chat}`, 'true');
                await m.reply('✅ *Anti-Toxic diaktifkan!*\nPesan dengan kata-kata kasar akan otomatis dihapus.');
            } else if (mode === 'off') {
                Settings.set(`antitoxic_${m.chat}`, 'false');
                await m.reply('❌ *Anti-Toxic dinonaktifkan!*');
            } else {
                const current = Settings.get(`antitoxic_${m.chat}`) === 'true' ? 'ON' : 'OFF';
                await m.reply(`🔰 Status Anti-Toxic: *${current}*\nGunakan .antitoxic on/off`);
            }
        }
    },
    {
        name: 'welcome', category: 'group', desc: 'Pesan sambutan otomatis', usage: 'on/off',
        groupOnly: true, adminOnly: true,
        async execute({ m, args }) {
            const mode = args[0]?.toLowerCase();
            if (mode === 'on') {
                Settings.set(`welcome_${m.chat}`, 'true');
                await m.reply('✅ *Welcome message diaktifkan!*\nBot akan menyambut member baru yang masuk.');
            } else if (mode === 'off') {
                Settings.set(`welcome_${m.chat}`, 'false');
                await m.reply('❌ *Welcome message dinonaktifkan!*');
            } else {
                const current = Settings.get(`welcome_${m.chat}`) === 'true' ? 'ON' : 'OFF';
                await m.reply(`🔰 Status Welcome: *${current}*\nGunakan .welcome on/off`);
            }
        }
    },
    {
        name: 'setwelcome', category: 'group', desc: 'Set pesan sambutan custom', usage: '(teks)',
        groupOnly: true, adminOnly: true,
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan pesan sambutan!\n\n💡 Gunakan `@user` untuk mention member baru.\n\nContoh: .setwelcome Halo @user, selamat datang di grup kami!');
            Settings.set(`welcomemsg_${m.chat}`, text);
            await m.reply('✅ Pesan sambutan berhasil diubah!');
        }
    },
    {
        name: 'setgoodbye', category: 'group', desc: 'Set pesan selamat tinggal custom', usage: '(teks)',
        groupOnly: true, adminOnly: true,
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan pesan selamat tinggal!\n\n💡 Gunakan `@user` untuk mention member.\n\nContoh: .setgoodbye Bye bye @user!');
            Settings.set(`goodbyemsg_${m.chat}`, text);
            await m.reply('✅ Pesan selamat tinggal berhasil diubah!');
        }
    },
    {
        name: 'leveling', category: 'group', desc: 'Toggle sistem leveling di grup', usage: 'on/off',
        groupOnly: true, adminOnly: true,
        async execute({ m, args }) {
            const mode = args[0]?.toLowerCase();
            if (mode === 'on') {
                Settings.set(`leveling_${m.chat}`, 'true');
                await m.reply('✅ *Leveling diaktifkan!*\nMember akan mendapatkan EXP dari setiap pesan.');
            } else if (mode === 'off') {
                Settings.set(`leveling_${m.chat}`, 'false');
                await m.reply('❌ *Leveling dinonaktifkan!*\nMember tidak akan mendapatkan EXP di grup ini.');
            } else {
                const current = Settings.get(`leveling_${m.chat}`) === 'true' ? 'ON' : 'OFF';
                await m.reply(`📈 Status Leveling: *${current}*\nGunakan .leveling on/off`);
            }
        }
    },
    {
        name: 'game', aliases: ['games'], category: 'group', desc: 'Toggle fitur games di grup', usage: 'on/off',
        groupOnly: true, adminOnly: true,
        async execute({ m, args, config }) {
            const mode = args[0]?.toLowerCase();
            if (mode === 'on') {
                Settings.set(`game_${m.chat}`, 'true');
                await m.reply('✅ *Games diaktifkan!*\nSemua fitur game bisa dipakai di grup ini.');
            } else if (mode === 'off') {
                Settings.set(`game_${m.chat}`, 'false');
                await m.reply('❌ *Games dinonaktifkan!*\nFitur game tidak bisa dipakai di grup ini.');
            } else {
                const current = Settings.get(`game_${m.chat}`) === 'true' ? 'ON' : 'OFF';
                let text = `🎮 *Status Games Grup*: *${current}*\n`;
                text += `_Gunakan .game on/off untuk mengubah_\n\n`;
                text += `⏳ *Jadwal Games Global:*\n`;
                
                if (config && config.gameSchedule && config.gameSchedule.length > 0) {
                    if (config.gameSchedule.length > 10) {
                        text += `▸ *Aktif:* Menit 00-20 & 40-60 tiap jam\n`;
                        text += `▸ *Istirahat:* Menit 20-40 tiap jam\n`;
                        text += `_(Berlaku 24 Jam Full)_\n`;
                    } else {
                        config.gameSchedule.forEach(sch => {
                            text += `▸ Jam ${sch.time} WIB - *${sch.state.toUpperCase()}*\n`;
                        });
                    }
                } else {
                    text += `_Tidak ada jadwal aktif._`;
                }
                
                await m.reply(text);
            }
        }
    }
];
