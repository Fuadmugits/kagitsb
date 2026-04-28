/**
 * 🐺 Werewolf Game Engine
 * Social deduction game for WhatsApp groups
 */

const ROLES = {
    WEREWOLF: { name: 'Werewolf', emoji: '🐺', team: 'evil', desc: 'Membunuh 1 warga setiap malam' },
    SEER: { name: 'Peramal', emoji: '🔮', team: 'good', desc: 'Mengecek peran 1 pemain setiap malam' },
    DOCTOR: { name: 'Dokter', emoji: '💉', team: 'good', desc: 'Melindungi 1 pemain dari serangan malam' },
    HUNTER: { name: 'Pemburu', emoji: '🏹', team: 'good', desc: 'Saat mati, bisa menembak 1 pemain lain' },
    VILLAGER: { name: 'Warga', emoji: '👤', team: 'good', desc: 'Tidak punya kemampuan khusus, andalkan insting!' },
};

const PHASE = {
    LOBBY: 'lobby',
    NIGHT: 'night',
    DAY_DISCUSS: 'day_discuss',
    DAY_VOTE: 'day_vote',
    HUNTER_REVENGE: 'hunter_revenge',
    ENDED: 'ended',
};

// Initialize global store
if (!global.werewolfGames) global.werewolfGames = new Map();

/**
 * Generate role distribution based on player count
 */
function getRoleDistribution(count) {
    // 6 players: 1 WW, 1 Seer, 1 Doctor, 3 Villager
    // 7 players: 1 WW, 1 Seer, 1 Doctor, 1 Hunter, 3 Villager
    // 8 players: 2 WW, 1 Seer, 1 Doctor, 1 Hunter, 3 Villager
    // 9 players: 2 WW, 1 Seer, 1 Doctor, 1 Hunter, 4 Villager
    // 10+ players: 2 WW + extras as Villager
    const roles = [];
    const wwCount = count >= 8 ? 2 : 1;
    for (let i = 0; i < wwCount; i++) roles.push('WEREWOLF');
    roles.push('SEER');
    roles.push('DOCTOR');
    if (count >= 7) roles.push('HUNTER');
    while (roles.length < count) roles.push('VILLAGER');
    return roles;
}

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Create a new game lobby
 */
function createGame(groupJid, creatorJid, creatorName) {
    if (global.werewolfGames.has(groupJid)) {
        return { success: false, error: 'Sudah ada game Werewolf aktif di grup ini!' };
    }

    const game = {
        groupJid,
        creator: creatorJid,
        phase: PHASE.LOBBY,
        players: new Map(), // jid -> { name, role, alive, voted }
        nightActions: {},   // { werewolfTarget, seerTarget, doctorTarget }
        votes: new Map(),   // voter -> target
        dayCount: 0,
        nightCount: 0,
        lastProtected: null, // Doctor can't protect same person twice in a row
        hunterTarget: null,
        pendingHunter: null, // JID of hunter who needs to shoot
        timers: {},
        createdAt: Date.now(),
        eventLog: [],
    };

    game.players.set(creatorJid, { name: creatorName, role: null, alive: true, voted: false });
    global.werewolfGames.set(groupJid, game);

    return { success: true, game };
}

/**
 * Join a game lobby
 */
function joinGame(groupJid, playerJid, playerName) {
    const game = global.werewolfGames.get(groupJid);
    if (!game) return { success: false, error: 'Tidak ada game Werewolf di grup ini! Buat dengan .werewolf' };
    if (game.phase !== PHASE.LOBBY) return { success: false, error: 'Game sudah berjalan! Tunggu game selesai.' };
    if (game.players.has(playerJid)) return { success: false, error: 'Kamu sudah bergabung!' };
    if (game.players.size >= 16) return { success: false, error: 'Lobby penuh! Maksimal 16 pemain.' };

    game.players.set(playerJid, { name: playerName, role: null, alive: true, voted: false });
    return { success: true, playerCount: game.players.size };
}

/**
 * Leave a game lobby
 */
function leaveGame(groupJid, playerJid) {
    const game = global.werewolfGames.get(groupJid);
    if (!game) return { success: false, error: 'Tidak ada game aktif!' };
    if (game.phase !== PHASE.LOBBY) return { success: false, error: 'Tidak bisa keluar saat game berjalan!' };
    if (!game.players.has(playerJid)) return { success: false, error: 'Kamu tidak ada di lobby!' };

    game.players.delete(playerJid);

    // If creator leaves, delete game
    if (playerJid === game.creator) {
        clearAllTimers(game);
        global.werewolfGames.delete(groupJid);
        return { success: true, disbanded: true };
    }

    return { success: true, playerCount: game.players.size };
}

