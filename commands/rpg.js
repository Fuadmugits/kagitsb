const { Users, GroupLevels, RPG } = require('../database');
const { formatNumber, randomInt, pickRandom } = require('../lib/functions');
const { calculateTotalStats, generateItem, generateRaidItem, MONSTERS, ITEM_TYPES, RPG_SHOP, Raid, RAID_BOSSES } = require('../lib/rpg');
const { RPG_TITLES } = require('../lib/titles');

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
            
            // Cooldown check
            const userRpg = RPG.getUser(m.sender);
            let uniqueSkillsList = [];
            try { uniqueSkillsList = JSON.parse(userRpg.unique_skills || '[]'); } catch(e) {}
            
            let skipCooldown = false;
            if (uniqueSkillsList.includes('Time Warp') && Math.random() < 0.30) {
                skipCooldown = true;
            }

            if (userRpg.last_attack && !skipCooldown) {
                const last = new Date(userRpg.last_attack).getTime();
                if (Date.now() - last < 30 * 1000) {
                    const sisa = Math.ceil((30 * 1000 - (Date.now() - last)) / 1000);
                    return m.reply(`⏳ Kamu sedang istirahat. Tunggu ${sisa} detik lagi.`);
                }
            }
            
            RPG.updateCooldown(m.sender, 'attack');
            
            // Skill system integration
            const skills = RPG.getSkills(m.sender);
            let critLvl = skills.crit || 0;
            const greedLvl = skills.greed || 0;
            
            if (uniqueSkillsList.includes('Assassin Eye')) {
                critLvl += 15;
            }

            let shadows = RPG.getShadows(m.sender);
            let shadowPower = 0;
            shadows.forEach(s => shadowPower += s.power);

            if (uniqueSkillsList.includes('Legion Commander')) {
                shadowPower *= 2;
            }
            
            const isCrit = critLvl > 0 && Math.random() < (critLvl / 100);
            const critMult = uniqueSkillsList.includes('Lethal Strike') ? 3.0 : 1.5;
            
            let dmgMult = 1.0;
            if (uniqueSkillsList.includes('Heavy Strike')) dmgMult += 0.15;
            if (uniqueSkillsList.includes('Poison Blade')) dmgMult += 0.10;
            if (uniqueSkillsList.includes('Meteor')) dmgMult += 0.25;
            if (uniqueSkillsList.includes('Giant Slayer') && monster.powerReq > 1000000) dmgMult += 0.30;
            if (uniqueSkillsList.includes('Dragon Slayer') && (monster.name.toLowerCase().includes('dragon') || monster.powerReq > 1000000)) dmgMult += 0.20;
            
            let isBerserk = false;
            if (uniqueSkillsList.includes('Berserk') && Math.random() < 0.20) {
                isBerserk = true;
                dmgMult += 1.5;
            }
            
            const basePlayerPower = isCrit ? Math.floor(stats.power * critMult) : stats.power;
            const effectivePower = Math.floor(basePlayerPower * dmgMult) + shadowPower;
            
            let actualMonsterPower = monster.powerReq;
            if (uniqueSkillsList.includes('Death Aura')) {
                actualMonsterPower = Math.floor(actualMonsterPower * 0.85);
            }
            if (uniqueSkillsList.includes('Iron Skin')) {
                actualMonsterPower = Math.floor(actualMonsterPower * 0.70);
            }

            if (effectivePower < actualMonsterPower) {
                if (uniqueSkillsList.includes('Shadow Step') && Math.random() < 0.20) {
                    return m.reply(`💨 *SHADOW STEP!* Kamu nyaris kalah melawan ${monster.name}, tapi berhasil menghilang ke dalam bayangan dan melarikan diri tanpa luka!`);
                }
                return m.reply(`💀 Kamu kalah melawan ${monster.name}!\n\n⚔️ Power Kamu: ${formatNumber(effectivePower)} ${isCrit ? '(Critical! 🔥)' : ''}${isBerserk ? '(Berserk! 💢)' : ''}${shadowPower > 0 ? ` (+${formatNumber(shadowPower)} dari Shadow)` : ''}\n🐉 Power Monster: ${formatNumber(actualMonsterPower)}\n\n_Lengkapi armor dan senjata yang lebih kuat!_`);
            }
            
            // Victory
            RPG.setLastKill(m.sender, { name: monster.name, power: monster.powerReq, attempts: 3 });
            
            let reply = isCrit 
                ? `🔥 *CRITICAL STRIKE!!!* ⚔️\nDengan kekuatan luar biasa, kamu berhasil menaklukkan *${monster.name}*!\n\n` 
                : `🎉 Kamu berhasil mengalahkan *${monster.name}*!\n\n`;
            
            // Check drops with luck factor
            const dropChance = monster.dropChance * (1 + (stats.luck / 200)); // Every 200 luck doubles drop chance
            if (Math.random() < dropChance) {
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
                    reply += `\n_Ini bukan drop status permanen! Ini adalah status dari item/armor yang baru kamu dapat. Ketik .inv untuk melihat tas dan .equip untuk memakai item ini._\n\n`;
                }
            } else {
                reply += `😔 Sayang sekali, monster tidak menjatuhkan item apa-apa.\n\n`;
            }
            
            // Exp and Coins calculation
            let expGained = 0;
            let koinGained = 0;
            
            const scale = Math.max(1, Math.sqrt(monster.powerReq));
            expGained = Math.floor(randomInt(2 * scale, 5 * scale));
            koinGained = Math.floor(randomInt(1 * scale, 3 * scale));
            
            if (uniqueSkillsList.includes('Soul Reap')) {
                expGained = Math.floor(expGained * 1.30);
                koinGained = Math.floor(koinGained * 1.30);
            }
            if (uniqueSkillsList.includes('War Cry')) {
                expGained = Math.floor(expGained * 1.20);
            }
            if (uniqueSkillsList.includes('Taunt')) {
                koinGained = Math.floor(koinGained * 1.50);
            }
            
            // Apply title exp multiplier
            if (stats.expMult && stats.expMult > 1.0) {
                expGained = Math.floor(expGained * stats.expMult);
            }
            
            const { Settings } = require('../database');
            const abuseVal = Settings.get('adminabuse_' + m.chat);
            const multiplier = parseInt(abuseVal) || (abuseVal === 'true' ? 2 : 1);
            
            if (multiplier > 1) {
                expGained *= multiplier;
                koinGained *= multiplier;
            }
            
            let skillMsgs = [];
            if (skipCooldown) skillMsgs.push(`⏳ *Time Warp Aktif (Bebas Cooldown!)*`);
            if (isBerserk) skillMsgs.push(`💢 *Berserk Aktif (Damage 2.5x!)*`);
            if (uniqueSkillsList.includes('Vampiric')) {
                RPG.addHp(m.sender, 50);
                skillMsgs.push(`🦇 *Vampiric Aktif (+50 HP)*`);
            }
            
            // Greed skill bonus (+2% coins per level)
            if (greedLvl > 0) {
                koinGained = Math.floor(koinGained * (1 + greedLvl * 0.02));
                skillMsgs.push(`🪙 *Bonus Skill Greed Aktif (+${greedLvl * 2}% Koin)*`);
            }
            
            // Critical Strike double gains
            if (isCrit) {
                expGained *= 2;
                koinGained *= 2;
                skillMsgs.push(`🔥 *Bonus Critical Strike: +100% EXP & Koin!*`);
            }
            
            RPG.addCoin(m.sender, koinGained);
            const expResult = RPG.addExp(m.sender, expGained);
            
            reply += `✨ +${formatNumber(expGained)} RPG EXP`;
            reply += `\n🪙 +${formatNumber(koinGained)} Koin RPG`;
            if (multiplier > 1) {
                reply += ` _(Admin Abuse x${multiplier} Buff)_`;
            }
            
            // If user has 'Arise' skill, record this kill
            const role = userRpg.rpg_role || 'Beginner';
            const attempts = uniqueSkillsList.includes('Shadow Extraction') ? 5 : 3;
            if (uniqueSkillsList.includes('Arise') || role === 'Necromancer' || role === 'Shadow Monarch') {
                RPG.setLastKill(m.sender, { name: monster.name, power: monster.powerReq, attempts: attempts });
            }
            
            if (expResult.leveledUp) {
                reply += `\n\n🌟 *RPG LEVEL UP!* Kamu naik ke RPG Level ${expResult.newLevel}! 🌟`;
                if (expResult.newSkill) {
                    reply += `\n🎁 *UNIQUE SKILL UNLOCKED:* [${expResult.newSkill}]`;
                }
            }
            
            let uniqueSkillsList = [];
            try { uniqueSkillsList = JSON.parse(userRpg.unique_skills || '[]'); } catch(e) {}
            if (uniqueSkillsList.includes('Arise') || role === 'Necromancer' || role === 'Shadow Monarch') {
                reply += `\n\n👻 *ARISE!* Ketik *.arise* untuk mencoba membangkitkan bayangan ${monster.name} (Sisa percobaan: 3)!`;
            }
            
            // Decrease Durability
            const slots = ['weapon', 'helmet', 'armor', 'glove', 'legging', 'shoe'];
            for (const slot of slots) {
                if (userRpg[slot]) {
                    try {
                        const item = JSON.parse(userRpg[slot]);
                        if (item.durability > 0) {
                            item.durability -= 1;
                            RPG.updateEquip(m.sender, slot, JSON.stringify(item));
                            if (item.durability === 0) reply += `\n\n⚠️ *WARNING:* Item *${item.name}* (${slot}) kamu hancur (0% Durability)! Stat tidak lagi aktif. Gunakan .repair untuk memperbaikinya.`;
                        }
                    } catch (e) {}
                }
            }
            
            await m.reply(reply);
        }
    },
    {
        name: 'inventory', aliases: ['inv', 'tas'], category: 'rpg', desc: 'Lihat isi tas RPG kamu',
        async execute({ sock, m }) {
            const userRpg = RPG.getUser(m.sender);
            const items = RPG.getInventory(m.sender);
            
            let text = `╭───「 🎒 *INVENTORY & EQUIPMENT* 」\n│\n`;
            
            // Tampilkan Aura jika ada
            if (userRpg.equipped_aura) {
                const aura = RPG_TITLES.find(t => t.id === userRpg.equipped_aura);
                if (aura) text += `│ 🏅 *Aura Aktif:* [ ${aura.name} ]\n│\n`;
            }

            text += `│ 👕 *[ EQUIPMENT TERPAKAI ]*\n`;
            
            const slots = {
                weapon: '🗡️ Weapon',
                helmet: '🪖 Helmet',
                armor: '🛡️ Armor',
                glove: '🧤 Glove',
                legging: '👖 Legging',
                shoe: '👢 Shoe'
            };
            
            let totalPower = 0; let totalDef = 0; let totalLuck = 0;
            
            for (const slot in slots) {
                if (userRpg[slot]) {
                    try {
                        const item = JSON.parse(userRpg[slot]);
                        const dur = item.durability ?? 100;
                        const durIcon = dur > 50 ? '🟢' : dur > 20 ? '🟡' : '🔴';
                        text += `│ ${slots[slot]}: ${item.name} ${durIcon} (${dur}% Durability)\n`;
                        if (dur > 0) {
                            totalPower += item.stats.power || 0;
                            totalDef += item.stats.defense || 0;
                            totalLuck += item.stats.luck || 0;
                        }
                    } catch(e) {
                        text += `│ ${slots[slot]}: [Error]\n`;
                    }
                } else {
                    text += `│ ${slots[slot]}: KOSONG\n`;
                }
            }
            
            text += `│\n│ 📊 *Stat Equipment Aktif:*\n│ 🗡️ Pwr: +${formatNumber(totalPower)} | 🛡️ Def: +${formatNumber(totalDef)} | 🍀 Luck: +${formatNumber(totalLuck)}\n│\n`;
            
            text += `│ 🎒 *[ ISI TAS / BELUM TERPAKAI ]*\n`;
            if (!items.length) {
                text += `│ _Tas kamu kosong._\n`;
            } else {
                const grouped = {};
                items.forEach((row) => {
                    try {
                        const item = JSON.parse(row.item_data);
                        const type = item.type || 'Lainnya';
                        if (!grouped[type]) grouped[type] = [];
                        grouped[type].push({ id: row.id, item, amount: row.amount });
                    } catch(e) {}
                });
                
                for (const type in grouped) {
                    text += `│ *[ ${type.toUpperCase()} ]*\n`;
                    grouped[type].forEach(g => {
                        text += `│ 🆔 [${g.id}] ${g.item.name} (${g.item.grade})\n`;
                        if (g.item.type !== 'consumable') {
                            text += `│    └ Rarity: ${g.item.rarity} | Pwr: ${g.item.stats.power} | Def: ${g.item.stats.defense}\n`;
                        } else {
                            text += `│    └ x${g.amount} | ${g.item.desc || 'Consumable'}\n`;
                        }
                    });
                }
            }
            text += `╰──────────────\n\n_Ketik .equip <id> untuk memakai item_\n_Ketik .rpgauras untuk melihat koleksi Aura_`;
            await m.reply(text);
        }
    },
    {
        name: 'rpgauras', aliases: ['auras', 'rauras'], category: 'rpg', desc: 'Lihat koleksi Aura RPG kamu',
        async execute({ sock, m }) {
            const userRpg = RPG.getUser(m.sender);
            let unlocked = [];
            try { unlocked = JSON.parse(userRpg.unlocked_auras || '[]'); } catch(e) {}
            
            let text = `╭───「 🏅 *KOLEKSI AURA RPG* 」\n│\n`;
            text += `│ Total Aura Terbuka: *${unlocked.length}* / ${RPG_TITLES.length}\n│\n`;
            
            if (unlocked.length === 0) {
                text += `│ _Kamu belum memiliki Aura._\n│ _Kalahkan Raid Boss untuk mendapatkan Aura!_\n`;
            } else {
                unlocked.forEach(id => {
                    const aura = RPG_TITLES.find(t => t.id === id);
                    if (aura) {
                        const isEquipped = userRpg.equipped_aura === id ? ' ✅' : '';
                        text += `│ 🆔 [${id}] ${aura.name}${isEquipped}\n`;
                    }
                });
            }
            
            text += `│\n╰──────────────\n\n_Ketik .rpgaurainfo <id> untuk detail._\n_Ketik .equipaura <id> untuk memakai Aura._`;
            await m.reply(text);
        }
    },
    {
        name: 'rpgaurainfo', aliases: ['aurainfo'], category: 'rpg', desc: 'Lihat info detail sebuah aura', usage: '<id>',
        async execute({ sock, m, args }) {
            const id = args[0]?.toUpperCase();
            if (!id) return m.reply('❌ Masukkan ID Aura! Contoh: .rpgaurainfo T1');
            const aura = RPG_TITLES.find(t => t.id === id);
            if (!aura) return m.reply('❌ Aura tidak ditemukan!');
            
            let text = `🏅 *AURA INFO: ${aura.name}*\n\n`;
            
            // Tampilkan requirement dinamis untuk Aura Boss (T78-T200)
            const idNum = parseInt(id.replace('T', ''));
            if (idNum >= 78 && idNum <= 200) {
                const bossId = idNum - 77;
                text += `📌 *Cara Mendapatkan:*\nKalahkan Raid Boss ID *${bossId}* sebanyak 77x (Jaminan Pity) atau dapatkan drop langka (1%).\n\n`;
            } else {
                text += `📌 *Cara Mendapatkan:*\n${aura.requirement}\n\n`;
            }

            text += `📊 *Stat Multipliers:*\n`;
            if (aura.stats) {
                text += `🗡️ Power: x${aura.stats.power}\n`;
                text += `🛡️ Defense: x${aura.stats.defense}\n`;
                text += `🍀 Luck: x${aura.stats.luck}\n`;
                text += `✨ EXP: x${aura.stats.exp}\n`;
            } else {
                text += `_Cosmetic Only (Tidak ada penambahan stat)_\n`;
            }
            await m.reply(text);
        }
    },
    {
        name: 'equipaura', aliases: ['setaura'], category: 'rpg', desc: 'Pakai Aura RPG', usage: '<id>',
        async execute({ sock, m, args }) {
            const id = args[0]?.toUpperCase();
            if (!id) return m.reply('❌ Masukkan ID Aura! Contoh: .equipaura T181');
            
            const userRpg = RPG.getUser(m.sender);
            let unlocked = [];
            try { unlocked = JSON.parse(userRpg.unlocked_auras || '[]'); } catch(e) {}
            
            if (!unlocked.includes(id)) return m.reply('❌ Kamu belum memiliki Aura ini! Kalahkan Raid Boss untuk mendapatkannya.');
            
            const aura = RPG_TITLES.find(t => t.id === id);
            if (!aura) return m.reply('❌ Aura tidak ditemukan!');
            
            RPG.setAura(m.sender, id);
            await m.reply(`✅ Berhasil memakai Aura *${aura.name}*!`);
        }
    },
    {
        name: 'rpgprofile', aliases: ['rprofile', 'stats'], category: 'rpg', desc: 'Lihat profil dan stat RPG kamu',
        async execute({ sock, m }) {
            const userRpg = RPG.getUser(m.sender);
            const user = Users.get(m.sender);
            const stats = calculateTotalStats(m.sender, m.chat);
            
            let auraName = 'None';
            if (userRpg.equipped_aura) {
                const aura = RPG_TITLES.find(t => t.id === userRpg.equipped_aura);
                if (aura) auraName = aura.name;
            }
            
            let uniqueSkills = [];
            try { uniqueSkills = JSON.parse(userRpg.unique_skills || '[]'); } catch(e) {}
            
            let shadows = [];
            try { shadows = JSON.parse(userRpg.shadows || '[]'); } catch(e) {}
            
            let text = `╭───「 👤 *RPG PROFILE* 」\n`;
            text += `│ 🏅 *Gelar/Aura:* [ ${auraName} ]\n`;
            text += `│ 👤 *Nama:* ${user.name}\n`;
            text += `│ 🌟 *Level RPG:* ${userRpg.rpg_level || 1} (EXP: ${formatNumber(userRpg.rpg_exp || 0)})\n`;
            text += `│ 🎭 *Role:* ${userRpg.rpg_role || 'Beginner'}\n`;
            if (uniqueSkills.length > 0) {
                text += `│ 🔮 *Unique Skills:* ${uniqueSkills.join(', ')}\n`;
            }
            if (shadows.length > 0) {
                text += `│ 👻 *Shadows (${shadows.length}/100):*\n`;
                shadows.slice(0, 5).forEach((s, i) => {
                    const rankText = s.rank ? ` [${s.rank}]` : '';
                    text += `│    ${i+1}. ${s.name}${rankText} (P: ${formatNumber(s.power)})\n`;
                });
                if (shadows.length > 5) {
                    text += `│    ... dan ${shadows.length - 5} lainnya.\n`;
                }
            } else {
                const role = userRpg.rpg_role || 'Beginner';
                if (uniqueSkills.includes('Arise') || role === 'Necromancer' || role === 'Shadow Monarch') {
                    text += `│ 👻 *Shadows (0/100)*\n`;
                }
            }
            text += `│ 🪙 *Koin RPG:* ${formatNumber(userRpg.rpg_coin || 0)}\n`;
            text += `│ ❤️ *HP:* ${formatNumber(userRpg.hp || 0)} / 1.000\n`;
            text += `│\n│ 📊 *TOTAL STATS (Final):*\n`;
            text += `│ 🗡️ Power: ${formatNumber(stats.power)}\n`;
            text += `│ 🛡️ Defense: ${formatNumber(stats.defense)}\n`;
            text += `│ 🍀 Luck: ${formatNumber(stats.luck)}\n`;
            text += `│ ✨ EXP Multi: x${stats.expMult}\n`;
            text += `│\n│ 💠 *ASCENSION:* P:${userRpg.asc_power || 0} | D:${userRpg.asc_defense || 0} | L:${userRpg.asc_luck || 0}\n`;
            text += `╰──────────────\n\n_Gunakan .inv untuk melihat equipment_`;
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
        name: 'upgrade', category: 'rpg', desc: 'Upgrade stat dasar (power/defense/luck)', usage: '<stat> (all)',
        async execute({ sock, m, args }) {
            const stat = args[0]?.toLowerCase();
            const valid = ['power', 'defense', 'luck'];
            if (!valid.includes(stat)) return m.reply('❌ Pilih stat yang ingin di-upgrade: power, defense, atau luck!\nContoh: .upgrade power atau .upgrade power all');
            
            const userRpg = RPG.getUser(m.sender);
            const currentLevel = userRpg['base_' + stat] || 0;
            const isAll = args[1]?.toLowerCase() === 'all';
            
            const getCost = (lvl) => (lvl + 1) * 2; // Biaya dalam Koin RPG
            const userCoins = RPG.getCoin(m.sender);
            
            if (isAll) {
                let totalCost = 0;
                let levelsUp = 0;
                let tempLevel = currentLevel;
                let currentCoins = userCoins;
                
                while (currentCoins >= getCost(tempLevel)) {
                    const cost = getCost(tempLevel);
                    totalCost += cost;
                    currentCoins -= cost;
                    tempLevel++;
                    levelsUp++;
                    if (levelsUp >= 100) break; // Safety cap
                }
                
                if (levelsUp === 0) return m.reply(`❌ Koin RPG tidak cukup untuk upgrade bahkan 1 level!\n💰 Butuh: 🪙 ${formatNumber(getCost(currentLevel))} Koin\n🪙 Koinmu: 🪙 ${formatNumber(userCoins)}`);
                
                RPG.addCoin(m.sender, -totalCost);
                RPG.addStat(m.sender, stat, levelsUp);
                
                await m.reply(`✅ *UPGRADE MASSAL BERHASIL!*\n\n📈 Stat: ${stat.toUpperCase()}\n🆙 Naik: +${levelsUp} Level\n💰 Total Biaya: 🪙 ${formatNumber(totalCost)} Koin\n📊 Level Sekarang: ${tempLevel}\n🪙 Sisa Koin: 🪙 ${formatNumber(currentCoins)}`);
            } else {
                const cost = getCost(currentLevel);
                if (userCoins < cost) return m.reply(`❌ Koin RPG tidak cukup!\n💰 Butuh: 🪙 ${formatNumber(cost)} Koin\n🪙 Koinmu: 🪙 ${formatNumber(userCoins)}`);
                
                RPG.addCoin(m.sender, -cost);
                RPG.addStat(m.sender, stat, 1);
                
                await m.reply(`✅ *UPGRADE BERHASIL!*\n\n📈 Stat: ${stat.toUpperCase()}\n🆙 Level: ${currentLevel} -> ${currentLevel + 1}\n💰 Biaya: 🪙 ${formatNumber(cost)} Koin\n🪙 Sisa Koin: 🪙 ${formatNumber(userCoins - cost)}`);
            }
        }
    },
    {
        name: 'ascension', aliases: ['ascend', 'rebirth'], category: 'rpg', desc: 'Reset stat level untuk mendapatkan multiplier permanen (x1.1)', usage: '<stat>',
        async execute({ sock, m, args }) {
            const stat = args[0]?.toLowerCase();
            const valid = ['power', 'defense', 'luck'];
            if (!valid.includes(stat)) return m.reply('❌ Pilih stat yang ingin di-ascend: power, defense, atau luck!\n\n📌 *SYARAT:* Stat level harus minimal 100.\n📌 *BIAYA:* 50.000 Koin RPG.\n📌 *HASIL:* Stat level balik ke 0, tapi kamu dapat multiplier +10% permanen.');
            
            const userRpg = RPG.getUser(m.sender);
            const currentLevel = userRpg['base_' + stat] || 0;
            const currentAsc = userRpg['asc_' + stat] || 0;
            const coins = RPG.getCoin(m.sender);
            
            if (currentLevel < 100) return m.reply(`❌ Stat *${stat}* kamu belum level 100!\n📊 Level saat ini: ${currentLevel}`);
            
            // Cost scales 3x per ascension level
            const baseCost = 1000000;
            const cost = baseCost * Math.pow(3, currentAsc);
            
            if (coins < cost) return m.reply(`❌ Koin RPG tidak cukup untuk biaya Ascension berikutnya!\n💰 Butuh: 🪙 ${formatNumber(cost)}\n🪙 Koinmu: ${formatNumber(coins)}\n\n_Tips: Biaya naik 3x lipat setiap kali Ascension!_`);
            
            // Perform Ascension
            RPG.addCoin(m.sender, -cost);
            RPG.fullRebirth(m.sender, stat); 
            
            const newAsc = (RPG.getUser(m.sender)['asc_' + stat] || 0);
            
            await m.reply(`✨ *FULL REBIRTH BERHASIL!* ✨\n\n🌌 Stat *${stat.toUpperCase()}* kamu telah berevolusi!\n🆙 Ascension Level Sekarang: ${newAsc}\n⚡ Multiplier Stat: x${(1 + newAsc * 0.1).toFixed(1)}\n💰 Biaya: 🪙 ${formatNumber(cost)}\n\n⚠️ *PEMBERSIHAN TOTAL:* ⚠️\n- Semua Base Stat di-reset ke Awal.\n- Semua Item di Inventory dihapus.\n- Semua Equipment dilepas & dihancurkan.`);
        }
    },
    {
        name: 'heal', aliases: ['obat', 'pulih'], category: 'rpg', desc: 'Pulihkan HP kamu agar bisa bertarung kembali',
        async execute({ sock, m }) {
            const u = Users.get(m.sender);
            const userRpg = RPG.getUser(m.sender);
            const maxHp = 1000 + (u.level * 50);
            
            if (userRpg.hp >= maxHp) return m.reply('❤️ HP kamu sudah penuh!');
            
            const baseCost = 5000;
            const scalingCost = Math.floor((maxHp - 1000) * 10);
            const cost = Math.max(baseCost, baseCost + scalingCost);
            
            const coins = RPG.getCoin(m.sender);
            if (coins < cost) return m.reply(`❌ Koin RPG tidak cukup untuk biaya pengobatan!\n💰 Butuh: 🪙 ${formatNumber(cost)} Koin\n🪙 Koinmu: 🪙 ${formatNumber(coins)}`);
            
            RPG.addCoin(m.sender, -cost);
            RPG.setHp(m.sender, maxHp);
            
            await m.reply(`💖 *PENGOBATAN BERHASIL!* 💖\n\nHP kamu kini kembali penuh (*${maxHp}*).\n💸 Biaya: 🪙 ${formatNumber(cost)} Koin RPG\n\n_Ayo kembali ke arena pertarungan!_`);
        }
    },
    {
        name: 'repair', aliases: ['perbaiki', 'service'], category: 'rpg', desc: 'Perbaiki semua equipment yang terpakai',
        async execute({ sock, m }) {
            const userRpg = RPG.getUser(m.sender);
            const slots = ['weapon', 'helmet', 'armor', 'glove', 'legging', 'shoe'];
            let itemsToRepair = [];
            
            for (const slot of slots) {
                if (userRpg[slot]) {
                    const item = JSON.parse(userRpg[slot]);
                    if (item.durability < 100) {
                        itemsToRepair.push({ slot, item });
                    }
                }
            }
            
            if (itemsToRepair.length === 0) return m.reply('✅ Semua equipment kamu masih dalam kondisi prima!');
            
            const costPerItem = 250000;
            const totalCost = itemsToRepair.length * costPerItem;
            const coins = RPG.getCoin(m.sender);
            
            if (coins < totalCost) return m.reply(`❌ Koin RPG tidak cukup!\n💰 Biaya: 🪙 ${formatNumber(totalCost)} untuk ${itemsToRepair.length} item.\n🪙 Koinmu: ${formatNumber(coins)}`);
            
            RPG.addCoin(m.sender, -totalCost);
            
            for (const { slot, item } of itemsToRepair) {
                item.durability = 100;
                RPG.updateEquip(m.sender, slot, JSON.stringify(item));
            }
            
            await m.reply(`🛠️ *REPARASI SELESAI!* 🛠️\n\nBerhasil memperbaiki *${itemsToRepair.length}* equipment.\n💰 Total biaya: 🪙 ${formatNumber(totalCost)}\n\n_Equipment kamu kini memiliki durability 100% dan stat kembali aktif!_`);
        }
    },
    {
        name: 'evolverole', category: 'rpg', desc: 'Evolusi role ke tingkat berikutnya (Butuh Lvl 50/100)',
        async execute({ m }) {
            const userRpg = RPG.getUser(m.sender);
            const role = userRpg.rpg_role || 'Beginner';
            const lvl = userRpg.rpg_level || 1;
            
            const evoMap = {
                'Warrior': { next: 'Fighter', req: 50, cost: 500000 },
                'Fighter': { next: 'Gladiator', req: 100, cost: 2000000 },
                'Tank': { next: 'Paladin', req: 50, cost: 500000 },
                'Paladin': { next: 'Guardian', req: 100, cost: 2000000 },
                'Assassin': { next: 'Ninja', req: 50, cost: 500000 },
                'Ninja': { next: 'Shadowblade', req: 100, cost: 2000000 },
                'Mage': { next: 'Warlock', req: 50, cost: 500000 },
                'Warlock': { next: 'Archmage', req: 100, cost: 2000000 },
                'Necromancer': { next: 'Shadow Monarch', req: 100, cost: 5000000 }
            };
            
            if (!evoMap[role]) {
                return m.reply(`❌ Role *${role}* belum memiliki evolusi lanjutan atau Anda masih Beginner (gunakan .setrole dahulu).`);
            }
            
            const evo = evoMap[role];
            if (lvl < evo.req) {
                return m.reply(`❌ Level RPG Anda belum cukup!\nSyarat Level: ${evo.req}\nLevel Anda: ${lvl}`);
            }
            
            const coins = RPG.getCoin(m.sender);
            if (coins < evo.cost) {
                return m.reply(`❌ Koin RPG Anda tidak cukup!\nBiaya Evolusi: 🪙 ${formatNumber(evo.cost)}\nKoin Anda: 🪙 ${formatNumber(coins)}`);
            }
            
            RPG.addCoin(m.sender, -evo.cost);
            RPG.setRole(m.sender, evo.next);
            await m.reply(`🎉 *EVOLUSI BERHASIL!* 🎉\n\nRole Anda telah berevolusi dari *${role}* menjadi *${evo.next}*!\nKekuatan baru telah menanti Anda!`);
        }
    },
    {
        name: 'arise', aliases: ['bangkitkan'], category: 'rpg', desc: 'Membangkitkan monster/boss terakhir yang kamu bunuh menjadi Shadow (Skill: Arise)',
        async execute({ sock, m }) {
            const userRpg = RPG.getUser(m.sender);
            let uniqueSkills = [];
            try { uniqueSkills = JSON.parse(userRpg.unique_skills || '[]'); } catch(e) {}
            
            const role = userRpg.rpg_role || 'Beginner';
            if (!uniqueSkills.includes('Arise') && role !== 'Necromancer' && role !== 'Shadow Monarch') {
                return m.reply('❌ Kamu tidak memiliki skill *Arise* (Skill khusus Necromancer/Shadow Monarch).');
            }
            
            const lastKill = RPG.getLastKill(m.sender);
            if (!lastKill) {
                return m.reply('❌ Kamu belum membunuh monster/boss apa pun yang bisa dibangkitkan akhir-akhir ini.');
            }
            
            if (lastKill.attempts <= 0) {
                return m.reply('❌ Jiwa monster ini telah hancur karena gagal dibangkitkan berulang kali.');
            }
            
            let shadows = RPG.getShadows(m.sender);
            if (shadows.length >= 100) {
                return m.reply('❌ Pasukan bayanganmu (Shadow) sudah penuh (Maksimal 100)! Gunakan perintah *.removeshadow <nomor>* untuk melepas salah satu shadow.');
            }
            
            lastKill.attempts -= 1;
            RPG.setLastKill(m.sender, lastKill);
            
            // 60% chance to success, 90% if Shadow Extraction
            const successChance = uniqueSkills.includes('Shadow Extraction') ? 0.90 : 0.60;
            if (Math.random() < successChance) {
                // Determine Power Multiplier based on Role
                const role = userRpg.rpg_role || 'Beginner';
                let powerMult = 0.01; // Necromancer: 1%
                if (role === 'Shadow Monarch') {
                    powerMult = 0.10; // Shadow Monarch: 10% (10x stronger)
                }

                // Success
                let shadowPower = Math.floor(lastKill.power * powerMult);
                if (shadowPower < 1) shadowPower = 1;

                // Determine Rank
                let rank = 'Normal';
                if (shadowPower >= 10000000000) rank = 'Grand Marshal';
                else if (shadowPower >= 100000000) rank = 'Marshal';
                else if (shadowPower >= 1000000) rank = 'Commander';
                else if (shadowPower >= 100000) rank = 'Elite Knight';
                else if (shadowPower >= 10000) rank = 'Knight';
                else if (shadowPower >= 1000) rank = 'Elite';

                const shadow = { name: lastKill.name, power: shadowPower, rank: rank };
                RPG.addShadow(m.sender, shadow);
                RPG.setLastKill(m.sender, null); // Clear last kill so it can't be arisen again
                const { formatNumber } = require('../lib/functions');
                await m.reply(`🌑 *ARISE BERHASIL!* 🌑\n\nBayangan dari *${lastKill.name}* telah bangkit sebagai *[${rank}]* dan bergabung dengan Shadow Army milikmu!\n🗡️ Tambahan Power: +${formatNumber(shadow.power)}\n\n_Cek profil kamu menggunakan .rpgprofile_`);
            } else {
                // Fail
                if (lastKill.attempts > 0) {
                    await m.reply(`⚠️ *Gagal membangkitkan bayangan!* Jiwa *${lastKill.name}* menolak panggilanmu.\n\nSisa percobaan: ${lastKill.attempts}x lagi.`);
                } else {
                    await m.reply(`💥 *Gagal!* Jiwa *${lastKill.name}* telah hancur sepenuhnya dan tidak bisa dibangkitkan lagi.`);
                }
            }
        }
    },
    {
        name: 'removeshadow', aliases: ['delshadow', 'lepasbayangan'], category: 'rpg', desc: 'Melepaskan shadow dari pasukan bayanganmu', usage: '<nomor_shadow>',
        async execute({ sock, m, args }) {
            const index = parseInt(args[0]) - 1;
            if (isNaN(index)) return m.reply('❌ Masukkan nomor shadow yang ingin dilepas (1-3).\nCek nomor shadow di *.rpgprofile*');
            
            const shadows = RPG.getShadows(m.sender);
            if (index < 0 || index >= shadows.length) {
                return m.reply('❌ Nomor shadow tidak valid!');
            }
            
            const removed = shadows[index];
            RPG.removeShadow(m.sender, index);
            await m.reply(`👋 Kamu telah melepaskan bayangan *${removed.name}* kembali ke dalam kegelapan.`);
        }
    },
    {
        name: 'useitem', aliases: ['pakai'], category: 'rpg', desc: 'Gunakan item consumable dari tas', usage: '<id_item>',
        async execute({ sock, m, args }) {
            const id = parseInt(args[0]);
            if (isNaN(id)) return m.reply('❌ Masukkan ID item dari .inv');
            
            const itemRow = RPG.getInventoryItem(id);
            if (!itemRow || itemRow.jid !== m.sender || itemRow.amount < 1) {
                return m.reply('❌ Item tidak ditemukan di tas kamu!');
            }
            
            try {
                const itemData = JSON.parse(itemRow.item_data);
                if (itemData.type !== 'consumable') return m.reply('❌ Item ini tidak bisa digunakan, hanya bisa dipakai (.equip)');
                
                const effect = itemData.stats.effect;
                const isAll = args[1]?.toLowerCase() === 'all';
                const argCount = parseInt(args[1]);
                const count = isAll ? itemRow.amount : (!isNaN(argCount) && argCount > 0 ? Math.min(argCount, itemRow.amount) : 1);
                
                let totalReply = `✨ *MENGGUNAKAN ${count}x ${itemData.name.toUpperCase()}* ✨\n\n`;
                let totalBal = 0;
                let totalCoins = 0;
                let totalItems = 0;
                let itemsList = [];
                
                for (let i = 0; i < count; i++) {
                    if (effect === 'gacha') {
                        const rand = Math.random();
                        if (rand < 0.1) {
                            totalBal += randomInt(500000, 2000000);
                        } else if (rand < 0.3) {
                            totalCoins += randomInt(500, 1500);
                        } else {
                            const { generateItem, ITEM_TYPES } = require('../lib/rpg');
                            const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
                            const item = generateItem(type, 'kuat');
                            RPG.addInventory(m.sender, type, JSON.stringify(item));
                            totalItems++;
                            if (itemsList.length < 5) itemsList.push(`${item.rarity} ${item.name}`);
                        }
                    } else if (effect === 'premium') {
                        const days = itemData.stats.days || 1;
                        Users.setPremium(m.sender, days);
                    } else if (effect === 'balance') {
                        totalBal += randomInt(itemData.stats.min, itemData.stats.max);
                    }
                }
                
                if (effect === 'gacha') {
                    if (totalBal > 0) totalReply += `💰 Total Balance: Rp ${formatNumber(totalBal)}\n`;
                    if (totalCoins > 0) totalReply += `🪙 Total Koin RPG: ${formatNumber(totalCoins)}\n`;
                    if (totalItems > 0) {
                        totalReply += `🎁 Total Equipment: ${totalItems}\n`;
                        if (itemsList.length > 0) totalReply += `   _(Beberapa: ${itemsList.join(', ')}...)_\n`;
                    }
                } else if (effect === 'premium') {
                    totalReply += `💎 Status Premium telah ditambahkan/diperpanjang!`;
                } else if (effect === 'balance') {
                    totalReply += `💸 Total Balance didapat: Rp ${formatNumber(totalBal)}`;
                }
                
                if (totalBal > 0) {
                    Users.addBalance(m.sender, totalBal);
                    const { Transactions } = require('../database');
                    Transactions.create(m.sender, 'mystery_box', totalBal, `Reward dari ${count}x Mystery Box`);
                }
                if (totalCoins > 0) RPG.addCoin(m.sender, totalCoins);
                
                RPG.removeInventory(id, count);
                totalReply += `\n\n✅ *SELESAI!* Sisa item di tas: ${itemRow.amount - count}`;
                await m.reply(totalReply.trim());
            } catch (e) {
                console.error(e);
                await m.reply('❌ Gagal menggunakan item.');
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
            
            // Skill system integration
            const skills = RPG.getSkills(m.sender);
            const doubleMineLvl = skills.doublemine || 0;
            const greedLvl = skills.greed || 0;
            
            let skillMsgs = [];
            
            // Greed skill bonus (+2% coins per level)
            if (greedLvl > 0) {
                reward = Math.floor(reward * (1 + greedLvl * 0.02));
                skillMsgs.push(`🪙 *Bonus Skill Greed Aktif (+${greedLvl * 2}% Koin)*`);
            }
            
            // Double Mine skill check
            let doubleMineTriggered = false;
            if (doubleMineLvl > 0 && Math.random() < (doubleMineLvl / 100)) {
                reward *= 2;
                doubleMineTriggered = true;
                skillMsgs.push(`✨ *Skill Double Mine Aktif (Mendapatkan Hasil 2x Lipat! ⛏️)*`);
            }
            
            RPG.addCoin(m.sender, reward);
            
            let replyText = `⛏️ Kamu menambang dan mendapatkan *${material}${doubleMineTriggered ? ' x2' : ''}*!\n💰 Koin RPG bertambah: 🪙 ${formatNumber(reward)}`;
            if (skillMsgs.length > 0) {
                replyText += `\n\n${skillMsgs.join('\n')}`;
            }
            
            await m.reply(replyText);
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
        name: 'upgrade', category: 'rpg', desc: 'Upgrade stat dasar (power/defense/luck)', usage: '<stat> (all)',
        async execute({ sock, m, args }) {
            const stat = args[0]?.toLowerCase();
            const valid = ['power', 'defense', 'luck'];
            if (!valid.includes(stat)) return m.reply('❌ Pilih stat yang ingin di-upgrade: power, defense, atau luck.\nContoh: .upgrade power');
            
            const isAll = args[1]?.toLowerCase() === 'all';
            let userRpg = RPG.getUser(m.sender);
            
            const getCost = (s, val) => {
                if (s === 'power') return 25 + Math.floor(val * val * 0.05);
                if (s === 'luck') return 50 + Math.floor(val * val * 0.1);
                if (s === 'defense') return 15 + Math.floor(val * val * 0.03);
                return 0;
            };

            const incPerLevel = stat === 'luck' ? 5 : 50;
            let totalCost = 0;
            let levelsBought = 0;
            let tempStat = userRpg[`base_${stat}`] || (stat === 'luck' ? 0 : 10);
            let userCoins = RPG.getCoin(m.sender);
            let tempCoins = userCoins;

            const argCount = parseInt(args[1]);
            const isSpecific = !isNaN(argCount) && argCount > 0;

            if (isAll) {
                while (true) {
                    let nextCost = getCost(stat, tempStat);
                    if (tempCoins >= nextCost) {
                        tempCoins -= nextCost;
                        totalCost += nextCost;
                        tempStat += incPerLevel;
                        levelsBought++;
                    } else {
                        break;
                    }
                }
                if (levelsBought === 0) return m.reply(`❌ Koin RPG tidak cukup untuk upgrade bahkan 1 level!\n💰 Butuh: 🪙 ${formatNumber(getCost(stat, tempStat))}\n🪙 Koinmu: 🪙 ${formatNumber(userCoins)}`);
            } else if (isSpecific) {
                for (let i = 0; i < argCount; i++) {
                    let nextCost = getCost(stat, tempStat);
                    if (tempCoins >= nextCost) {
                        tempCoins -= nextCost;
                        totalCost += nextCost;
                        tempStat += incPerLevel;
                        levelsBought++;
                    } else {
                        break;
                    }
                }
                if (levelsBought < argCount) return m.reply(`❌ Koin RPG tidak cukup untuk upgrade *${argCount}* level!\n💰 Hanya mampu: ${levelsBought} level.\n🪙 Sisa Koin: 🪙 ${formatNumber(tempCoins)}`);
            } else {
                totalCost = getCost(stat, tempStat);
                if (tempCoins < totalCost) return m.reply(`❌ Koin RPG kurang!\n💰 Butuh: 🪙 ${formatNumber(totalCost)}\n🪙 Koinmu: 🪙 ${formatNumber(userCoins)}`);
                levelsBought = 1;
            }

            RPG.addCoin(m.sender, -totalCost);
            RPG.addStat(m.sender, stat, incPerLevel * levelsBought);
            
            await m.reply(`✅ *UPGRADE BERHASIL*\n\n📈 Base ${stat.toUpperCase()} meningkat (+${incPerLevel * levelsBought}) [${levelsBought}x Upgrade]!\n💰 Total Biaya: 🪙 ${formatNumber(totalCost)} Koin\n🪙 Sisa Koin: 🪙 ${formatNumber(RPG.getCoin(m.sender))}`);
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
        name: 'buyrpgcoin', aliases: ['buycoinrpg', 'beli-rpgcoin', 'beli-coinrpg'], category: 'rpg', desc: 'Beli Koin RPG dengan Balance (1 Koin = 100.000.000 Balance)', usage: '<jumlah>',
        async execute({ sock, m, args }) {
            const amount = parseInt(args[0]);
            if (isNaN(amount) || amount < 1) return m.reply('❌ Masukkan jumlah koin RPG yang ingin dibeli.\nContoh: .buyrpgcoin 5');
            
            const cost = amount * 100000000; // Raised 10x
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
                    if (category === 'consumable') {
                        text += `│      _${item.desc}_\n`;
                    } else {
                        text += `│      (P: ${item.stats.power}, D: ${item.stats.defense}, L: ${item.stats.luck})\n`;
                    }
                }
                text += `│\n`;
            }
            text += `╰──────────────\n\n_Gunakan .buyrpg <id> untuk membeli._\n_Gunakan .useitem <id_inv> untuk item consumable._\n_Koin RPG kamu: 🪙 ${formatNumber(RPG.getCoin(m.sender))}_`;
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
            
            const isAll = args[1]?.toLowerCase() === 'all';
            const argCount = parseInt(args[1]);
            const count = isAll ? Math.floor(coins / selectedItem.price) : (!isNaN(argCount) && argCount > 0 ? argCount : 1);
            
            const totalCost = count * selectedItem.price;
            if (coins < totalCost) return m.reply(`❌ Koin RPG tidak cukup untuk membeli *${count}x* item!\n💰 Butuh: 🪙 ${formatNumber(totalCost)}\n🪙 Koinmu: 🪙 ${formatNumber(coins)}`);
            
            RPG.addCoin(m.sender, -totalCost);
            
            const newItem = {
                type: itemType,
                name: selectedItem.name,
                rarity: selectedItem.rarity,
                grade: selectedItem.grade,
                stats: selectedItem.stats
            };
            
            RPG.addInventory(m.sender, itemType, JSON.stringify(newItem), count);
            await m.reply(`🛍️ *PEMBELIAN BERHASIL!*\n\nKamu telah membeli *${count}x ${selectedItem.name}* seharga 🪙 ${formatNumber(totalCost)} Koin RPG.\nBarang sudah dimasukkan ke dalam tas (.inv).`);
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
    },
    {
        name: 'summonraid', aliases: ['startraid'], category: 'rpg', desc: 'Summon Boss Raid (1-23)', usage: '<level>', groupOnly: true,
        async execute({ sock, m, args }) {
            const currentRaid = Raid.getStatus(m.chat);
            if (currentRaid) return m.reply(`⚠️ Boss Raid *${currentRaid.boss}* sedang aktif di grup ini!\n🩸 HP: ${formatNumber(currentRaid.currentHp)}/${formatNumber(currentRaid.maxHp)}`);
            
            const level = parseInt(args[0]);
            const maxLevel = require('../lib/rpg').RAID_BOSSES.length;
            if (isNaN(level) || level < 1 || level > maxLevel) return m.reply(`❌ Pilih level boss raid (1 - ${maxLevel})!\nContoh: .summonraid 23\n\n_Lihat daftar bos di .raidinfo_`);
            
            const boss = RAID_BOSSES.find(b => b.id === level);
            const userCoin = RPG.getCoin(m.sender);
            if (userCoin < boss.cost) return m.reply(`❌ Kamu butuh *${formatNumber(boss.cost)} Koin RPG* untuk summon ${boss.name}.\n💰 Koin kamu: ${formatNumber(userCoin)}`);
            
            RPG.addCoin(m.sender, -boss.cost);
            const res = Raid.summon(m.chat, m.sender, level);
            
            await m.reply(`🌋 *BOSS RAID TELAH MUNCUL!* 🌋\n\n👾 Boss: *${res.raid.boss}* ${res.raid.color}\n🩸 HP: *${formatNumber(res.raid.maxHp)}*\n👤 Summoner: @${m.sender.split('@')[0]}\n\nKetik *.attackraid* untuk menyerang bersama!`, { mentions: [m.sender] });
        }
    },
    {
        name: 'attackraid', aliases: ['raidattack', 'ar'], category: 'rpg', desc: 'Serang Boss Raid aktif', groupOnly: true,
        async execute({ sock, m }) {
            const raid = Raid.getStatus(m.chat);
            if (!raid) return m.reply('❌ Tidak ada Boss Raid yang aktif di grup ini. Gunakan *.summonraid* untuk memanggil bos!');
            
            const stats = calculateTotalStats(m.sender, m.chat);
            
            const { Settings } = require('../database');
            const abuseVal = Settings.get('adminabuse_' + m.chat);
            const multiplier = parseInt(abuseVal) || (abuseVal === 'true' ? 2 : 1);

            let damage = randomInt(Math.floor(stats.power * 0.8), Math.floor(stats.power * 1.2));
            
            // Skill system integration
            const skills = RPG.getSkills(m.sender);
            let critLvl = skills.crit || 0;
            const shieldLvl = skills.shield || 0;
            
            const userRpg = RPG.getUser(m.sender);
            let uniqueSkills = [];
            try { uniqueSkills = JSON.parse(userRpg.unique_skills || '[]'); } catch(e) {}
            
            if (uniqueSkills.includes('Assassin Eye')) critLvl += 15;
            
            let shadows = RPG.getShadows(m.sender);
            let shadowPower = 0;
            shadows.forEach(s => shadowPower += s.power);
            
            if (uniqueSkills.includes('Legion Commander')) {
                shadowPower *= 2;
            }
            
            let dmgMult = 1.0;
            if (uniqueSkills.includes('Heavy Strike')) dmgMult += 0.15;
            if (uniqueSkills.includes('Poison Blade')) dmgMult += 0.10;
            if (uniqueSkills.includes('Meteor')) dmgMult += 0.25;
            if (uniqueSkills.includes('Giant Slayer')) dmgMult += 0.30;
            if (uniqueSkills.includes('Dragon Slayer')) dmgMult += 0.20;
            
            let isBerserk = false;
            if (uniqueSkills.includes('Berserk') && Math.random() < 0.20) {
                isBerserk = true;
                dmgMult += 1.5;
            }
            
            if (uniqueSkills.includes('Elemental Burst') && Math.random() < 0.25) {
                dmgMult += 1.0;
            }
            
            const isCrit = critLvl > 0 && Math.random() < (critLvl / 100);
            const critMult = uniqueSkills.includes('Lethal Strike') ? 3.0 : 2.0;
            
            if (isCrit) {
                damage = Math.floor(damage * critMult);
            }
            
            damage = Math.floor(damage * dmgMult) + shadowPower;
            
            if (uniqueSkills.includes('Vampiric')) {
                const healAmt = Math.floor(damage * 0.05);
                RPG.addHp(m.sender, healAmt);
            }
            
            // Damage Cap: Scaling Shield Duration (+5 detik per level boss)
            const raidAge = Date.now() - raid.startTime;
            const shieldDuration = 10000 + ((raid.id - 1) * 5000); 
            const isCapped = raidAge < shieldDuration;
            const cap = Math.floor(raid.maxHp * 0.05);
            let cappedLabel = '';
            if (isCapped && damage > cap) {
                damage = cap;
                const remainingSec = Math.ceil((shieldDuration - raidAge) / 1000);
                cappedLabel = ` (Shield 5% HP 🛡️ - ${remainingSec}s)`;
            }
            
            // Boss Counter-Attack & Skills
            let bossPower = 100 * Math.pow(raid.id, 1.5); // Buffed boss damage significantly
            if (uniqueSkills.includes('Death Aura')) {
                bossPower = bossPower * 0.85; // Death Aura reduces boss counter-attack by 15%
            }
            if (uniqueSkills.includes('Guardian')) {
                bossPower = bossPower * 0.60; // Guardian reduces boss counter-attack by 40%
            }
            
            let bossDmg = randomInt(Math.floor(bossPower * 0.8), Math.floor(bossPower * 1.2));
            if (isBerserk) bossDmg = Math.floor(bossDmg * 1.20); // Berserk takes 20% more damage
            
            // Boss Skill Chance (15% base, reduced by War Cry, blocked by Smoke Bomb)
            let skillMsg = '';
            let extraDurabilityLoss = 0;
            let stunEffect = 0;
            
            let bossSkillChance = 0.15;
            if (uniqueSkills.includes('War Cry')) bossSkillChance -= 0.05;
            if (uniqueSkills.includes('Smoke Bomb')) bossSkillChance = 0;
            
            if (Math.random() < bossSkillChance) {
                const bossSkillsList = [
                    { name: '🔥 CRITICAL STRIKE', effect: () => { bossDmg *= 2; } },
                    { name: '☣️ CORROSIVE CLAW', effect: () => { extraDurabilityLoss = 5; } },
                    { name: '💫 STUN BLAST', effect: () => { stunEffect = 15000; } } // Extra 15s cooldown
                ];
                const selectedBossSkill = pickRandom(bossSkillsList);
                selectedBossSkill.effect();
                skillMsg = `\n⚠️ *BOSS SKILL:* ${selectedBossSkill.name}!`;
            }

            // Player defense reduces boss damage
            bossDmg = Math.max(5, bossDmg - Math.floor(stats.defense / 150)); 
            
            // Shield Aura skill bonus (reduces damage taken from boss)
            if (shieldLvl > 0) {
                bossDmg = Math.floor(bossDmg * (1 - shieldLvl * 0.01));
            }
            if (uniqueSkills.includes('Iron Skin')) {
                bossDmg = Math.floor(bossDmg * 0.70); // -30% damage taken
            }
            
            if (uniqueSkills.includes('Holy Shield') && Math.random() < 0.15) {
                bossDmg = 0;
                skillMsg += `\n🛡️ *HOLY SHIELD!* Serangan bos berhasil diblokir penuh!`;
            } else if (uniqueSkills.includes('Shadow Step') && Math.random() < 0.20) {
                bossDmg = 0;
                skillMsg += `\n💨 *SHADOW STEP!* Anda menghilang dan menghindari serangan bos!`;
            }
            
            if (uniqueSkills.includes('Reflect') && bossDmg > 0) {
                const reflectDmg = Math.floor(bossDmg * 0.20);
                damage += reflectDmg; // add reflected damage to boss damage
                skillMsg += `\n🪞 *REFLECT!* Memantulkan ${reflectDmg} damage kembali ke boss!`;
            }
            
            if (uniqueSkills.includes('Mana Shield') && bossDmg > 0) {
                const manaAbsorb = Math.floor(bossDmg * 0.25);
                bossDmg -= manaAbsorb;
                RPG.addHp(m.sender, Math.floor(manaAbsorb * 0.5)); // heal half of absorbed
                skillMsg += `\n🔮 *MANA SHIELD!* Menyerap ${manaAbsorb} damage!`;
            }
            
            if (uniqueSkills.includes('Time Warp')) {
                stunEffect = Math.floor(stunEffect * 0.5); // reduce stun duration by 50%
            }
            
            RPG.addHp(m.sender, -bossDmg);
            const currentPlayerHp = (RPG.getUser(m.sender).hp || 0);

            if (currentPlayerHp <= 0) {
                RPG.setHp(m.sender, 0);
                return m.reply(`💀 *KAMU TERLUKA PARAH!* 💀\n\n${skillMsg}\nSerangan balik dari *${raid.boss}* sebesar *${bossDmg}* DMG membuatmu pingsan!\nKamu tidak bisa menyerang sementara waktu. Gunakan *.heal* untuk memulihkan diri.`);
            }

            const res = Raid.attack(m.chat, m.sender, damage);
            
            // Update cooldown di db (Unix Timestamp)
            const { run } = require('../database');
            const cooldownExpire = Date.now() + stunEffect;
            try { run(`UPDATE rpg_users SET last_raid_attack = ? WHERE jid = ?`, [cooldownExpire, m.sender]); } catch {
                try { run(`ALTER TABLE rpg_users ADD COLUMN last_raid_attack TEXT`); run(`UPDATE rpg_users SET last_raid_attack = ? WHERE jid = ?`, [cooldownExpire, m.sender]); } catch {}
            }

            if (res.status === 'dead') {
                let rewardMsg = `🎊 *BOSS RAID ${res.raid.boss.toUpperCase()} DIKALAHKAN!* 🎊\n\n👾 Boss: *${res.raid.boss}*\n\n*KONTRIBUSI HADIAH:*`;
                const participants = Object.entries(res.raid.participants).sort((a, b) => b[1] - a[1]);
                const topContributorJid = participants[0][0];
                
                for (const [jid, dmg] of participants) {
                    let coinReward = Math.floor(dmg * 0.0005);
                    let expReward = Math.floor(dmg * 0.005);
                    
                    const targetUserRpg = RPG.getUser(jid);
                    let pUniqueSkills = [];
                    try { pUniqueSkills = JSON.parse(targetUserRpg.unique_skills || '[]'); } catch(e) {}
                    
                    if (pUniqueSkills.includes('Soul Reap')) {
                        coinReward = Math.floor(coinReward * 1.30);
                        expReward = Math.floor(expReward * 1.30);
                    }
                    if (pUniqueSkills.includes('War Cry')) {
                        expReward = Math.floor(expReward * 1.20);
                    }
                    if (pUniqueSkills.includes('Taunt')) {
                        coinReward = Math.floor(coinReward * 1.50);
                    }
                    
                    RPG.addCoin(jid, coinReward);
                    const expResult = RPG.addExp(jid, expReward);
                    
                    rewardMsg += `\n👤 @${jid.split('@')[0]}: ${formatNumber(dmg)} DMG -> 🪙 +${formatNumber(coinReward)} Koin RPG | ✨ +${formatNumber(expReward)} EXP`;
                    if (expResult.leveledUp) {
                        rewardMsg += `\n    🌟 *Naik Lvl ${expResult.newLevel}!*${expResult.newSkill ? ` 🎁 [${expResult.newSkill}]` : ''}`;
                    }
                    
                    const role = targetUserRpg.rpg_role || 'Beginner';
                    const attempts = pUniqueSkills.includes('Shadow Extraction') ? 5 : 3;
                    if (pUniqueSkills.includes('Arise') || role === 'Necromancer' || role === 'Shadow Monarch') {
                        RPG.setLastKill(jid, { name: res.raid.boss, power: Math.floor(100 * Math.pow(res.raid.id, 1.5)), attempts: attempts });
                        rewardMsg += `\n    👻 *ARISE!* Ketik *.arise* untuk mencoba membangkitkan bayangan ${res.raid.boss} (3 percobaan)!`;
                    }
                    
                    // --- BOSS AURA DROP SYSTEM ---
                    const auraId = `T${77 + res.raid.id}`;
                    let unlocked = [];
                    try { unlocked = JSON.parse(targetUserRpg.unlocked_auras || '[]'); } catch(e) {}

                    if (!unlocked.includes(auraId)) {
                        const killCount = RPG.addBossKill(jid, res.raid.id);
                        const auraDef = RPG_TITLES.find(t => t.id === auraId);
                        
                        // Drop chance: 1% (0.01) OR Pity at 77 kills
                        if (Math.random() < 0.01 || killCount >= 77) {
                            RPG.addUnlockedAura(jid, auraId);
                            rewardMsg += `\n    ✨ *AURA DROP!* Kamu mendapatkan Aura: *${auraDef ? auraDef.name : auraId}* ${killCount >= 77 ? '(Pity 77/77)' : '(LUCKY!)'}`;
                        } else {
                            rewardMsg += `\n    🔸 Progress Aura: *${killCount}/77* kills.`;
                        }
                    }
                    // -----------------------------

                    // Peluang drop item untuk semua peserta (Base 5% + Luck factor)
                    const participantStats = calculateTotalStats(jid, m.chat);
                    const raidDropChance = 0.05 * (1 + (participantStats.luck / 500)); // Every 500 luck doubles raid drop chance
                    if (Math.random() < raidDropChance) {
                        const itemType = pickRandom(ITEM_TYPES);
                        const item = generateRaidItem(res.raid.id, itemType);
                        if (item) {
                            RPG.addInventory(jid, itemType, JSON.stringify(item));
                            rewardMsg += `\n    🎁 *DROP:* ${item.rarity} ${item.name} (${item.set} Set)`;
                        }
                    }
                }
                
                // Bonus khusus untuk Top Contributor (30% chance for another set piece)
                if (Math.random() < 0.30) {
                    const itemType = pickRandom(ITEM_TYPES);
                    const item = generateRaidItem(res.raid.id, itemType);
                    if (item) {
                        RPG.addInventory(topContributorJid, itemType, JSON.stringify(item));
                        rewardMsg += `\n\n🏆 *LUCKY DROP (TOP CONTRIBUTOR):*\n✨ @${topContributorJid.split('@')[0]} mendapatkan bonus item set!\n📦 Item: ${item.name} (${item.rarity})`;
                    }
                }
                
                await m.reply(rewardMsg, { mentions: Object.keys(res.raid.participants) });
            } else {
                const label = multiplier > 1 ? ` (Admin Abuse x${multiplier}! 🔥)` : '';
                const critLabel = isCrit ? ' 🔥 (CRITICAL STRIKE! ⚔️)' : '';
                
                // Decrease Durability on Raid Attack
                const slots = ['weapon', 'helmet', 'armor', 'glove', 'legging', 'shoe'];
                const currentUserRpg = RPG.getUser(m.sender);
                for (const slot of slots) {
                    if (currentUserRpg[slot]) {
                        try {
                            const item = JSON.parse(userRpg[slot]);
                            if (item.durability > 0) {
                                item.durability -= (2 + extraDurabilityLoss);
                                if (item.durability < 0) item.durability = 0;
                                RPG.updateEquip(m.sender, slot, JSON.stringify(item));
                            }
                        } catch (e) {}
                    }
                }

                await m.reply(`⚔️ Kamu menyerang *${raid.boss}*!\n💥 Damage: *${formatNumber(res.damage)}*${label}${cappedLabel}${skillMsg}\n🩸 Sisa HP Boss: *${formatNumber(res.raid.currentHp)}*\n❤️ HP Kamu: ${currentPlayerHp} (-${bossDmg})`);
            }
        }
    },
    {
        name: 'raidstatus', aliases: ['rs'], category: 'rpg', desc: 'Cek status Boss Raid aktif', groupOnly: true,
        async execute({ sock, m }) {
            const raid = Raid.getStatus(m.chat);
            if (!raid) return m.reply('❌ Tidak ada Boss Raid yang aktif di grup ini.');
            
            let msg = `👾 *STATUS BOSS RAID* 👾\n\n`;
            msg += `👿 Boss: *${raid.boss}* ${raid.color}\n`;
            msg += `🩸 HP: *${formatNumber(raid.currentHp)} / ${formatNumber(raid.maxHp)}*\n`;
            msg += `⏳ Aktif sejak: ${new Date(raid.startTime).toLocaleTimeString()}\n\n`;
            
            const participants = Object.entries(raid.participants).sort((a, b) => b[1] - a[1]);
            if (participants.length > 0) {
                msg += `📊 *TOP CONTRIBUTORS:*\n`;
                participants.slice(0, 5).forEach(([jid, dmg], i) => {
                    msg += `${i + 1}. @${jid.split('@')[0]} - ${formatNumber(dmg)} DMG\n`;
                });
            }
            
            await m.reply(msg.trim(), { mentions: participants.map(p => p[0]) });
        }
    },
    {
        name: 'raidinfo', aliases: ['tierlist', 'bossinfo'], category: 'rpg', desc: 'Lihat tier list Boss Raid', usage: '[halaman]',
        async execute({ sock, m, args }) {
            const page = parseInt(args[0]) || 1;
            const perPage = 10;
            const totalPages = Math.ceil(RAID_BOSSES.length / perPage);
            
            if (page > totalPages) return m.reply(`❌ Halaman tidak ditemukan! Maksimal halaman: ${totalPages}`);
            
            let msg = `🏆 *RPG BOSS RAID TIER LIST (Hal ${page}/${totalPages})* 🏆\n\n`;
            
            const start = (page - 1) * perPage;
            const end = start + perPage;
            const bossesToShow = RAID_BOSSES.slice(start, end);
            
            bossesToShow.forEach((b, i) => {
                msg += `${start + i + 1}. *${b.name}* ${b.color}\n`;
                msg += `   └ 🩸 HP: ${formatNumber(b.hp)}\n`;
                msg += `   └ 💰 Cost: ${formatNumber(b.cost)} Coin\n`;
                msg += `   └ 📊 Stat Drop: ${formatNumber(b.baseStat)}\n`;
                msg += `   └ ✨ Rarity: ${b.rarity}\n\n`;
            });
            
            msg += `✨ *SET BONUS INFO:*\n`;
            msg += `• 3/5 Set: +10% Power & Defense\n`;
            msg += `• 5/5 Set: +25% Power & Defense\n\n`;
            msg += `_Gunakan *.raidinfo ${page + 1}* untuk halaman selanjutnya._\n`;
            msg += `_Gunakan *.summonraid <level>* untuk memanggil boss!_`;
            
            await m.reply(msg.trim());
        }
    },
    {
        name: 'surrenderraid', aliases: ['giveupraid', 'cancelraid'], category: 'rpg', desc: 'Menyerah dan hentikan Boss Raid yang sedang berlangsung', groupOnly: true,
        async execute({ sock, m }) {
            const raid = Raid.getStatus(m.chat);
            if (!raid) return m.reply('❌ Tidak ada Boss Raid yang sedang aktif.');
            
            const { isOwner } = require('../lib/functions');
            const isAdm = m.isAdmin || isOwner(m.sender);
            const isSummoner = raid.summonedBy === m.sender;
            
            if (!isAdm && !isSummoner) return m.reply('❌ Hanya Summoner atau Admin grup yang bisa membatalkan Raid!');
            
            Raid.stop(m.chat);
            
            await m.reply(`🏳️ *RAID DIBATALKAN* 🏳️\n\nBoss *${raid.boss}* telah meninggalkan arena karena kalian menyerah. Tidak ada hadiah yang diberikan.`);
        }
    },
    {
        name: 'sellitem', aliases: ['sell'], category: 'rpg', desc: 'Jual item dari inventory', usage: '<id_inv/all>',
        async execute({ sock, m, args }) {
            const arg = args[0]?.toLowerCase();
            if (!arg) return m.reply('❌ Masukkan ID item dari .inv atau ketik "all"!\nContoh: .sellitem 5 atau .sellitem all');
            
            const { RARITIES, GRADES } = require('../lib/rpg');
            
            if (arg === 'all') {
                const items = RPG.getInventory(m.sender);
                if (!items.length) return m.reply('🎒 Tas kamu kosong, tidak ada yang bisa dijual.');
                
                let totalSold = 0;
                let totalIncome = 0;
                
                for (const row of items) {
                    try {
                        const item = JSON.parse(row.item_data);
                        const rarity = RARITIES.find(r => r.name === item.rarity) || { mult: 1 };
                        const grade = GRADES.find(g => g.name === item.grade) || { mult: 1 };
                        const price = Math.floor(500 * (rarity.mult || 1) * (grade.mult || 1) * 0.5);
                        
                        RPG.removeInventory(row.id, row.amount);
                        totalIncome += price * row.amount;
                        totalSold++;
                    } catch (e) {}
                }
                
                RPG.addCoin(m.sender, totalIncome);
                return m.reply(`💰 *CUCI GUDANG BERHASIL!*\n\n📦 Total item dijual: ${totalSold}\n🪙 Total pendapatan: ${formatNumber(totalIncome)} Koin RPG.`);
            }

            const id = parseInt(arg);
            if (isNaN(id)) return m.reply('❌ Masukkan ID item dari .inv!\nContoh: .sellitem 5');
            
            const itemRow = RPG.getInventoryItem(id);
            if (!itemRow || itemRow.jid !== m.sender || itemRow.amount < 1) {
                return m.reply('❌ Item tidak ditemukan di tas kamu!');
            }
            
            try {
                const item = JSON.parse(itemRow.item_data);
                const rarity = RARITIES.find(r => r.name === item.rarity) || { mult: 1 };
                const grade = GRADES.find(g => g.name === item.grade) || { mult: 1 };
                const price = Math.floor(500 * (rarity.mult || 1) * (grade.mult || 1) * 0.5);
                
                RPG.removeInventory(id, 1);
                RPG.addCoin(m.sender, price);
                
                await m.reply(`💰 Berhasil menjual *${item.name}*!\n🪙 Mendapatkan: ${formatNumber(price)} Koin RPG.`);
            } catch (e) {
                await m.reply('❌ Gagal menjual item.');
            }
        }
    },
    {
        name: 'equipmentlist', aliases: ['equiplist', 'listequipment'], category: 'rpg', desc: 'Lihat daftar semua equipment yang ada di RPG',
        async execute({ sock, m }) {
            const { RPG_SHOP, RAID_BOSSES, ITEM_TYPES, RARITIES, GRADES } = require('../lib/rpg');
            
            let msg = `⚔️ *DAFTAR EQUIPMENT RPG* ⚔️\n\n`;
            
            msg += `🛒 *ITEM TOKO (SHOP ITEMS):*\n`;
            for (const category in RPG_SHOP) {
                msg += `🔹 *${category.toUpperCase()}*\n`;
                RPG_SHOP[category].forEach(item => {
                    msg += `   • [${item.id}] ${item.name} (🪙 ${formatNumber(item.price)})\n`;
                });
            }
            
            msg += `\n🌋 *ITEM RAID (RAID DROPS):*\n`;
            RAID_BOSSES.forEach(boss => {
                msg += `🔸 *SET ${boss.name.toUpperCase()}*\n`;
                for (const type in boss.drops) {
                    msg += `   • ${boss.drops[type]} (${type})\n`;
                }
            });
            
            msg += `\n✨ *RARITIES:* ` + RARITIES.map(r => r.name).join(', ');
            msg += `\n🏅 *GRADES:* ` + GRADES.map(g => g.name).join(', ');
            
            msg += `\n\n_Dapatkan item dari .attack atau .attackraid!_`;
            
            await m.reply(msg.trim());
        }
    },
    {
        name: 'skills', aliases: ['skill'], category: 'rpg', desc: 'Lihat dan upgrade skill RPG kamu', usage: '[upgrade <nama_skill>]',
        async execute({ sock, m, args }) {
            const { RPG } = require('../database');
            const { formatNumber } = require('../lib/functions');
            const skills = RPG.getSkills(m.sender);
            
            const action = args[0]?.toLowerCase();
            const skillName = args[1]?.toLowerCase();
            
            const skillInfo = {
                doublemine: { name: 'Double Mine', max: 50, desc: 'Peluang mendapat 2x hasil tambang' },
                crit: { name: 'Critical Strike', max: 50, desc: 'Peluang 2x damage saat attack/raid' },
                shield: { name: 'Shield Aura', max: 50, desc: 'Mengurangi damage boss raid' },
                greed: { name: 'Greed', max: 50, desc: 'Bonus Koin RPG saat menambang/bertarung' }
            };
            
            if (action === 'upgrade' && skillName) {
                if (!skillInfo[skillName]) return m.reply(`❌ Skill tidak ditemukan!\nPilih: ${Object.keys(skillInfo).join(', ')}`);
                
                const currentLevel = skills[skillName] || 0;
                const info = skillInfo[skillName];
                
                if (currentLevel >= info.max) return m.reply(`❌ Skill *${info.name}* sudah mencapai Max Level (${info.max})!`);
                
                const cost = Math.floor(50000 * Math.pow(1.2, currentLevel)); // Cost scales up exponentially
                const userCoins = RPG.getCoin(m.sender);
                
                if (userCoins < cost) return m.reply(`❌ Koin RPG tidak cukup untuk upgrade skill!\n💰 Butuh: 🪙 ${formatNumber(cost)}\n🪙 Koinmu: ${formatNumber(userCoins)}`);
                
                RPG.addCoin(m.sender, -cost);
                skills[skillName] = currentLevel + 1;
                RPG.saveSkills(m.sender, skills);
                
                return m.reply(`✅ *SKILL UPGRADE BERHASIL!*\n\n✨ Skill: ${info.name}\n🆙 Level: ${currentLevel} -> ${currentLevel + 1}\n💰 Biaya: 🪙 ${formatNumber(cost)} Koin RPG\n\n_Efek: +1% peluang/efek per level_`);
            }
            
            let text = `╭───「 🌟 *RPG SKILLS* 」\n│\n`;
            for (const key in skillInfo) {
                const lvl = skills[key] || 0;
                const max = skillInfo[key].max;
                text += `│ 🔹 *${skillInfo[key].name}* (Lv. ${lvl}/${max})\n`;
                text += `│    └ _${skillInfo[key].desc} (+${lvl}%)_\n│\n`;
            }
            text += `╰──────────────\n\n_Ketik .skills upgrade <nama_skill> untuk menaikkan level._\n_Biaya: bertahap menggunakan Koin RPG._`;
            
            await m.reply(text);
        }
    },
    {
        name: 'equipbest', aliases: ['bestequip'], category: 'rpg', desc: 'Otomatis pakai equipment terbaik di inventory',
        async execute({ sock, m }) {
            const { RPG } = require('../database');
            const items = RPG.getInventory(m.sender);
            if (!items.length) return m.reply('🎒 Tas kamu kosong, tidak ada item untuk dipakai.');
            
            const userRpg = RPG.getUser(m.sender);
            const slots = ['weapon', 'helmet', 'armor', 'glove', 'legging', 'shoe'];
            
            let bestItems = {};
            let equippedCount = 0;
            
            items.forEach((row) => {
                try {
                    const item = JSON.parse(row.item_data);
                    if (slots.includes(item.type)) {
                        const score = (item.stats.power || 0) + (item.stats.defense || 0) + (item.stats.luck || 0);
                        if (!bestItems[item.type] || score > bestItems[item.type].score) {
                            bestItems[item.type] = { id: row.id, item: item, score: score, row: row };
                        }
                    }
                } catch(e) {}
            });
            
            for (const slot of slots) {
                let currentEquip = null;
                try {
                    if (userRpg[slot]) currentEquip = JSON.parse(userRpg[slot]);
                } catch(e) {}
                
                const currentScore = currentEquip ? (currentEquip.stats.power || 0) + (currentEquip.stats.defense || 0) + (currentEquip.stats.luck || 0) : -1;
                
                const bestInInv = bestItems[slot];
                
                if (bestInInv && bestInInv.score > currentScore) {
                    RPG.updateEquip(m.sender, slot, JSON.stringify(bestInInv.item));
                    RPG.removeInventory(bestInInv.id, 1);
                    
                    if (currentEquip) {
                        RPG.addInventory(m.sender, slot, JSON.stringify(currentEquip), 1);
                    }
                    equippedCount++;
                }
            }
            
            if (equippedCount > 0) {
                await m.reply(`✅ Berhasil otomatis memakai *${equippedCount}* equipment terbaik!\n\n_Ketik .inv untuk melihat equipment yang sedang dipakai._`);
            } else {
                await m.reply(`✅ Equipment yang sedang kamu pakai sudah yang terbaik!`);
            }
        }
    }
];
