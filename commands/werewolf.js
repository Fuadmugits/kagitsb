const ww = require('../lib/werewolf');
const { Users } = require('../database');

const NIGHT_TIMEOUT = 90000;
const DISCUSS_TIMEOUT = 180000;
const VOTE_TIMEOUT = 60000;
const HUNTER_TIMEOUT = 30000;

/** Helper: send night DMs to all alive players with roles */
async function sendNightDMs(sock, game) {
    for (const [jid, player] of game.players) {
        if (!player.alive) continue;
        const prompt = ww.getNightPrompt(game, jid);
        if (prompt) {
            try {
                await sock.sendMessage(jid, { text: prompt.text });
            } catch (e) {
                console.error(`WW: Failed to DM ${jid}:`, e.message);
            }
        }
    }
}

/** Helper: announce to group */
async function announce(sock, groupJid, text, mentions = []) {
    await sock.sendMessage(groupJid, { text, mentions });
}

/** Helper: build mentions array from game players */
function getAllMentions(game) {
    return Array.from(game.players.keys());
}

/** Helper: process night resolution and transition to day */
async function processNightEnd(sock, game, groupJid) {
    ww.clearAllTimers(game);
    const nightResult = ww.resolveNight(game);

    // Check hunter trigger
    if (nightResult.hunterTriggered) {
        game.phase = ww.PHASE.HUNTER_REVENGE;
        let msg = `🌅 *PAGI HARI ${game.dayCount + 1}*\n\n`;
        msg += nightResult.events.join('\n') + '\n\n';
        msg += `🏹 *${game.players.get(game.pendingHunter).name}* adalah seorang Pemburu!\nDia bisa menembak 1 pemain sebelum mati!\n\n⏳ Waktu: 30 detik`;
        await announce(sock, groupJid, msg, getAllMentions(game));

        try {
            await sock.sendMessage(game.pendingHunter, {
                text: `🏹 *PEMBURU — BALAS DENDAM!*\n\nKamu telah terbunuh! Tapi sebagai Pemburu, kamu bisa membawa 1 orang bersamamu!\n\nPilih target:\n${ww.getAlivePlayerListText(game)}\n⚡ Ketik: *.wshoot @target*\n⏳ Waktu: 30 detik`
            });
        } catch (e) { /* ignore */ }

        game.timers.hunter = setTimeout(async () => {
            if (game.pendingHunter) {
                game.pendingHunter = null;
                await announce(sock, groupJid, `⏳ Pemburu tidak menembak siapa-siapa!`);
                await transitionToDay(sock, game, groupJid);
            }
        }, HUNTER_TIMEOUT);
        return;
    }

    await transitionToDay(sock, game, groupJid, nightResult);
}

/** Helper: transition to day phase */
async function transitionToDay(sock, game, groupJid, nightResult = null) {
    // Check win before day
    const winner = ww.checkWin(game);
    if (winner) {
        await announceWinner(sock, game, groupJid, winner);
        return;
    }

    ww.startDay(game);
    const alive = ww.getAlivePlayers(game);

    let msg = `☀️ *SIANG HARI ${game.dayCount}*\n\n`;
    if (nightResult) {
        msg += nightResult.events.join('\n') + '\n\n';
    }
    msg += `👥 Pemain hidup: ${alive.length}\n`;
    msg += `${alive.map(([j, p]) => `  💚 ${p.name}`).join('\n')}\n\n`;
    msg += `💬 Saatnya diskusi! Cari tahu siapa Werewolf-nya!\n⏳ Waktu diskusi: 3 menit\n\n`;
    msg += `_Setelah diskusi, ketik *.wvote @pemain* untuk voting eliminasi._`;

    await announce(sock, groupJid, msg, getAllMentions(game));

    // Auto transition to vote after discuss timeout
    game.timers.discuss = setTimeout(async () => {
        if (game.phase === ww.PHASE.DAY_DISCUSS) {
            ww.startVoting(game);
            let voteMsg = `🗳️ *WAKTU VOTING!*\n\nWaktu diskusi habis! Saatnya vote!\n\n`;
            voteMsg += `Pemain hidup:\n${ww.getAlivePlayerListText(game)}\n`;
            voteMsg += `⚡ Ketik: *.wvote @pemain*\n⏳ Waktu: 60 detik`;
            await announce(sock, groupJid, voteMsg, getAllMentions(game));

            game.timers.vote = setTimeout(async () => {
                if (game.phase === ww.PHASE.DAY_VOTE) {
                    await processVoteEnd(sock, game, groupJid);
                }
            }, VOTE_TIMEOUT);
        }
    }, DISCUSS_TIMEOUT);
}