/**
 * Start the game — assign roles and begin night phase
 */
function startGame(groupJid, starterJid) {
    const game = global.werewolfGames.get(groupJid);
    if (!game) return { success: false, error: 'Tidak ada game aktif!' };
    if (game.phase !== PHASE.LOBBY) return { success: false, error: 'Game sudah berjalan!' };
    if (starterJid !== game.creator) return { success: false, error: 'Hanya pembuat lobby yang bisa memulai game!' };
    if (game.players.size < 6) return { success: false, error: `Minimal 6 pemain untuk mulai! Sekarang: ${game.players.size}/6` };

    // Assign roles
    const playerJids = Array.from(game.players.keys());
    const roleKeys = shuffle(getRoleDistribution(playerJids.length));

    for (let i = 0; i < playerJids.length; i++) {
        game.players.get(playerJids[i]).role = roleKeys[i];
    }

    game.eventLog.push('🎮 Game dimulai!');

    return { success: true, game };
}

/**
 * Begin night phase
 */
function startNight(game) {
    game.phase = PHASE.NIGHT;
    game.nightCount++;
    game.nightActions = { werewolfTarget: null, seerTarget: null, doctorTarget: null };

    // Reset werewolf votes for multi-wolf
    game.werewolfVotes = new Map();

    return game;
}

/**
 * Process werewolf kill action (called from DM)
 */
function werewolfAction(groupJid, werewolfJid, targetJid) {
    const game = global.werewolfGames.get(groupJid);
    if (!game) return { success: false, error: 'Game tidak ditemukan!' };
    if (game.phase !== PHASE.NIGHT) return { success: false, error: 'Sekarang bukan fase malam!' };

    const ww = game.players.get(werewolfJid);
    if (!ww || ww.role !== 'WEREWOLF' || !ww.alive) return { success: false, error: 'Kamu bukan Werewolf!' };

    const target = game.players.get(targetJid);
    if (!target || !target.alive) return { success: false, error: 'Target tidak valid!' };
    if (target.role === 'WEREWOLF') return { success: false, error: 'Tidak bisa membunuh sesama Werewolf!' };

    // For multiple werewolves, use voting
    game.werewolfVotes = game.werewolfVotes || new Map();
    game.werewolfVotes.set(werewolfJid, targetJid);

    // Check if all alive werewolves have voted
    const aliveWolves = getAliveByRole(game, 'WEREWOLF');
    const allVoted = aliveWolves.every(jid => game.werewolfVotes.has(jid));

    if (allVoted) {
        // Pick the most voted target (or random if tie)
        const voteCounts = {};
        for (const t of game.werewolfVotes.values()) {
            voteCounts[t] = (voteCounts[t] || 0) + 1;
        }
        const maxVotes = Math.max(...Object.values(voteCounts));
        const topTargets = Object.keys(voteCounts).filter(t => voteCounts[t] === maxVotes);
        game.nightActions.werewolfTarget = topTargets[Math.floor(Math.random() * topTargets.length)];
    }

    return { success: true, allVoted, targetName: target.name };
}

/**
 * Process seer check action (called from DM)
 */
function seerAction(groupJid, seerJid, targetJid) {
    const game = global.werewolfGames.get(groupJid);
    if (!game) return { success: false, error: 'Game tidak ditemukan!' };
    if (game.phase !== PHASE.NIGHT) return { success: false, error: 'Sekarang bukan fase malam!' };

    const seer = game.players.get(seerJid);
    if (!seer || seer.role !== 'SEER' || !seer.alive) return { success: false, error: 'Kamu bukan Peramal!' };

    const target = game.players.get(targetJid);
    if (!target || !target.alive) return { success: false, error: 'Target tidak valid!' };
    if (targetJid === seerJid) return { success: false, error: 'Tidak bisa mengecek diri sendiri!' };

    game.nightActions.seerTarget = targetJid;
    const role = ROLES[target.role];
    const isWolf = target.role === 'WEREWOLF';

    return { success: true, targetName: target.name, role: role.name, emoji: role.emoji, isWolf };
}

/**
 * Process doctor heal action (called from DM)
 */
