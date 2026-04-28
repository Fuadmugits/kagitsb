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
    }
];
