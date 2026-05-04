const config = require('../config');
const { Users, Transactions, CommandLogs, AFK, RPG } = require('../database');
const { calculateTotalStats, ITEM_TYPES } = require('../lib/rpg');
const { getTime, getDate, getDay, getGreeting, runtime, formatNumber, isOwner } = require('../lib/functions');
const { getCommands, getCommandCount } = require('../lib/handler');

const startTime = Date.now();

module.exports = [
    {
        name: 'menu',
        aliases: ['help', 'h'],
        category: 'bot',
        desc: 'Menampilkan menu bot',
        noLimit: true,
        async execute({ sock, m, prefix }) {
            const user = Users.getOrCreate(m.sender, m.pushName);
            const isPrem = Users.isPremium(m.sender) || isOwner(m.sender);
            const totalCmd = getCommandCount();
            const cmds = getCommands();
            const categories = {};
            for (const cmd of cmds) {
                const cat = cmd.category || 'other';
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(cmd);
            }

            const catNames = {
                bot: '𝙱𝙾𝚃 𝙼𝙴𝙽𝚄', group: '𝙶𝚁𝙾𝚄𝙿 𝙼𝙴𝙽𝚄', search: '𝚂𝙴𝙰𝚁𝙲𝙷 𝙼𝙴𝙽𝚄',
                download: '𝙳𝙾𝚆𝙽𝙻𝙾𝙰𝙳 𝙼𝙴𝙽𝚄', quotes: '𝚀𝚄𝙾𝚃𝙴𝚂 𝙼𝙴𝙽𝚄',
                tools: '𝚃𝙾𝙾𝙻𝚂 𝙼𝙴𝙽𝚄', ai: '𝙰𝙸 𝙼𝙴𝙽𝚄', anime: '𝙰𝙽𝙸𝙼𝙴 𝙼𝙴𝙽𝚄',
                games: '𝙶𝙰𝙼𝙴 𝙼𝙴𝙽𝚄', panel: '𝙿𝙰𝙽𝙴𝙻 𝙼𝙴𝙽𝚄', fun: '𝙵𝚄𝙽 𝙼𝙴𝙽𝚄',
                social: '𝚂𝙾𝙲𝙸𝙰𝙻 𝙼𝙴𝙽𝚄', utility: '𝚄𝚃𝙸𝙻𝙸𝚃𝚈 𝙼𝙴𝙽𝚄',
                random: '𝚁𝙰𝙽𝙳𝙾𝙼 𝙼𝙴𝙽𝚄', stalker: '𝚂𝚃𝙰𝙻𝙺𝙴𝚁 𝙼𝙴𝙽𝚄',
                owner: '𝙾𝚆𝙽𝙴𝚁 𝙼𝙴𝙽𝚄', other: '𝙾𝚃𝙷𝙴𝚁',
            };



            let text = `╔═══ ❖ 𝚄𝚂𝙴𝚁 𝙸𝙽𝙵𝙾 ❖ ═══╗\n`;
            text += `║ 👤 𝙽𝚊𝚖𝚊     : ${m.pushName}\n`;
            text += `║ 🆔 𝙸𝙳       : @${m.sender.split('@')[0]}\n`;
            text += `║ 💎 𝚄𝚜𝚎𝚛    : ${isPrem ? '𝙿𝚁𝙴𝙼𝙸𝚄𝙼' : '𝙵𝚁𝙴𝙴'}\n`;
            text += `║ 📉 𝙻𝚒𝚖𝚒𝚝   : ${formatNumber(user.limit_count)}\n`;
            text += `║ 💰 𝚄𝚊𝚗𝚐    : ${formatNumber(user.balance)}\n`;
            text += `╚═══════════════════════╝\n\n`;

            text += `╔═══ ❖ 𝙱𝙾𝚃 𝙸𝙽𝙵𝙾 ❖ ═══╗\n`;
            text += `║ 🤖 𝙽𝚊𝚖𝚊       : ${config.bot.name}\n`;
            text += `║ ⚡ 𝙿𝚘𝚠𝚎𝚛𝚎𝚍    : @${sock.user?.id?.split(':')[0] || '0'}\n`;
            text += `║ 👑 𝙾𝚠𝚗𝚎𝚛      : ${config.bot.ownerName}\n`;
            text += `║ 🔧 𝙼𝚘𝚍𝚎       : ${config.bot.mode.charAt(0).toUpperCase() + config.bot.mode.slice(1)}\n`;
            text += `║ ☕ 𝙿𝚛𝚎𝚏𝚒𝚡     :  *${prefix}*\n`;
            text += `║ 🌟 𝙵𝚒𝚝𝚞𝚛 𝙿𝚛𝚎𝚖 : 🔸\n`;
            text += `╚═══════════════════════╝\n\n`;

            text += `╔═══ ❖ 𝙰𝙱𝙾𝚄𝚃 ❖ ═══╗\n`;
            text += `║ 📅 𝚃𝚊𝚗𝚐𝚐𝚊𝚕 : ${getDate()}\n`;
            text += `║ 📆 𝙷𝚊𝚛𝚒     : ${getDay()}\n`;
            text += `║ ⏰ 𝙹𝚊𝚖      : ${getTime()} 𝚆𝙸𝙱\n`;
            text += `╚═══════════════════╝\n`;

            const order = ['bot','group','search','download','quotes','tools','ai','anime','games','social','utility','panel','fun','random','stalker','owner'];
            for (const cat of order) {
                if (!categories[cat] || categories[cat].length === 0) continue;
                if (cat === 'owner' && !isOwner(m.sender)) continue;
                text += `╔═══ ❖ ${catNames[cat] || cat.toUpperCase()} ❖ ═══╗\n`;
                for (const cmd of categories[cat]) {
                    const prem = cmd.premiumOnly ? ' 🔸' : '';
                    const usage = cmd.usage ? ` ${cmd.usage}` : '';
                    text += `║ ♧ ${prefix}${cmd.name}${usage}${prem}\n`;
                }
                text += `╚═══════════════════════╝\n`;
            }
            
            const fs = require('fs');
            const path = require('path');
            const imagePath = path.join(__dirname, '..', 'menu.jpg');
            
            try {
                if (fs.existsSync(imagePath)) {
                    await sock.sendMessage(m.chat, { image: fs.readFileSync(imagePath), caption: text, mentions: [m.sender] }, { quoted: m.raw });
                } else {
                    // Fallback to text if menu.jpg is not found
                    await sock.sendMessage(m.chat, { text, mentions: [m.sender] }, { quoted: m.raw });
                }
            } catch (e) {
                // If there's an error reading the image, send as text to avoid crashing
                await sock.sendMessage(m.chat, { text, mentions: [m.sender] }, { quoted: m.raw });
            }
        }
    },
    {
        name: 'profile',
        category: 'bot', desc: 'Lihat profil kamu', noLimit: true,
        async execute({ m }) {
            const user = Users.getOrCreate(m.sender, m.pushName);
            const isPrem = Users.isPremium(m.sender) || isOwner(m.sender);
            const stats = calculateTotalStats(m.sender);
            const userRpg = RPG.getUser(m.sender);
            
            let text = `╭───「 👤 𝙿𝚁𝙾𝙵𝙸𝙻𝙴 」\n`;
            text += `│ 📛 Nama     : ${m.pushName}\n`;
            text += `│ 🆔 ID       : ${m.sender.split('@')[0]}\n`;
            text += `│ 💎 Status   : ${isPrem ? 'PREMIUM' : 'FREE'}\n`;
            text += `│ 📉 Limit    : ${formatNumber(user.limit_count)}\n`;
            text += `│ 💰 Balance  : ${formatNumber(user.balance)}\n`;
            text += `│ 📊 Commands : ${formatNumber(user.total_commands)}\n`;
            if (isPrem && user.premium_expire) {
                text += `│ ⏰ Expire   : ${user.premium_expire.split('T')[0]}\n`;
            }
            text += `│ 📅 Joined   : ${user.created_at?.split('T')[0] || '-'}\n`;
            text += `╰──────────────\n\n`;
            
            text += `╭───「 ⚔️ 𝚁𝙿𝙶 𝚂𝚃𝙰𝚃𝚂 」\n`;
            text += `│ 🪙 Koin  : ${formatNumber(RPG.getCoin(m.sender))}\n`;
            text += `│ 🗡️ Power : ${formatNumber(stats.power)}\n`;
            text += `│ 🛡️ Def   : ${formatNumber(stats.defense)}\n`;
            text += `│ 🍀 Luck  : ${formatNumber(stats.luck)}\n`;
            text += `╰──────────────\n\n`;
            
            text += `╭───「 🛡️ 𝙴𝚀𝚄𝙸𝙿𝙼𝙴𝙽𝚃 」\n`;
            for (const slot of ITEM_TYPES) {
                let itemName = 'Kosong';
                if (userRpg[slot]) {
                    try {
                        const item = JSON.parse(userRpg[slot]);
                        itemName = `${item.name} ${item.grade}`;
                    } catch(e) {}
                }
                const icon = slot === 'weapon' ? '🗡️' : slot === 'helmet' ? '🪖' : slot === 'armor' ? '🦺' : slot === 'glove' ? '🧤' : slot === 'legging' ? '👖' : '🥾';
                text += `│ ${icon} ${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${itemName}\n`;
            }
            text += `╰──────────────`;
            await m.reply(text);
        }
    },
    {
        name: 'claim',
        category: 'bot', desc: 'Klaim hadiah harian', noLimit: true,
        async execute({ m }) {
            Users.getOrCreate(m.sender, m.pushName);
            if (!Users.canClaim(m.sender)) return m.reply('❌ Kamu sudah claim hari ini! Coba lagi besok.');
            Users.claim(m.sender);
            await m.reply(`✅ *Daily Claim Berhasil!*\n\n💰 +${formatNumber(config.dailyClaim.balance)} Balance\n📉 +${config.dailyClaim.limit} Limit\n\n_Claim lagi besok ya!_`);
        }
    },
    {
        name: 'ping',
        category: 'bot', desc: 'Cek respon bot', noLimit: true,
        async execute({ m }) {
            const start = Date.now();
            await m.reply(`🏓 Pong!\n⚡ Speed: ${Date.now() - start}ms`);
        }
    },
    {
        name: 'myid',
        aliases: ['siapasaya', 'whoami'],
        category: 'bot', desc: 'Lihat JID/nomor kamu', noLimit: true,
        async execute({ m }) {
            const { getNumberFromJid, isOwner } = require('../lib/functions');
            const number = getNumberFromJid(m.sender);
            const ownerCheck = isOwner(m.sender);
            let text = `🆔 *INFO JID KAMU*\n\n`;
            text += `📞 JID Penuh : \`${m.sender}\`\n`;
            text += `🔢 Nomor     : \`${number}\`\n`;
            text += `👑 Owner Bot : ${ownerCheck ? '✅ Ya' : '❌ Bukan'}\n\n`;
            text += `_Nomor di atas harus sama persis dengan OWNER_NUMBER di Railway._`;
            await m.reply(text);
        }
    },
    {
        name: 'speed',
        category: 'bot', desc: 'Cek kecepatan bot', noLimit: true,
        async execute({ m }) {
            const start = Date.now();
            await m.reply(`⚡ *Speed Test*\n\n🔹 Response: ${Date.now() - start}ms\n🔹 Uptime: ${runtime((Date.now() - startTime) / 1000)}`);
        }
    },
    {
        name: 'runtime',
        category: 'bot', desc: 'Cek uptime bot', noLimit: true,
        async execute({ m }) {
            await m.reply(`⏰ *Bot Uptime*\n\n🔹 ${runtime((Date.now() - startTime) / 1000)}`);
        }
    },
    {
        name: 'totalfitur',
        aliases: ['totalcmd'],
        category: 'bot', desc: 'Lihat total fitur', noLimit: true,
        async execute({ m }) {
            await m.reply(`📊 Total fitur: *${getCommandCount()}* commands`);
        }
    },

    {
        name: 'buy',
        category: 'bot', desc: 'Beli item dengan balance', usage: '[item]',
        async execute({ m, args }) {
            if (!args[0]) {
                let text = `🛒 *SHOP*\n\n`;
                text += `*💎 Premium (Bayar ke Owner):*\n`;
                text += `◇ .buyprem 7  — Rp ${formatNumber(config.prices.premium_7d)} (7 hari)\n`;
                text += `◇ .buyprem 14 — Rp ${formatNumber(config.prices.premium_14d)} (14 hari)\n`;
                text += `◇ .buyprem 30 — Rp ${formatNumber(config.prices.premium_30d)} (30 hari)\n\n`;
                text += `*📉 Limit (Pakai Balance):*\n`;
                text += `◇ .buy limit10  — ${formatNumber(config.prices.limit_10)} balance (10 limit)\n`;
                text += `◇ .buy limit50  — ${formatNumber(config.prices.limit_50)} balance (50 limit)\n`;
                text += `◇ .buy limit100 — ${formatNumber(config.prices.limit_100)} balance (100 limit)\n\n`;
                text += `_💡 Premium hanya bisa dibeli dengan uang asli ke owner. Ketik .buyprem untuk info cara bayar!_`;
                return m.reply(text);
            }
            const user = Users.getOrCreate(m.sender, m.pushName);
            const item = args[0].toLowerCase();

            // Blokir pembelian premium via balance
            if (item === 'premium') {
                return m.reply(
                    `❌ *Premium tidak bisa dibeli dengan balance!*\n\n` +
                    `💎 Premium hanya tersedia dengan pembayaran uang asli ke owner.\n\n` +
                    `📌 Ketik *.buyprem* untuk melihat harga dan cara pembayaran.`
                );
            }

            const items = {
                limit10:  { price: config.prices.limit_10,  action: () => { Users.addLimit(m.sender, 10);  }, msg: '📉 +10 Limit berhasil ditambahkan!' },
                limit50:  { price: config.prices.limit_50,  action: () => { Users.addLimit(m.sender, 50);  }, msg: '📉 +50 Limit berhasil ditambahkan!' },
                limit100: { price: config.prices.limit_100, action: () => { Users.addLimit(m.sender, 100); }, msg: '📉 +100 Limit berhasil ditambahkan!' },
            };
            if (!items[item]) return m.reply('❌ Item tidak ditemukan! Ketik *.buy* untuk lihat daftar.');
            if (user.balance < items[item].price) return m.reply(`❌ Balance tidak cukup!\n💰 Butuh: ${formatNumber(items[item].price)}\n💳 Kamu punya: ${formatNumber(user.balance)}`);
            Users.addBalance(m.sender, -items[item].price);
            items[item].action();
            Transactions.create(m.sender, 'buy', -items[item].price, `Beli ${item}`);
            await m.reply(`✅ ${items[item].msg}\n\n💰 Sisa balance: ${formatNumber(Users.get(m.sender)?.balance || 0)}`);
        }
    },
    {
        name: 'buyprem',
        aliases: ['belipremium', 'orderprem'],
        category: 'bot', desc: 'Info & cara beli Premium (uang asli)', noLimit: true,
        async execute({ m }) {
            const cfg = config;
            const ownerNums = cfg.bot.ownerNumber || [];
            const methods = cfg.payment?.methods?.filter(p => p.number && p.number !== '-') || [];

            let text = `💎 *BELI PREMIUM*\n\n`;
            text += `❗ *Premium hanya bisa dibeli dengan uang asli ke owner.*\n`;
            text += `Tidak bisa menggunakan balance bot.\n\n`;
            text += `📋 *Harga Premium:*\n`;
            text += `▸ 7 hari  → Rp ${formatNumber(cfg.prices.premium_7d)}\n`;
            text += `▸ 14 hari → Rp ${formatNumber(cfg.prices.premium_14d)}\n`;
            text += `▸ 30 hari → Rp ${formatNumber(cfg.prices.premium_30d)}\n\n`;
            text += `💳 *Metode Pembayaran:*\n`;
            if (methods.length) {
                methods.forEach(p => { text += `▸ ${p.name}: *${p.number}*\n`; });
            } else {
                text += `▸ Tanya langsung ke owner untuk info rekening.\n`;
            }
            text += `\n📞 *Hubungi Owner:*\n`;
            if (ownerNums.length) {
                ownerNums.forEach(num => { text += `▸ wa.me/${num}\n`; });
            } else {
                text += `▸ Tanya admin grup ini.\n`;
            }
            text += `\n📌 *Cara Order:*\n`;
            text += `1. Pilih durasi premium\n`;
            text += `2. Transfer ke salah satu rekening di atas\n`;
            text += `3. Screenshot bukti transfer\n`;
            text += `4. Kirim ke owner beserta nomor WA kamu\n`;
            text += `5. Owner akan aktifkan premium kamu ✅\n\n`;
            text += `_Benefit Premium: limit unlimited, akses fitur eksklusif (.rvo, dll)_ 🌟`;
            await m.reply(text);
        }
    },
    {
        name: 'transfer',
        aliases: ['tf'],
        category: 'bot', desc: 'Transfer balance', usage: '(@tag) (nominal)',
        async execute({ sock, m, args }) {
            const target = m.mentionedJid?.[0] || (args[0] ? args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net' : null);
            const amount = parseInt(args[1] || args[0]);
            if (!target || !amount || amount <= 0) return m.reply(`❌ Format: .transfer @tag nominal\nContoh: .transfer @user 1000`);
            if (target === m.sender) return m.reply('❌ Tidak bisa transfer ke diri sendiri!');
            Users.getOrCreate(target);
            const ok = Users.transfer(m.sender, target, amount);
            if (!ok) return m.reply('❌ Balance tidak cukup!');
            await m.reply(`✅ Berhasil transfer *${formatNumber(amount)}* balance ke @${target.split('@')[0]}`);
        }
    },
    {
        name: 'afk',
        category: 'bot', desc: 'Set status AFK', usage: '(alasan)', noLimit: true,
        async execute({ m, text }) {
            AFK.set(m.sender, text || '');
            await m.reply(`✅ AFK mode aktif${text ? `: ${text}` : ''}`);
        }
    },
    {
        name: 'request',
        aliases: ['req'],
        category: 'bot', desc: 'Kirim request ke owner', usage: '(pesan)',
        async execute({ sock, m, text, config: cfg }) {
            if (!text) return m.reply('❌ Masukkan pesan request!');
            for (const own of cfg.bot.ownerNumber) {
                await sock.sendMessage(own + '@s.whatsapp.net', {
                    text: `📩 *REQUEST*\n\n👤 Dari: ${m.pushName}\n🆔 ID: ${m.sender.split('@')[0]}\n\n💬 ${text}`
                });
            }
            await m.reply('✅ Request terkirim ke owner!');
        }
    },
    {
        name: 'donasi',
        category: 'bot', desc: 'Info donasi', noLimit: true,
        async execute({ m }) {
            await m.reply(`💝 *DONASI*\n\n🏦 DANA/OVO/GoPay:\n📞 ${config.bot.ownerNumber[0]}\n\nTerima kasih atas dukungannya! 🙏`);
        }
    },
];
