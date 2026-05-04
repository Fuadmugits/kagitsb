const { Users, GroupLevels, RPG } = require('../database');
const { formatNumber } = require('../lib/functions');
const { calculateTotalStats, generateItem, MONSTERS, ITEM_TYPES } = require('../lib/rpg');

module.exports = [
    {
        name: 'rank', aliases: ['level', 'lvl'], category: 'fun', desc: 'Cek level dan EXP kamu di grup ini',
        groupOnly: true,
        async execute({ sock, m, args }) {
            const jid = m.mentionedJid?.[0] || m.sender;
            const u = Users.get(jid);
            if (!u) return m.reply('❌ User tidak ditemukan di database.');
            
            // Get per-group leveling data
            const profile = GroupLevels.getProfile(jid, m.chat);
            if (!profile) return m.reply('❌ Data level tidak ditemukan.');

            const currentExp = profile.exp || 0;
            const currentLevel = profile.level || 1;
            const expNeeded = profile.expNeeded;
            const title = profile.title;
            const isMaxLevel = profile.isMaxLevel;
            const rank = GroupLevels.getRank(jid, m.chat);
            
            // Create a text-based progress bar
            const progress = isMaxLevel ? 100 : Math.floor((currentExp / expNeeded) * 100);
            const barLength = 20;
            const filledLength = Math.floor((progress / 100) * barLength);
            const emptyLength = barLength - filledLength;
            const progressBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
            
            const roleStr = u.role === 'premium' ? '💎 Premium' : u.role === 'owner' ? '👑 Owner' : '⚪ Free';
            
            let text = `╭───「 🌟 *RANK & LEVEL* 」───╮\n│\n`;
            text += `│ 👤 *Name:* ${u.name}\n`;
            text += `│ 🏷️ *Role:* ${roleStr}\n`;
            text += `│ 🏅 *Title:* ${title}\n`;
            text += `│ 📈 *Level:* ${currentLevel} / 100\n`;
            text += `│ 🏆 *Rank:* #${rank}\n`;
            if (isMaxLevel) {
                text += `│ ✨ *EXP:* MAX LEVEL! 🎊\n`;
            } else {
                text += `│ ✨ *EXP:* ${formatNumber(currentExp)} / ${formatNumber(expNeeded)}\n`;
            }
            text += `│\n`;
            text += `│ *Progress:* [${progress}%]\n`;
            text += `│ ${progressBar}\n`;
            text += `│\n`;
            text += `│ 💬 *Total Cmds:* ${formatNumber(u.total_commands)}\n`;
            text += `│ 💰 *Balance:* Rp ${formatNumber(u.balance)}\n`;
            text += `│\n`;
            text += `╰─── _Level khusus grup ini_ ───╯\n\n`;
            text += `_Kirim pesan untuk mendapatkan EXP!_\n`;
            text += `_⏳ Cooldown: 10 detik per pesan_`;
            
            try {
                // We'll use a public API to generate a nice rank card if possible
                const { fetchBuffer } = require('../lib/functions');
                const avatarUrl = await sock.profilePictureUrl(jid, 'image').catch(() => 'https://i.ibb.co/3Fh9Q6M/empty-profile.png');
                const apiUrl = `https://api.siputzx.my.id/api/canvas/rank?avatar=${encodeURIComponent(avatarUrl)}&username=${encodeURIComponent(u.name)}&level=${currentLevel}&currentExp=${currentExp}&requiredExp=${expNeeded}&rank=${rank}`;
                
                const buffer = await fetchBuffer(apiUrl);
                if (buffer) {
                    await sock.sendMessage(m.chat, { image: buffer, caption: text }, { quoted: m.raw });
                } else {
                    await m.reply(text);
                }
            } catch {
                // Fallback to text
                await m.reply(text);
            }
        }
    },
    {
        name: 'leaderboard', aliases: ['lb', 'top', 'grouplb', 'glb'], category: 'fun', desc: 'Lihat top level di grup ini',
        groupOnly: true,
        async execute({ sock, m }) {
            const topUsers = GroupLevels.getLeaderboard(m.chat, 10);
            if (!topUsers.length) return m.reply('❌ Belum ada data level di grup ini.');
            
            let text = `╭───「 🏆 *GROUP LEADERBOARD* 」───╮\n│\n`;
            
            const medals = ['🥇', '🥈', '🥉', '🎗️', '🎗️', '🎗️', '🎗️', '🎗️', '🎗️', '🎗️'];
            
            topUsers.forEach((u, i) => {
                const title = GroupLevels.getTitle(u.level || 1);
                const name = u.name || 'Unknown';
                text += `│ ${medals[i] || '🎗️'} *${name}*\n`;
                text += `│    ${title} • Level ${u.level || 1} (${formatNumber(u.exp || 0)} EXP)\n│\n`;
            });
            
            text += `╰─── _Ranking khusus grup ini_ ───╯\n\n`;
            text += `_Kirim pesan untuk mendapatkan EXP dan naik level!_`;
            
            await m.reply(text);
        }
    },
    {
        name: 'topbalance', aliases: ['topbal', 'topkaya', 'richest'], category: 'fun', desc: 'Lihat top balance di grup ini',
        groupOnly: true,
        async execute({ sock, m }) {
            const groupMeta = await sock.groupMetadata(m.chat);
            const memberJids = groupMeta.participants.map(p => p.id);

            // Get balance for each group member
            const members = memberJids.map(jid => {
                const u = Users.get(jid);
                return u ? { jid, name: u.name || 'Unknown', balance: u.balance || 0 } : null;
            }).filter(Boolean).filter(u => u.balance > 0);

            members.sort((a, b) => b.balance - a.balance);
            const top = members.slice(0, 10);

            if (!top.length) return m.reply('❌ Belum ada member dengan balance di grup ini.');

            const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

            let text = `╭───「 💰 *TOP BALANCE GRUP* 」───╮\n│\n`;
            const mentions = [];

            top.forEach((u, i) => {
                text += `│ ${medals[i]} *${u.name}*\n`;
                text += `│    💰 Rp ${formatNumber(u.balance)}\n│\n`;
                mentions.push(u.jid);
            });

            text += `╰─── _Ranking balance grup ini_ ───╯\n\n`;
            text += `_Main game & daily claim untuk naikkan balance!_`;

            await sock.sendMessage(m.chat, { text, mentions }, { quoted: m.raw });
        }
    },
    {
        name: 'titlelist', aliases: ['titles', 'gelar'], category: 'fun', desc: 'Lihat daftar semua title level',
        async execute({ sock, m }) {
            let text = `╭───「 🏅 *DAFTAR TITLE* 」───╮\n│\n`;
            
            const titles = [
                { range: '1 - 4', title: '🌱 Newbie' },
                { range: '5 - 9', title: '🌿 Beginner' },
                { range: '10 - 14', title: '🍃 Apprentice' },
                { range: '15 - 19', title: '🌾 Trainee' },
                { range: '20 - 24', title: '⚡ Fighter' },
                { range: '25 - 29', title: '🔥 Warrior' },
                { range: '30 - 34', title: '⚔️ Knight' },
                { range: '35 - 39', title: '🛡️ Guardian' },
                { range: '40 - 44', title: '🏹 Ranger' },
                { range: '45 - 49', title: '🧙 Mage' },
                { range: '50 - 54', title: '💎 Elite' },
                { range: '55 - 59', title: '🌟 Master' },
                { range: '60 - 64', title: '👑 Grand Master' },
                { range: '65 - 69', title: '🔱 Champion' },
                { range: '70 - 74', title: '🐉 Dragon Slayer' },
                { range: '75 - 79', title: '⭐ Legendary' },
                { range: '80 - 84', title: '🌌 Mythical' },
                { range: '85 - 89', title: '🏆 Supreme' },
                { range: '90 - 94', title: '💫 Divine' },
                { range: '95 - 99', title: '🔮 Immortal' },
                { range: '100', title: '👑✨ Transcendent' },
            ];
            
            titles.forEach(t => {
                text += `│ Level ${t.range}\n`;
                text += `│ ➤ ${t.title}\n│\n`;
            });
            
            text += `╰─── _Max Level: 100_ ───╯`;
            
            await m.reply(text);
        }
    },
    {
        name: 'attack', category: 'games', desc: 'Serang monster untuk mendapatkan item', usage: '<monster>',
        async execute({ sock, m, args }) {
            const monsterName = args[0]?.toLowerCase();
            if (!monsterName || !MONSTERS[monsterName]) {
                return m.reply(`❌ Monster tidak ditemukan!\n\nDaftar Monster:\n` + Object.keys(MONSTERS).map(k => `- ${k} (Req Power: ${formatNumber(MONSTERS[k].powerReq)})`).join('\n'));
            }
            
            const monster = MONSTERS[monsterName];
            const stats = calculateTotalStats(m.sender);
            
            // Check cooldown (5 minutes)
            const userRpg = RPG.getUser(m.sender);
            if (userRpg.last_attack) {
                const last = new Date(userRpg.last_attack).getTime();
                if (Date.now() - last < 5 * 60 * 1000) {
                    const sisa = Math.ceil((5 * 60 * 1000 - (Date.now() - last)) / 1000);
                    return m.reply(`⏳ Kamu sedang istirahat. Tunggu ${sisa} detik lagi.`);
                }
            }
            
            RPG.updateCooldown(m.sender, 'attack');
            
            if (stats.power < monster.powerReq) {
                return m.reply(`💀 Kamu kalah melawan ${monster.name}!\n\n⚔️ Power Kamu: ${formatNumber(stats.power)}\n🐉 Power Monster: ${formatNumber(monster.powerReq)}\n\n_Lengkapi armor dan senjata yang lebih kuat!_`);
            }
            
            // Victory
            let reply = `🎉 Kamu berhasil mengalahkan *${monster.name}*!\n\n`;
            
            // Check drops
            if (Math.random() < monster.dropChance) {
                const dropType = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
                const item = generateItem(dropType);
                if (item) {
                    RPG.addInventory(m.sender, dropType, JSON.stringify(item), 1);
                    reply += `🎁 *DROP ITEM!*\n`;
                    reply += `🔹 Nama: ${item.name}\n`;
                    reply += `🔹 Rarity: ${item.rarity}\n`;
                    reply += `🔹 Grade: ${item.grade}\n`;
                    reply += `🔹 Power: +${formatNumber(item.stats.power)}\n`;
                    reply += `🔹 Def: +${formatNumber(item.stats.defense)}\n`;
                    reply += `🔹 Luck: +${formatNumber(item.stats.luck)}\n\n`;
                    reply += `_Cek inventory dengan .inv_`;
                }
            } else {
                reply += `😔 Sayang sekali, monster tidak menjatuhkan item apa-apa.`;
            }
            
            await m.reply(reply);
        }
    },
    {
        name: 'inventory', aliases: ['inv', 'tas'], category: 'games', desc: 'Lihat isi tas RPG kamu',
        async execute({ sock, m }) {
            const items = RPG.getInventory(m.sender);
            if (!items.length) return m.reply('🎒 Tas kamu kosong.');
            
            let text = `╭───「 🎒 *INVENTORY RPG* 」\n`;
            items.forEach((row) => {
                try {
                    const item = JSON.parse(row.item_data);
                    text += `│ 🆔 [${row.id}] ${item.name} (${item.grade})\n`;
                    text += `│    └ Rarity: ${item.rarity} | Pwr: ${item.stats.power} | Def: ${item.stats.defense}\n`;
                } catch(e) {}
            });
            text += `╰──────────────\n\n_Ketik .equip <id> untuk memakai item_`;
            await m.reply(text);
        }
    },
    {
        name: 'equip', category: 'games', desc: 'Pakai item dari tas', usage: '<id_item>',
        async execute({ sock, m, args }) {
            const id = parseInt(args[0]);
            if (isNaN(id)) return m.reply('❌ Masukkan ID item dari .inv');
            
            const itemRow = RPG.getInventoryItem(id);
            if (!itemRow || itemRow.jid !== m.sender || itemRow.amount < 1) {
                return m.reply('❌ Item tidak ditemukan di tas kamu!');
            }
            
            try {
                const itemData = JSON.parse(itemRow.item_data);
                
                // Get current equipped item to swap
                const userRpg = RPG.getUser(m.sender);
                const currentEquipped = userRpg[itemData.type];
                
                // Equip new
                RPG.updateEquip(m.sender, itemData.type, JSON.stringify(itemData));
                
                // Remove from inv
                RPG.removeInventory(id, 1);
                
                // Add old to inv if exists
                if (currentEquipped) {
                    RPG.addInventory(m.sender, itemData.type, currentEquipped, 1);
                }
                
                await m.reply(`✅ Berhasil memakai *${itemData.name}*!`);
            } catch (e) {
                await m.reply('❌ Gagal membaca data item.');
            }
        }
    },
    {
        name: 'mine', category: 'games', desc: 'Menambang batu & mineral',
        async execute({ sock, m }) {
            const userRpg = RPG.getUser(m.sender);
            if (userRpg.last_mine) {
                const last = new Date(userRpg.last_mine).getTime();
                if (Date.now() - last < 2 * 60 * 1000) { // 2 mins cooldown
                    const sisa = Math.ceil((2 * 60 * 1000 - (Date.now() - last)) / 1000);
                    return m.reply(`⏳ Stamina habis! Tunggu ${sisa} detik lagi.`);
                }
            }
            
            RPG.updateCooldown(m.sender, 'mine');
            
            const rand = Math.random();
            let reward = 0;
            let material = '';
            
            if (rand < 0.1) {
                reward = 5000;
                material = '💎 Diamond';
            } else if (rand < 0.3) {
                reward = 2000;
                material = '🟡 Gold';
            } else if (rand < 0.6) {
                reward = 1000;
                material = '⚪ Iron';
            } else {
                reward = 500;
                material = '🪨 Stone';
            }
            
            Users.addBalance(m.sender, reward);
            await m.reply(`⛏️ Kamu menambang dan mendapatkan *${material}*!\n💰 Balance bertambah: Rp ${formatNumber(reward)}`);
        }
    },
    {
        name: 'pvp', category: 'games', desc: 'Tantang player lain bertarung', usage: '@tag',
        async execute({ sock, m, args }) {
            const target = m.mentionedJid?.[0] || (args[0] ? args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net' : null);
            if (!target) return m.reply('❌ Tag orang yang ingin dilawan!\nContoh: .pvp @user');
            if (target === m.sender) return m.reply('❌ Tidak bisa melawan diri sendiri!');
            
            const userRpg = RPG.getUser(m.sender);
            if (userRpg.last_pvp) {
                const last = new Date(userRpg.last_pvp).getTime();
                if (Date.now() - last < 10 * 60 * 1000) { // 10 mins cooldown
                    const sisa = Math.ceil((10 * 60 * 1000 - (Date.now() - last)) / 60000);
                    return m.reply(`⏳ Kamu masih memulihkan luka. Tunggu ${sisa} menit lagi.`);
                }
            }
            
            RPG.updateCooldown(m.sender, 'pvp');
            
            const p1Stats = calculateTotalStats(m.sender);
            const p2Stats = calculateTotalStats(target);
            
            // RNG factor based on Luck
            const p1LuckRoll = Math.random() * (p1Stats.luck || 1);
            const p2LuckRoll = Math.random() * (p2Stats.luck || 1);
            
            const p1Score = p1Stats.power + (p1Stats.defense * 0.5) + p1LuckRoll;
            const p2Score = p2Stats.power + (p2Stats.defense * 0.5) + p2LuckRoll;
            
            let text = `⚔️ *PVP BATTLE* ⚔️\n\n`;
            text += `👤 *Kamu*: Power ${formatNumber(p1Stats.power)} | Def ${formatNumber(p1Stats.defense)}\n`;
            text += `🎯 *Musuh*: Power ${formatNumber(p2Stats.power)} | Def ${formatNumber(p2Stats.defense)}\n\n`;
            
            if (p1Score > p2Score) {
                const loot = Math.floor(Math.random() * 500) + 500;
                Users.addBalance(m.sender, loot);
                text += `🎉 *KAMU MENANG!* 🎉\nKamu merampas Rp ${formatNumber(loot)} dari arena!`;
            } else if (p2Score > p1Score) {
                text += `💀 *KAMU KALAH!* 💀\nKekuatanmu belum cukup untuk mengalahkan musuh!`;
            } else {
                text += `🤝 *SERI!* 🤝\nKalian sama-sama kuat!`;
            }
            
            await m.reply(text);
        }
    }
];