/** Helper: process vote resolution */
async function processVoteEnd(sock, game, groupJid) {
    ww.clearAllTimers(game);
    const voteResult = ww.resolveVotes(game);

    let msg = `📊 *HASIL VOTING*\n\n`;
    if (voteResult.voteSummary) {
        msg += `📝 Detail vote:\n${voteResult.voteSummary.join('\n')}\n\n`;
    }
    msg += voteResult.events.join('\n');

    await announce(sock, groupJid, msg, getAllMentions(game));

    // Hunter check
    if (voteResult.hunterTriggered) {
        game.phase = ww.PHASE.HUNTER_REVENGE;
        await announce(sock, groupJid, `🏹 *${game.players.get(game.pendingHunter).name}* adalah Pemburu! Dia bisa menembak 1 pemain!`);
        try {
            await sock.sendMessage(game.pendingHunter, {
                text: `🏹 *PEMBURU — BALAS DENDAM!*\n\nPilih target:\n${ww.getAlivePlayerListText(game)}\n⚡ Ketik: *.wshoot @target*\n⏳ 30 detik`
            });
        } catch (e) { /* ignore */ }

        game.timers.hunter = setTimeout(async () => {
            if (game.pendingHunter) {
                game.pendingHunter = null;
                await announce(sock, groupJid, `⏳ Pemburu tidak menembak.`);
                await postVoteTransition(sock, game, groupJid);
            }
        }, HUNTER_TIMEOUT);
        return;
    }

    await postVoteTransition(sock, game, groupJid);
}

/** Helper: after vote (and optional hunter), check win or go to night */
async function postVoteTransition(sock, game, groupJid) {
    const winner = ww.checkWin(game);
    if (winner) {
        await announceWinner(sock, game, groupJid, winner);
        return;
    }

    // Start night
    ww.startNight(game);
    let nightMsg = `🌙 *MALAM ${game.nightCount}*\n\n`;
    nightMsg += `Desa tertidur... Para makhluk malam beraksi.\n\n`;
    nightMsg += `_Pemain dengan peran khusus, cek DM untuk melakukan aksi malam!_`;
    await announce(sock, groupJid, nightMsg, getAllMentions(game));

    await sendNightDMs(sock, game);

    game.timers.night = setTimeout(async () => {
        if (game.phase === ww.PHASE.NIGHT) {
            await processNightEnd(sock, game, groupJid);
        }
    }, NIGHT_TIMEOUT);
}

/** Helper: announce winner */
async function announceWinner(sock, game, groupJid, winner) {
    const roleList = ww.getPlayerListText(game, true);
    let msg = '';

    if (winner === 'werewolf') {
        msg = `╭──「 🐺 𝙶𝙰𝙼𝙴 𝙾𝚅𝙴𝚁 」──╮\n│\n│ 🐺 *WEREWOLF MENANG!* 🐺\n│\n│ Para Werewolf berhasil menguasai desa!\n│\n│ 📋 *Daftar Peran:*\n${roleList}\n╰────────────────────────╯`;
    } else {
        msg = `╭──「 🏆 𝙶𝙰𝙼𝙴 𝙾𝚅𝙴𝚁 」──╮\n│\n│ 🎉 *WARGA MENANG!* 🎉\n│\n│ Semua Werewolf berhasil dieliminasi!\n│\n│ 📋 *Daftar Peran:*\n${roleList}\n╰────────────────────────╯`;
    }

    // Reward alive winners
    const alive = ww.getAlivePlayers(game);
    for (const [jid, p] of alive) {
        const isWinnerTeam = (winner === 'werewolf' && p.role === 'WEREWOLF') ||
                             (winner === 'villager' && p.role !== 'WEREWOLF');
        if (isWinnerTeam) {
            Users.addBalance(jid, 2000);
        }
    }

    await announce(sock, groupJid, msg, getAllMentions(game));
    ww.endGame(groupJid);
}

