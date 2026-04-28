const { fetchBuffer, fetchJson } = require('../lib/functions');

module.exports = [
    {
        name: 'waifu',
        category: 'anime',
        desc: 'Random waifu image',
        async execute({ sock, m }) {
            try {
                await m.react('⏳');
                const res = await fetchJson('https://api.waifu.pics/sfw/waifu');
                if (!res?.url) return m.reply('❌ Gagal mengambil gambar!');
                const buffer = await fetchBuffer(res.url);
                if (!buffer) return m.reply('❌ Gagal download gambar!');
                await sock.sendMessage(m.chat, {
                    image: buffer,
                    caption: '🌸 *Waifu~*\n\n_Powered by waifu.pics_'
                }, { quoted: m.raw });
                await m.react('✅');
            } catch (e) {
                await m.reply('❌ Error: ' + e.message);
            }
        }
    },
    {
        name: 'neko',
        category: 'anime',
        desc: 'Random neko image',
        async execute({ sock, m }) {
            try {
                await m.react('⏳');
                const res = await fetchJson('https://api.waifu.pics/sfw/neko');
                if (!res?.url) return m.reply('❌ Gagal mengambil gambar!');
                const buffer = await fetchBuffer(res.url);
                if (!buffer) return m.reply('❌ Gagal download gambar!');
                await sock.sendMessage(m.chat, {
                    image: buffer,
                    caption: '🐱 *Neko~*\n\n_Powered by waifu.pics_'
                }, { quoted: m.raw });
                await m.react('✅');
            } catch (e) {
                await m.reply('❌ Error: ' + e.message);
            }
        }
    },
    {
        name: 'shinobu',
        category: 'anime',
        desc: 'Random shinobu image',
        async execute({ sock, m }) {
            try {
                await m.react('⏳');
                const res = await fetchJson('https://api.waifu.pics/sfw/shinobu');
                if (!res?.url) return m.reply('❌ Gagal!');
                const buffer = await fetchBuffer(res.url);
                if (buffer) await sock.sendMessage(m.chat, { image: buffer, caption: '⚔️ *Shinobu~*' }, { quoted: m.raw });
                await m.react('✅');
            } catch { await m.reply('❌ Error.'); }
        }
    },
    {
        name: 'megumin',
        category: 'anime',
        desc: 'Random megumin image',
        async execute({ sock, m }) {
            try {
                await m.react('⏳');
                const res = await fetchJson('https://api.waifu.pics/sfw/megumin');
                if (!res?.url) return m.reply('❌ Gagal!');
                const buffer = await fetchBuffer(res.url);
                if (buffer) await sock.sendMessage(m.chat, { image: buffer, caption: '💥 *Megumin~*' }, { quoted: m.raw });
                await m.react('✅');
            } catch { await m.reply('❌ Error.'); }
        }
    },
];
