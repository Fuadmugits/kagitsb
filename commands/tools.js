const { CustomCommands, MessageStore } = require('../database');
const { pickRandom, toWebp } = require('../lib/functions');

module.exports = [
    {
        name: 'sticker', aliases: ['s','stiker'], category: 'tools', desc: 'Buat sticker dari gambar', usage: '(reply img)',
        async execute({ sock, m, text }) {
            const media = m.quoted?.isImage ? m.quoted : m.isImage ? m : null;
            if (!media) return m.reply('❌ Reply gambar untuk dijadikan sticker!');
            try {
                let buffer = await media.download();
                buffer = await toWebp(buffer); // Convert to WebP
                await sock.sendMessage(m.chat, {
                    sticker: buffer,
                    contextInfo: { externalAdReply: undefined }
                }, { quoted: m.raw });
            } catch (e) { await m.reply('❌ Gagal membuat sticker: ' + e.message); }
        }
    },
    {
        name: 'toimage', aliases: ['toimg'], category: 'tools', desc: 'Sticker ke gambar', usage: '(reply sticker)',
        async execute({ sock, m }) {
            if (!m.quoted?.isSticker) return m.reply('❌ Reply sticker!');
            const buffer = await m.quoted.download();
            await sock.sendMessage(m.chat, { image: buffer, caption: '✅ Converted to image' }, { quoted: m.raw });
        }
    },
    {
        name: 'tts', category: 'tools', desc: 'Text to speech', usage: '(text)',
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan teks! Contoh: .tts halo dunia');
            try {
                const gtts = require('google-tts-api');
                const url = gtts.getAudioUrl(text, { lang: 'id', slow: false });
                const { fetchBuffer } = require('../lib/functions');
                const buffer = await fetchBuffer(url);
                if (!buffer) return m.reply('❌ Gagal generate audio!');
                await sock.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/mpeg', ptt: true }, { quoted: m.raw });
            } catch (e) { await m.reply('❌ Error: ' + e.message); }
        }
    },
    {
        name: 'toqr', category: 'tools', desc: 'Text ke QR code', usage: '(text)',
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan teks!');
            try {
                const QRCode = require('qrcode');
                const buffer = await QRCode.toBuffer(text, { width: 512, margin: 2, color: { dark: '#000', light: '#fff' } });
                await sock.sendMessage(m.chat, { image: buffer, caption: '✅ QR Code generated' }, { quoted: m.raw });
            } catch (e) { await m.reply('❌ Error: ' + e.message); }
        }
    },
    {
        name: 'translate', aliases: ['tr'], category: 'tools', desc: 'Terjemahkan teks', usage: '(kode bahasa) (teks)',
        async execute({ m, args, text }) {
            const lang = args[0] || 'id';
            const txt = args.slice(1).join(' ') || m.quoted?.body || '';
            if (!txt) return m.reply('❌ .translate en teks yang ingin diterjemahkan');
            try {
                const { fetchJson } = require('../lib/functions');
                const res = await fetchJson(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(txt)}&langpair=auto|${lang}`);
                await m.reply(`╭───「 🌐 𝚃𝚁𝙰𝙽𝚂𝙻𝙰𝚃𝙴 」\n│ \n│ 📝 Original: ${txt}\n│ 🔄 ${lang.toUpperCase()}: ${res?.responseData?.translatedText || 'Gagal translate'}\n╰──────────────`);
            } catch (e) { await m.reply('❌ Error translate: ' + e.message); }
        }
    },
    {
        name: 'shorturl', category: 'tools', desc: 'Pendekkan URL', usage: '(url)',
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan URL!');
            try {
                const { fetchJson } = require('../lib/functions');
                const res = await fetchJson(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(text)}`);
                await m.reply(`╭───「 🔗 𝚂𝙷𝙾𝚁𝚃 𝚄𝚁𝙻 」\n│ \n│ 📎 Original: ${text}\n│ ✅ Short: ${res || text}\n╰──────────────`);
            } catch { await m.reply('❌ Gagal memendekkan URL.'); }
        }
    },
    {
        name: 'readmore', category: 'tools', desc: 'Buat teks readmore', usage: 'text1|text2',
        async execute({ m, text }) {
            if (!text || !text.includes('|')) return m.reply('❌ Format: .readmore text1|text2');
            const [t1, t2] = text.split('|');
            const readmore = String.fromCharCode(8206).repeat(4001);
            await m.reply(t1.trim() + readmore + t2.trim());
        }
    },
    {
        name: 'setcmd', category: 'tools', desc: 'Buat custom command', usage: '(trigger|response)',
        async execute({ m, text }) {
            if (!text || !text.includes('|')) return m.reply('❌ Format: .setcmd trigger|response');
            const [trigger, ...rest] = text.split('|');
            const response = rest.join('|');
            CustomCommands.create(trigger.trim().toLowerCase(), response.trim(), m.sender);
            await m.reply(`✅ Custom command "${trigger.trim()}" berhasil dibuat!`);
        }
    },
    {
        name: 'delcmd', category: 'tools', desc: 'Hapus custom command', usage: '(trigger)',
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan trigger command!');
            CustomCommands.delete(text.trim().toLowerCase());
            await m.reply(`✅ Custom command "${text.trim()}" dihapus!`);
        }
    },
    {
        name: 'listcmd', category: 'tools', desc: 'Lihat custom commands', noLimit: true,
        async execute({ m }) {
            const cmds = CustomCommands.getAll();
            if (!cmds.length) return m.reply('📋 Belum ada custom command.');
            let text = `📋 *Custom Commands* (${cmds.length})\n\n`;
            cmds.forEach((c, i) => { text += `${i+1}. ${c.trigger_word} → ${c.response.substring(0, 50)}${c.response.length > 50 ? '...' : ''}\n`; });
            await m.reply(text);
        }
    },
    {
        name: 'addmsg', category: 'tools', desc: 'Simpan pesan', usage: '(nama)',
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan nama! .addmsg namafile');
            const content = m.quoted?.body || '';
            if (!content) return m.reply('❌ Reply pesan yang ingin disimpan!');
            MessageStore.create(text.trim(), content, m.sender);
            await m.reply(`✅ Pesan disimpan sebagai "${text.trim()}"!`);
        }
    },
    {
        name: 'getmsg', category: 'tools', desc: 'Ambil pesan tersimpan', usage: '(nama)',
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan nama!');
            const msg = MessageStore.get(text.trim());
            if (!msg) return m.reply('❌ Pesan tidak ditemukan!');
            await m.reply(msg.content);
        }
    },
    {
        name: 'delmsg', category: 'tools', desc: 'Hapus pesan tersimpan', usage: '(nama)',
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan nama!');
            MessageStore.delete(text.trim());
            await m.reply(`✅ Pesan "${text.trim()}" dihapus!`);
        }
    },
    {
        name: 'listmsg', category: 'tools', desc: 'Lihat pesan tersimpan', noLimit: true,
        async execute({ m }) {
            const msgs = MessageStore.getAll();
            if (!msgs.length) return m.reply('📋 Belum ada pesan tersimpan.');
            let text = `📋 *Message Store* (${msgs.length})\n\n`;
            msgs.forEach((ms, i) => { text += `${i+1}. ${ms.name}\n`; });
            await m.reply(text);
        }
    },
    {
        name: 'react', category: 'tools', desc: 'React ke pesan', usage: '(emoji)',
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan emoji!');
            const key = m.quoted?.key || m.key;
            await sock.sendMessage(m.chat, { react: { text: text.trim(), key } });
        }
    },
    {
        name: 'tagme', category: 'tools', desc: 'Tag diri sendiri', noLimit: true,
        async execute({ sock, m }) {
            await sock.sendMessage(m.chat, { text: `👤 @${m.sender.split('@')[0]}`, mentions: [m.sender] }, { quoted: m.raw });
        }
    },
    {
        name: 'totag', category: 'tools', desc: 'Kirim pesan sebagai tag', usage: '(reply pesan)',
        groupOnly: true, adminOnly: true,
        async execute({ sock, m }) {
            if (!m.quoted) return m.reply('❌ Reply pesan yang ingin dikirim sebagai tag!');
            const meta = await sock.groupMetadata(m.chat);
            const mentions = meta.participants.map(p => p.id);
            await sock.sendMessage(m.chat, { text: m.quoted.body || '📢', mentions }, { quoted: m.raw });
        }
    },
];
