const { Users, GroupLevels } = require('../database');
const { formatNumber } = require('../lib/functions');

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
    }
];
