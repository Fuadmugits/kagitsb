const { fetchJson, fetchBuffer } = require('../lib/functions');

module.exports = [
    {
        name: 'pixiv',
        category: 'search',
        desc: 'Cari gambar dari Pixiv',
        usage: '(query)',
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan kata kunci!');
            try {
                const buffer = await fetchBuffer(`https://api.siputzx.my.id/api/s/pixiv?query=${encodeURIComponent(text)}`);
                if (buffer) await sock.sendMessage(m.chat, { image: buffer, caption: `🎨 Pixiv: ${text}` }, { quoted: m.raw });
                else await m.reply('❌ Tidak ditemukan.');
            } catch { await m.reply('❌ Error.'); }
        }
    },
    {
        name: 'ringtone',
        category: 'search',
        desc: 'Cari ringtone',
        usage: '(query)',
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan kata kunci!');
            try {
                const res = await fetchJson(`https://api.siputzx.my.id/api/s/ringtone?query=${encodeURIComponent(text)}`);
                const items = res?.data?.slice(0, 5) || res?.result?.slice(0, 5) || [];
                if (!items.length) return m.reply('❌ Tidak ditemukan!');
                let msg = `🔔 *Ringtone Search*: ${text}\n\n`;
                items.forEach((v, i) => { msg += `${i + 1}. *${v.title || v.name || '-'}*\n🔗 ${v.audio || v.url || '-'}\n\n`; });
                await m.reply(msg);
            } catch { await m.reply('❌ Error.'); }
        }
    },
    {
        name: 'style',
        aliases: ['styletext', 'fancy'],
        category: 'search',
        desc: 'Ubah teks jadi fancy style',
        usage: '(query)',
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan teks!');
            const styles = [
                { name: 'Monospace', fn: t => t.split('').map(c => { const code = c.charCodeAt(0); if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D670 + code - 65); if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D68A + code - 97); return c; }).join('') },
                { name: 'Bold', fn: t => t.split('').map(c => { const code = c.charCodeAt(0); if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D400 + code - 65); if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D41A + code - 97); return c; }).join('') },
                { name: 'Italic', fn: t => t.split('').map(c => { const code = c.charCodeAt(0); if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D434 + code - 65); if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D44E + code - 97); return c; }).join('') },
                { name: 'Bold Italic', fn: t => t.split('').map(c => { const code = c.charCodeAt(0); if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D468 + code - 65); if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D482 + code - 97); return c; }).join('') },
                { name: 'Circled', fn: t => t.split('').map(c => { const code = c.charCodeAt(0); if (code >= 65 && code <= 90) return String.fromCodePoint(0x24B6 + code - 65); if (code >= 97 && code <= 122) return String.fromCodePoint(0x24D0 + code - 97); return c; }).join('') },
                { name: 'Squared', fn: t => t.split('').map(c => { const code = c.charCodeAt(0); if (code >= 65 && code <= 90) return String.fromCodePoint(0x1F130 + code - 65); return c; }).join('') },
                { name: 'Strikethrough', fn: t => t.split('').map(c => c + '\u0336').join('') },
                { name: 'Underline', fn: t => t.split('').map(c => c + '\u0332').join('') },
            ];
            let msg = `✨ *STYLE TEXT*\n\n📝 Original: ${text}\n\n`;
            for (const s of styles) {
                msg += `${s.name}:\n${s.fn(text)}\n\n`;
            }
            await m.reply(msg);
        }
    },
    {
        name: 'tenor',
        category: 'search',
        desc: 'Cari GIF dari Tenor',
        usage: '(query)',
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan kata kunci!');
            try {
                const res = await fetchJson(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(text)}&key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&limit=1`);
                const gif = res?.results?.[0]?.media_formats?.gif?.url;
                if (!gif) return m.reply('❌ GIF tidak ditemukan!');
                const buffer = await fetchBuffer(gif);
                if (buffer) await sock.sendMessage(m.chat, { video: buffer, gifPlayback: true, caption: `🎬 Tenor: ${text}` }, { quoted: m.raw });
            } catch { await m.reply('❌ Error.'); }
        }
    },
    {
        name: 'urban',
        aliases: ['ud', 'urbandictionary'],
        category: 'search',
        desc: 'Cari definisi Urban Dictionary',
        usage: '(query)',
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan kata!');
            try {
                const res = await fetchJson(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(text)}`);
                const def = res?.list?.[0];
                if (!def) return m.reply('❌ Definisi tidak ditemukan!');
                let msg = `📖 *Urban Dictionary*\n\n`;
                msg += `📝 Word: *${def.word}*\n`;
                msg += `📄 Definition:\n${def.definition?.replace(/\[|\]/g, '')}\n\n`;
                msg += `💬 Example:\n${def.example?.replace(/\[|\]/g, '') || '-'}\n\n`;
                msg += `👍 ${def.thumbs_up || 0} | 👎 ${def.thumbs_down || 0}`;
                await m.reply(msg);
            } catch { await m.reply('❌ Error.'); }
        }
    },
];
