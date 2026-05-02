const { fetchBuffer, fetchJson } = require('../lib/functions');

/**
 * Multi-API fallback untuk fetch anime images.
 * Coba beberapa API secara berurutan hingga berhasil.
 */
async function fetchAnimeImage(category) {
    const apis = [
        // API 1: waifu.im (paling stabil)
        async () => {
            const res = await fetchJson(`https://api.waifu.im/search?included_tags=${category === 'waifu' ? 'waifu' : category}`);
            return res?.images?.[0]?.url || null;
        },
        // API 2: waifu.pics
        async () => {
            const res = await fetchJson(`https://api.waifu.pics/sfw/${category}`);
            return res?.url || null;
        },
        // API 3: nekos.life (hanya mendukung neko)
        async () => {
            if (category === 'neko') {
                const res = await fetchJson('https://nekos.life/api/v2/img/neko');
                return res?.url || null;
            }
            // Fallback ke waifu.im dengan tag random
            const res = await fetchJson('https://api.waifu.im/search?included_tags=waifu');
            return res?.images?.[0]?.url || null;
        },
        // API 4: pic.re
        async () => {
            const res = await fetchJson('https://pic.re/image.json');
            return res?.file_url || null;
        },
    ];

    for (const apiFn of apis) {
        try {
            const url = await apiFn();
            if (url) {
                const buffer = await fetchBuffer(url);
                if (buffer && buffer.length > 1000) return buffer; // Minimal 1KB
            }
        } catch (e) {
            console.log(`Anime API fallback skip: ${e.message}`);
        }
    }
    return null;
}

module.exports = [
    {
        name: 'waifu',
        category: 'anime',
        desc: 'Random waifu image (Premium)',
        premiumOnly: true,
        async execute({ sock, m }) {
            try {
                await m.react('⏳');
                await m.reply('🔄 _Mengambil gambar waifu..._');
                
                const buffer = await fetchAnimeImage('waifu');
                if (!buffer) {
                    await m.react('❌');
                    return m.reply('❌ Semua API gagal mengambil gambar. Coba lagi nanti!');
                }
                
                await sock.sendMessage(m.chat, {
                    image: buffer,
                    caption: '🌸 *Waifu~*\n\n_✨ Fitur Premium Only_'
                }, { quoted: m.raw });
                await m.react('✅');
            } catch (e) {
                await m.react('❌');
                await m.reply('❌ Error: ' + e.message);
            }
        }
    },
    {
        name: 'neko',
        category: 'anime',
        desc: 'Random neko image (Premium)',
        premiumOnly: true,
        async execute({ sock, m }) {
            try {
                await m.react('⏳');
                await m.reply('🔄 _Mengambil gambar neko..._');
                
                const buffer = await fetchAnimeImage('neko');
                if (!buffer) {
                    await m.react('❌');
                    return m.reply('❌ Semua API gagal mengambil gambar. Coba lagi nanti!');
                }
                
                await sock.sendMessage(m.chat, {
                    image: buffer,
                    caption: '🐱 *Neko~*\n\n_✨ Fitur Premium Only_'
                }, { quoted: m.raw });
                await m.react('✅');
            } catch (e) {
                await m.react('❌');
                await m.reply('❌ Error: ' + e.message);
            }
        }
    },
    {
        name: 'shinobu',
        category: 'anime',
        desc: 'Random shinobu image (Premium)',
        premiumOnly: true,
        async execute({ sock, m }) {
            try {
                await m.react('⏳');
                await m.reply('🔄 _Mengambil gambar shinobu..._');
                
                const buffer = await fetchAnimeImage('shinobu');
                if (!buffer) {
                    await m.react('❌');
                    return m.reply('❌ Semua API gagal mengambil gambar. Coba lagi nanti!');
                }
                
                await sock.sendMessage(m.chat, {
                    image: buffer,
                    caption: '⚔️ *Shinobu~*\n\n_✨ Fitur Premium Only_'
                }, { quoted: m.raw });
                await m.react('✅');
            } catch (e) {
                await m.react('❌');
                await m.reply('❌ Error: ' + e.message);
            }
        }
    },
    {
        name: 'megumin',
        category: 'anime',
        desc: 'Random megumin image (Premium)',
        premiumOnly: true,
        async execute({ sock, m }) {
            try {
                await m.react('⏳');
                await m.reply('🔄 _Mengambil gambar megumin..._');
                
                const buffer = await fetchAnimeImage('megumin');
                if (!buffer) {
                    await m.react('❌');
                    return m.reply('❌ Semua API gagal mengambil gambar. Coba lagi nanti!');
                }
                
                await sock.sendMessage(m.chat, {
                    image: buffer,
                    caption: '💥 *Megumin~*\n\n_✨ Fitur Premium Only_'
                }, { quoted: m.raw });
                await m.react('✅');
            } catch (e) {
                await m.react('❌');
                await m.reply('❌ Error: ' + e.message);
            }
        }
    },
];
