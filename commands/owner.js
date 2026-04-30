const { isOwner, formatNumber, parseJid, getNumberFromJid } = require('../lib/functions');
const { Users, Transactions, Settings, CommandLogs, CoOwners } = require('../database');
const config = require('../config');
const fs = require('fs');

// Helper: resolve JID dari @tag, quoted, atau nomor telepon
function resolveJid(m, args, argIndex = 0) {
    if (m.mentionedJid?.[0]) return m.mentionedJid[0];
    if (m.quoted?.sender) return m.quoted.sender;
    if (args[argIndex]) return parseJid(args[argIndex]);
    return null;
}

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
        name: 'delprem', category: 'owner', desc: 'Hapus premium', usage: '(@tag/nomor)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = resolveJid(m, args);
            if (!jid) return m.reply('❌ Tag user, reply pesan, atau masukkan nomor!\nContoh: .delprem 628xxx');
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
        name: 'ban', category: 'owner', desc: 'Ban user', usage: '(@tag/nomor)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = resolveJid(m, args);
            if (!jid) return m.reply('❌ Tag user, reply pesan, atau masukkan nomor!\nContoh: .ban 628xxx');
            Users.getOrCreate(jid);
            Users.ban(jid);
            await m.reply(`🔨 @${jid.split('@')[0]} telah di-BAN!`);
        }
    },
    {
        name: 'unban', category: 'owner', desc: 'Unban user', usage: '(@tag/nomor)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = resolveJid(m, args);
            if (!jid) return m.reply('❌ Tag user, reply pesan, atau masukkan nomor!');
            Users.unban(jid);
            await m.reply(`✅ @${jid.split('@')[0]} telah di-UNBAN!`);
        }
    },
    {
        name: 'addbalance', aliases: ['adduang', 'addbal'], category: 'owner', desc: 'Tambah balance', usage: '(@tag/nomor) (nominal)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            // Jika ada mention, arg[0] adalah nominal; jika nomor telepon, arg[0]=nomor, arg[1]=nominal
            const hasMention = !!m.mentionedJid?.[0];
            const hasQuoted  = !!m.quoted?.sender;
            const jid    = resolveJid(m, args, 0);
            const amount = parseInt(hasMention || hasQuoted ? args[0] : args[1]) || 0;
            if (!jid) return m.reply('❌ Format: .addbalance @tag 1000\natau: .addbalance 628xxx 1000');
            if (!amount) return m.reply('❌ Masukkan jumlah balance!\nContoh: .addbalance @tag 5000');
            Users.getOrCreate(jid);
            Users.addBalance(jid, amount);
            Transactions.create(jid, 'topup', amount, 'Topup by owner');
            await m.reply(`✅ +${formatNumber(amount)} balance ke @${jid.split('@')[0]}`);
        }
    },
    {
        name: 'addlimit', category: 'owner', desc: 'Tambah limit', usage: '(@tag/nomor) (jumlah)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const hasMention = !!m.mentionedJid?.[0];
            const hasQuoted  = !!m.quoted?.sender;
            const jid    = resolveJid(m, args, 0);
            const amount = parseInt(hasMention || hasQuoted ? args[0] : args[1]) || 0;
            if (!jid) return m.reply('❌ Format: .addlimit @tag 10\natau: .addlimit 628xxx 10');
            if (!amount) return m.reply('❌ Masukkan jumlah limit!\nContoh: .addlimit @tag 20');
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
        name: 'block', category: 'owner', desc: 'Block user', usage: '(@tag/nomor)', ownerOnly: true, noLimit: true,
        async execute({ sock, m, args }) {
            const jid = resolveJid(m, args);
            if (!jid) return m.reply('❌ Tag user, reply, atau masukkan nomor!');
            await sock.updateBlockStatus(jid, 'block');
            await m.reply(`✅ @${jid.split('@')[0]} diblock!`);
        }
    },
    {
        name: 'openblock', aliases: ['unblock'], category: 'owner', desc: 'Unblock user', usage: '(@tag/nomor)', ownerOnly: true, noLimit: true,
        async execute({ sock, m, args }) {
            const jid = resolveJid(m, args);
            if (!jid) return m.reply('❌ Tag user, reply, atau masukkan nomor!');
            await sock.updateBlockStatus(jid, 'unblock');
            await m.reply(`✅ @${jid.split('@')[0]} di-unblock!`);
        }
    },
    {
        name: 'mute', category: 'owner', desc: 'Mute user', usage: '(@tag/nomor)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) { const jid = resolveJid(m, args); if (!jid) return m.reply('❌ Tag user, reply, atau masukkan nomor!'); Users.getOrCreate(jid); Users.mute(jid); await m.reply('✅ User di-mute!'); }
    },
    {
        name: 'unmute', category: 'owner', desc: 'Unmute user', usage: '(@tag/nomor)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) { const jid = resolveJid(m, args); if (!jid) return m.reply('❌ Tag user, reply, atau masukkan nomor!'); Users.unmute(jid); await m.reply('✅ User di-unmute!'); }
    },

    // ── Co-Owner Management (hanya main owner) ────────
    {
        name: 'addcoowner',
        aliases: ['addco'],
        category: 'owner',
        desc: 'Tambah co-owner',
        usage: '(@tag/nomor)',
        ownerOnly: true,
        realOwnerOnly: true,
        noLimit: true,
        async execute({ m, args }) {
            // Hanya main owner (bukan co-owner) yang boleh
            const senderNum = getNumberFromJid(m.sender);
            if (!config.bot.ownerNumber.includes(senderNum)) {
                return m.reply('❌ Hanya *owner utama* yang bisa menambah co-owner!');
            }
            let jid = m.mentionedJid?.[0];
            if (!jid && args[0]) jid = parseJid(args[0]);
            if (!jid) return m.reply('❌ Tag atau masukkan nomor user!\nContoh: .addcoowner @tag atau .addcoowner 628xxx');
            if (config.bot.ownerNumber.includes(getNumberFromJid(jid))) {
                return m.reply('❌ User ini sudah owner utama!');
            }
            CoOwners.add(jid, m.sender);
            Users.getOrCreate(jid);
            await m.reply(
                `✅ *Co-Owner Ditambahkan!*\n\n` +
                `👤 User: @${jid.split('@')[0]}\n` +
                `🔑 Hak akses: Semua command owner (kecuali manage co-owner)\n\n` +
                `_Hapus dengan .delcoowner @tag_`,
                { mentions: [jid] }
            );
        }
    },
    {
        name: 'delcoowner',
        aliases: ['delco', 'removecoowner'],
        category: 'owner',
        desc: 'Hapus co-owner',
        usage: '(@tag/nomor)',
        ownerOnly: true,
        noLimit: true,
        async execute({ m, args }) {
            const senderNum = getNumberFromJid(m.sender);
            if (!config.bot.ownerNumber.includes(senderNum)) {
                return m.reply('❌ Hanya *owner utama* yang bisa menghapus co-owner!');
            }
            let jid = m.mentionedJid?.[0];
            if (!jid && args[0]) jid = parseJid(args[0]);
            if (!jid) return m.reply('❌ Tag atau masukkan nomor user!');
            if (!CoOwners.isCoOwner(jid)) return m.reply('❌ User ini bukan co-owner!');
            CoOwners.remove(jid);
            await m.reply(`✅ Co-owner @${jid.split('@')[0]} telah dihapus.`, { mentions: [jid] });
        }
    },
    {
        name: 'listcoowner',
        aliases: ['listco'],
        category: 'owner',
        desc: 'Lihat daftar co-owner',
        ownerOnly: true,
        noLimit: true,
        async execute({ m }) {
            const list = CoOwners.getAll();
            if (!list.length) return m.reply('📋 Belum ada co-owner.\n\nTambah dengan .addcoowner @tag');
            let text = `👑 *DAFTAR CO-OWNER* (${list.length})\n\n`;
            list.forEach((co, i) => {
                text += `${i+1}. *${co.name || 'Unknown'}* (${co.jid.split('@')[0]})\n`;
                text += `   📅 Ditambah: ${co.created_at?.split('T')[0] || '-'}\n\n`;
            });
            text += `_Hapus dengan .delcoowner @tag_`;
            await m.reply(text);
        }
    },
];