function doctorAction(groupJid, doctorJid, targetJid) {
    const game = global.werewolfGames.get(groupJid);
    if (!game) return { success: false, error: 'Game tidak ditemukan!' };
    if (game.phase !== PHASE.NIGHT) return { success: false, error: 'Sekarang bukan fase malam!' };

    const doc = game.players.get(doctorJid);
    if (!doc || doc.role !== 'DOCTOR' || !doc.alive) return { success: false, error: 'Kamu bukan Dokter!' };

    const target = game.players.get(targetJid);
    if (!target || !target.alive) return { success: false, error: 'Target tidak valid!' };
    if (targetJid === game.lastProtected) return { success: false, error: 'Tidak bisa melindungi orang yang sama 2x berturut-turut!' };

    game.nightActions.doctorTarget = targetJid;

    return { success: true, targetName: target.name };
}

/**
 * Resolve night — process all actions and determine who dies
 */
function resolveNight(game) {
    const result = { killed: null, saved: false, events: [] };
    const wwTarget = game.nightActions.werewolfTarget;
    const docTarget = game.nightActions.doctorTarget;

    if (wwTarget) {
        if (wwTarget === docTarget) {
            // Doctor saved the target!
            result.saved = true;
            result.events.push(`💉 Seseorang diselamatkan oleh Dokter semalam!`);
        } else {
            // Target dies
            const victim = game.players.get(wwTarget);
            if (victim) {
                victim.alive = false;
                result.killed = { jid: wwTarget, name: victim.name, role: ROLES[victim.role] };
                result.events.push(`☠️ *${victim.name}* ditemukan tewas! Dia adalah seorang *${ROLES[victim.role].emoji} ${ROLES[victim.role].name}*`);

                // Check if victim is hunter
                if (victim.role === 'HUNTER') {
                    game.pendingHunter = wwTarget;
                    result.hunterTriggered = true;
                }
            }
        }
    } else {
        result.events.push(`🌅 Malam berlalu dengan tenang... Tidak ada korban.`);
    }

    // Update last protected
    game.lastProtected = docTarget || null;

    return result;
}

/**
 * Start day discussion phase
 */
function startDay(game) {
    game.phase = PHASE.DAY_DISCUSS;
    game.dayCount++;
    game.votes = new Map();
    // Reset vote status for all alive players
    for (const [, player] of game.players) {
        if (player.alive) player.voted = false;
    }
    return game;
}

/**
 * Start voting phase
 */
function startVoting(game) {
    game.phase = PHASE.DAY_VOTE;
    game.votes = new Map();
    return game;
}

/**
 * Cast a vote to eliminate someone
 */
function castVote(groupJid, voterJid, targetJid) {
    const game = global.werewolfGames.get(groupJid);
    if (!game) return { success: false, error: 'Game tidak ditemukan!' };
    if (game.phase !== PHASE.DAY_VOTE) return { success: false, error: 'Sekarang bukan fase voting!' };

    const voter = game.players.get(voterJid);
    if (!voter || !voter.alive) return { success: false, error: 'Kamu tidak bisa vote!' };

    const target = game.players.get(targetJid);
    if (!target || !target.alive) return { success: false, error: 'Target tidak valid atau sudah mati!' };

    game.votes.set(voterJid, targetJid);
    voter.voted = true;

    // Check if all alive players have voted
    const alivePlayers = getAlivePlayers(game);
    const allVoted = alivePlayers.every(([jid]) => game.votes.has(jid));

    return { success: true, voterName: voter.name, targetName: target.name, allVoted, voteCount: game.votes.size, totalAlive: alivePlayers.length };
}

/**
 * Resolve votes — eliminate the player with most votes
 */
function resolveVotes(game) {
    const result = { eliminated: null, tie: false, events: [] };

    if (game.votes.size === 0) {
        result.events.push('🤷 Tidak ada yang di-vote. Tidak ada yang tereliminasi.');
        return result;
    }

    // Count votes
    const voteCounts = {};
    for (const target of game.votes.values()) {
        voteCounts[target] = (voteCounts[target] || 0) + 1;
    }

    const maxVotes = Math.max(...Object.values(voteCounts));
    const topTargets = Object.keys(voteCounts).filter(t => voteCounts[t] === maxVotes);

    if (topTargets.length > 1) {
        // Tie — no one eliminated
        result.tie = true;
        result.events.push('⚖️ Hasil voting seri! Tidak ada yang tereliminasi.');
        return result;
    }

    const eliminatedJid = topTargets[0];
    const eliminated = game.players.get(eliminatedJid);
    eliminated.alive = false;

    result.eliminated = {
        jid: eliminatedJid,
        name: eliminated.name,
        role: ROLES[eliminated.role],
        roleKey: eliminated.role,
        voteCount: maxVotes,
    };

    result.events.push(`🪦 *${eliminated.name}* telah dieliminasi dengan ${maxVotes} vote! Dia adalah seorang *${ROLES[eliminated.role].emoji} ${ROLES[eliminated.role].name}*`);

    // Check if eliminated is hunter
    if (eliminated.role === 'HUNTER') {
        game.pendingHunter = eliminatedJid;
        result.hunterTriggered = true;
    }

    // Build vote summary
    result.voteSummary = [];
    for (const [voterJid, targetJid] of game.votes) {
        const voter = game.players.get(voterJid);
        const target = game.players.get(targetJid);
        result.voteSummary.push(`  ${voter.name} → ${target.name}`);
    }

    return result;
}

