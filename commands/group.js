const { getNumberFromJid } = require('../lib/functions');
const { Warnings } = require('../database');

module.exports = [
    {
        name: 'add', category: 'group', desc: 'Tambah member', usage: '(62xxx)',
        groupOnly: true, adminOnly: true, botAdminOnly: true,
        async execute({ sock, m, args }) {
            if (!args[0]) return m.reply('❌ Masukkan nomor! Contoh: .add 628xxx');
            const jid = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            try { await sock.groupParticipantsUpdate(m.chat, [jid], 'add'); await m.reply('✅ Berhasil menambahkan!'); }
            catch { await m.reply('❌ Gagal menambahkan. Nomor mungkin tidak valid atau privasi tertutup.'); }
        }
    },
    {
        name: 'kick', category: 'group', desc: 'Keluarkan member', usage: '(@tag/62xxx)',
        groupOnly: true, adminOnly: true, botAdminOnly: true,
        async execute({ sock, m, args }) {
            const jid = m.mentionedJid?.[0] || (args[0] ? args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net' : null);
            if (!jid) return m.reply('❌ Tag atau masukkan nomor member!');
            try { await sock.groupParticipantsUpdate(m.chat, [jid], 'remove'); await m.reply('✅ Member dikeluarkan!'); }
            catch { await m.reply('❌ Gagal mengeluarkan member.'); }
        }
    },
    {
        name: 'promote', category: 'group', desc: 'Jadikan admin', usage: '(@tag)',
        groupOnly: true, adminOnly: true, botAdminOnly: true,
        async execute({ sock, m, args }) {
            const jid = m.mentionedJid?.[0] || (args[0] ? args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net' : null);
            if (!jid) return m.reply('❌ Tag member yang ingin dijadikan admin!');
            try { await sock.groupParticipantsUpdate(m.chat, [jid], 'promote'); await m.reply('✅ Berhasil promote!'); }
            catch { await m.reply('❌ Gagal promote member.'); }
        }
    },
    {
        name: 'demote', category: 'group', desc: 'Hapus admin', usage: '(@tag)',
        groupOnly: true, adminOnly: true, botAdminOnly: true,
        async execute({ sock, m, args }) {
            const jid = m.mentionedJid?.[0] || (args[0] ? args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net' : null);
            if (!jid) return m.reply('❌ Tag admin yang ingin didemote!');
            try { await sock.groupParticipantsUpdate(m.chat, [jid], 'demote'); await m.reply('✅ Berhasil demote!'); }
            catch { await m.reply('❌ Gagal demote.'); }
        }
    },
    {
        name: 'warn', category: 'group', desc: 'Beri warning', usage: '(@tag)',
        groupOnly: true, adminOnly: true,
        async execute({ m }) {
            const jid = m.mentionedJid?.[0] || m.quoted?.sender;
            if (!jid) return m.reply('❌ Tag atau reply pesan member!');
            Warnings.add(jid, m.chat, '', m.sender);
            const count = Warnings.count(jid, m.chat);
            const maxWarn = 5;
            let msg = `⚠️ @${jid.split('@')[0]} mendapat warning! (${count}/${maxWarn})`;
            if (count >= maxWarn) {
                msg += '\n\n🔴 *Warning penuh!* Member akan di-mute atau di-kick oleh Admin.';
            }
            await m.reply(msg, { mentions: [jid] });
        }
    },
    {
        name: 'unwarn', category: 'group', desc: 'Hapus warning', usage: '(@tag)',
        groupOnly: true, adminOnly: true,
        async execute({ m }) {
            const jid = m.mentionedJid?.[0] || m.quoted?.sender;
            if (!jid) return m.reply('❌ Tag atau reply pesan member!');
            Warnings.reset(jid, m.chat);
            await m.reply(`✅ Warning @${jid.split('@')[0]} direset!`);
        }
    },
    {
        name: 'setname', category: 'group', desc: 'Ubah nama grup', usage: '(nama baru)',
        groupOnly: true, adminOnly: true, botAdminOnly: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan nama baru grup!');
            await sock.groupUpdateSubject(m.chat, text);
            await m.reply('✅ Nama grup diubah!');
        }
    },
    {
        name: 'setdesc', category: 'group', desc: 'Ubah deskripsi grup', usage: '(deskripsi)',
        groupOnly: true, adminOnly: true, botAdminOnly: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan deskripsi baru!');
            await sock.groupUpdateDescription(m.chat, text);
            await m.reply('✅ Deskripsi grup diubah!');
        }
    },
    {
        name: 'setppgc', category: 'group', desc: 'Ubah foto profil grup', usage: '(reply img)',
        groupOnly: true, adminOnly: true, botAdminOnly: true,
        async execute({ sock, m }) {
            const media = m.quoted?.isImage ? m.quoted : m.isImage ? m : null;
            if (!media) return m.reply('❌ Reply foto untuk dijadikan foto profil grup!');
            const buffer = await media.download();
            await sock.updateProfilePicture(m.chat, buffer);
            await m.reply('✅ Foto profil grup diubah!');
        }
    },
    {
        name: 'linkgrup', aliases: ['linkgroup','gclink'], category: 'group', desc: 'Dapatkan link grup',
        groupOnly: true, adminOnly: true, botAdminOnly: true,
        async execute({ sock, m }) {
            const code = await sock.groupInviteCode(m.chat);
            await m.reply(`🔗 *Link Group:*\nhttps://chat.whatsapp.com/${code}`);
        }
    },
    {
        name: 'revoke', category: 'group', desc: 'Reset link grup',
        groupOnly: true, adminOnly: true, botAdminOnly: true,
        async execute({ sock, m }) {
            await sock.groupRevokeInvite(m.chat);
            await m.reply('✅ Link grup direset!');
        }
    },
    {
        name: 'tagall', category: 'group', desc: 'Tag semua member',
        groupOnly: true, adminOnly: true,
        async execute({ sock, m, text }) {
            const meta = await sock.groupMetadata(m.chat);
            let msg = `📢 *TAG ALL*${text ? `\n💬 ${text}` : ''}\n\n`;
            const mentions = [];
            for (const p of meta.participants) {
                msg += `◇ @${p.id.split('@')[0]}\n`;
                mentions.push(p.id);
            }
            await sock.sendMessage(m.chat, { text: msg, mentions }, { quoted: m.raw });
        }
    },
    {
        name: 'hidetag', category: 'group', desc: 'Tag tersembunyi', usage: '(pesan)',
        groupOnly: true, adminOnly: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan pesan!');
            const meta = await sock.groupMetadata(m.chat);
            const mentions = meta.participants.map(p => p.id);
            await sock.sendMessage(m.chat, { text, mentions });
        }
    },
    {
        name: 'group', category: 'group', desc: 'Buka/tutup grup', usage: '(open/close)',
        groupOnly: true, adminOnly: true, botAdminOnly: true,
        async execute({ sock, m, args }) {
            if (!args[0]) return m.reply('❌ .group open / .group close');
            if (args[0] === 'open') {
                await sock.groupSettingUpdate(m.chat, 'not_announcement');
                await m.reply('✅ Grup dibuka! Semua member bisa kirim pesan.');
            } else if (args[0] === 'close') {
                await sock.groupSettingUpdate(m.chat, 'announcement');
                await m.reply('✅ Grup ditutup! Hanya admin yang bisa kirim pesan.');
            }
        }
    },
    {
        name: 'delete', aliases: ['del'], category: 'group', desc: 'Hapus pesan', usage: '(reply pesan)',
        groupOnly: true, adminOnly: true,
        async execute({ sock, m }) {
            if (!m.quoted) return m.reply('❌ Reply pesan yang ingin dihapus!');
            await sock.sendMessage(m.chat, { delete: m.quoted.key });
        }
    },
    {
        name: 'listonline', category: 'group', desc: 'Lihat member online',
        groupOnly: true,
        async execute({ sock, m }) {
            const meta = await sock.groupMetadata(m.chat);
            let text = `📋 *Member Grup: ${meta.subject}*\n👥 Total: ${meta.participants.length}\n\n`;
            meta.participants.forEach((p, i) => {
                const role = p.admin === 'superadmin' ? '👑' : p.admin === 'admin' ? '⭐' : '👤';
                text += `${i+1}. ${role} @${p.id.split('@')[0]}\n`;
            });
            const mentions = meta.participants.map(p => p.id);
            await sock.sendMessage(m.chat, { text, mentions }, { quoted: m.raw });
        }
    },
];
