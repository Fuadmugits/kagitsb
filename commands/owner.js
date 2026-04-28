const { isOwner, formatNumber, parseJid } = require('../lib/functions');
const { Users, Transactions, Settings, CommandLogs } = require('../database');
const config = require('../config');
const fs = require('fs');

module.exports = [
    {
        name: 'bot', category: 'owner', desc: 'Bot settings', usage: '[set]', ownerOnly: true, noLimit: true,
        async execute({ sock, m, args, text }) {
            if (!args[0]) return m.reply('❌ .bot public/self/group\n.bot autoread on/off\n.bot autotyping on/off');
            const sub = args[0].toLowerCase();
            if (['public','self','group'].includes(sub)) { config.bot.mode = sub; Settings.set('bot_mode', sub); return m.reply(`✅ Mode bot: ${sub}`); }
            if (sub === 'autoread') { config.bot.autoRead = args[1] === 'on'; Settings.set('auto_read', args[1]); return m.reply(`✅ Auto-read: ${args[1]}`); }
            if (sub === 'autotyping') { config.bot.autoTyping = args[1] === 'on'; Settings.set('auto_typing', args[1]); return m.reply(`✅ Auto-typing: ${args[1]}`); }
        }
    },
    {
        name: 'addprem', category: 'owner', desc: 'Tambah premium user', usage: '(@tag/nomor) (hari)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            let jid = null;
            let daysArg = null;

            if (m.mentionedJid?.[0]) {
                // Jika pakai mention/tag
                jid = m.mentionedJid[0];
                // Days ada di args terakhir (args[0] = @mention, args[1] = days)
                daysArg = args.find(a => !a.startsWith('@') && /^\d+$/.test(a));
            } else if (args[0]) {
                // Jika pakai nomor manual
                jid = parseJid(args[0]);
                daysArg = args[1];
            }

            const days = parseInt(daysArg) || 30;

            if (!jid) return m.reply('❌ Tag user atau masukkan nomor!\n\n📌 Contoh:\n• .addprem @tag 30\n• .addprem 628xxx 30\n• .addprem 08xxx 30');

            // Pastikan user ada di database
            Users.getOrCreate(jid);
            // Set premium
            Users.setPremium(jid, days);

            // Verifikasi premium berhasil disimpan
            const check = Users.get(jid);
            if (check && check.role === 'premium') {
                const expDate = check.premium_expire ? new Date(check.premium_expire).toLocaleDateString('id') : '-';
                await m.reply(`✅ *Premium Berhasil Ditambahkan!*\n\n👤 User: @${jid.split('@')[0]}\n⏳ Durasi: ${days} hari\n📅 Expire: ${expDate}\n💎 Role: Premium`);
            } else {
                await m.reply(`❌ Gagal menambahkan premium untuk @${jid.split('@')[0]}. Silakan coba lagi.`);
            }
        }
    },
    {
        name: 'delprem', category: 'owner', desc: 'Hapus premium', usage: '(@tag)', ownerOnly: true, noLimit: true,
        async execute({ m }) {
            const jid = m.mentionedJid?.[0] || m.quoted?.sender;
            if (!jid) return m.reply('❌ Tag user!');
            Users.removePremium(jid);
            await m.reply(`✅ Premium @${jid.split('@')[0]} dihapus!`);
        }
    },
    {
        name: 'listprem', category: 'owner', desc: 'Lihat list premium', ownerOnly: true, noLimit: true,
        async execute({ m }) {
            const list = Users.getPremium();
            if (!list.length) return m.reply('📋 Tidak ada user premium.');
            let text = `💎 *PREMIUM USERS* (${list.length})\n\n`;
            list.forEach((u, i) => { text += `${i+1}. ${u.name} (${u.jid.split('@')[0]})\n   Expire: ${u.premium_expire?.split('T')[0] || '-'}\n`; });
            await m.reply(text);
        }
    },
    {
        name: 'ban', category: 'owner', desc: 'Ban user', usage: '(@tag)', ownerOnly: true, noLimit: true,
        async execute({ m }) {
            const jid = m.mentionedJid?.[0] || m.quoted?.sender;
            if (!jid) return m.reply('❌ Tag user!');
            Users.getOrCreate(jid);
            Users.ban(jid);
            await m.reply(`🔨 @${jid.split('@')[0]} telah di-BAN!`);
        }
    },
    {
        name: 'unban', category: 'owner', desc: 'Unban user', usage: '(@tag)', ownerOnly: true, noLimit: true,
        async execute({ m }) {
            const jid = m.mentionedJid?.[0] || m.quoted?.sender;
            if (!jid) return m.reply('❌ Tag user!');
            Users.unban(jid);
            await m.reply(`✅ @${jid.split('@')[0]} telah di-UNBAN!`);
        }
    },
    {
        name: 'addbalance', aliases: ['adduang', 'addbal'], category: 'owner', desc: 'Tambah balance', usage: '(@tag) (nominal)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = m.mentionedJid?.[0] || (args[0] ? args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net' : null);
            const amount = parseInt(args[1] || args[0]) || 0;
            if (!jid || !amount) return m.reply('❌ .addbalance @tag nominal');
            Users.getOrCreate(jid);
            Users.addBalance(jid, amount);
            Transactions.create(jid, 'topup', amount, 'Topup by owner');
            await m.reply(`✅ +${formatNumber(amount)} balance ke @${jid.split('@')[0]}`);
        }
    },
    {
        name: 'addlimit', category: 'owner', desc: 'Tambah limit', usage: '(@tag) (jumlah)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = m.mentionedJid?.[0] || (args[0] ? args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net' : null);
            const amount = parseInt(args[1] || args[0]) || 0;
            if (!jid || !amount) return m.reply('❌ .addlimit @tag jumlah');
            Users.getOrCreate(jid);
            Users.addLimit(jid, amount);
            await m.reply(`✅ +${amount} limit ke @${jid.split('@')[0]}`);
        }
    },
    {
        name: 'join', category: 'owner', desc: 'Bot join grup', usage: '(link)', ownerOnly: true, noLimit: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan link grup!');
            const code = text.replace('https://chat.whatsapp.com/', '');
            try { await sock.groupAcceptInvite(code); await m.reply('✅ Berhasil join grup!'); }
            catch { await m.reply('❌ Gagal join. Link tidak valid atau expired.'); }
        }
    },
    {
        name: 'leave', category: 'owner', desc: 'Bot leave grup', ownerOnly: true, noLimit: true,
        async execute({ sock, m }) {
            if (!m.isGroup) return m.reply('❌ Hanya di grup!');
            await m.reply('👋 Bot meninggalkan grup...');
            await sock.groupLeave(m.chat);
        }
    },
    {
        name: 'broadcast', aliases: ['bc'], category: 'owner', desc: 'Broadcast pesan', usage: '(pesan)', ownerOnly: true, noLimit: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan pesan broadcast!');
            const groups = await sock.groupFetchAllParticipating();
            const ids = Object.keys(groups);
            let count = 0;
            for (const id of ids) {
                try { await sock.sendMessage(id, { text: `📢 *BROADCAST*\n\n${text}\n\n_— ${config.bot.name}_` }); count++; } catch {}
            }
            await m.reply(`✅ Broadcast terkirim ke ${count}/${ids.length} grup`);
        }
    },
    {
        name: 'listpc', category: 'owner', desc: 'List chat pribadi', ownerOnly: true, noLimit: true,
        async execute({ sock, m }) { await m.reply('📋 Fitur ini menampilkan list private chat.'); }
    },
    {
        name: 'listgc', category: 'owner', desc: 'List grup', ownerOnly: true, noLimit: true,
        async execute({ sock, m }) {
            const groups = await sock.groupFetchAllParticipating();
            const arr = Object.values(groups);
            let text = `📋 *LIST GRUP* (${arr.length})\n\n`;
            arr.forEach((g, i) => { text += `${i+1}. ${g.subject}\n   👥 ${g.participants.length} members\n\n`; });
            await m.reply(text);
        }
    },
    {
        name: 'setbotname', category: 'owner', desc: 'Ubah nama bot', usage: '(nama)', ownerOnly: true, noLimit: true,
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan nama baru!');
            config.bot.name = text;
            Settings.set('bot_name', text);
            await m.reply(`✅ Nama bot diubah ke: ${text}`);
        }
    },
    {
        name: 'setppbot', category: 'owner', desc: 'Ubah foto profil bot', ownerOnly: true, noLimit: true,
        async execute({ sock, m }) {
            const media = m.quoted?.isImage ? m.quoted : m.isImage ? m : null;
            if (!media) return m.reply('❌ Reply foto!');
            const buffer = await media.download();
            await sock.updateProfilePicture(sock.user.id, buffer);
            await m.reply('✅ Foto profil bot diubah!');
        }
    },
    {
        name: 'setbio', category: 'owner', desc: 'Ubah bio bot', usage: '(bio)', ownerOnly: true, noLimit: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan bio baru!');
            await sock.updateProfileStatus(text);
            await m.reply('✅ Bio bot diubah!');
        }
    },
    {
        name: 'clearchat', category: 'owner', desc: 'Hapus semua chat', ownerOnly: true, noLimit: true,
        async execute({ sock, m }) { await sock.chatModify({ delete: true, lastMessages: [{ key: m.key, messageTimestamp: m.raw.messageTimestamp }] }, m.chat); await m.reply('✅ Chat dibersihkan!'); }
    },
    {
        name: 'block', category: 'owner', desc: 'Block user', usage: '(@tag)', ownerOnly: true, noLimit: true,
        async execute({ sock, m }) {
            const jid = m.mentionedJid?.[0] || m.quoted?.sender;
            if (!jid) return m.reply('❌ Tag user!');
            await sock.updateBlockStatus(jid, 'block');
            await m.reply(`✅ @${jid.split('@')[0]} diblock!`);
        }
    },
    {
        name: 'openblock', aliases: ['unblock'], category: 'owner', desc: 'Unblock user', usage: '(@tag)', ownerOnly: true, noLimit: true,
        async execute({ sock, m }) {
            const jid = m.mentionedJid?.[0] || m.quoted?.sender;
            if (!jid) return m.reply('❌ Tag user!');
            await sock.updateBlockStatus(jid, 'unblock');
            await m.reply(`✅ @${jid.split('@')[0]} di-unblock!`);
        }
    },
    {
        name: 'mute', category: 'owner', desc: 'Mute user', ownerOnly: true, noLimit: true,
        async execute({ m }) { const jid = m.mentionedJid?.[0] || m.quoted?.sender; if (!jid) return m.reply('❌ Tag user!'); Users.getOrCreate(jid); Users.mute(jid); await m.reply('✅ User di-mute!'); }
    },
    {
        name: 'unmute', category: 'owner', desc: 'Unmute user', ownerOnly: true, noLimit: true,
        async execute({ m }) { const jid = m.mentionedJid?.[0] || m.quoted?.sender; if (!jid) return m.reply('❌ Tag user!'); Users.unmute(jid); await m.reply('✅ User di-unmute!'); }
    },
];
