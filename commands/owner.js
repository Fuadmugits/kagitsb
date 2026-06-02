const { isOwner, formatNumber, parseJid, getNumberFromJid } = require('../lib/functions');
const { Users, Transactions, Settings, CommandLogs, CoOwners, CustomTitles, GroupLevels, RPG } = require('../database');
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
        name: 'addpremgroup', aliases: ['addpremsc', 'addpremgc'], category: 'owner', desc: 'Tambah premium untuk seluruh anggota grup', usage: '(hari)', ownerOnly: true, groupOnly: true, noLimit: true,
        async execute({ sock, m, args }) {
            const days = parseInt(args[0]) || 30;
            const metadata = await sock.groupMetadata(m.chat);
            const participants = metadata.participants;
            
            let count = 0;
            for (const p of participants) {
                const jid = p.id;
                Users.getOrCreate(jid);
                Users.setPremium(jid, days);
                count++;
            }
            
            await m.reply(`✅ *Premium Massal Berhasil!*\n\n👥 Total: ${count} member\n⏳ Durasi: ${days} hari\n\nSeluruh anggota grup ini sekarang menjadi Premium.`);
        }
    },
    {
        name: 'delpremgroup', aliases: ['delpremsc', 'delpremgc'], category: 'owner', desc: 'Hapus premium untuk seluruh anggota grup', ownerOnly: true, groupOnly: true, noLimit: true,
        async execute({ sock, m }) {
            const metadata = await sock.groupMetadata(m.chat);
            const participants = metadata.participants;
            
            let count = 0;
            for (const p of participants) {
                const jid = p.id;
                Users.removePremium(jid);
                count++;
            }
            
            await m.reply(`✅ *Premium Massal Dihapus!*\n\n👥 Total: ${count} member\n\nSeluruh anggota grup ini kembali menjadi user Free.`);
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
            const hasQuoted  = !!m.quoted?.sender;
            const jid    = resolveJid(m, args, 0);
            // Quoted reply: amount in args[0] | mention/phone: amount in args[1]
            const amount = parseInt(hasQuoted ? args[0] : args[1]) || 0;
            if (!jid) return m.reply('❌ Format: .addbalance @tag 1000\natau: .addbalance 628xxx 1000');
            if (!amount) return m.reply('❌ Masukkan jumlah balance!\nContoh: .addbalance @tag 5000');
            Users.getOrCreate(jid);
            Users.addBalance(jid, amount);
            Transactions.create(jid, 'topup', amount, 'Topup by owner');
            await m.reply(`✅ +${formatNumber(amount)} balance ke @${jid.split('@')[0]}`);
        }
    },
    {
        name: 'addcoin', aliases: ['addkoin'], category: 'owner', desc: 'Tambah coin RPG', usage: '(@tag/nomor) (jumlah)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const hasQuoted  = !!m.quoted?.sender;
            const jid    = resolveJid(m, args, 0);
            const amount = parseInt(hasQuoted ? args[0] : args[1]) || 0;
            if (!jid) return m.reply('❌ Format: .addcoin @tag 1000\natau: .addcoin 628xxx 1000');
            if (!amount) return m.reply('❌ Masukkan jumlah coin!\nContoh: .addcoin @tag 5000');
            RPG.addCoin(jid, amount);
            await m.reply(`✅ +${formatNumber(amount)} RPG Coin ke @${jid.split('@')[0]}`);
        }
    },
    {
        name: 'addlimit', category: 'owner', desc: 'Tambah limit', usage: '(@tag/nomor) (jumlah)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const hasQuoted  = !!m.quoted?.sender;
            const jid    = resolveJid(m, args, 0);
            // Quoted reply: amount in args[0] | mention/phone: amount in args[1]
            const amount = parseInt(hasQuoted ? args[0] : args[1]) || 0;
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

    // ── Custom Title & Level Management (owner, group only) ────────
    {
        name: 'settitle',
        category: 'owner',
        desc: 'Set custom title member di grup',
        usage: '(@tag/nomor) (title)',
        ownerOnly: true,
        groupOnly: true,
        noLimit: true,
        async execute({ m, args, text }) {
            let jid = null;
            let titleText = '';

            if (m.mentionedJid?.[0]) {
                jid = m.mentionedJid[0];
                // Title = semua args kecuali mention
                titleText = args.filter(a => !a.startsWith('@')).join(' ').trim();
            } else if (m.quoted?.sender) {
                jid = m.quoted.sender;
                titleText = text.trim();
            } else if (args[0]) {
                jid = parseJid(args[0]);
                titleText = args.slice(1).join(' ').trim();
            }

            if (!jid) return m.reply(
                '❌ Tag/reply user atau masukkan nomor!\n\n' +
                '📌 Contoh:\n' +
                '• .settitle @tag Raja Bot\n' +
                '• .settitle 628xxx Sultan Grup\n' +
                '• Reply pesan + .settitle Pro Player'
            );
            if (!titleText) return m.reply(
                '❌ Masukkan title!\n\n' +
                '📌 Contoh:\n' +
                '• .settitle @tag Raja Bot\n' +
                '• .settitle @tag Pro Player\n' +
                '• .settitle @tag Master Sejati\n\n' +
                '💡 Emoji otomatis ditambahkan berdasarkan keyword:\n' +
                'raja→👑 sultan→💎 pro→🔥 master→🧙 legend→⭐ dll.'
            );

            const fullTitle = CustomTitles.set(jid, m.chat, titleText, m.sender);

            await m.reply(
                `✅ *Title Berhasil Diatur!*\n\n` +
                `👤 User: @${jid.split('@')[0]}\n` +
                `🏅 Title: *${fullTitle}*\n\n` +
                `_Title ini akan tampil di profil dan leaderboard grup._\n` +
                `_Hapus dengan .deltitle @tag_`,
                { mentions: [jid] }
            );
        }
    },
    {
        name: 'deltitle',
        aliases: ['removetitle', 'hapustitle'],
        category: 'owner',
        desc: 'Hapus custom title member',
        usage: '(@tag/nomor)',
        ownerOnly: true,
        groupOnly: true,
        noLimit: true,
        async execute({ m, args }) {
            const jid = resolveJid(m, args);
            if (!jid) return m.reply('❌ Tag user, reply pesan, atau masukkan nomor!');

            const existing = CustomTitles.get(jid, m.chat);
            if (!existing) return m.reply(`❌ @${jid.split('@')[0]} tidak punya custom title di grup ini.`, { mentions: [jid] });

            CustomTitles.remove(jid, m.chat);
            await m.reply(
                `✅ Title custom @${jid.split('@')[0]} telah dihapus.\n` +
                `_Title kembali mengikuti level otomatis._`,
                { mentions: [jid] }
            );
        }
    },
    {
        name: 'setlevel',
        category: 'owner',
        desc: 'Set level member di grup',
        usage: '(@tag/nomor) (level)',
        ownerOnly: true,
        groupOnly: true,
        noLimit: true,
        async execute({ m, args }) {
            let jid = null;
            let levelArg = null;

            if (m.mentionedJid?.[0]) {
                jid = m.mentionedJid[0];
                levelArg = args.find(a => !a.startsWith('@') && /^\d+$/.test(a));
            } else if (m.quoted?.sender) {
                jid = m.quoted.sender;
                levelArg = args[0];
            } else if (args[0]) {
                jid = parseJid(args[0]);
                levelArg = args[1];
            }

            const level = parseInt(levelArg);
            if (!jid) return m.reply(
                '❌ Tag/reply user atau masukkan nomor!\n\n' +
                '📌 Contoh:\n' +
                '• .setlevel @tag 50\n' +
                '• .setlevel 628xxx 100'
            );
            if (!level || level < 1 || level > 100) return m.reply('❌ Level harus antara 1-100!');

            const newLevel = GroupLevels.setLevel(jid, m.chat, level);
            const title = CustomTitles.get(jid, m.chat)?.title || GroupLevels.getTitle(newLevel);

            await m.reply(
                `✅ *Level Berhasil Diatur!*\n\n` +
                `👤 User: @${jid.split('@')[0]}\n` +
                `📈 Level: *${newLevel}*\n` +
                `🏅 Title: *${title}*\n` +
                `📊 EXP: 0 (direset)`,
                { mentions: [jid] }
            );
        }
    },
    {
        name: 'listtitle',
        category: 'owner',
        desc: 'Lihat semua custom title di grup',
        ownerOnly: true,
        groupOnly: true,
        noLimit: true,
        async execute({ m }) {
            const list = CustomTitles.getByGroup(m.chat);
            if (!list.length) return m.reply('📋 Belum ada custom title di grup ini.\n\nSet dengan .settitle @tag [title]');

            let text = `🏅 *CUSTOM TITLES DI GRUP INI* (${list.length})\n\n`;
            const mentions = [];
            list.forEach((t, i) => {
                text += `${i + 1}. @${t.jid.split('@')[0]}\n`;
                text += `   🏅 ${t.title}\n`;
                text += `   📅 Set: ${t.created_at?.split('T')[0] || '-'}\n\n`;
                mentions.push(t.jid);
            });
            text += `_Hapus title: .deltitle @tag_`;
            await m.reply(text, { mentions });
        }
    },
    {
        name: 'resetrpg', category: 'owner', desc: 'Reset seluruh data RPG pemain', ownerOnly: true, noLimit: true,
        async execute({ m }) {
            RPG.resetRPG();
            await m.reply('✅ *RESET BERHASIL*\n\nSeluruh data equipment, koin, base stats, dan inventory RPG semua player telah direset ke awal!');
        }
    },
    {
        name: 'adminabuse', category: 'owner', desc: 'Aktifkan multiplier exp, luck, dan koin untuk seluruh member di grup ini', usage: 'on [multiplier]/off', ownerOnly: true, groupOnly: true, noLimit: true,
        async execute({ sock, m, args }) {
            const action = args[0]?.toLowerCase();
            if (!['on', 'off'].includes(action)) return m.reply('❌ Gunakan "on [multiplier]" atau "off"!\nContoh: .adminabuse on 4');
            
            if (action === 'on') {
                let multiplier = parseInt(args[1]) || 2;
                if (multiplier < 2) multiplier = 2;
                
                Settings.set('adminabuse_' + m.chat, String(multiplier));
                await m.reply(`🔥 *ADMIN ABUSE GRUP AKTIF (x${formatNumber(multiplier)})!* 🔥\n\nSeluruh member di grup ini sekarang mendapatkan buff:\n✨ x${formatNumber(multiplier)} EXP\n🍀 x${formatNumber(multiplier)} Luck\n💰 Multiplier hadiah x${formatNumber(multiplier)} dari seluruh aktivitas!`);
            } else {
                Settings.set('adminabuse_' + m.chat, 'false');
                await m.reply(`✅ *ADMIN ABUSE NONAKTIF*\n\nBuff admin abuse untuk grup ini telah dicabut.`);
            }
        }
    },
    {
        name: 'mute', category: 'owner', desc: 'Mute/unmute bot di grup ini', usage: 'on/off', ownerOnly: true, groupOnly: true, noLimit: true,
        async execute({ sock, m, args }) {
            const action = args[0]?.toLowerCase();
            if (!['on', 'off'].includes(action)) return m.reply('❌ Gunakan "on" atau "off"!\nContoh: .mute on');
            
            if (action === 'on') {
                Settings.set(`mute_${m.chat}`, 'true');
                await m.reply('🤫 *Bot Muted!*\n\nBot sekarang dinonaktifkan di grup ini dan tidak akan merespon perintah apapun kecuali dari Owner.');
            } else {
                Settings.set(`mute_${m.chat}`, 'false');
                await m.reply('🔊 *Bot Unmuted!*\n\nBot kembali aktif dan siap melayani di grup ini.');
            }
        }
    },
    {
        name: 'togglegame', aliases: ['togglegames'], category: 'owner', desc: 'Matikan/nyalakan fitur game secara global', usage: 'on/off', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const action = args[0]?.toLowerCase();
            if (action === 'on') {
                const { Settings } = require('../database');
                Settings.set('global_game_status', 'true');
                await m.reply('✅ *Fitur Game Global Diaktifkan!*\nSeluruh game kini bisa dimainkan kembali.');
            } else if (action === 'off') {
                const { Settings } = require('../database');
                Settings.set('global_game_status', 'false');
                await m.reply('❌ *Fitur Game Global Dinonaktifkan!*\nPlayer tidak akan bisa memainkan game apapun.');
            } else {
                const { Settings } = require('../database');
                const current = Settings.get('global_game_status') === 'false' ? 'OFF' : 'ON';
                return m.reply(`🔰 Status Global Game: *${current}*\n\nGunakan "on" atau "off"!\nContoh: .togglegame off`);
            }
        }
    },
    {
        name: 'togglejudi', category: 'owner', desc: 'Matikan/nyalakan fitur judi secara global', usage: 'on/off', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const action = args[0]?.toLowerCase();
            if (action === 'on') {
                const { Settings } = require('../database');
                Settings.set('global_judi_status', 'true');
                await m.reply('✅ *Fitur Judi Global Diaktifkan!*\nSeluruh permainan judi kini bisa dimainkan kembali.');
            } else if (action === 'off') {
                const { Settings } = require('../database');
                Settings.set('global_judi_status', 'false');
                await m.reply('❌ *Fitur Judi Global Dinonaktifkan!*\nPlayer tidak akan bisa memainkan game kategori judi apapun.');
            } else {
                const { Settings } = require('../database');
                const current = Settings.get('global_judi_status') === 'false' ? 'OFF' : 'ON';
                return m.reply(`🔰 Status Global Judi: *${current}*\n\nGunakan "on" atau "off"!\nContoh: .togglejudi off`);
            }
        }
    },
    {
        name: 'addcode', category: 'owner', desc: 'Buat kode redeem RPG', usage: '<code> <koin> <balance> <limit> [max_uses]', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            if (args.length < 4) return m.reply('❌ Format: .addcode <code> <koin> <balance> <limit> [max_uses]\nContoh: .addcode MABAR 1000 50000 10 50');
            const code = args[0].toUpperCase();
            const coin = parseInt(args[1]) || 0;
            const balance = parseInt(args[2]) || 0;
            const limit = parseInt(args[3]) || 0;
            const maxUses = parseInt(args[4]) || 0;
            
            if (coin === 0 && balance === 0 && limit === 0) return m.reply('❌ Minimal salah satu hadiah harus lebih dari 0!');
            
            const { RedeemCodes } = require('../database');
            const existing = RedeemCodes.get(code);
            if (existing) return m.reply('❌ Kode tersebut sudah ada!');
            
            const res = RedeemCodes.create(code, coin, balance, limit, maxUses);
            await m.reply(`✅ *KODE DIBUAT*\n\n🎟️ Kode: *${res.code}*\n🎁 Hadiah:\n  🪙 ${coin} Koin\n  💵 Rp ${balance} Balance\n  🎫 ${limit} Limit\n👥 Limit Pengguna: ${maxUses > 0 ? maxUses : 'Unlimited'}\n⏳ Expired: 7 Hari dari sekarang`);
        }
    },
    {
        name: 'delcode', category: 'owner', desc: 'Hapus kode redeem', usage: '<code>', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            if (!args[0]) return m.reply('❌ Masukkan kodenya!');
            const { RedeemCodes } = require('../database');
            RedeemCodes.delete(args[0]);
            await m.reply(`✅ Kode *${args[0].toUpperCase()}* berhasil dihapus.`);
        }
    },
    {
        name: 'listcodes', category: 'owner', desc: 'Lihat daftar kode redeem', ownerOnly: true, noLimit: true,
        async execute({ m }) {
            const { RedeemCodes } = require('../database');
            const codes = RedeemCodes.list();
            if (codes.length === 0) return m.reply('Belum ada kode redeem yang dibuat.');
            
            let txt = `🎟️ *DAFTAR KODE REDEEM*\n\n`;
            for (const c of codes) {
                const sisa = c.max_uses > 0 ? `${c.current_uses}/${c.max_uses}` : `${c.current_uses}/∞`;
                const expired = new Date(c.expires_at).getTime() < Date.now() ? '(EXPIRED)' : '';
                txt += `🔹 *${c.code}* ${expired}\n🎁 Hadiah: 🪙 ${c.r_coin} | 💵 ${c.r_balance} | 🎫 ${c.r_limit}\n👥 Digunakan: ${sisa}\n\n`;
            }
            await m.reply(txt.trim());
        }
    },
    {
        name: 'giveitem', aliases: ['gi', 'giveequip'], category: 'owner', desc: 'Berikan equipment apapun ke user', usage: '(@tag/nomor) <type> <rarity> <grade> | raid <bossId> <type> <grade>', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const { createCustomItem, createSpecificRaidItem, ITEM_TYPES, RARITIES, GRADES } = require('../lib/rpg');
            
            let jid = null;
            let itemArgs = [];

            // 1. Detect JID and separate item arguments
            if (m.mentionedJid?.[0]) {
                jid = m.mentionedJid[0];
                // Remove the mention from args (usually first or specific index)
                itemArgs = args.filter(a => !a.startsWith('@'));
            } else if (m.quoted?.sender) {
                jid = m.quoted.sender;
                itemArgs = args;
            } else if (args[0] && (/^\d+$/.test(args[0]) || args[0].includes('@'))) {
                jid = parseJid(args[0]);
                itemArgs = args.slice(1);
            }

            if (!jid) return m.reply('❌ Tag user, reply pesan, atau masukkan nomor!\nContoh: .giveitem @user weapon Mythic SSS+');
            if (itemArgs.length < 3) return m.reply(`❌ Argumen kurang!\n\n📌 *Biasa:* .giveitem @user <type> <rarity> <grade>\n📌 *Raid:* .giveitem @user raid <bossId> <type> <grade>\n\n*Type:* ${ITEM_TYPES.join(', ')}`);

            let item = null;
            const isRaid = itemArgs[0].toLowerCase() === 'raid';

            if (isRaid) {
                const bossId = parseInt(itemArgs[1]);
                const type = itemArgs[2]?.toLowerCase();
                const grade = itemArgs[3]?.toUpperCase();
                
                if (!bossId || !type || !grade) return m.reply('❌ Format Raid salah!\nContoh: .giveitem @user raid 3 weapon SSS+');
                if (!ITEM_TYPES.includes(type)) return m.reply(`❌ Type tidak valid: *${type}*\nGunkan: ${ITEM_TYPES.join(', ')}`);
                
                item = createSpecificRaidItem(bossId, type, grade);
            } else {
                const type = itemArgs[0]?.toLowerCase();
                const rarity = itemArgs[1];
                const grade = itemArgs[2]?.toUpperCase();
                
                if (!ITEM_TYPES.includes(type)) return m.reply(`❌ Type tidak valid: *${type}*\nGunkan: ${ITEM_TYPES.join(', ')}`);
                
                // Validate rarity
                const foundRarity = RARITIES.find(r => r.name.toLowerCase() === rarity.toLowerCase());
                if (!foundRarity) return m.reply(`❌ Rarity tidak valid: *${rarity}*\nGunkan: ${RARITIES.map(r => r.name).join(', ')}`);
                
                // Validate grade
                const foundGrade = GRADES.find(g => g.name.toLowerCase() === grade.toLowerCase());
                if (!foundGrade) return m.reply(`❌ Grade tidak valid: *${grade}*\nGunkan: ${GRADES.map(g => g.name).join(', ')}`);

                item = createCustomItem(type, rarity, grade);
            }

            if (!item) return m.reply('❌ Gagal membuat item. Pastikan semua parameter benar!');

            RPG.addInventory(jid, item.type, JSON.stringify(item));
            await m.reply(`✅ *ITEM BERHASIL DIBERIKAN!* 🎁\n\n👤 Penerima: @${jid.split('@')[0]}\n📦 Item: ${item.name}\n✨ Rarity: ${item.rarity}\n🏅 Grade: ${item.grade}\n📊 Stats: P:${item.stats.power} D:${item.stats.defense} L:${item.stats.luck}\n\n_Item sudah dimasukkan ke inventory (.inv)_`, { mentions: [jid] });
        }
    },
    {
        name: 'giveset', aliases: ['gs'], category: 'rpg', desc: 'Berikan 1 set equipment boss ke user', usage: '(@tag/nomor) <bossId> <grade>', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const { createSpecificRaidItem, ITEM_TYPES } = require('../lib/rpg');
            const jid = resolveJid(m, args, 0);
            const bossId = parseInt(m.quoted?.sender ? args[0] : args[1]);
            const grade = (m.quoted?.sender ? args[1] : args[2])?.toUpperCase() || 'S';

            if (!jid || !bossId) return m.reply('❌ Format: .giveset @tag <bossId> <grade>\nContoh: .giveset @user 123 SSS+');
            
            let count = 0;
            for (const type of ITEM_TYPES) {
                const item = createSpecificRaidItem(bossId, type, grade);
                if (item) {
                    RPG.addInventory(jid, item.type, JSON.stringify(item));
                    count++;
                }
            }
            
            await m.reply(`✅ *SET BERHASIL DIBERIKAN!* 🎁\n\n👤 Penerima: @${jid.split('@')[0]}\n👾 Boss ID: ${bossId}\n🏅 Grade: ${grade}\n📦 Total: ${count} item (Full Set)\n\n_Cek di .inv_`, { mentions: [jid] });
        }
    },
    {
        name: 'resetbal', aliases: ['resetbalance'], category: 'rpg', desc: 'Reset balance user menjadi 0', usage: '(@tag)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = resolveJid(m, args, 0);
            if (!jid) return m.reply('❌ Tag user atau reply pesan!');
            Users.setBalance(jid, 0);
            await m.reply(`✅ Balance @${jid.split('@')[0]} telah di-reset menjadi Rp 0.`, { mentions: [jid] });
        }
    },
    {
        name: 'resetcoin', aliases: ['resetcoins'], category: 'rpg', desc: 'Reset koin RPG user menjadi 0', usage: '(@tag)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = resolveJid(m, args, 0);
            if (!jid) return m.reply('❌ Tag user atau reply pesan!');
            RPG.setCoin(jid, 0);
            await m.reply(`✅ Koin RPG @${jid.split('@')[0]} telah di-reset menjadi 🪙 0.`, { mentions: [jid] });
        }
    },
    {
        name: 'resetallbal', category: 'rpg', desc: 'Reset SEMUA balance user menjadi 0', ownerOnly: true, noLimit: true,
        async execute({ m }) {
            const { run } = require('../database');
            run('UPDATE users SET balance = 0');
            await m.reply('⚠️ *DATABASE RESET:* Semua balance user telah di-reset menjadi Rp 0!');
        }
    },
    {
        name: 'resetallcoin', category: 'rpg', desc: 'Reset SEMUA koin RPG user menjadi 0', ownerOnly: true, noLimit: true,
        async execute({ m }) {
            const { run } = require('../database');
            run('UPDATE rpg_users SET rpg_coin = 0');
            await m.reply('⚠️ *DATABASE RESET:* Semua koin RPG user telah di-reset menjadi 🪙 0!');
        }
    },
    {
        name: 'addlevel', aliases: ['levelup'], category: 'rpg', desc: 'Tambah level RPG user', usage: '(@tag/nomor) <jumlah>', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = resolveJid(m, args, 0);
            const amount = parseInt(m.quoted?.sender ? args[0] : args[1]) || 1;
            if (!jid) return m.reply('❌ Format: .addlevel @tag 10');
            Users.getOrCreate(jid);
            Users.addLevel(jid, amount);
            await m.reply(`✅ Berhasil menambah *${amount} level* untuk @${jid.split('@')[0]}`, { mentions: [jid] });
        }
    },
    {
        name: 'setlevelrpg', aliases: ['slr'], category: 'rpg', desc: 'Set level RPG user', usage: '(@tag/nomor) <level>', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = resolveJid(m, args, 0);
            const level = parseInt(m.quoted?.sender ? args[0] : args[1]) || 1;
            if (!jid) return m.reply('❌ Format: .setlevelrpg @tag 100');
            const { RPG } = require('../database');
            RPG.setLevel(jid, level);
            await m.reply(`✅ Level RPG @${jid.split('@')[0]} diatur ke *${level}*`, { mentions: [jid] });
        }
    },
    {
        name: 'resetlevel', category: 'rpg', desc: 'Reset level RPG user ke 1', usage: '(@tag/nomor)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = resolveJid(m, args, 0);
            if (!jid) return m.reply('❌ Tag user!');
            const { RPG } = require('../database');
            RPG.setLevel(jid, 1);
            await m.reply(`✅ Level RPG @${jid.split('@')[0]} telah direset ke 1`, { mentions: [jid] });
        }
    },
    {
        name: 'ban', category: 'owner', desc: 'Ban user dari bot', usage: '(@tag)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = resolveJid(m, args, 0);
            if (!jid) return m.reply('❌ Tag user!');
            run('UPDATE users SET is_banned = 1 WHERE jid = ?', [jid]);
            await m.reply(`✅ User @${jid.split('@')[0]} telah di-ban.`, { mentions: [jid] });
        }
    },
    {
        name: 'unban', category: 'owner', desc: 'Buka ban user', usage: '(@tag)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = resolveJid(m, args, 0);
            if (!jid) return m.reply('❌ Tag user!');
            run('UPDATE users SET is_banned = 0 WHERE jid = ?', [jid]);
            await m.reply(`✅ User @${jid.split('@')[0]} telah di-unban.`, { mentions: [jid] });
        }
    },
    {
        name: 'jail', category: 'owner', desc: 'Masukkan user ke penjara (mencegah command)', usage: '(@tag) <menit>', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = resolveJid(m, args, 0);
            const mins = parseInt(m.quoted?.sender ? args[0] : args[1]) || 60;
            if (!jid) return m.reply('❌ Tag user!');
            Users.setJail(jid, mins);
            await m.reply(`✅ User @${jid.split('@')[0]} dimasukkan ke penjara selama ${mins} menit.`, { mentions: [jid] });
        }
    },
    {
        name: 'unjail', category: 'owner', desc: 'Keluarkan user dari penjara', usage: '(@tag)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = resolveJid(m, args, 0);
            if (!jid) return m.reply('❌ Tag user!');
            Users.setJail(jid, 0);
            await m.reply(`✅ User @${jid.split('@')[0]} telah dikeluarkan dari penjara.`, { mentions: [jid] });
        }
    },
    {
        name: 'checkuser', aliases: ['statususer'], category: 'owner', desc: 'Cek status lengkap user', usage: '(@tag)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = resolveJid(m, args, 0);
            if (!jid) return m.reply('❌ Tag user!');
            const user = Users.get(jid);
            if (!user) return m.reply('❌ User tidak ditemukan di database.');
            
            const isJailed = Users.isJailed(jid);
            const jailTime = Users.getJailTimeLeft(jid);
            
            let text = `👤 *USER STATUS:* @${jid.split('@')[0]}\n\n`;
            text += `🏷️ Nama: ${user.name}\n`;
            text += `🎖️ Role: ${user.role.toUpperCase()}\n`;
            text += `📊 Level: ${user.level} | EXP: ${user.exp}\n`;
            text += `💰 Balance: Rp ${formatNumber(user.balance)}\n`;
            text += `🪙 Koin RPG: ${formatNumber(RPG.getCoin(jid))}\n`;
            text += `🔋 Limit: ${user.limit_count}\n`;
            text += `🚫 Banned: ${user.is_banned ? 'YA 🔴' : 'TIDAK 🟢'}\n`;
            text += `🔒 Jailed: ${isJailed ? `YA (${jailTime}m sisa) 🟠` : 'TIDAK 🟢'}\n`;
            text += `📅 Terdaftar: ${user.created_at}`;
            
            await m.reply(text, { mentions: [jid] });
        }
    },
    {
        name: 'checkinv', category: 'owner', desc: 'Cek inventory member', usage: '(@tag)', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = resolveJid(m, args, 0);
            if (!jid) return m.reply('❌ Tag user!');
            const { RPG } = require('../database');
            const items = RPG.getInventory(jid);
            if (!items.length) return m.reply('🎒 Tas member ini kosong.');
            let text = `🎒 *INVENTORY: @${jid.split('@')[0]}*\n\n`;
            items.forEach((row) => {
                try {
                    const item = JSON.parse(row.item_data);
                    text += `🆔 [${row.id}] ${item.name} (${item.type}) x${row.amount}\n`;
                } catch(e) {}
            });
            await m.reply(text, { mentions: [jid] });
        }
    },
    {
        name: 'delitem', category: 'owner', desc: 'Hapus item member', usage: '(@tag) <id_inv>', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = resolveJid(m, args, 0);
            const id = parseInt(m.quoted?.sender ? args[0] : args[1]);
            if (!jid || isNaN(id)) return m.reply('❌ Format salah! Contoh: .delitem @tag 5');
            const { RPG } = require('../database');
            const itemRow = RPG.getInventoryItem(id);
            if (!itemRow || itemRow.jid !== jid) {
                return m.reply('❌ Item tidak ditemukan di inventory member ini!');
            }
            RPG.removeInventory(id, itemRow.amount);
            await m.reply(`✅ Item ID ${id} berhasil dihapus dari inventory @${jid.split('@')[0]}.`, { mentions: [jid] });
        }
    },
    {
        name: 'setrolerpg', category: 'owner', desc: 'Set role RPG user', usage: '(@tag) <role>', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = resolveJid(m, args, 0);
            const role = (m.quoted?.sender ? args[0] : args[1]);
            if (!jid || !role) return m.reply('❌ Format: .setrolerpg @tag Warrior');
            const { RPG } = require('../database');
            RPG.setRole(jid, role.charAt(0).toUpperCase() + role.slice(1));
            await m.reply(`✅ Role RPG @${jid.split('@')[0]} diatur ke *${role}*`, { mentions: [jid] });
        }
    },
    {
        name: 'addskillrpg', category: 'owner', desc: 'Tambahkan unique skill ke user', usage: '(@tag) <skill>', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = resolveJid(m, args, 0);
            let skill = (m.quoted?.sender ? args.slice(0) : args.slice(1)).join(' ');
            if (!jid || !skill) return m.reply('❌ Format: .addskillrpg @tag Vampiric');
            const { RPG } = require('../database');
            const ok = RPG.addUniqueSkill(jid, skill);
            if (ok) {
                await m.reply(`✅ Unique Skill *${skill}* berhasil ditambahkan ke @${jid.split('@')[0]}`, { mentions: [jid] });
            } else {
                await m.reply(`❌ @${jid.split('@')[0]} sudah memiliki skill tersebut!`, { mentions: [jid] });
            }
        }
    },
    {
        name: 'removeskillrpg', category: 'owner', desc: 'Hapus unique skill dari user', usage: '(@tag) <skill>', ownerOnly: true, noLimit: true,
        async execute({ m, args }) {
            const jid = resolveJid(m, args, 0);
            let skill = (m.quoted?.sender ? args.slice(0) : args.slice(1)).join(' ');
            if (!jid || !skill) return m.reply('❌ Format: .removeskillrpg @tag Vampiric');
            const { RPG } = require('../database');
            const ok = RPG.removeUniqueSkill(jid, skill);
            if (ok) {
                await m.reply(`✅ Unique Skill *${skill}* berhasil dihapus dari @${jid.split('@')[0]}`, { mentions: [jid] });
            } else {
                await m.reply(`❌ @${jid.split('@')[0]} tidak memiliki skill tersebut!`, { mentions: [jid] });
            }
        }
    }
];
