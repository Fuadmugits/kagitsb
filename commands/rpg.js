const { Users, GroupLevels, RPG } = require('../database');
const { formatNumber, randomInt } = require('../lib/functions');
const { calculateTotalStats, generateItem, MONSTERS, ITEM_TYPES, RPG_SHOP } = require('../lib/rpg');

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
        name: 'attack', category: 'rpg', desc: 'Serang monster untuk mendapatkan item', usage: '<monster>',
        async execute({ sock, m, args }) {
            const monsterName = args[0]?.toLowerCase();
            if (!monsterName || !MONSTERS[monsterName]) {
                return m.reply(`❌ Monster tidak ditemukan!\n\nDaftar Monster:\n` + Object.keys(MONSTERS).map(k => `- ${k} (Req Power: ${formatNumber(MONSTERS[k].powerReq)})`).join('\n'));
            }
            
            const monster = MONSTERS[monsterName];
            const stats = calculateTotalStats(m.sender, m.chat);
            
            // Check cooldown (3.5 minutes)
            const userRpg = RPG.getUser(m.sender);
            if (userRpg.last_attack) {
                const last = new Date(userRpg.last_attack).getTime();
                if (Date.now() - last < 30 * 1000) {
                    const sisa = Math.ceil((30 * 1000 - (Date.now() - last)) / 1000);
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
                const item = generateItem(dropType, monster.class);
                if (item) {
                    RPG.addInventory(m.sender, dropType, JSON.stringify(item), 1);
                    reply += `🎁 *DROP ITEM (Masuk ke Tas)!*\n`;
                    reply += `🔹 Item: ${item.name} (${dropType})\n`;
                    reply += `🔹 Rarity: ${item.rarity}\n`;
                    reply += `🔹 Grade: ${item.grade}\n`;
                    reply += `📊 *Atribut Item Ini:*\n`;
                    reply += `   🗡️ Power: +${formatNumber(item.stats.power)}\n`;
                    reply += `   🛡️ Def: +${formatNumber(item.stats.defense)}\n`;
                    reply += `   🍀 Luck: +${formatNumber(item.stats.luck)}\n`;
                    reply += `\n_Ini bukan drop status permanen! Ini adalah status dari item/armor yang baru kamu dapat. Ketik .inv untuk melihat tas dan .equip untuk memakai item ini._`;
                }
            } else {
                reply += `😔 Sayang sekali, monster tidak menjatuhkan item apa-apa.`;
            }
            
            let expGained = 0;
            let koinGained = 0;
            if (monster.class === 'lemah') expGained = randomInt(5, 20);
            else if (monster.class === 'kuat') expGained = randomInt(50, 150);
            else expGained = randomInt(500, 2000);
            
            const { Settings } = require('../database');
            const abuseVal = Settings.get('adminabuse_' + m.chat);
            const multiplier = parseInt(abuseVal) || (abuseVal === 'true' ? 2 : 1);
            
            if (multiplier > 1) {
                expGained *= multiplier;
                koinGained = randomInt(20, 100) * (multiplier / 2); // scaling koin bonus
            }
            
            if (koinGained > 0) RPG.addCoin(m.sender, koinGained);
            const expResult = Users.addExp(m.sender, expGained);
            reply += `\n✨ +${formatNumber(expGained)} EXP`;
            if (koinGained > 0) reply += `\n🪙 +${formatNumber(Math.round(koinGained))} Koin (Admin Abuse x${multiplier} Bonus)`;
            if (expResult.leveledUp) {
                reply += `\n🌟 *LEVEL UP!* Kamu naik ke Level ${expResult.newLevel}! 🌟`;
            }
            
            await m.reply(reply);
        }
    },
    {
        name: 'inventory', aliases: ['inv', 'tas'], category: 'rpg', desc: 'Lihat isi tas RPG kamu',
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
        name: 'equip', category: 'rpg', desc: 'Pakai item dari tas', usage: '<id_item>',
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
        name: 'mine', category: 'rpg', desc: 'Menambang batu & mineral',
        async execute({ sock, m }) {
            const userRpg = RPG.getUser(m.sender);
            if (userRpg.last_mine) {
                const last = new Date(userRpg.last_mine).getTime();
                if (Date.now() - last < 30 * 1000) { // 30 seconds cooldown
                    const sisa = Math.ceil((30 * 1000 - (Date.now() - last)) / 1000);
                    return m.reply(`⏳ Stamina habis! Tunggu ${sisa} detik lagi.`);
                }
            }
            
            RPG.updateCooldown(m.sender, 'mine');
            
            const rand = Math.random();
            let reward = 0;
            let material = '';
            
            if (rand < 0.1) {
                reward = 50;
                material = '💎 Diamond';
            } else if (rand < 0.3) {
                reward = 25;
                material = '🟡 Gold';
            } else if (rand < 0.6) {
                reward = 15;
                material = '⚪ Iron';
            } else {
                reward = 10;
                material = '🪨 Stone';
            }
            
            const { Settings } = require('../database');
            const abuseVal = Settings.get('adminabuse_' + m.chat);
            const multiplier = parseInt(abuseVal) || (abuseVal === 'true' ? 2 : 1);
            if (multiplier > 1) {
                reward *= multiplier;
            }
            
            const balReward = reward * 1000; // balance reward
            
            RPG.addCoin(m.sender, reward);
            Users.addBalance(m.sender, balReward);
            await m.reply(`⛏️ Kamu menambang dan mendapatkan *${material}*!\n💰 Koin RPG bertambah: 🪙 ${formatNumber(reward)}\n💵 Balance bertambah: Rp ${formatNumber(balReward)}`);
        }
    },
    {
        name: 'pvp', category: 'rpg', desc: 'Tantang player lain bertarung', usage: '@tag',
        async execute({ sock, m, args }) {
            const target = m.mentionedJid?.[0] || (args[0] ? args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net' : null);
            if (!target) return m.reply('❌ Tag orang yang ingin dilawan!\nContoh: .pvp @user');
            if (target === m.sender) return m.reply('❌ Tidak bisa melawan diri sendiri!');
            
            if (global.pvpChallenges && global.pvpChallenges.has(target)) {
                return m.reply('❌ Target sedang dalam antrean tantangan PvP lain!');
            }
            if (global.pvpChallenges && global.pvpChallenges.has(m.sender)) {
                return m.reply('❌ Kamu masih memiliki tantangan PvP yang belum dijawab. Tunggu atau batalkan!');
            }
            
            const userRpg = RPG.getUser(m.sender);
            if (userRpg.last_pvp) {
                const last = new Date(userRpg.last_pvp).getTime();
                if (Date.now() - last < 10 * 60 * 1000) { // 10 mins cooldown
                    const sisa = Math.ceil((10 * 60 * 1000 - (Date.now() - last)) / 60000);
                    return m.reply(`⏳ Kamu masih memulihkan luka. Tunggu ${sisa} menit lagi.`);
                }
            }
            
            global.pvpChallenges = global.pvpChallenges || new Map();
            
            global.pvpChallenges.set(target, {
                challenger: m.sender,
                timer: setTimeout(async () => {
                    global.pvpChallenges.delete(target);
                    await sock.sendMessage(m.key.remoteJid, { text: `⏳ Tantangan PvP dari @${m.sender.split('@')[0]} kepada @${target.split('@')[0]} hangus karena tidak ada respons.`, mentions: [m.sender, target] });
                }, 60000)
            });
            
            await sock.sendMessage(m.key.remoteJid, { text: `⚔️ @${target.split('@')[0]}, kamu ditantang PvP oleh @${m.sender.split('@')[0]}!\n\nKetik *.terimapvp* untuk bertarung atau *.tolakpvp* untuk menolak.\nWaktu: 60 detik.`, mentions: [m.sender, target] });
        }
    },
    {
        name: 'terimapvp', aliases: ['terima'], category: 'rpg', desc: 'Menerima tantangan PvP',
        async execute({ sock, m, args }) {
            if (m.command === 'terima' && args[0]?.toLowerCase() !== 'pvp') return;
            
            global.pvpChallenges = global.pvpChallenges || new Map();
            const challenge = global.pvpChallenges.get(m.sender);
            if (!challenge) return m.reply('❌ Kamu tidak memiliki tantangan PvP yang tertunda.');
            
            clearTimeout(challenge.timer);
            global.pvpChallenges.delete(m.sender);
            
            const challenger = challenge.challenger;
            
            RPG.updateCooldown(challenger, 'pvp');
            RPG.updateCooldown(m.sender, 'pvp');
            
            const p1Stats = calculateTotalStats(challenger, m.chat);
            const p2Stats = calculateTotalStats(m.sender, m.chat);
            
            // RNG factor based on Luck
            const p1LuckRoll = Math.random() * (p1Stats.luck || 1);
            const p2LuckRoll = Math.random() * (p2Stats.luck || 1);
            
            const p1Score = p1Stats.power + (p1Stats.defense * 0.5) + p1LuckRoll;
            const p2Score = p2Stats.power + (p2Stats.defense * 0.5) + p2LuckRoll;
            
            let text = `⚔️ *PVP BATTLE* ⚔️\n\n`;
            text += `👤 *@${challenger.split('@')[0]}*: Power ${formatNumber(p1Stats.power)} | Def ${formatNumber(p1Stats.defense)}\n`;
            text += `🎯 *@${m.sender.split('@')[0]}*: Power ${formatNumber(p2Stats.power)} | Def ${formatNumber(p2Stats.defense)}\n\n`;
            
            if (p1Score > p2Score) {
                let loot = Math.floor(Math.random() * 20) + 5;
                const { Settings } = require('../database');
                const abuseVal = Settings.get('adminabuse_' + m.chat);
                const multiplier = parseInt(abuseVal) || (abuseVal === 'true' ? 2 : 1);
                if (multiplier > 1) loot *= multiplier;
                RPG.addCoin(challenger, loot);
                text += `🎉 *@${challenger.split('@')[0]} MENANG!* 🎉\nMerampas 🪙 ${formatNumber(loot)} Koin RPG dari arena! ${multiplier > 1 ? `(Admin Abuse x${multiplier}! 🔥)` : ''}`;
            } else if (p2Score > p1Score) {
                let loot = Math.floor(Math.random() * 20) + 5;
                const { Settings } = require('../database');
                const abuseVal = Settings.get('adminabuse_' + m.chat);
                const multiplier = parseInt(abuseVal) || (abuseVal === 'true' ? 2 : 1);
                if (multiplier > 1) loot *= multiplier;
                RPG.addCoin(m.sender, loot);
                text += `💀 *@${challenger.split('@')[0]} KALAH!* 💀\n@${m.sender.split('@')[0]} menang dan merampas 🪙 ${formatNumber(loot)} Koin RPG! ${multiplier > 1 ? `(Admin Abuse x${multiplier}! 🔥)` : ''}`;
            } else {
                text += `🤝 *SERI!* 🤝\nKalian sama-sama kuat!`;
            }
            
            await sock.sendMessage(m.key.remoteJid, { text, mentions: [challenger, m.sender] });
        }
    },
    {
        name: 'tolakpvp', aliases: ['tolak'], category: 'rpg', desc: 'Menolak tantangan PvP',
        async execute({ sock, m, args }) {
            if (m.command === 'tolak' && args[0]?.toLowerCase() !== 'pvp') return;
            
            global.pvpChallenges = global.pvpChallenges || new Map();
            const challenge = global.pvpChallenges.get(m.sender);
            if (!challenge) return m.reply('❌ Kamu tidak memiliki tantangan PvP yang tertunda.');
            
            clearTimeout(challenge.timer);
            global.pvpChallenges.delete(m.sender);
            
            await sock.sendMessage(m.key.remoteJid, { text: `🏃‍♂️ @${m.sender.split('@')[0]} menolak tantangan PvP dari @${challenge.challenger.split('@')[0]}.`, mentions: [m.sender, challenge.challenger] });
        }
    },
    {
        name: 'upgrade', category: 'rpg', desc: 'Upgrade stat dasar (power/defense/luck)', usage: '<stat>',
        async execute({ sock, m, args }) {
            const stat = args[0]?.toLowerCase();
            const valid = ['power', 'defense', 'luck'];
            if (!valid.includes(stat)) return m.reply('❌ Pilih stat yang ingin di-upgrade: power, defense, atau luck.\nContoh: .upgrade power');
            
            const userRpg = RPG.getUser(m.sender);
            const currentStat = userRpg[`base_${stat}`] || (stat === 'luck' ? 0 : 10);
            
            // Cost calculation
            let cost = 0;
            if (stat === 'power') {
                cost = 50000 + (currentStat * currentStat * 50); // Exponential cost
            } else if (stat === 'luck') {
                cost = 100000 + (currentStat * currentStat * 100); // 2x lebih mahal
            } else if (stat === 'defense') {
                cost = 30000 + (currentStat * currentStat * 30); // Lebih murah dari power
            }
            
            const user = Users.getOrCreate(m.sender);
            
            if (user.balance < cost) {
                return m.reply(`❌ Balance kurang!\n💰 Butuh: Rp ${formatNumber(cost)}\n💳 Saldo: Rp ${formatNumber(user.balance)}\n\n_Semakin tinggi stat, semakin mahal biaya upgrade-nya._`);
            }
            
            Users.addBalance(m.sender, -cost);
            const inc = stat === 'luck' ? 5 : 50;
            RPG.upgradeBaseStat(m.sender, stat, inc);
            
            await m.reply(`✅ *UPGRADE BERHASIL*\n\n📈 Base ${stat.toUpperCase()} meningkat (+${inc})!\n💸 Biaya: Rp ${formatNumber(cost)}\n💳 Sisa Saldo: Rp ${formatNumber(Users.get(m.sender).balance)}`);
        }
    },
    {
        name: 'monsterlist', aliases: ['monsters', 'daftarmonster'], category: 'rpg', desc: 'Lihat daftar monster untuk dilawan', usage: '<lemah/kuat/boss>',
        async execute({ sock, m, args }) {
            const cls = args[0]?.toLowerCase();
            if (!['lemah', 'kuat', 'boss'].includes(cls)) {
                return m.reply('❌ Format salah!\n\nSilakan pilih kategori monster:\n- `.monsterlist lemah`\n- `.monsterlist kuat`\n- `.monsterlist boss`');
            }
            
            let text = `╭───「 🐉 *DAFTAR MONSTER: ${cls.toUpperCase()}* 」\n`;
            for (const key in MONSTERS) {
                if (MONSTERS[key].class !== cls) continue;
                const mon = MONSTERS[key];
                text += `│ 👹 *${mon.name}*\n`;
                text += `│    └ Req Power: 🗡️ ${formatNumber(mon.powerReq)}\n`;
                text += `│    └ Drop Chance: 🎁 ${Math.round(mon.dropChance * 100)}%\n│\n`;
            }
            text += `╰──────────────\n\n_Ketik .attack <nama_monster> untuk menyerang._`;
            await m.reply(text);
        }
    },
    {
        name: 'buyrpgcoin', category: 'rpg', desc: 'Beli Koin RPG dengan Balance (1 Koin = 50.000 Balance)', usage: '<jumlah>',
        async execute({ sock, m, args }) {
            const amount = parseInt(args[0]);
            if (isNaN(amount) || amount < 1) return m.reply('❌ Masukkan jumlah koin RPG yang ingin dibeli.\nContoh: .buyrpgcoin 5');
            
            const cost = amount * 50000;
            const user = Users.getOrCreate(m.sender);
            if (user.balance < cost) return m.reply(`❌ Balance tidak cukup!\n💰 Butuh: Rp ${formatNumber(cost)}\n💳 Saldo: Rp ${formatNumber(user.balance)}`);
            
            Users.addBalance(m.sender, -cost);
            RPG.addCoin(m.sender, amount);
            await m.reply(`✅ *PEMBELIAN BERHASIL*\n\n🪙 +${formatNumber(amount)} Koin RPG\n💸 Biaya: Rp ${formatNumber(cost)}\n💳 Sisa Saldo: Rp ${formatNumber(Users.get(m.sender).balance)}`);
        }
    },
    {
        name: 'rpgshop', category: 'rpg', desc: 'Lihat daftar item RPG yang bisa dibeli',
        async execute({ sock, m }) {
            let text = `╭───「 🏪 *RPG SHOP* 」\n`;
            for (const category in RPG_SHOP) {
                text += `│ 🔰 *${category.toUpperCase()}*\n`;
                for (const item of RPG_SHOP[category]) {
                    text += `│  └ [${item.id}] ${item.name} | 🪙 ${item.price}\n`;
                    text += `│      (P: ${item.stats.power}, D: ${item.stats.defense}, L: ${item.stats.luck})\n`;
                }
                text += `│\n`;
            }
            text += `╰──────────────\n\n_Gunakan .buyrpg <id> untuk membeli._\n_Koin RPG kamu: 🪙 ${formatNumber(RPG.getCoin(m.sender))}_`;
            await m.reply(text);
        }
    },
    {
        name: 'buyrpg', category: 'rpg', desc: 'Beli item dari RPG Shop', usage: '<id>',
        async execute({ sock, m, args }) {
            const id = args[0]?.toLowerCase();
            if (!id) return m.reply('❌ Masukkan ID item!\nContoh: .buyrpg w1\n\n_Lihat daftar item di .rpgshop_');
            
            let selectedItem = null;
            let itemType = '';
            for (const category in RPG_SHOP) {
                const found = RPG_SHOP[category].find(i => i.id.toLowerCase() === id);
                if (found) {
                    selectedItem = found;
                    itemType = category;
                    break;
                }
            }
            
            if (!selectedItem) return m.reply('❌ ID item tidak ditemukan! Cek .rpgshop');
            
            const coins = RPG.getCoin(m.sender);
            if (coins < selectedItem.price) return m.reply(`❌ Koin RPG tidak cukup!\n💰 Butuh: 🪙 ${formatNumber(selectedItem.price)}\n🪙 Koinmu: ${formatNumber(coins)}`);
            
            RPG.addCoin(m.sender, -selectedItem.price);
            
            const newItem = {
                type: itemType,
                name: selectedItem.name,
                rarity: selectedItem.rarity,
                grade: selectedItem.grade,
                stats: selectedItem.stats
            };
            
            RPG.addInventory(m.sender, itemType, JSON.stringify(newItem));
            await m.reply(`🛍️ *PEMBELIAN BERHASIL!*\n\nKamu telah membeli *${selectedItem.name}* seharga 🪙 ${selectedItem.price} Koin RPG.\nBarang sudah dimasukkan ke dalam tas (.inv).`);
        }
    },
    {
        name: 'toprpgcoin', aliases: ['toprpg'], category: 'rpg', desc: 'Lihat top pemain dengan koin RPG terbanyak',
        async execute({ sock, m }) {
            const top = RPG.getTopRPGCoin();
            if (!top || top.length === 0) return m.reply('Belum ada pemain yang memiliki Koin RPG.');
            let text = '╭───「 🏆 *TOP RPG COIN* 」\n';
            top.forEach((u, i) => {
                const badge = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🎗️';
                text += `│ ${badge} ${u.name || 'Unknown'}\n│    └ 🪙 ${formatNumber(u.rpg_coin)}\n`;
            });
            text += '╰──────────────';
            await m.reply(text);
        }
    },
    {
        name: 'redeem', aliases: ['claimcode'], category: 'rpg', desc: 'Tukarkan kode hadiah', usage: '<code>',
        async execute({ m, args }) {
            if (!args[0]) return m.reply('❌ Masukkan kode yang ingin ditukar!\nContoh: .redeem MABAR');
            
            const code = args[0].toUpperCase();
            const { RedeemCodes, Users } = require('../database');
            
            const codeData = RedeemCodes.get(code);
            if (!codeData) return m.reply('❌ Kode tidak valid atau tidak ditemukan!');
            
            // Check expiry
            if (new Date(codeData.expires_at).getTime() < Date.now()) {
                return m.reply('❌ Kode ini sudah kedaluwarsa (expired)!');
            }
            
            // Check limit
            if (codeData.max_uses > 0 && codeData.current_uses >= codeData.max_uses) {
                return m.reply('❌ Kuota pemakaian kode ini sudah habis!');
            }
            
            // Check history
            if (RedeemCodes.hasRedeemed(m.sender, code)) {
                return m.reply('❌ Kamu sudah pernah mengklaim kode ini!');
            }
            
            // Grant reward
            const { r_coin, r_balance, r_limit } = codeData;
            
            try {
                let rewardText = '';
                if (r_coin > 0) {
                    RPG.addCoin(m.sender, r_coin);
                    rewardText += `\n  🪙 ${formatNumber(r_coin)} Koin RPG`;
                }
                if (r_balance > 0) {
                    Users.addBalance(m.sender, r_balance);
                    rewardText += `\n  💵 Rp ${formatNumber(r_balance)} Balance`;
                }
                if (r_limit > 0) {
                    Users.addLimit(m.sender, r_limit);
                    rewardText += `\n  🎫 ${formatNumber(r_limit)} Limit`;
                }
                
                // Redeem process
                RedeemCodes.redeem(m.sender, code);
                
                await m.reply(`🎉 *KODE BERHASIL DIKLAIM!*\n\nSelamat! Kamu mendapatkan hadiah:${rewardText}`);
            } catch (e) {
                console.error(e);
                await m.reply('❌ Terjadi kesalahan saat memproses kode.');
            }
        }
    }
];
