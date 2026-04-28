const { fetchJson, fetchBuffer, isOwner } = require('../lib/functions');
const { Users } = require('../database');

module.exports = [
    {
        name: 'menfes',
        aliases: ['menfess'],
        category: 'bot',
        desc: 'Kirim pesan menfess anonim',
        usage: '(62xxx|nama palsu)',
        async execute({ sock, m, text }) {
            if (!text || !text.includes('|')) return m.reply('❌ Format: .menfes 628xxx|Nama Palsu\n\nSetelah itu, reply pesan ini dengan isi menfess kamu.');
            const [number, fakeName] = text.split('|');
            const targetJid = number.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

            const menfesText = m.quoted?.body || '';
            if (!menfesText) {
                return m.reply(`✅ Target: ${number.trim()}\n👤 Nama: ${fakeName.trim()}\n\n_Sekarang reply pesan ini dengan isi menfess yang ingin kamu kirim!_`);
            }

            try {
                await sock.sendMessage(targetJid, {
                    text: `💌 *MENFESS*\n\n👤 Dari: *${fakeName.trim()}*\n\n💬 ${menfesText}\n\n_Pesan ini dikirim secara anonim melalui bot._`
                });
                await m.reply('✅ Menfess berhasil dikirim!');
            } catch {
                await m.reply('❌ Gagal mengirim menfess. Pastikan nomor valid.');
            }
        }
    },
    {
        name: 'confes',
        aliases: ['confess'],
        category: 'bot',
        desc: 'Kirim confess anonim',
        usage: '(62xxx|nama palsu)',
        async execute({ sock, m, text }) {
            if (!text || !text.includes('|')) return m.reply('❌ Format: .confes 628xxx|Nama Palsu\n\nKemudian reply dengan isi confess.');
            const [number, fakeName] = text.split('|');
            const targetJid = number.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

            const confText = m.quoted?.body || '';
            if (!confText) {
                return m.reply(`✅ Target: ${number.trim()}\n👤 Nama: ${fakeName.trim()}\n\n_Reply pesan ini dengan isi confess yang ingin kamu kirim!_`);
            }

            try {
                await sock.sendMessage(targetJid, {
                    text: `🫣 *CONFESS*\n\n👤 Dari: *${fakeName.trim()}*\n\n💬 ${confText}\n\n_Seseorang ingin menyampaikan sesuatu kepadamu secara anonim._`
                });
                await m.reply('✅ Confess berhasil dikirim!');
            } catch {
                await m.reply('❌ Gagal mengirim confess.');
            }
        }
    },
    {
        name: 'roomai',
        category: 'bot',
        desc: 'Chat AI dalam room (percakapan berlanjut)',
        usage: '(query)',
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan pesan untuk AI!\nContoh: .roomai halo, siapa kamu?');
            try {
                await m.react('⏳');
                const res = await fetchJson(`https://api.siputzx.my.id/api/ai/gemini-pro?text=${encodeURIComponent(text)}`);
                const answer = res?.data || res?.result || 'Maaf, tidak bisa memproses.';
                await m.reply(`🤖 *Room AI*\n\n${answer}`);
                await m.react('✅');
            } catch {
                await m.reply('❌ Error menghubungi AI.');
            }
        }
    },
    {
        name: 'inspect',
        category: 'bot',
        desc: 'Inspect link grup WhatsApp',
        usage: '(url gc)',
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan link grup!');
            const code = text.replace('https://chat.whatsapp.com/', '');
            try {
                const info = await sock.groupGetInviteInfo(code);
                let msg = `🔍 *GROUP INSPECT*\n\n`;
                msg += `📛 Nama: ${info.subject}\n`;
                msg += `🆔 ID: ${info.id}\n`;
                msg += `👤 Pembuat: @${info.owner?.split('@')[0] || 'Unknown'}\n`;
                msg += `👥 Members: ${info.size}\n`;
                msg += `📝 Deskripsi: ${info.desc || 'Tidak ada'}\n`;
                msg += `📅 Dibuat: ${new Date(info.creation * 1000).toLocaleDateString('id')}\n`;
                await sock.sendMessage(m.chat, { text: msg, mentions: info.owner ? [info.owner] : [] }, { quoted: m.raw });
            } catch {
                await m.reply('❌ Gagal inspect. Link mungkin tidak valid atau expired.');
            }
        }
    },
    {
        name: 'q',
        category: 'bot',
        desc: 'Lihat pesan yang di-quote (reply)',
        async execute({ m }) {
            if (!m.quoted) return m.reply('❌ Reply pesan yang ingin dilihat!');
            await m.reply(`📝 *Quoted Message*\n\n${m.quoted.body || '[Media/Sticker]'}`);
        }
    },
    {
        name: 'rvo',
        category: 'bot',
        desc: 'Buka view-once message (Premium)',
        premiumOnly: true,
        async execute({ sock, m }) {
            if (!m.quoted) return m.reply('❌ Reply pesan view-once!');
            try {
                const buffer = await m.quoted.download();
                if (m.quoted.isImage) {
                    await sock.sendMessage(m.sender, { image: buffer, caption: '👁️ View Once Opened' });
                } else if (m.quoted.isVideo) {
                    await sock.sendMessage(m.sender, { video: buffer, caption: '👁️ View Once Opened' });
                } else if (m.quoted.isAudio) {
                    await sock.sendMessage(m.sender, { audio: buffer, mimetype: 'audio/mpeg' });
                } else {
                    return await m.reply('❌ Tipe media tidak didukung.');
                }
                
                // Jika command dijalankan di grup, beri tahu di grup
                if (m.isGroup) {
                    await m.reply('✅ Media View-Once telah dikirim ke chat pribadimu (Private Message)!');
                } else {
                    await m.reply('✅ Media View-Once berhasil dibuka!');
                }
            } catch {
                await m.reply('❌ Gagal membuka view-once.');
            }
        }
    },
    {
        name: 'addsewa',
        category: 'bot',
        desc: 'Tambah sewa bot untuk grup',
        usage: '(hari)',
        ownerOnly: true,
        groupOnly: true,
        noLimit: true,
        async execute({ m, args }) {
            const days = parseInt(args[0]) || 30;
            const expire = new Date();
            expire.setDate(expire.getDate() + days);
            const { Settings } = require('../database');
            Settings.set(`sewa_${m.chat}`, expire.toISOString());
            await m.reply(`✅ Sewa bot untuk grup ini aktif selama ${days} hari!\n📅 Expire: ${expire.toLocaleDateString('id')}`);
        }
    },
    {
        name: 'delsewa',
        category: 'bot',
        desc: 'Hapus sewa bot',
        ownerOnly: true,
        groupOnly: true,
        noLimit: true,
        async execute({ m }) {
            const { Settings } = require('../database');
            Settings.set(`sewa_${m.chat}`, '');
            await m.reply('✅ Sewa untuk grup ini dihapus.');
        }
    },
    {
        name: 'listsewa',
        category: 'bot',
        desc: 'Lihat daftar sewa aktif',
        ownerOnly: true,
        noLimit: true,
        async execute({ m }) {
            await m.reply('📋 *List Sewa*\n\n_Fitur listsewa akan menampilkan semua grup yang menyewa bot._');
        }
    },
    {
        name: 'coffe',
        aliases: ['coffee', 'kopi'],
        category: 'other',
        desc: 'Random coffee image',
        async execute({ sock, m }) {
            try {
                const buffer = await fetchBuffer('https://coffee.alexflipnote.dev/random');
                if (buffer) await sock.sendMessage(m.chat, { image: buffer, caption: '☕ *Random Coffee*' }, { quoted: m.raw });
                else await m.reply('❌ Gagal mengambil gambar.');
            } catch { await m.reply('❌ Error.'); }
        }
    },
];