/**
 * Hunter revenge shot
 */
function hunterShoot(groupJid, hunterJid, targetJid) {
    const game = global.werewolfGames.get(groupJid);
    if (!game) return { success: false, error: 'Game tidak ditemukan!' };
    if (game.pendingHunter !== hunterJid) return { success: false, error: 'Kamu bukan Hunter yang sedang mati!' };

    const target = game.players.get(targetJid);
    if (!target || !target.alive) return { success: false, error: 'Target tidak valid!' };

    target.alive = false;
    game.pendingHunter = null;

    return {
        success: true,
        targetName: target.name,
        targetRole: ROLES[target.role],
    };
}

/**
 * Check win condition
 * Returns: null (no winner), 'werewolf', 'villager'
 */
function checkWin(game) {
    const alive = getAlivePlayers(game);
    const wolves = alive.filter(([, p]) => p.role === 'WEREWOLF');
    const villagers = alive.filter(([, p]) => p.role !== 'WEREWOLF');

    if (wolves.length === 0) return 'villager';
    if (wolves.length >= villagers.length) return 'werewolf';
    return null;
}

/**
 * End the game
 */
function endGame(groupJid) {
    const game = global.werewolfGames.get(groupJid);
    if (game) {
        clearAllTimers(game);
        game.phase = PHASE.ENDED;
        global.werewolfGames.delete(groupJid);
    }
    return game;
}

/**
 * Get alive players
 */
function getAlivePlayers(game) {
    return Array.from(game.players.entries()).filter(([, p]) => p.alive);
}

/**
 * Get alive players by role
 */
function getAliveByRole(game, role) {
    return Array.from(game.players.entries())
        .filter(([, p]) => p.role === role && p.alive)
        .map(([jid]) => jid);
}

/**
 * Get game for a player's DM context (find which group game they belong to)
 */
function findGameForPlayer(playerJid) {
    for (const [groupJid, game] of global.werewolfGames) {
        if (game.players.has(playerJid) && game.phase !== PHASE.LOBBY && game.phase !== PHASE.ENDED) {
            return { groupJid, game };
        }
    }
    return null;
}

/**
 * Get player list text
 */
function getPlayerListText(game, showRoles = false) {
    let text = '';
    let i = 1;
    for (const [jid, player] of game.players) {
        const status = player.alive ? '💚' : '💀';
        const role = showRoles ? ` — ${ROLES[player.role]?.emoji || '?'} ${ROLES[player.role]?.name || '?'}` : '';
        text += `${i}. ${status} ${player.name} (@${jid.split('@')[0]})${role}\n`;
        i++;
    }
    return text;
}

/**
 * Get alive player list for targeting
 */
function getAlivePlayerListText(game, excludeJid = null) {
    let text = '';
    let i = 1;
    for (const [jid, player] of game.players) {
        if (!player.alive) continue;
        if (excludeJid && jid === excludeJid) continue;
        text += `${i}. ${player.name} (@${jid.split('@')[0]})\n`;
        i++;
    }
    return text;
}

/**
 * Generate night action DM prompt for a role
 */
