const { fetchJson, fetchBuffer } = require('../lib/functions');

module.exports = [
    { name: 'ytsearch', aliases: ['yts'], category: 'search', desc: 'Cari video YouTube', usage: '(query)',
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan kata kunci!');
            try {
                const res = await fetchJson(`https://api.siputzx.my.id/api/y/search?query=${encodeURIComponent(text)}`);
                const items = res?.data?.slice(0, 5) || [];
                if (!items.length) return m.reply('❌ Tidak ditemukan!');
                let msg = `🔎 *YouTube Search*: ${text}\n\n`;
                items.forEach((v, i) => { msg += `${i+1}. *${v.title || 'No title'}*\n⏱️ ${v.duration || '-'}\n🔗 ${v.url || '-'}\n\n`; });
                await m.reply(msg);
            } catch { await m.reply('❌ Gagal mencari.'); }
        }
    },
    { name: 'google', category: 'search', desc: 'Cari di Google', usage: '(query)',
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan kata kunci!');
            try {
                const res = await fetchJson(`https://api.siputzx.my.id/api/s/google?query=${encodeURIComponent(text)}`);
                const items = res?.data?.slice(0, 5) || [];
                let msg = `🔎 *Google Search*: ${text}\n\n`;
                items.forEach((v, i) => { msg += `${i+1}. *${v.title || '-'}*\n${v.snippet || '-'}\n🔗 ${v.link || '-'}\n\n`; });
                await m.reply(msg || '❌ Tidak ditemukan.');
            } catch { await m.reply('❌ Gagal mencari.'); }
        }
    },
    { name: 'pinterest', aliases: ['pin'], category: 'search', desc: 'Cari gambar Pinterest (Premium)', usage: '(query)', premiumOnly: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan kata kunci!');
            try {
                const res = await fetchJson(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(text)}`);
                const url = res?.data?.[0] || res?.result?.[0];
                if (!url) return m.reply('❌ Tidak ditemukan!');
                const buffer = await fetchBuffer(url);
                if (buffer) await sock.sendMessage(m.chat, { image: buffer, caption: `📌 Pinterest: ${text}` }, { quoted: m.raw });
                else await m.reply('❌ Gagal download gambar.');
            } catch { await m.reply('❌ Error.'); }
        }
    },
    { name: 'wallpaper', aliases: ['wall'], category: 'search', desc: 'Cari wallpaper (Premium)', usage: '(query)', premiumOnly: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan kata kunci!');
            try {
                const res = await fetchJson(`https://api.siputzx.my.id/api/s/wallpaper?query=${encodeURIComponent(text)}`);
                const url = res?.data?.[0] || res?.result?.[0];
                if (!url) return m.reply('❌ Tidak ditemukan!');
                const buffer = await fetchBuffer(url);
                if (buffer) await sock.sendMessage(m.chat, { image: buffer, caption: `🖼️ Wallpaper: ${text}` }, { quoted: m.raw });
            } catch { await m.reply('❌ Error.'); }
        }
    },
    { name: 'cuaca', aliases: ['weather'], category: 'search', desc: 'Cek cuaca', usage: '(kota)',
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan nama kota!');
            try {
                const res = await fetchJson(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(text)}&units=metric&appid=060a6bcfa19809c2cd4d97a212b19273`);
                if (!res?.main) return m.reply('❌ Kota tidak ditemukan!');
                await m.reply(`🌤️ *Cuaca ${res.name}*\n\n🌡️ Suhu: ${res.main.temp}°C\n💧 Kelembapan: ${res.main.humidity}%\n🌬️ Angin: ${res.wind.speed} m/s\n☁️ Kondisi: ${res.weather[0].description}`);
            } catch { await m.reply('❌ Gagal mengecek cuaca.'); }
        }
    },
    { name: 'spotify', category: 'search', desc: 'Cari lagu Spotify', usage: '(query)',
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan kata kunci!');
            try {
                const res = await fetchJson(`https://api.siputzx.my.id/api/s/spotify?query=${encodeURIComponent(text)}`);
                const items = res?.data?.slice(0, 5) || res?.result?.slice(0, 5) || [];
                if (!items.length) return m.reply('❌ Tidak ditemukan!');
                let msg = `🎵 *Spotify Search*: ${text}\n\n`;
                items.forEach((v, i) => { msg += `${i+1}. *${v.title || v.name || 'No title'}*\n👤 Artist: ${v.artist || '-'}\n⏱️ Duration: ${v.duration || '-'}\n🔗 ${v.url || '-'}\n\n`; });
                await m.reply(msg);
            } catch { await m.reply('❌ Gagal mencari di Spotify.'); }
        }
    },
    { name: 'gimage', aliases: ['img'], category: 'search', desc: 'Cari gambar Google (Premium)', usage: '(query)', premiumOnly: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan kata kunci!');
            try {
                const res = await fetchJson(`https://api.siputzx.my.id/api/s/googleimage?query=${encodeURIComponent(text)}`);
                const url = res?.data?.[0] || res?.result?.[0] || res?.data?.[0]?.url;
                if (!url) return m.reply('❌ Tidak ditemukan!');
                const buffer = await fetchBuffer(url);
                if (buffer) await sock.sendMessage(m.chat, { image: buffer, caption: `🖼️ Google Image: ${text}` }, { quoted: m.raw });
                else await m.reply('❌ Gagal download gambar.');
            } catch { await m.reply('❌ Gagal mencari gambar.'); }
        }
    },
    { name: 'npm', category: 'search', desc: 'Cari package NPM', usage: '(query)',
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan nama package!');
            try {
                const res = await fetchJson(`https://registry.npmjs.org/${encodeURIComponent(text)}`);
                if (!res?.name) return m.reply('❌ Package tidak ditemukan!');
                await m.reply(`📦 *NPM Package*\n\n📝 ${res.name}\n📄 ${res.description || '-'}\n🔗 https://npmjs.com/package/${res.name}\n📊 Version: ${res['dist-tags']?.latest || '-'}`);
            } catch { await m.reply('❌ Error.'); }
        }
    },
];
