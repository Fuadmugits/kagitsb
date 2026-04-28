const { fetchJson, fetchBuffer } = require('../lib/functions');

module.exports = [
    { name: 'ai', aliases: ['gpt','chatgpt'], category: 'ai', desc: 'Tanya AI', usage: '(query)',
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan pertanyaan! Contoh: .ai apa itu javascript');
            await m.react('⏳');
            try {
                const res = await fetchJson(`https://api.siputzx.my.id/api/ai/gemini-pro?text=${encodeURIComponent(text)}`);
                await m.reply(`╭───「 🤖 𝙰𝙸 𝙰𝚂𝚂𝙸𝚂𝚃𝙰𝙽𝚃 」\n│ \n│ ${res?.data || res?.result || 'Maaf, tidak bisa memproses pertanyaan.'}\n╰──────────────`);
            } catch { await m.reply('❌ Gagal menghubungi AI. Coba lagi nanti.'); }
            await m.react('✅');
        }
    },
    { name: 'gemini', category: 'ai', desc: 'Tanya Gemini AI', usage: '(query)',
        async execute({ m, text, config }) {
            if (!text) return m.reply('❌ Masukkan pertanyaan!');
            await m.react('⏳');
            try {
                if (config.api.geminiKey) {
                    const res = await fetchJson(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${config.api.geminiKey}`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        data: { contents: [{ parts: [{ text }] }] }
                    });
                    const answer = res?.candidates?.[0]?.content?.parts?.[0]?.text || 'Tidak ada jawaban.';
                    await m.reply(`╭───「 ✨ 𝙶𝙴𝙼𝙸𝙽𝙸 𝙰𝙸 」\n│ \n│ ${answer}\n╰──────────────`);
                } else {
                    const res = await fetchJson(`https://api.siputzx.my.id/api/ai/gemini-pro?text=${encodeURIComponent(text)}`);
                    await m.reply(`╭───「 ✨ 𝙶𝙴𝙼𝙸𝙽𝙸 𝙰𝙸 」\n│ \n│ ${res?.data || res?.result || 'Tidak ada jawaban.'}\n╰──────────────`);
                }
            } catch { await m.reply('❌ Gagal menghubungi Gemini.'); }
            await m.react('✅');
        }
    },
    { name: 'simi', category: 'ai', desc: 'Chat dengan SimSimi', usage: '(query)',
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan pesan!');
            try {
                const res = await fetchJson(`https://api.siputzx.my.id/api/ai/simsimi?text=${encodeURIComponent(text)}&lang=id`);
                await m.reply(res?.data || res?.result || 'Hmm...');
            } catch { await m.reply('🤔 Hmm aku bingung...'); }
        }
    },
    { name: 'txt2img', category: 'ai', desc: 'Generate gambar dari teks', usage: '(prompt)', premiumOnly: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan deskripsi gambar!');
            await m.react('⏳');
            try {
                const buffer = await fetchBuffer(`https://api.siputzx.my.id/api/ai/text2img?text=${encodeURIComponent(text)}`);
                if (buffer) { await sock.sendMessage(m.chat, { image: buffer, caption: `╭───「 🎨 𝚃𝚇𝚃 𝟸 𝙸𝙼𝙶 」\n│ \n│ 📝 Prompt: ${text}\n╰──────────────` }, { quoted: m.raw }); }
                else { await m.reply('❌ Gagal generate gambar.'); }
            } catch { await m.reply('❌ Error generate gambar.'); }
            await m.react('✅');
        }
    },
];