/** Helper: resolve a target JID from mentions or text */
function resolveTarget(m, args, game) {
    let targetJid = m.mentionedJid?.[0] || m.quoted?.sender;
    if (!targetJid && args[0]) {
        const num = args[0].replace(/[^0-9]/g, '');
        if (num) targetJid = num + '@s.whatsapp.net';
    }
    return targetJid;
}

module.exports = [
    {
        name: 'werewolf',
        aliases: ['ww'],
        category: 'games',
        desc: 'Buat lobby game Werewolf',
        groupOnly: true,
        noLimit: true,
        async execute({ sock, m }) {
            const result = ww.createGame(m.chat, m.sender, m.pushName);
            if (!result.success) return m.reply(`❌ ${result.error}`);

            let text = `╭──「 🐺 𝚆𝙴𝚁𝙴𝚆𝙾𝙻𝙵 」──╮\n`;
            text += `│\n`;
            text += `│ 🎮 Lobby Werewolf dibuat!\n`;
            text += `│ 👤 Creator: ${m.pushName}\n`;
            text += `│ 👥 Pemain: 1/16\n`;
            text += `│\n`;
            text += `│ 📝 Cara bermain:\n`;
            text += `│ *.wjoin* — Bergabung\n`;
            text += `│ *.wleave* — Keluar\n`;
            text += `│ *.wstart* — Mulai (min 6)\n`;
            text += `│\n`;
            text += `│ 🐺 Roles:\n`;
            text += `│ 🐺 Werewolf — Membunuh warga\n`;
            text += `│ 🔮 Peramal — Cek peran pemain\n`;
            text += `│ 💉 Dokter — Lindungi pemain\n`;
            text += `│ 🏹 Pemburu — Tembak saat mati\n`;
            text += `│ 👤 Warga — Vote eliminasi\n`;
            text += `│\n`;
            text += `╰────────────────────────╯`;

            await sock.sendMessage(m.chat, { text, mentions: [m.sender] }, { quoted: m.raw });
        }
    },
    {
        name: 'wjoin',
        category: 'games',
        desc: 'Bergabung ke lobby Werewolf',
        groupOnly: true,
        noLimit: true,
        async execute({ sock, m }) {
            const result = ww.joinGame(m.chat, m.sender, m.pushName);
            if (!result.success) return m.reply(`❌ ${result.error}`);
            await m.reply(`✅ *${m.pushName}* bergabung! (${result.playerCount}/16 pemain)\n\n_Ketik *.wstart* untuk mulai (min 6 pemain)_`);
        }
    },
    {
        name: 'wleave',
        category: 'games',
        desc: 'Keluar dari lobby Werewolf',
        groupOnly: true,
        noLimit: true,
        async execute({ m }) {
            const result = ww.leaveGame(m.chat, m.sender);
            if (!result.success) return m.reply(`❌ ${result.error}`);
            if (result.disbanded) return m.reply(`🚪 Creator keluar! Lobby dibubarkan.`);
            await m.reply(`🚪 *${m.pushName}* keluar dari lobby. (${result.playerCount} pemain tersisa)`);
        }
    },
    {
        name: 'wstart',
        category: 'games',
        desc: 'Mulai game Werewolf',
        groupOnly: true,
        noLimit: true,
        async execute({ sock, m }) {
            const result = ww.startGame(m.chat, m.sender);
            if (!result.success) return m.reply(`❌ ${result.error}`);

            const game = result.game;

            // Send role DMs
            let roleMsg = `🎮 *GAME DIMULAI!*\n\n🐺 Werewolf telah menyusup ke desa...\n\n_Cek DM untuk mengetahui peranmu!_\n\n`;
            roleMsg += `👥 Pemain:\n`;
            for (const [jid, p] of game.players) {
                roleMsg += `  • ${p.name}\n`;
            }
            await announce(sock, m.chat, roleMsg, getAllMentions(game));

            // DM roles to each player
            for (const [jid, player] of game.players) {
                const role = ww.ROLES[player.role];
                try {
                    await sock.sendMessage(jid, {
                        text: `╭──「 🐺 𝚆𝙴𝚁𝙴𝚆𝙾𝙻𝙵 」──╮\n│\n│ 🎭 Peranmu: *${role.emoji} ${role.name}*\n│ 📖 ${role.desc}\n│ 👥 Tim: ${role.team === 'evil' ? '🔴 Evil' : '🟢 Good'}\n│\n│ _Jangan beritahu siapapun!_\n╰────────────────────────╯`
                    });
                } catch (e) {
                    console.error(`WW: Can't DM ${jid}:`, e.message);
                }
            }

            // Start first night after a short delay
            setTimeout(async () => {
                ww.startNight(game);
                let nightMsg = `🌙 *MALAM 1*\n\nDesa tertidur... Para makhluk malam mulai beraksi.\n\n_Pemain dengan peran khusus, cek DM!_`;
                await announce(sock, m.chat, nightMsg, getAllMentions(game));
                await sendNightDMs(sock, game);

                game.timers.night = setTimeout(async () => {
                    if (game.phase === ww.PHASE.NIGHT) {
                        await processNightEnd(sock, game, m.chat);
                    }
                }, NIGHT_TIMEOUT);
            }, 3000);
        }
    },
    {
        name: 'wvote',
        category: 'games',
        desc: 'Vote eliminasi pemain',
        groupOnly: true,
        noLimit: true,
        usage: '(@pemain)',
        async execute({ sock, m, args }) {
            const game = global.werewolfGames?.get(m.chat);
            if (!game) return m.reply('❌ Tidak ada game Werewolf aktif!');

            // Allow voting during discuss phase too (auto-transition to vote)
            if (game.phase === ww.PHASE.DAY_DISCUSS) {
                ww.startVoting(game);
                ww.clearAllTimers(game);
            }

            if (game.phase !== ww.PHASE.DAY_VOTE) return m.reply('❌ Sekarang bukan fase voting!');

            const targetJid = resolveTarget(m, args, game);
            if (!targetJid) return m.reply('❌ Tag pemain yang ingin di-vote!\nContoh: *.wvote @pemain*');

            const result = ww.castVote(m.chat, m.sender, targetJid);
            if (!result.success) return m.reply(`❌ ${result.error}`);

            await m.reply(`🗳️ *${result.voterName}* vote untuk *${result.targetName}* (${result.voteCount}/${result.totalAlive})`);

            if (result.allVoted) {
                await processVoteEnd(sock, game, m.chat);
            }
        }
    },
    {
        name: 'wkill',
        category: 'games',
        desc: 'Werewolf: pilih target bunuh (DM)',
        noLimit: true,
        async execute({ sock, m, args }) {
            const found = ww.findGameForPlayer(m.sender);
            if (!found) return m.reply('❌ Kamu tidak sedang dalam game Werewolf!');
            const { groupJid, game } = found;

            const targetJid = resolveTarget(m, args, game);
            if (!targetJid) return m.reply('❌ Tag target!\nContoh: *.wkill @pemain*');

            const result = ww.werewolfAction(groupJid, m.sender, targetJid);
            if (!result.success) return m.reply(`❌ ${result.error}`);

            await m.reply(`🐺 Target: *${result.targetName}*${result.allVoted ? '\n✅ Semua Werewolf sudah memilih!' : '\n⏳ Menunggu Werewolf lain...'}`);

            if (result.allVoted && ww.isNightComplete(game)) {
                await processNightEnd(sock, game, groupJid);
            }
        }
    },
    {
        name: 'wsee',
        category: 'games',
        desc: 'Peramal: cek peran pemain (DM)',
        noLimit: true,
        async execute({ sock, m, args }) {
            const found = ww.findGameForPlayer(m.sender);
            if (!found) return m.reply('❌ Kamu tidak sedang dalam game Werewolf!');
            const { groupJid, game } = found;

            const targetJid = resolveTarget(m, args, game);
            if (!targetJid) return m.reply('❌ Tag target!\nContoh: *.wsee @pemain*');

            const result = ww.seerAction(groupJid, m.sender, targetJid);
            if (!result.success) return m.reply(`❌ ${result.error}`);

            const verdict = result.isWolf
                ? `🔴 *${result.targetName}* adalah *${result.emoji} ${result.role}*! BERBAHAYA!`
                : `🟢 *${result.targetName}* adalah *${result.emoji} ${result.role}*. Aman.`;

            await m.reply(`🔮 *HASIL RAMALAN*\n\n${verdict}`);

            if (ww.isNightComplete(game)) {
                await processNightEnd(sock, game, groupJid);
            }
        }
    },
    {
        name: 'wheal',
        category: 'games',
        desc: 'Dokter: lindungi pemain (DM)',
        noLimit: true,
        async execute({ sock, m, args }) {
            const found = ww.findGameForPlayer(m.sender);
            if (!found) return m.reply('❌ Kamu tidak sedang dalam game Werewolf!');
            const { groupJid, game } = found;

            const targetJid = resolveTarget(m, args, game);
            if (!targetJid) return m.reply('❌ Tag target!\nContoh: *.wheal @pemain*');

            const result = ww.doctorAction(groupJid, m.sender, targetJid);
            if (!result.success) return m.reply(`❌ ${result.error}`);

            await m.reply(`💉 Kamu melindungi *${result.targetName}* malam ini.`);

            if (ww.isNightComplete(game)) {
                await processNightEnd(sock, game, groupJid);
            }
        }
    },
    {
        name: 'wshoot',
        category: 'games',
        desc: 'Pemburu: tembak saat mati (DM)',
        noLimit: true,
        async execute({ sock, m, args }) {
            const found = ww.findGameForPlayer(m.sender);
            if (!found) return m.reply('❌ Kamu tidak sedang dalam game Werewolf!');
            const { groupJid, game } = found;

            const targetJid = resolveTarget(m, args, game);
            if (!targetJid) return m.reply('❌ Tag target!\nContoh: *.wshoot @pemain*');

            const result = ww.hunterShoot(groupJid, m.sender, targetJid);
            if (!result.success) return m.reply(`❌ ${result.error}`);

            ww.clearAllTimers(game);
            await announce(sock, groupJid,
                `🏹💥 Pemburu menembak *${result.targetName}*!\nDia adalah *${result.targetRole.emoji} ${result.targetRole.name}*!`,
                getAllMentions(game)
            );

            // Continue game flow
            const winner = ww.checkWin(game);
            if (winner) {
                await announceWinner(sock, game, groupJid, winner);
            } else if (game.dayCount === 0) {
                await transitionToDay(sock, game, groupJid);
            } else {
                await postVoteTransition(sock, game, groupJid);
            }
        }
    },
    {
        name: 'wstatus',
        category: 'games',
        desc: 'Lihat status game Werewolf',
        groupOnly: true,
        noLimit: true,
        async execute({ m }) {
            const game = global.werewolfGames?.get(m.chat);
            if (!game) return m.reply('❌ Tidak ada game Werewolf aktif!');
            await m.reply(ww.getStatusText(game));
        }
    },
    {
        name: 'wend',
        category: 'games',
        desc: 'Akhiri game Werewolf paksa',
        groupOnly: true,
        noLimit: true,
        async execute({ sock, m }) {
            const game = global.werewolfGames?.get(m.chat);
            if (!game) return m.reply('❌ Tidak ada game Werewolf aktif!');

            const { isOwner } = require('../lib/functions');
            if (m.sender !== game.creator && !isOwner(m.sender)) {
                // Check if sender is group admin
                const meta = await sock.groupMetadata(m.chat);
                const isAdmin = meta.participants.find(p => p.id === m.sender)?.admin;
                if (!isAdmin) return m.reply('❌ Hanya creator game atau admin grup yang bisa mengakhiri game!');
            }

            const roleList = ww.getPlayerListText(game, true);
            ww.endGame(m.chat);
            await m.reply(`🛑 *Game Werewolf diakhiri paksa!*\n\n📋 Daftar peran:\n${roleList}`);
        }
    },
];