function getNightPrompt(game, playerJid) {
    const player = game.players.get(playerJid);
    if (!player || !player.alive) return null;

    const groupName = game.groupJid; // Will need to be resolved in command
    const alivePlayers = getAlivePlayerListText(game, player.role === 'WEREWOLF' ? null : playerJid);

    switch (player.role) {
        case 'WEREWOLF': {
            const otherWolves = getAliveByRole(game, 'WEREWOLF').filter(j => j !== playerJid);
            let packInfo = '';
            if (otherWolves.length > 0) {
                packInfo = `\n🐺 Rekan Werewolf: ${otherWolves.map(j => game.players.get(j).name).join(', ')}`;
            }
            return {
                text: `🌙 *MALAM ${game.nightCount}* — Fase Werewolf\n\n🐺 Kamu adalah *Werewolf*!${packInfo}\n\nPilih target untuk dibunuh malam ini:\n${getAlivePlayerListText(game, null)}\n⚡ Ketik: *.wkill @target*\n⏳ Waktu: 90 detik`,
                role: 'WEREWOLF'
            };
        }
        case 'SEER':
            return {
                text: `🌙 *MALAM ${game.nightCount}* — Fase Peramal\n\n🔮 Kamu adalah *Peramal*!\n\nPilih pemain yang ingin kamu cek perannya:\n${alivePlayers}\n⚡ Ketik: *.wsee @target*\n⏳ Waktu: 90 detik`,
                role: 'SEER'
            };
        case 'DOCTOR':
            return {
                text: `🌙 *MALAM ${game.nightCount}* — Fase Dokter\n\n💉 Kamu adalah *Dokter*!\n\nPilih pemain yang ingin kamu lindungi malam ini:\n${getAlivePlayerListText(game)}\n${game.lastProtected ? `⚠️ Tidak bisa melindungi orang yang sama 2x berturut-turut!` : ''}\n⚡ Ketik: *.wheal @target*\n⏳ Waktu: 90 detik`,
                role: 'DOCTOR'
            };
        default:
            return {
                text: `🌙 *MALAM ${game.nightCount}*\n\n${ROLES[player.role].emoji} Kamu adalah *${ROLES[player.role].name}*.\n\n_Tidak ada aksi malam untuk peranmu. Tidurlah dengan tenang... atau tidak. 😰_`,
                role: player.role
            };
    }
}

/**
 * Check if all night actions are complete
 */
function isNightComplete(game) {
    const aliveWolves = getAliveByRole(game, 'WEREWOLF');
    const aliveSeer = getAliveByRole(game, 'SEER');
    const aliveDoctor = getAliveByRole(game, 'DOCTOR');

    const wwDone = aliveWolves.length === 0 || game.nightActions.werewolfTarget !== null;
    const seerDone = aliveSeer.length === 0 || game.nightActions.seerTarget !== null;
    const docDone = aliveDoctor.length === 0 || game.nightActions.doctorTarget !== null;

    return wwDone && seerDone && docDone;
}

/**
 * Clear all timers for a game
 */
function clearAllTimers(game) {
    if (game.timers) {
        for (const key of Object.keys(game.timers)) {
            if (game.timers[key]) {
                clearTimeout(game.timers[key]);
                game.timers[key] = null;
            }
        }
    }
}

/**
 * Get game status text
 */
function getStatusText(game) {
    const phaseNames = {
        [PHASE.LOBBY]: '⏳ Menunggu Pemain',
        [PHASE.NIGHT]: '🌙 Malam',
        [PHASE.DAY_DISCUSS]: '☀️ Siang — Diskusi',
        [PHASE.DAY_VOTE]: '🗳️ Siang — Voting',
        [PHASE.HUNTER_REVENGE]: '🏹 Pemburu Balas Dendam',
        [PHASE.ENDED]: '🏁 Selesai',
    };

    const alive = getAlivePlayers(game);
    let text = `╭──「 🐺 𝚆𝙴𝚁𝙴𝚆𝙾𝙻𝙵 𝚂𝚃𝙰𝚃𝚄𝚂 」──╮\n`;
    text += `│\n`;
    text += `│ 📍 Fase: ${phaseNames[game.phase] || game.phase}\n`;
    text += `│ 🌙 Malam ke-${game.nightCount}\n`;
    text += `│ 👥 Pemain hidup: ${alive.length}/${game.players.size}\n`;
    text += `│\n`;
    text += `│ 📋 *Daftar Pemain:*\n`;

    for (const [jid, player] of game.players) {
        const status = player.alive ? '💚' : '💀';
        text += `│ ${status} ${player.name}\n`;
    }

    text += `│\n`;
    text += `╰────────────────────────╯`;
    return text;
}

module.exports = {
    ROLES,
    PHASE,
    createGame,
    joinGame,
    leaveGame,
    startGame,
    startNight,
    werewolfAction,
    seerAction,
    doctorAction,
    resolveNight,
    startDay,
    startVoting,
    castVote,
    resolveVotes,
    hunterShoot,
    checkWin,
    endGame,
    getAlivePlayers,
    getAliveByRole,
    findGameForPlayer,
    getPlayerListText,
    getAlivePlayerListText,
    getNightPrompt,
    isNightComplete,
    clearAllTimers,
    getStatusText,
};
