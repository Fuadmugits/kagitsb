const fs = require('fs');
const path = require('path');
const config = require('../config');
const { serialize } = require('./serialize');
const { isOwner, getNumberFromJid } = require('./functions');
const { Users, CommandLogs, AFK, CustomCommands, Settings, GroupLevels } = require('../database');

// Command registry
const commands = new Map();

/**
 * Load all command files from the commands/ directory
 */
function loadCommands() {
    const commandsDir = path.join(__dirname, '..', 'commands');
    const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js') && f !== '_index.js');

    let totalLoaded = 0;
    for (const file of files) {
        try {
            const cmds = require(path.join(commandsDir, file));
            if (Array.isArray(cmds)) {
                for (const cmd of cmds) {
                    if (cmd.name) {
                        commands.set(cmd.name, cmd);
                        if (cmd.aliases) {
                            for (const alias of cmd.aliases) {
                                commands.set(alias, cmd);
                            }
                        }
                        totalLoaded++;
                    }
                }
            }
        } catch (e) {
            console.error(`❌ Error loading ${file}:`, e.message);
        }
    }
    console.log(`📦 Loaded ${totalLoaded} commands from ${files.length} files`);
}

/**
 * Main message handler
 */
async function handleMessage(sock, rawMsg, io) {
    try {
        const m = serialize(rawMsg, sock);
        if (!m || !m.body) return;

        // Bot mode check
        if (config.bot.mode === 'self' && !m.fromMe && !isOwner(m.sender)) return;

        // Auto-read
        if (config.bot.autoRead) {
            await sock.readMessages([m.key]);
        }

        // Register user
        const user = Users.getOrCreate(m.sender, m.pushName);
        if (user.name !== m.pushName && m.pushName !== 'Unknown') {
            Users.updateName(m.sender, m.pushName);
        }

        // Auto-Moderator Interceptor (Group Only)
        if (m.isGroup && !isOwner(m.sender)) {
            const groupMeta = await sock.groupMetadata(m.chat);
            const isAdmin = groupMeta.participants.find(p => p.id === m.sender)?.admin;
            const botJid = sock.user.id.replace(/:\d+/, '') + '@s.whatsapp.net';
            const isBotAdmin = groupMeta.participants.find(p => p.id === botJid)?.admin;

            // Anti-Link
            if (Settings.get(`antilink_${m.chat}`) === 'true' && !isAdmin) {
                if (m.body.match(/(chat\.whatsapp\.com\/)/gi)) {
                    await m.reply('🚫 *Anti-Link Detected!*\n\nKamu telah mengirimkan link grup WhatsApp lain. Sesuai aturan, pesan akan dihapus dan kamu akan dikeluarkan.');
                    if (isBotAdmin) {
                        try {
                            await sock.sendMessage(m.chat, { delete: m.key });
                            await sock.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
                        } catch (e) { console.error('Failed to kick/delete:', e.message); }
                    }
                    return; // Stop processing further
                }
            }

            // Anti-Toxic
            if (Settings.get(`antitoxic_${m.chat}`) === 'true' && !isAdmin) {
                const toxicWords = ['anjing', 'babi', 'bangsat', 'kontol', 'memek', 'ngentot', 'tolol', 'goblok', 'bgst'];
                const bodyLower = m.body.toLowerCase();
                const isToxic = toxicWords.some(word => bodyLower.includes(word));
                if (isToxic) {
                    await m.reply('🚫 *Anti-Toxic Detected!*\n\nTolong jaga bahasamu di grup ini!');
                    if (isBotAdmin) {
                        try { await sock.sendMessage(m.chat, { delete: m.key }); } catch { }
                    }
                    return; // Stop processing
                }
            }
        }

        // 🐺 Werewolf: Auto-delete messages from dead players in group
        if (m.isGroup && global.werewolfGames?.has(m.chat)) {
            const { isPlayerDeadInGame } = require('./werewolf');
            const deadGame = isPlayerDeadInGame(m.chat, m.sender);
            if (deadGame) {
                try {
                    await sock.sendMessage(m.chat, { delete: m.key });
                } catch (e) {
                    console.error('WW: Failed to delete dead player msg:', e.message);
                }
                try {
                    await sock.sendMessage(m.sender, {
                        text: `💀 *Kamu sudah mati di game Werewolf!*\n\nPesan kamu di grup telah dihapus otomatis agar tidak membocorkan informasi.\nTunggu sampai game selesai untuk bisa chat lagi di grup.`
                    });
                } catch (e) { /* ignore DM fail */ }
                return; // Stop processing
            }
        }

        // Per-Group Leveling System (Add 1 EXP per message with anti-spam)
        if (m.isGroup && !m.body.startsWith(config.bot.prefix)) {
            const levelUpInfo = GroupLevels.addExp(m.sender, m.chat);
            if (levelUpInfo.leveledUp && Settings.get('leveling_notify') !== 'false') {
                const tag = `@${m.sender.split('@')[0]}`;
                
                if (levelUpInfo.gotNewTitle) {
                    // 🎊 Special celebration every 5 levels — NEW TITLE UNLOCKED!
                    const profile = GroupLevels.getProfile(m.sender, m.chat);
                    let text = `╭──「 🎊✨ *TITLE UNLOCKED!* ✨🎊 」──╮\n│\n`;
                    text += `│ 🎉 Selamat ${tag}!\n│\n`;
                    text += `│ 📈 Level: *${levelUpInfo.newLevel}*\n`;
                    text += `│ 🏅 Title Baru: *${levelUpInfo.newTitle}*\n│\n`;
                    text += `│ _Title diberikan otomatis setiap_\n`;
                    text += `│ _naik 5 level. Terus aktif!_ 🔥\n│\n`;
                    text += `╰──────────────────────────╯`;
                    await sock.sendMessage(m.chat, { text, mentions: [m.sender] });
                } else {
                    // Simple level-up notification
                    const text = `📈 *Level Up!* ${tag} naik ke *Level ${levelUpInfo.newLevel}*! 🎉`;
                    await sock.sendMessage(m.chat, { text, mentions: [m.sender] });
                }
            }
        }

        // Check banned
        if (user.is_banned && !isOwner(m.sender)) return;

        // AFK check - notify if mentioned/replied user is AFK
        if (m.mentionedJid?.length > 0) {
            for (const jid of m.mentionedJid) {
                const afk = AFK.get(jid);
                if (afk) {
                    const since = new Date(afk.timestamp);
                    const diff = Math.floor((Date.now() - since.getTime()) / 1000);
                    const mins = Math.floor(diff / 60);
                    await m.reply(`⏳ User tersebut sedang AFK${afk.reason ? `: ${afk.reason}` : ''}\n⏰ Sejak: ${mins} menit yang lalu`);
                }
            }
        }

        // Remove AFK when user sends a message
        const senderAfk = AFK.get(m.sender);
        if (senderAfk) {
            AFK.remove(m.sender);
            const since = new Date(senderAfk.timestamp);
            const diff = Math.floor((Date.now() - since.getTime()) / 1000);
            const mins = Math.floor(diff / 60);
            await m.reply(`👋 Selamat datang kembali!\n⏰ Kamu AFK selama ${mins} menit`);
        }

        // Game Interceptor (Check answers for active games)
        if (global.activeGames) {
            const activeGame = global.activeGames.get(m.chat);
            if (activeGame) {
                // Jika game wajib reply, cek apakah user mereply pesan bot
                if (activeGame.msgId && (!m.quoted || m.quoted.key.id !== activeGame.msgId)) return;
                
                const answerLower = m.body.toLowerCase().trim();
                if (answerLower === activeGame.answer) {
                    const reward = activeGame.reward || 500;
                    Users.addBalance(m.sender, reward);
                    await m.reply(`🎉 BENAR!\n\nJawaban: ${activeGame.answer}\nHadiah: +${reward} balance\nSelamat kepada @${m.sender.split('@')[0]}!`, { mentions: [m.sender] });
                    global.activeGames.delete(m.chat);
                    return; // Stop processing so it doesn't trigger other commands
                }
            }
        }

        // Check custom commands
        const customCmd = CustomCommands.get(m.body.toLowerCase().trim());
        if (customCmd) {
            await m.reply(customCmd.response);
            return;
        }

        // Parse command
        const prefix = config.bot.prefix;
        if (!m.body.startsWith(prefix)) return;

        const fullCmd = m.body.slice(prefix.length).trim();
        const args = fullCmd.split(/\s+/);
        const cmdName = args.shift()?.toLowerCase();
        const text = args.join(' ');

        if (!cmdName) return;

        // Find command
        const command = commands.get(cmdName);
        if (!command) return;

        // Permission checks
        if (command.ownerOnly && !isOwner(m.sender)) {
            return m.reply('❌ Perintah ini hanya untuk owner bot!');
        }

        if (command.groupOnly && !m.isGroup) {
            return m.reply('❌ Perintah ini hanya bisa digunakan di grup!');
        }

        if (command.privateOnly && m.isGroup) {
            return m.reply('❌ Perintah ini hanya bisa digunakan di chat pribadi!');
        }

        if (command.premiumOnly && !Users.isPremium(m.sender) && !m.fromMe && !isOwner(m.sender)) {
            return m.reply('🔸 Fitur ini khusus untuk user *PREMIUM*!\nKetik *.buy premium* untuk info lebih lanjut.');
        }

        // Admin check for group commands
        if (command.adminOnly && m.isGroup) {
            const groupMeta = await sock.groupMetadata(m.chat);
            const isAdmin = groupMeta.participants.find(p => p.id === m.sender)?.admin;
            if (!isAdmin && !m.fromMe && !isOwner(m.sender)) {
                return m.reply('❌ Perintah ini hanya untuk admin grup!');
            }
        }

        // Bot admin check
        if (command.botAdminOnly && m.isGroup) {
            const groupMeta = await sock.groupMetadata(m.chat);
            const botJid = sock.user.id.replace(/:\d+/, '');
            const isBotAdmin = groupMeta.participants.find(p => p.id === botJid)?.admin;
            if (!isBotAdmin) {
                return m.reply('❌ Bot harus menjadi admin grup untuk menggunakan perintah ini!');
            }
        }

        // Limit check
        if (!m.fromMe && !isOwner(m.sender) && !Users.isPremium(m.sender) && !command.noLimit) {
            if (user.limit_count <= 0) {
                return m.reply('❌ Limit harian kamu sudah habis!\n\n💡 Gunakan *.claim* untuk klaim limit harian\n🔸 Atau upgrade ke *PREMIUM* untuk limit unlimited!');
            }
            Users.deductLimit(m.sender);
        }

        // Auto typing
        if (config.bot.autoTyping) {
            await sock.sendPresenceUpdate('composing', m.chat);
        }

        // Log command
        CommandLogs.create(m.sender, cmdName, m.chat, m.isGroup);

        // Emit to dashboard
        if (io) {
            io.emit('command', {
                user: m.pushName,
                jid: m.sender,
                command: cmdName,
                chat: m.chat,
                isGroup: m.isGroup,
                timestamp: Date.now(),
            });
        }

        // Execute command
        await command.execute({ sock, m, args, text, prefix, config, command });

    } catch (e) {
        console.error('Handler error:', e);
    }
}

/**
 * Get all registered commands
 */
function getCommands() {
    const unique = new Map();
    for (const [key, cmd] of commands) {
        if (key === cmd.name) unique.set(key, cmd);
    }
    return Array.from(unique.values());
}

/**
 * Get command count
 */
function getCommandCount() {
    return getCommands().length;
}

module.exports = { loadCommands, handleMessage, getCommands, getCommandCount, commands };
