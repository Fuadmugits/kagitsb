const { randomInt, formatNumber, pickRandom, fetchJson } = require('../lib/functions');
const { Users, Transactions, Achievements } = require('../database');
const config = require('../config');

const activeGames = new Map();
global.gameCooldowns = global.gameCooldowns || new Map();

function checkCooldown(jid, gameType, seconds) {
    const key = `${jid}_${gameType}`;
    if (global.gameCooldowns.has(key)) {
        const diff = Date.now() - global.gameCooldowns.get(key);
        if (diff < seconds * 1000) {
            return Math.ceil((seconds * 1000 - diff) / 1000);
        }
    }
    global.gameCooldowns.set(key, Date.now());
    return 0;
}

async function getDynamicQuestion(type, fallback) {
    try {
        let p = '';
        const seed = Math.random().toString(36).substring(2, 10); // Random string agar AI tidak cache jawaban
        const extra = `\n(Wajib: Buat soal yang SANGAT BERBEDA dari sebelumnya. TINGKAT EXPERT/SANGAT SULIT. Gunakan konsep yang jarang diketahui orang awam. Kode seed acak: ${seed})`;
        
        if (type === 'tebakkata') p = 'Berikan 1 soal tebak kata bahasa Indonesia TINGKAT EXPERT. Gunakan istilah ilmiah, filosofis, atau teknikal yang sangat jarang. JSON murni tanpa awalan backtick: {"q":"pertanyaan panjang dan detail","a":"jawaban_1_kata"}' + extra;
        else if (type === 'tebakkimia') p = 'Berikan 1 soal tebak unsur/reaksi kimia TINGKAT EXPERT. Gunakan unsur langka, isotop, atau reaksi kompleks. JSON murni tanpa awalan backtick: {"q":"deskripsi unsur/reaksi","a":"nama_unsur"}' + extra;
        else if (type === 'caklontong') p = 'Berikan 1 tebakan logika meleset ala Cak Lontong TINGKAT SANGAT MENJEBAK dan absurd. JSON murni tanpa awalan backtick: {"q":"pertanyaan","a":"jawaban"}' + extra;
        else if (type === 'tebaknegara') p = 'Berikan 1 tebakan negara dari fakta SANGAT OBSCURE (bukan fakta umum). Gunakan negara kecil atau fakta geopolitik langka. JSON murni tanpa awalan backtick: {"q":"pertanyaan","a":"negara"}' + extra;
        else if (type === 'tekateki') p = 'Berikan 1 teka-teki filosofis/logika berlapis TINGKAT EXPERT yang sangat menjebak. JSON murni tanpa awalan backtick: {"q":"pertanyaan","a":"jawaban"}' + extra;
        
        if (p) {
            let txt = '';
            if (config.api.geminiKey) {
                const res = await fetchJson(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${config.api.geminiKey}`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    data: { contents: [{ parts: [{ text: p }] }] }
                });
                txt = res?.candidates?.[0]?.content?.parts?.[0]?.text;
            } else {
                const res = await fetchJson(`https://api.siputzx.my.id/api/ai/gemini-pro?text=${encodeURIComponent(p)}`);
                txt = res?.data || res?.result;
            }
            if (txt) {
                const parsed = JSON.parse(txt.replace(/```json/g,'').replace(/```/g,'').trim());
                if (parsed.q && parsed.a) return parsed;
            }
        }
    } catch (e) {
        console.log('AI Error, using fallback:', e.message);
    }
    return pickRandom(fallback);
}

module.exports = [
    {
        name: 'slot', category: 'games', desc: 'Main slot machine',
        async execute({ m }) {
            const cd = checkCooldown(m.sender, 'slot', 10);
            if (cd > 0) return m.reply(`⏳ Sabar! Tunggu ${cd} detik lagi untuk bermain slot.`);
            
            const { calculateTotalStats } = require('../lib/rpg');
            const stats = calculateTotalStats(m.sender);
            const luckBonus = Math.min(0.2, (stats.luck || 0) * 0.00001); // Max 20% forced win from luck

            const user = Users.getOrCreate(m.sender, m.pushName);
            const emojis = ['🍒','🍋','🍊','🍇','💎','7️⃣','🔔','⭐'];
            let s = [pickRandom(emojis), pickRandom(emojis), pickRandom(emojis)];
            
            // Re-roll mechanics using luck
            if (Math.random() < luckBonus && s[0] !== s[1] && s[1] !== s[2]) {
                const winEmoji = pickRandom(emojis);
                s = [winEmoji, winEmoji, winEmoji]; // force jackpot
            } else if (Math.random() < luckBonus * 2 && s[0] !== s[1] && s[1] !== s[2]) {
                s[2] = s[1]; // force minor win
            }

            let win = 0;
            if (s[0]===s[1] && s[1]===s[2]) { win = s[0]==='💎' ? 5000 : s[0]==='7️⃣' ? 3000 : 1000; }
            else if (s[0]===s[1] || s[1]===s[2] || s[0]===s[2]) { win = 250; }

            if (win > 0) { 
                const { Settings } = require('../database');
                const abuseVal = Settings.get('adminabuse_' + m.chat);
                const multiplier = parseInt(abuseVal) || (abuseVal === 'true' ? 2 : 1);
                if (multiplier > 1) win *= multiplier;
                Users.addBalance(m.sender, win); 
                Transactions.create(m.sender, 'game_win', win, 'Slot machine'); 
                await m.reply(`🎰 *SLOT MACHINE*\n\n┃ ${s.join(' ┃ ')} ┃\n\n🎉 MENANG! +${formatNumber(win)} balance! ${multiplier > 1 ? `(Admin Abuse x${multiplier}! 🔥)` : ''}`);
            } else {
                await m.reply(`🎰 *SLOT MACHINE*\n\n┃ ${s.join(' ┃ ')} ┃\n\n😢 Coba lagi!`);
            }
        }
    },
    {
        name: 'casino', category: 'casino', desc: 'Main casino (x3/x7/x12)', usage: '(nominal)',
        async execute({ m, args }) {
            const cd = checkCooldown(m.sender, 'casino', 10);
            if (cd > 0) return m.reply(`⏳ Sabar! Tunggu ${cd} detik lagi untuk bermain casino.`);
            
            const user = Users.getOrCreate(m.sender, m.pushName);
            let bet = args[0]?.toLowerCase() === 'all' ? user.balance : parseInt(args[0]) || 100;
            if (user.balance < bet) return m.reply(`❌ Balance tidak cukup! Kamu punya ${formatNumber(user.balance)}`);
            if (bet < 100) return m.reply('❌ Minimal bet 100!');

            const { calculateTotalStats } = require('../lib/rpg');
            const stats = calculateTotalStats(m.sender);
            const userLuck = stats.luck || 0;

            // Base chances
            let superJackpotChance = 0.005; // 0.5%
            let jackpotChance = 0.015; // 1.5%
            let winChance = 0.25; // 25%

            // Luck bonus scaling
            const superBonus = Math.min(0.05, userLuck * 0.000005);
            const jackBonus = Math.min(0.1, userLuck * 0.00001);
            const winBonus = Math.min(0.2, userLuck * 0.00002);

            superJackpotChance += superBonus;
            jackpotChance += jackBonus;
            winChance += winBonus;

            const { Settings } = require('../database');
            const abuseVal = Settings.get('adminabuse_' + m.chat);
            const multiplier = parseInt(abuseVal) || (abuseVal === 'true' ? 2 : 1);
            const isAdminAbuse = multiplier > 1;

            const roll = Math.random();
            const t1 = superJackpotChance;
            const t2 = t1 + jackpotChance;
            const t3 = t2 + winChance;

            if (roll < t1) {
                let superWin = bet * 12;
                if (isAdminAbuse) superWin *= multiplier;
                Users.addBalance(m.sender, superWin);
                Transactions.create(m.sender, 'casino_superjackpot', superWin, 'Casino');
                await m.reply(`🎰 *CASINO ROYALE*\n\n🌟🌟🌟 *SUPER MEGA JACKPOT!!!* 🌟🌟🌟\n\n🍀 KEBERUNTUNGAN DEWA! Berkat luck ${formatNumber(userLuck)}, kamu mendapatkan SUPER JACKPOT!\n💰 +${formatNumber(superWin)} balance *(12x modal!)* ${isAdminAbuse ? `\n🔥 *ADMIN ABUSE x${multiplier} ACTIVE!*` : ''}\n📊 Modal: ${formatNumber(bet)}\n🎲 Chance: ${((t1)*100).toFixed(2)}%`);
            } else if (roll < t2) {
                let jackpotWin = bet * 7;
                if (isAdminAbuse) jackpotWin *= multiplier;
                Users.addBalance(m.sender, jackpotWin);
                Transactions.create(m.sender, 'casino_jackpot', jackpotWin, 'Casino');
                Achievements.grant(m.sender, 'casino_jackpot');
                await m.reply(`🎰 *CASINO ROYALE*\n\n🎊🎊🎊 *JJJACKPOT!!!* 🎊🎊🎊\n\n🍀 LUAR BIASA! Kamu mendapatkan MEGA JACKPOT!\n💰 +${formatNumber(jackpotWin)} balance *(7x modal!)* ${isAdminAbuse ? `\n🔥 *ADMIN ABUSE x${multiplier} ACTIVE!*` : ''}\n📊 Modal: ${formatNumber(bet)}\n🎲 Chance: ${((jackpotChance)*100).toFixed(2)}%\n\n🏅 _Badge "Penjudi Ulung" telah kamu dapatkan!_`);
            } else if (roll < t3) {
                let winAmount = bet * 3;
                if (isAdminAbuse) winAmount *= multiplier;
                Users.addBalance(m.sender, winAmount);
                Transactions.create(m.sender, 'casino_win', winAmount, 'Casino');
                await m.reply(`🎰 *CASINO ROYALE*\n\n🎉 Kamu MENANG!\n💰 +${formatNumber(winAmount)} balance *(3x modal!)* ${isAdminAbuse ? `\n🔥 *ADMIN ABUSE x${multiplier} ACTIVE!*` : ''}\n📊 Modal: ${formatNumber(bet)}\n🎲 Chance: ${((winChance)*100).toFixed(2)}%`);
            } else {
                Users.addBalance(m.sender, -bet);
                Transactions.create(m.sender, 'casino_lose', -bet, 'Casino');
                const taunt = pickRandom(['Nasib...', 'Coba lagi!', 'Mungkin besok hoki~', 'Sabar ya...', 'Belum rezeki!']);
                await m.reply(`🎰 *CASINO ROYALE*\n\n😢 Kamu KALAH!\n💸 -${formatNumber(bet)} balance\n📊 Modal: ${formatNumber(bet)}\n\n_${taunt}_`);
            }
        }
    },
    {
        name: 'suit', category: 'games', desc: 'Suit (batu gunting kertas)',
        async execute({ m }) {
            const choices = ['batu','gunting','kertas'];
            const emoji = { batu: '✊', gunting: '✌️', kertas: '🖐️' };
            const bot = pickRandom(choices);
            const user = pickRandom(choices);
            let result;
            if (user === bot) result = '🤝 SERI!';
            else if ((user==='batu'&&bot==='gunting')||(user==='gunting'&&bot==='kertas')||(user==='kertas'&&bot==='batu')) { 
                let reward = 100;
                const { Settings } = require('../database');
                const abuseVal = Settings.get('adminabuse_' + m.chat);
                const multiplier = parseInt(abuseVal) || (abuseVal === 'true' ? 2 : 1);
                if (multiplier > 1) reward *= multiplier;
                result = `🎉 Kamu MENANG!${multiplier > 1 ? ` (Admin Abuse x${multiplier}! 🔥)` : ''}`; 
                Users.addBalance(m.sender, reward); 
            }
            else { result = '😢 Kamu KALAH!'; }
            await m.reply(`✊✌️🖐️ *SUIT*\n\n👤 Kamu: ${emoji[user]} ${user}\n🤖 Bot: ${emoji[bot]} ${bot}\n\n${result}`);
        }
    },
    {
        name: 'math', category: 'games', desc: 'Tebak matematika', usage: '(level)',
        async execute({ m, args }) {
            const level = args[0] || 'easy';
            let a, b, op, answer;
            if (level === 'hard') { a = randomInt(50,200); b = randomInt(10,100); op = pickRandom(['+','-','×']); }
            else if (level === 'medium') { a = randomInt(10,50); b = randomInt(5,30); op = pickRandom(['+','-','×']); }
            else { a = randomInt(1,20); b = randomInt(1,10); op = pickRandom(['+','-']); }
            if (op==='+') answer = a+b; else if (op==='-') answer = a-b; else answer = a*b;
            
            global.activeGames = global.activeGames || new Map();
            if (global.activeGames.has(m.chat)) return m.reply('❌ Selesaikan game sebelumnya dulu!');
            
            const sentMsg = await m.reply(`╭───「 🧮 𝙼𝙰𝚃𝙷 𝚀𝚄𝙸𝚉 」\n│ \n│ ❓ ${a} ${op} ${b} = ?\n│ \n│ 💡 Hint: Ketik jawabannya!\n│ 💡 Balas pesan ini untuk menjawab!
│ ⏳ Timeout: 60 Detik\n│ 🏆 Level: ${level.toUpperCase()}\n╰──────────────`);
            global.activeGames.set(m.chat, { answer: answer.toString(), time: Date.now(), reward: 500, msgId: sentMsg.key.id });
            setTimeout(() => { if (global.activeGames.has(m.chat)) { global.activeGames.delete(m.chat); m.reply(`⏳ *Waktu Habis!*\nJawaban: ${answer}`); } }, 60000);
        }
    },
    {
        name: 'tictactoe', aliases: ['ttt'], category: 'games', desc: 'Main Tic Tac Toe vs Bot/Player', usage: '(@tag)',
        async execute({ m, sock }) {
            global.activeGames = global.activeGames || new Map();
            if (global.activeGames.has(m.chat)) global.activeGames.delete(m.chat);

            const target = m.mentionedJid?.[0];
            const bet = 1000;

            if (target) {
                // PvP Mode
                const p1 = Users.getOrCreate(m.sender);
                const p2 = Users.getOrCreate(target);
                if (p1.balance < bet) return m.reply(`❌ Balance kamu kurang untuk taruhan ${bet}!`);
                if (p2.balance < bet) return m.reply(`❌ Lawanmu tidak punya cukup balance untuk taruhan ${bet}!`);
                
                global.activeGames.set(m.chat, {
                    type: 'pending_challenge',
                    targetJid: target,
                    onAccept: async (acceptMsg, acceptSock) => {
                        const board = [0,0,0,0,0,0,0,0,0];
                        const ICONS = ['\u2b1c','\u274c','⭕'];
                        const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
                        
                        let turn = m.sender; // P1 start
                        
                        const renderBoard = () => {
                            let b = '';
                            for (let i = 0; i < 9; i++) {
                                b += board[i] === 0 ? `${i+1}\ufe0f\u20e3` : ICONS[board[i]];
                                if ((i+1) % 3 === 0 && i < 8) b += '\n';
                            }
                            return b;
                        };
                        const checkWin = (player) => WIN_LINES.some(([a,b,c]) => board[a]===player && board[b]===player && board[c]===player);
                        const isFull = () => board.every(c => c !== 0);

                        const sentMsg = await acceptMsg.reply(
                            `❌⭕ *TIC TAC TOE PvP*\n\n` +
                            `Pemain 1 (❌): @${m.sender.split('@')[0]}\n` +
                            `Pemain 2 (⭕): @${target.split('@')[0]}\n` +
                            `Taruhan: ${bet} balance\n\n` +
                            renderBoard() +
                            `\n\n📝 *Ketik angka 1-9* untuk jalan! Giliran: @${turn.split('@')[0]}`, { mentions: [m.sender, target] }
                        );

                        global.activeGames.set(m.chat, {
                            type: 'tictactoe',
                            board,
                            msgId: sentMsg.key.id,
                            p1: m.sender,
                            p2: target,
                            turn: turn,
                            handleMove: async (moveMsg, sck, pos) => {
                                const game = global.activeGames.get(moveMsg.chat);
                                if (!game) return;
                                if (moveMsg.sender !== game.turn) return; // Bukan gilirannya

                                const idx = pos - 1;
                                if (game.board[idx] !== 0) {
                                    await moveMsg.reply('❌ Kotak sudah terisi! Pilih yang lain.');
                                    return;
                                }

                                const isP1 = (moveMsg.sender === game.p1);
                                game.board[idx] = isP1 ? 1 : 2;

                                if (checkWin(isP1 ? 1 : 2)) {
                                    global.activeGames.delete(moveMsg.chat);
                                    const loser = isP1 ? game.p2 : game.p1;
                                    const winner = isP1 ? game.p1 : game.p2;
                                    Users.addBalance(loser, -bet);
                                    Users.addBalance(winner, bet);
                                    await sck.sendMessage(moveMsg.chat, { 
                                        text: `❌⭕ *HASIL*\n\n${renderBoard()}\n\n🎉 *Pemenang:* @${winner.split('@')[0]}\n💸 Transfer ${bet} balance dari @${loser.split('@')[0]}`,
                                        mentions: [winner, loser]
                                    }, { quoted: moveMsg.raw });
                                    return;
                                }
                                if (isFull()) { global.activeGames.delete(moveMsg.chat); await sck.sendMessage(moveMsg.chat, { text: `❌⭕ *HASIL*\n\n${renderBoard()}\n\n🤝 *SERI!* Tidak ada taruhan dipotong.` }, { quoted: moveMsg.raw }); return; }
                                
                                game.turn = isP1 ? game.p2 : game.p1;
                                await sck.sendMessage(moveMsg.chat, { 
                                    text: `❌⭕ *TIC TAC TOE PvP*\n\n${renderBoard()}\n\n📝 Giliran: @${game.turn.split('@')[0]}! Ketik 1-9`,
                                    mentions: [game.turn]
                                }, { quoted: moveMsg.raw });
                            }
                        });
                    }
                });

                await m.reply(`⚔️ Menantang @${target.split('@')[0]} bermain TicTacToe!\nTaruhan: ${bet} balance.\n\nKetik *terima* untuk mulai, atau *tolak* untuk membatalkan.`, { mentions: [target] });
            } else {
                // Mode Vs Bot (Solo)
                const board = [0,0,0,0,0,0,0,0,0];
                const ICONS = ['\u2b1c','\u274c','⭕'];
                const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

                const renderBoard = () => {
                    let b = '';
                    for (let i = 0; i < 9; i++) {
                        b += board[i] === 0 ? `${i+1}\ufe0f\u20e3` : ICONS[board[i]];
                        if ((i+1) % 3 === 0 && i < 8) b += '\n';
                    }
                    return b;
                };

                const checkWin = (player) => WIN_LINES.some(([a,b,c]) => board[a]===player && board[b]===player && board[c]===player);
                const isFull = () => board.every(c => c !== 0);

                const botMove = () => {
                    for (const [a,b,c] of WIN_LINES) { if (board[a]===2 && board[b]===2 && board[c]===0) { board[c]=2; return; } if (board[a]===2 && board[c]===2 && board[b]===0) { board[b]=2; return; } if (board[b]===2 && board[c]===2 && board[a]===0) { board[a]=2; return; } }
                    for (const [a,b,c] of WIN_LINES) { if (board[a]===1 && board[b]===1 && board[c]===0) { board[c]=2; return; } if (board[a]===1 && board[c]===1 && board[b]===0) { board[b]=2; return; } if (board[b]===1 && board[c]===1 && board[a]===0) { board[a]=2; return; } }
                    if (board[4]===0) { board[4]=2; return; }
                    const empty = board.map((v,i)=>v===0?i:-1).filter(i=>i>=0);
                    const pick = empty[Math.floor(Math.random()*empty.length)];
                    board[pick] = 2;
                };

                const sentMsg = await m.reply(
                    `❌⭕ *TIC TAC TOE vs BOT*\n\n` +
                    `Kamu = ❌ | Bot = ⭕\n\n` +
                    renderBoard() +
                    `\n\n📝 *Ketik angka 1-9* untuk jalan!`
                );

                global.activeGames.set(m.chat, {
                    type: 'tictactoe',
                    board,
                    msgId: sentMsg.key.id,
                    p1: m.sender, // Menandakan bahwa player asli adalah sender
                    handleMove: async (moveMsg, sck, pos) => {
                        const game = global.activeGames.get(moveMsg.chat);
                        if (!game) return;
                        if (moveMsg.sender !== game.p1) return; // Mencegah orang lain intervensi solo vs bot

                        const idx = pos - 1;
                        if (game.board[idx] !== 0) {
                            await moveMsg.reply('❌ Kotak sudah terisi! Pilih yang lain.');
                            return;
                        }
                        game.board[idx] = 1;
                        if (checkWin(1)) {
                            global.activeGames.delete(moveMsg.chat);
                            let reward = 1000;
                            const { Settings } = require('../database');
                            const abuseVal = Settings.get('adminabuse_' + moveMsg.chat);
                            const multiplier = parseInt(abuseVal) || (abuseVal === 'true' ? 2 : 1);
                            if (multiplier > 1) reward *= multiplier;
                            Users.addBalance(moveMsg.sender, reward);
                            await sck.sendMessage(moveMsg.chat, { text: `❌⭕ *HASIL*\n\n${renderBoard()}\n\n🎉 *Kamu MENANG!* +${reward} balance💰 ${multiplier > 1 ? `(Admin Abuse x${multiplier}! 🔥)` : ''}` }, { quoted: moveMsg.raw });
                            return;
                        }
                        if (isFull()) { global.activeGames.delete(moveMsg.chat); await sck.sendMessage(moveMsg.chat, { text: `❌⭕ *HASIL*\n\n${renderBoard()}\n\n🤝 *SERI!*` }, { quoted: moveMsg.raw }); return; }
                        botMove();
                        if (checkWin(2)) {
                            global.activeGames.delete(moveMsg.chat);
                            await sck.sendMessage(moveMsg.chat, { text: `❌⭕ *HASIL*\n\n${renderBoard()}\n\n🤖 *Bot MENANG!* Coba lagi!` }, { quoted: moveMsg.raw });
                            return;
                        }
                        if (isFull()) { global.activeGames.delete(moveMsg.chat); await sck.sendMessage(moveMsg.chat, { text: `❌⭕ *HASIL*\n\n${renderBoard()}\n\n🤝 *SERI!*` }, { quoted: moveMsg.raw }); return; }
                        await sck.sendMessage(moveMsg.chat, { text: `❌⭕ *TIC TAC TOE*\n\n${renderBoard()}\n\n📝 Giliranmu! Ketik 1-9` }, { quoted: moveMsg.raw });
                    }
                });
            }

            setTimeout(() => {
                if (global.activeGames.has(m.chat)) {
                    const game = global.activeGames.get(m.chat);
                    if (game.type === 'tictactoe' || game.type === 'pending_challenge') {
                        global.activeGames.delete(m.chat);
                        m.reply('⏳ *Game TicTacToe berakhir / kadaluarsa karena timeout!*');
                    }
                }
            }, 180000);
        }
    },
    {
        name: 'blackjack', aliases: ['bj'], category: 'games', desc: 'Main Blackjack',
        async execute({ m }) {
            const cards = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
            const suits = ['♠️','♥️','♦️','♣️'];
            const draw = () => `${pickRandom(cards)}${pickRandom(suits)}`;
            const val = c => { const v = c.replace(/[♠️♥️♦️♣️]/g,''); if ('JQK'.includes(v)) return 10; if (v==='A') return 11; return parseInt(v)||0; };
            const p = [draw(), draw()]; const d = [draw(), draw()];
            const pVal = p.reduce((a,c) => a+val(c), 0);
            const dVal = d.reduce((a,c) => a+val(c), 0);
            let result;
            if (pVal === 21) result = '🎉 BLACKJACK! Kamu MENANG!';
            else if (pVal > 21) result = '💥 BUST! Kamu kalah!';
            else if (dVal > 21 || pVal > dVal) result = '🎉 Kamu MENANG!';
            else if (pVal === dVal) result = '🤝 SERI!';
            else result = '😢 Dealer menang!';
            await m.reply(`🃏 *BLACKJACK*\n\n👤 Kamu: ${p.join(' ')} (${pVal})\n🤖 Dealer: ${d.join(' ')} (${dVal})\n\n${result}`);
        }
    },
    {
        name: 'samgong', category: 'games', desc: 'Main Samgong', usage: '(nominal)',
        async execute({ m, args }) {
            const user = Users.getOrCreate(m.sender, m.pushName);
            const bet = args[0]?.toLowerCase() === 'all' ? user.balance : parseInt(args[0]) || 100;
            if (user.balance < bet) return m.reply('❌ Balance tidak cukup!');
            const draw3 = () => [randomInt(1,10),randomInt(1,10),randomInt(1,10)];
            const val = cards => cards.reduce((a,b)=>a+b,0) % 10;
            const p = draw3(); const d = draw3();
            const pv = val(p); const dv = val(d);
            const win = pv > dv;
            if (win) { 
                let reward = bet;
                const { Settings } = require('../database');
                const abuseVal = Settings.get('adminabuse_' + m.chat);
                const multiplier = parseInt(abuseVal) || (abuseVal === 'true' ? 2 : 1);
                if (multiplier > 1) reward *= multiplier;
                Users.addBalance(m.sender, reward); 
                await m.reply(`🎴 *SAMGONG*\n\n👤 Kamu: [${p.join(',')}] = ${pv}\n🤖 Bot: [${d.join(',')}] = ${dv}\n\n🎉 MENANG! +${formatNumber(reward)} ${multiplier > 1 ? `(Admin Abuse x${multiplier}! 🔥)` : ''}`);
            } else { 
                Users.addBalance(m.sender, -bet); 
                await m.reply(`🎴 *SAMGONG*\n\n👤 Kamu: [${p.join(',')}] = ${pv}\n🤖 Bot: [${d.join(',')}] = ${dv}\n\n😢 KALAH! -${formatNumber(bet)}`);
            }
        }
    },
    {
        name: 'tebakkata', category: 'games', desc: 'Tebak kata (sulit)',
        async execute({ m }) {
            global.activeGames = global.activeGames || new Map();

            // Hapus game lama agar selalu muncul soal baru
            if (global.activeGames.has(m.chat)) {
                global.activeGames.delete(m.chat);
            }

            await m.reply('⏳ _Mengenerate soal baru..._');

            const fallbacks = [
                { q: 'Fenomena psikologis di mana korban penculikan justru mengembangkan ikatan emosional positif terhadap penculiknya', a: 'stockholm' },
                { q: 'Prinsip dalam fisika kuantum yang menyatakan bahwa mengamati partikel akan mengubah perilakunya secara fundamental', a: 'ketidakpastian' },
                { q: 'Istilah untuk bias kognitif di mana seseorang menilai sesuatu berdasarkan kesan pertama yang tidak relevan', a: 'anchoring' },
                { q: 'Proses biologis di mana sel secara terprogram menghancurkan dirinya sendiri untuk kepentingan organisme', a: 'apoptosis' },
                { q: 'Cabang filsafat yang mempertanyakan hakikat keberadaan, realitas, dan makna ada', a: 'ontologi' },
                { q: 'Fenomena astronomi ketika cahaya bintang membelok saat melewati medan gravitasi benda masif', a: 'lensgravitasi' },
                { q: 'Istilah linguistik untuk kata yang memiliki bunyi mirip di berbagai bahasa karena asal usul yang sama', a: 'kognat' },
                { q: 'Teori ekonomi yang menyatakan bahwa uang beredar yang berlebihan menyebabkan inflasi', a: 'monetarisme' },
                { q: 'Hukum termodinamika yang menyatakan bahwa entropi alam semesta selalu meningkat', a: 'entropimeningkat' },
                { q: 'Proses di mana bakteri memperoleh gen dari lingkungan bukan dari induknya, menyebabkan resistensi antibiotik', a: 'transferhorizontal' },
                { q: 'Paradoks logika di mana pernyataan "kalimat ini bohong" tidak bisa ditentukan benar atau salahnya', a: 'paradokspembohong' },
                { q: 'Efek fisika di mana frekuensi gelombang berubah karena gerakan relatif sumber terhadap pengamat', a: 'doppler' },
                { q: 'Proses geologi pembentukan pegunungan akibat tumbukan lempeng tektonik', a: 'orogenesis' },
                { q: 'Konsep dalam psikologi Jung tentang memori kolektif bawah sadar seluruh umat manusia', a: 'arketipe' },
                { q: 'Zat dalam otak yang mengatur siklus tidur-bangun dan diproduksi oleh kelenjar pineal', a: 'melatonin' },
            ];

            const w = await getDynamicQuestion('tebakkata', fallbacks);
            const cleanAnswer = w.a.toLowerCase().replace(/\s+/g, '');
            const hint = cleanAnswer.length > 2
                ? cleanAnswer[0] + '_'.repeat(cleanAnswer.length - 2) + cleanAnswer[cleanAnswer.length - 1]
                : cleanAnswer[0] + '_';

            const sentMsg = await m.reply(
                `╭───「 🔤 𝚃𝙴𝙱𝙰𝙺 𝙺𝙰𝚃𝙰 」\n` +
                `│ \n` +
                `│ ❓ ${w.q}\n` +
                `│ \n` +
                `│ 💡 Hint: *${hint}* (${cleanAnswer.length} huruf)\n` +
                `│ 📝 Balas pesan ini untuk menjawab!\n` +
                `│ ⏳ Timeout: 90 Detik\n` +
                `│ 🏆 Reward: +1.500 balance\n` +
                `╰──────────────`
            );

            global.activeGames.set(m.chat, {
                answer: cleanAnswer,
                time: Date.now(),
                reward: 1500,
                msgId: sentMsg.key.id,
                type: 'tebakkata'
            });

            // Timeout 90 detik, soal lebih sulit
            setTimeout(() => {
                const game = global.activeGames.get(m.chat);
                if (game && game.type === 'tebakkata') {
                    global.activeGames.delete(m.chat);
                    m.reply(`⏳ *Waktu Habis!*\n\n❌ Tidak ada yang menjawab.\n✅ Jawaban: *${w.a}*`);
                }
            }, 90000);
        }
    },
    {
        name: 'tebaklirik', category: 'games', desc: 'Tebak lirik lagu pop Indonesia',
        async execute({ m }) {
            global.activeGames = global.activeGames || new Map();
            if (global.activeGames.has(m.chat)) global.activeGames.delete(m.chat);

            const songs = [
                { s: 'Bento', a: 'iwan fals', l: 'Bento sudah jadi bos besar, banyak uang dan harta berlimpah...' },
                { s: 'Kerispatih', a: 'kerispatih', l: 'Aku yang tak berharga lagi di matamu, aku yang selalu kau buang...' },
                { s: 'Bimbang', a: 'melly goeslaw', l: 'Antara ya atau tidak, antara benci atau cinta...' },
                { s: 'Kisah Cintaku', a: 'peterpan', l: 'Berjalan di keheningan malam yang dingin tak berbintang...' },
                { s: 'Kasih Putih', a: 'glenn fredly', l: 'Kasih putih yang selalu hadir bersama diriku...' },
                { s: 'Berita Kepada Kawan', a: 'ebiet g ade', l: 'Perjalanan ini terasa sangat melelahkan...' },
                { s: 'Bila Rasaku Ini Rasamu', a: 'kerispatih', l: 'Apakah yang telah kau lakukan terhadap diriku...' },
                { s: 'Terlalu Manis', a: 'slank', l: 'Terlalu manis kau merasa paling manis di dunia...' },
                { s: 'Pelangi Di Matamu', a: 'jamrud', l: 'Biarkan ku menatap matamu, ada pelangi di matamu...' },
                { s: 'Roman Picisan', a: 'dewa 19', l: 'Hati-hati saat kau mencintai seseorang dengan sepenuh hati...' }
            ];
            const song = pickRandom(songs);
            const hint = song.s[0] + '_'.repeat(song.s.length - 2) + song.s[song.s.length - 1];

            global.activeGames.set(m.chat, {
                type: 'tebaklirik',
                answer: song.s.toLowerCase(),
                reward: 1200,
                hint
            });
            await m.reply(
                `╭───「 🎵 𝚃𝙴𝙱𝙰𝙺 𝙻𝙸𝚁𝙸𝙺 」\n` +
                `│ \n` +
                `│ 🎤 Lirik:\n` +
                `│ _"${song.l}"_\n` +
                `│ \n` +
                `│ ❓ Apa judul lagu di atas?\n` +
                `│ 💡 Hint: *${hint}* (Penyanyi: ${song.a})\n` +
                `│ 📝 Ketik jawaban langsung (tanpa reply)\n` +
                `│ ⏳ Timeout: 60 Detik | 🏆 Reward: +1.200\n` +
                `╰──────────────`
            );
            setTimeout(() => {
                if (global.activeGames.has(m.chat) && global.activeGames.get(m.chat).type === 'tebaklirik') {
                    global.activeGames.delete(m.chat);
                    m.reply(`⏳ *Waktu Habis!*\n\n✅ Jawaban: *${song.s}* (${song.a})`);
                }
            }, 60000);
        }
    },
    {
        name: 'tebakkimia', category: 'games', desc: 'Tebak unsur kimia',
        async execute({ m }) {
            await m.reply('⏳ _Mengenerate soal AI..._');
            const fallbacks = [
                {q:'Unsur radioaktif dengan waktu paruh terpendek di antara halogen, hanya ditemukan dari peluruhan unsur lain',a:'Astatin'},
                {q:'Logam transisi dengan simbol Tc yang tidak memiliki isotop stabil dan pertama kali dibuat secara sintetis',a:'Teknesium'},
                {q:'Unsur aktinida yang digunakan sebagai bahan bakar reaktor nuklir breeder, simbol Pu',a:'Plutonium'},
                {q:'Gas mulia terberat yang terjadi secara alami, bersifat radioaktif dan menjadi penyebab kanker paru-paru',a:'Radon'},
                {q:'Unsur lantanida yang digunakan dalam magnet permanen terkuat di dunia (NdFeB)',a:'Neodimium'},
                {q:'Logam terberat yang stabil, memiliki simbol Bi dan isotop 209 yang sangat panjang waktu paruhnya',a:'Bismut'},
                {q:'Unsur dengan nomor atom 76, logam terpadat yang dikenal manusia',a:'Osmium'},
                {q:'Unsur yang dinamai dari nama planet, ditemukan tahun 1789, digunakan di PLTN, simbol U',a:'Uranium'},
                {q:'Unsur non-logam yang paling elektronegatif di tabel periodik menurut skala Pauling',a:'Fluor'},
                {q:'Logam alkali tanah yang terbakar dengan nyala hijau terang dan digunakan dalam kembang api',a:'Barium'},
            ];
            const e = await getDynamicQuestion('tebakkimia', fallbacks);
            
            global.activeGames = global.activeGames || new Map();
            if (global.activeGames.has(m.chat)) return m.reply('❌ Selesaikan game sebelumnya dulu!');
            
            const sentMsg = await m.reply(`╭───「 🧪 𝚃𝙴𝙱𝙰𝙺 𝙺𝙸𝙼𝙸𝙰 」\n│ \n│ ❓ ${e.q}\n│ \n│ 💡 Balas pesan ini untuk menjawab!
│ ⏳ Timeout: 60 Detik\n╰──────────────`);
            global.activeGames.set(m.chat, { answer: e.a.toLowerCase(), time: Date.now(), reward: 1000, msgId: sentMsg.key.id });
            setTimeout(() => { if (global.activeGames.has(m.chat)) { global.activeGames.delete(m.chat); m.reply(`⏳ *Waktu Habis!*\nJawaban: ${e.a}`); } }, 60000);
        }
    },
    {
        name: 'caklontong', category: 'games', desc: 'Tebak cak lontong',
        async execute({ m }) {
            await m.reply('⏳ _Mengenerate soal AI..._');
            const fallbacks = [
                {q:'Semakin dipukul semakin diam, semakin dicium semakin keras...',a:'Kentongan'},
                {q:'Dokter gigi biasanya pulang kerja bawa...',a:'Payung'},
                {q:'Ikan yang paling ditakuti nelayan...',a:'Ikan mas'},
                {q:'Kalo orang pintar makan di...',a:'Mulut'},
                {q:'Tempat parkir yang paling ramai di Indonesia...',a:'Indonesia'},
                {q:'Guru yang tidak pernah marah...',a:'Gurita'},
                {q:'Orang yang tidak pernah mandi tapi selalu bersih...',a:'Bayi belum lahir'},
                {q:'Motor yang paling lambat di dunia...',a:'Motorola'},
                {q:'Buah yang selalu dihitung orang...',a:'Buah pikiran'},
                {q:'Sayur yang paling ditakuti penjahat...',a:'Sayur bayam'}
            ];
            const q = await getDynamicQuestion('caklontong', fallbacks);
            
            global.activeGames = global.activeGames || new Map();
            if (global.activeGames.has(m.chat)) return m.reply('❌ Selesaikan game sebelumnya dulu!');
            
            const sentMsg = await m.reply(`╭───「 🤔 𝙲𝙰𝙺 𝙻𝙾𝙽𝚃𝙾𝙽𝙶 」\n│ \n│ ❓ ${q.q}\n│ \n│ 💡 Balas pesan ini untuk menjawab!
│ ⏳ Timeout: 60 Detik\n╰──────────────`);
            global.activeGames.set(m.chat, { answer: q.a.toLowerCase(), time: Date.now(), reward: 1500, msgId: sentMsg.key.id });
            setTimeout(() => { if (global.activeGames.has(m.chat)) { global.activeGames.delete(m.chat); m.reply(`⏳ *Waktu Habis!*\nJawaban: ${q.a}`); } }, 60000);
        }
    },
    {
        name: 'tebakangka', category: 'games', desc: 'Tebak angka 1-100 (interaktif)',
        async execute({ m }) {
            global.activeGames = global.activeGames || new Map();
            if (global.activeGames.has(m.chat)) global.activeGames.delete(m.chat);

            const answer = randomInt(1, 100);
            let attempts = 0;
            const MAX_ATTEMPTS = 7;

            const sentMsg = await m.reply(
                `╭───「 🔢 𝚃𝙴𝙱𝙰𝙺 𝙰𝙽𝙶𝙺𝙰 」\n` +
                `│ \n` +
                `│ 🎯 Aku memikirkan angka 1-100\n` +
                `│ 📝 Balas pesan ini dengan tebakannmu!\n` +
                `│ 💡 Kamu punya *${MAX_ATTEMPTS} kesempatan*\n` +
                `│ 🏆 Reward: +800 balance\n` +
                `╰──────────────`
            );

            global.activeGames.set(m.chat, {
                type: 'tebakangka_reply',
                answer: String(answer),
                reward: 800,
                msgId: sentMsg.key.id,
                attempts: 0,
                maxAttempts: MAX_ATTEMPTS,
                hint: `antara 1-100`,
                handleGuess: async (guessMsg, guessNum) => {
                    attempts++;
                    const game = global.activeGames.get(m.chat);
                    if (!game) return;
                    game.attempts = attempts;

                    if (guessNum === answer) {
                        let reward = 800;
                        const { Settings } = require('../database');
                        const abuseVal = Settings.get('adminabuse_' + m.chat);
                        const multiplier = parseInt(abuseVal) || (abuseVal === 'true' ? 2 : 1);
                        if (multiplier > 1) reward *= multiplier;
                        Users.addBalance(guessMsg.sender, reward);
                        global.activeGames.delete(m.chat);
                        await guessMsg.reply(
                            `🎉 *BENAR!* Angkanya *${answer}*!\n` +
                            `📊 Dicapai dalam *${attempts} percobaan*\n` +
                            `💰 +${reward} balance untuk @${guessMsg.sender.split('@')[0]}! ${multiplier > 1 ? `(Admin Abuse x${multiplier}! 🔥)` : ''}`
                        );
                    } else if (attempts >= MAX_ATTEMPTS) {
                        global.activeGames.delete(m.chat);
                        await guessMsg.reply(`⏳ *Kesempatan Habis!*\n\n✅ Jawaban: *${answer}*\nSayang sekali... Coba lagi!`);
                    } else {
                        const left = MAX_ATTEMPTS - attempts;
                        const hint = guessNum < answer ? '⬆️ Lebih BESAR' : '⬇️ Lebih KECIL';
                        await guessMsg.reply(`${hint} dari ${guessNum}\n💡 Sisa kesempatan: *${left}x*`);
                    }
                }
            });

            setTimeout(() => {
                if (global.activeGames.has(m.chat)) {
                    global.activeGames.delete(m.chat);
                    m.reply(`⏳ *Waktu Habis!*\n\n✅ Jawaban: *${answer}*`);
                }
            }, 120000);
        }
    },
    {
        name: 'tebaknegara', category: 'games', desc: 'Tebak negara',
        async execute({ m }) {
            await m.reply('⏳ _Mengenerate soal AI..._');
            const fallbacks = [
                {q:'Negara di Afrika yang pernah dikenal sebagai Abyssinia dan memiliki kalender sendiri dengan 13 bulan',a:'Ethiopia'},
                {q:'Negara kepulauan terkecil di dunia berdasarkan luas daratan, terletak di Samudra Pasifik',a:'Nauru'},
                {q:'Negara di Asia Tengah yang pernah berganti nama ibu kotanya dari Astana ke Nur-Sultan lalu kembali ke Astana',a:'Kazakhstan'},
                {q:'Negara di Eropa yang tidak memiliki bandara dan merupakan salah satu mikrostate tertua di dunia',a:'San Marino'},
                {q:'Negara di Afrika Barat yang namanya berasal dari sungai, dan pernah menjadi pusat Kerajaan Mali',a:'Mali'},
                {q:'Negara pegunungan di Asia Selatan yang mengukur kebahagiaan nasional bruto alih-alih PDB',a:'Bhutan'},
                {q:'Negara di Eropa Timur yang memiliki wilayah separatis Transnistria yang tidak diakui internasional',a:'Moldova'},
                {q:'Negara di Karibia yang merupakan pulau terbesar dan satu-satunya negara sosialis di belahan bumi barat',a:'Kuba'},
                {q:'Negara di Afrika Timur yang terkurung daratan dan pernah menjadi kerajaan Abyssinia',a:'Lesotho'},
                {q:'Negara di Asia Tenggara yang baru merdeka tahun 2002 dan menjadi negara termuda di Asia',a:'Timor Leste'}
            ];
            const c = await getDynamicQuestion('tebaknegara', fallbacks);
            
            global.activeGames = global.activeGames || new Map();
            if (global.activeGames.has(m.chat)) return m.reply('❌ Selesaikan game sebelumnya dulu!');
            
            const sentMsg = await m.reply(`╭───「 🌍 𝚃𝙴𝙱𝙰𝙺 𝙽𝙴𝙶𝙰𝚁𝙰 」\n│ \n│ ❓ ${c.q}\n│ \n│ 💡 Balas pesan ini untuk menjawab!
│ ⏳ Timeout: 60 Detik\n╰──────────────`);
            global.activeGames.set(m.chat, { answer: c.a.toLowerCase(), time: Date.now(), reward: 1000, msgId: sentMsg.key.id });
            setTimeout(() => { if (global.activeGames.has(m.chat)) { global.activeGames.delete(m.chat); m.reply(`⏳ *Waktu Habis!*\nJawaban: ${c.a}`); } }, 60000);
        }
    },
    {
        name: 'tebakgambar', category: 'games', desc: 'Tebak gambar objek (berbasis teks)',
        async execute({ m }) {
            global.activeGames = global.activeGames || new Map();
            if (global.activeGames.has(m.chat)) global.activeGames.delete(m.chat);

            const objects = [
                { o: 'Astrolabe', d: 'Instrumen kuno berbentuk cakram logam berlubang yang digunakan astronom untuk mengukur posisi bintang.' },
                { o: 'Sextant', d: 'Alat navigasi pelaut yang mengukur sudut antara cakrawala dan benda langit untuk menentukan posisi.' },
                { o: 'Fonograf', d: 'Alat pemutar musik era Victoria yang menggunakan jarum pada piringan berlekuk untuk menghasilkan suara.' },
                { o: 'Barometer', d: 'Instrumen ilmiah yang mengukur tekanan atmosfer untuk memprediksi cuaca.' },
                { o: 'Periskop', d: 'Alat optik berbentuk tabung dengan cermin yang memungkinkan pengamatan objek di atas penghalang.' },
                { o: 'Sundial', d: 'Alat penunjuk waktu tertua yang menggunakan bayangan dari sinar matahari pada permukaan bertanda.' },
                { o: 'Katrol', d: 'Alat mekanis berupa roda berisi tali yang mengubah arah gaya untuk mengangkat beban berat.' },
                { o: 'Telegraf', d: 'Alat komunikasi jarak jauh yang mengirim pesan menggunakan sinyal listrik dalam kode titik dan garis.' },
                { o: 'Kompas', d: 'Instrumen navigasi berisi jarum magnetik yang selalu menunjuk ke arah utara bumi.' },
                { o: 'Gyroscope', d: 'Roda berputar cepat pada poros yang mempertahankan orientasinya terlepas dari gerakan wadahnya.' }
            ];
            const obj = pickRandom(objects);
            const hint = obj.o[0] + '_'.repeat(obj.o.length - 2) + obj.o[obj.o.length - 1];

            global.activeGames.set(m.chat, {
                type: 'tebakgambar',
                answer: obj.o.toLowerCase(),
                reward: 900,
                hint
            });
            await m.reply(
                `╭───「 🖼️ 𝚃𝙴𝙱𝙰𝙺 𝙶𝙰𝙼𝙱𝙰𝚁 」\n` +
                `│ \n` +
                `│ 👁️ Bayangkan gambar ini:\n` +
                `│ _"${obj.d}"_\n` +
                `│ \n` +
                `│ ❓ Benda apakah yang dimaksud?\n` +
                `│ 💡 Hint: *${hint}*\n` +
                `│ 📝 Ketik jawaban langsung (tanpa reply)\n` +
                `│ ⏳ Timeout: 60 Detik | 🏆 Reward: +900\n` +
                `╰──────────────`
            );
            setTimeout(() => {
                if (global.activeGames.has(m.chat) && global.activeGames.get(m.chat).type === 'tebakgambar') {
                    global.activeGames.delete(m.chat);
                    m.reply(`⏳ *Waktu Habis!*\n\n✅ Jawaban: *${obj.o}*`);
                }
            }, 60000);
        }
    },
    {
        name: 'tebakbendera', category: 'games', desc: 'Tebak bendera negara',
        async execute({ m }) {
            global.activeGames = global.activeGames || new Map();
            if (global.activeGames.has(m.chat)) global.activeGames.delete(m.chat);

            const flags = [
                {e:'🇧🇹',a:'bhutan'}, {e:'🇱🇸',a:'lesotho'}, {e:'🇲🇳',a:'mongolia'},
                {e:'🇲🇩',a:'moldova'}, {e:'🇬🇪',a:'georgia'}, {e:'🇦🇲',a:'armenia'},
                {e:'🇦🇿',a:'azerbaijan'}, {e:'🇰🇬',a:'kirgizstan'}, {e:'🇹🇯',a:'tajikistan'},
                {e:'🇹🇲',a:'turkmenistan'}, {e:'🇺🇿',a:'uzbekistan'}, {e:'🇲🇲',a:'myanmar'},
                {e:'🇱🇦',a:'laos'}, {e:'🇰🇭',a:'kamboja'}, {e:'🇧🇳',a:'brunei'},
                {e:'🇲🇻',a:'maladewa'}, {e:'🇳🇵',a:'nepal'}, {e:'🇱🇰',a:'sri lanka'},
                {e:'🇧🇼',a:'botswana'}, {e:'🇿🇲',a:'zambia'}, {e:'🇿🇼',a:'zimbabwe'},
                {e:'🇲🇿',a:'mozambik'}, {e:'🇲🇬',a:'madagaskar'}, {e:'🇸🇳',a:'senegal'},
                {e:'🇬🇭',a:'ghana'}, {e:'🇨🇮',a:'pantai gading'}, {e:'🇨🇲',a:'kamerun'},
                {e:'🇧🇴',a:'bolivia'}, {e:'🇵🇾',a:'paraguay'}, {e:'🇺🇾',a:'uruguay'},
                {e:'🇪🇨',a:'ekuador'}, {e:'🇭🇳',a:'honduras'}, {e:'🇬🇹',a:'guatemala'},
                {e:'🇵🇦',a:'panama'}, {e:'🇯🇲',a:'jamaika'}, {e:'🇮🇸',a:'islandia'},
            ];
            const f = pickRandom(flags);
            const hint = f.a[0] + '_'.repeat(f.a.replace(/\s/g,'').length - 2) + f.a[f.a.length - 1];

            global.activeGames.set(m.chat, {
                type: 'tebakbendera',
                answer: f.a,
                reward: 750,
                hint
            });
            await m.reply(
                `╭───「 🏳️ 𝚃𝙴𝙱𝙰𝙺 𝙱𝙴𝙽𝙳𝙴𝚁𝙰 」\n` +
                `│ \n` +
                `│ 🚩 ${f.e}\n` +
                `│ \n` +
                `│ ❓ Negara mana punya bendera ini?\n` +
                `│ 💡 Hint: *${hint}*\n` +
                `│ 📝 Ketik jawaban langsung (tanpa reply)\n` +
                `│ ⏳ Timeout: 45 Detik | 🏆 Reward: +750\n` +
                `╰──────────────`
            );
            setTimeout(() => {
                if (global.activeGames.has(m.chat) && global.activeGames.get(m.chat).type === 'tebakbendera') {
                    global.activeGames.delete(m.chat);
                    m.reply(`⏳ *Waktu Habis!*\n\n✅ Jawaban: *${f.a}* ${f.e}`);
                }
            }, 45000);
        }
    },
    {
        name: 'susunkata', category: 'games', desc: 'Susun kata acak',
        async execute({ m }) {
            global.activeGames = global.activeGames || new Map();
            if (global.activeGames.has(m.chat)) global.activeGames.delete(m.chat);

            const words = [
                'KONSTITUSIONALISME','DEINDUSTRIALISASI','KETIDAKBERPIHAKAN','DESENTRALISASI',
                'KONTRAPRODUKTIF','KETIDAKSEIMBANGAN','BIOKOMPATIBILITAS','ELEKTROMAGNETISME',
                'KETIDAKBERDAYAAN','KONTRAKONTRAKTUAL','DEOKSIMARGARINAT','POLISAKARIDA',
                'TERKONSTITUSIONAL','KETIDAKKONSISTENAN','BIOGEOKIMIA','PALEONTOLOGI',
                'KETIDAKTERATURAN','ULTRAVIOLET','FOTOSINTESIS','ANTIKONSTITUSIONAL'
            ];
            const w = pickRandom(words);
            let shuffled;
            do { shuffled = w.split('').sort(() => Math.random() - 0.5).join(''); } while (shuffled === w);
            const hint = w[0] + '_'.repeat(w.length - 2) + w[w.length - 1];

            global.activeGames.set(m.chat, {
                type: 'susunkata',
                answer: w.toLowerCase(),
                reward: 1000,
                hint
            });
            await m.reply(
                `╭───「 🔤 𝚂𝚄𝚂𝚄𝙽 𝙺𝙰𝚃𝙰 」\n` +
                `│ \n` +
                `│ 🔀 *${shuffled}*\n` +
                `│ \n` +
                `│ 💡 Hint: *${hint}* (${w.length} huruf)\n` +
                `│ 📝 Ketik jawaban langsung (tanpa reply)\n` +
                `│ ⏳ Timeout: 60 Detik | 🏆 Reward: +1.000\n` +
                `╰──────────────`
            );
            setTimeout(() => {
                if (global.activeGames.has(m.chat) && global.activeGames.get(m.chat).type === 'susunkata') {
                    global.activeGames.delete(m.chat);
                    m.reply(`⏳ *Waktu Habis!*\n\n✅ Jawaban: *${w}*`);
                }
            }, 60000);
        }
    },
    {
        name: 'colorblind', category: 'games', desc: 'Test buta warna emoji',
        async execute({ m }) {
            global.activeGames = global.activeGames || new Map();
            if (global.activeGames.has(m.chat)) global.activeGames.delete(m.chat);

            const tests = [
                { bg: '🔴', fg: '🍎', ans: 'apel' },
                { bg: '🟡', fg: '🍋', ans: 'lemon' },
                { bg: '🟢', fg: '🍏', ans: 'apel hijau' },
                { bg: '🔵', fg: '📘', ans: 'buku' },
                { bg: '🟣', fg: '🍇', ans: 'anggur' },
                { bg: '🟤', fg: '🥔', ans: 'kentang' },
                { bg: '⚫', fg: '🎱', ans: 'bola' },
                { bg: '⚪', fg: '🥚', ans: 'telur' }
            ];
            const t = pickRandom(tests);

            let pattern = '';
            const hideRow = randomInt(1, 4);
            const hideCol = randomInt(1, 4);

            for(let r = 0; r < 6; r++) {
                for(let c = 0; c < 6; c++) {
                    if (r === hideRow && c === hideCol) pattern += t.fg;
                    else pattern += t.bg;
                }
                pattern += '\n';
            }

            global.activeGames.set(m.chat, {
                type: 'colorblind',
                answer: t.ans.toLowerCase(),
                reward: 1200,
                hint: `Sesuatu yang berbentuk ${t.ans.length} huruf`
            });
            
            await m.reply(
                `╭───「 🎨 𝙲𝙾𝙻𝙾𝚁 𝙱𝙻𝙸𝙽𝙳 𝚃𝙴𝚂𝚃 」\n` +
                `│ \n` +
                `${pattern}\n` +
                `│ ❓ Objek/bentuk apa yang tersembunyi\n` +
                `│ di antara warna di atas?\n` +
                `│ \n` +
                `│ 📝 Ketik jawaban langsung (tanpa reply)\n` +
                `│ ⏳ Timeout: 45 Detik | 🏆 Reward: +1.200\n` +
                `╰──────────────`
            );
            setTimeout(() => {
                if (global.activeGames.has(m.chat) && global.activeGames.get(m.chat).type === 'colorblind') {
                    global.activeGames.delete(m.chat);
                    m.reply(`⏳ *Waktu Habis!*\n\n✅ Jawaban: *${t.ans}* (${t.fg})`);
                }
            }, 45000);
        }
    },
    {
        name: 'rampok', category: 'games', desc: 'Rampok balance member', usage: '(@tag)',
        async execute({ m }) {
            if (Users.isJailed(m.sender)) {
                return m.reply(`🚔 Kamu masih di dalam penjara!\nTunggu ${Users.getJailTimeLeft(m.sender)} menit lagi sebelum bisa merampok.`);
            }
            const target = m.mentionedJid?.[0] || m.quoted?.sender;
            if (!target) return m.reply('❌ Tag target!');
            const success = Math.random() > 0.6;
            const amount = randomInt(50, 300);
            if (success) {
                const targetUser = Users.getOrCreate(target);
                if (targetUser.balance >= amount) {
                    let reward = amount;
                    const { Settings } = require('../database');
                    const abuseVal = Settings.get('adminabuse_' + m.chat);
                    const multiplier = parseInt(abuseVal) || (abuseVal === 'true' ? 2 : 1);
                    if (multiplier > 1) reward *= multiplier;
                    Users.addBalance(target, -amount);
                    Users.addBalance(m.sender, reward);
                    await m.reply(`🔫 Berhasil merampok @${target.split('@')[0]}!\n💰 +${formatNumber(reward)} balance ${multiplier > 1 ? `(Admin Abuse x${multiplier}! 🔥)` : ''}`);
                } else { await m.reply(`😢 @${target.split('@')[0]} terlalu miskin untuk dirampok!`); }
            } else { 
                await m.reply(`👮 Kamu gagal merampok dan kena tangkap!\nMasuk penjara selama 30 menit dan denda ${formatNumber(amount)} balance.`); 
                Users.addBalance(m.sender, -Math.min(amount, Users.get(m.sender)?.balance || 0));
                Users.setJail(m.sender, 30);
            }
        }
    },
    {
        name: 'begal', category: 'games', desc: 'Begal balance',
        async execute({ m }) {
            if (Users.isJailed(m.sender)) {
                return m.reply(`🚔 Kamu masih di dalam penjara!\nTunggu ${Users.getJailTimeLeft(m.sender)} menit lagi sebelum bisa membegal.`);
            }
            const amount = randomInt(100, 500);
            const success = Math.random() > 0.5;
            if (success) { 
                let reward = amount;
                const { Settings } = require('../database');
                const abuseVal = Settings.get('adminabuse_' + m.chat);
                const multiplier = parseInt(abuseVal) || (abuseVal === 'true' ? 2 : 1);
                if (multiplier > 1) reward *= multiplier;
                Users.addBalance(m.sender, reward); 
                await m.reply(`🔪 Begal berhasil! +${formatNumber(reward)} balance ${multiplier > 1 ? `(Admin Abuse x${multiplier}! 🔥)` : ''}`); 
            } else { 
                await m.reply('👮 Begal gagal! Kamu tertangkap dan dipenjara 30 menit!');
                Users.setJail(m.sender, 30);
            }
        }
    },
    {
        name: 'tekateki', category: 'games', desc: 'Teka-teki',
        async execute({ m }) {
            await m.reply('⏳ _Mengenerate soal AI..._');
            const fallbacks = [
                {q:'Aku hidup ketika aku dimakan, dan mati ketika aku diberi minum. Siapakah aku?',a:'Api'},
                {q:'Aku punya kota tapi tidak ada bangunan, punya hutan tapi tidak ada pohon, punya air tapi tidak ada ikan',a:'Peta'},
                {q:'Semakin kamu ambil dariku, semakin besar aku. Tapi jika kamu tambahkan, aku malah mengecil',a:'Lubang'},
                {q:'Aku bisa terbang tanpa sayap, menangis tanpa mata, dan ke mana pun aku pergi kegelapan mengikuti',a:'Awan'},
                {q:'Yang membuatku tidak pernah memakainya, yang memakainya tidak pernah melihatnya, yang melihatnya tidak pernah menginginkannya',a:'Peti mati'},
                {q:'Aku selalu ada di depanmu tapi tidak pernah bisa kau lihat',a:'Masa depan'},
                {q:'Makin panjang makin pendek, makin pendek makin panjang. Apa itu?',a:'Umur'},
                {q:'Aku punya leher tapi tidak punya kepala, punya badan tapi tidak punya kaki',a:'Botol'},
                {q:'Orang kaya membutuhkan aku, orang miskin punya banyak aku, jika kamu makan aku kamu mati',a:'Tidak ada'},
                {q:'Aku mengikutimu ke mana-mana di siang hari tapi menghilang di malam hari tanpa jejak',a:'Bayangan'}
            ];
            const r = await getDynamicQuestion('tekateki', fallbacks);
            
            global.activeGames = global.activeGames || new Map();
            if (global.activeGames.has(m.chat)) return m.reply('❌ Selesaikan game sebelumnya dulu!');
            
            global.activeGames.set(m.chat, { answer: r.a.toLowerCase(), time: Date.now(), reward: 1500 });
            await m.reply(`╭───「 🤔 𝚃𝙴𝙺𝙰-𝚃𝙴𝙺𝙸 」\n│ \n│ ❓ ${r.q}\n│ \n│ 💡 Balas pesan ini untuk menjawab!
│ ⏳ Timeout: 60 Detik\n╰──────────────`);
            setTimeout(() => { if (global.activeGames.has(m.chat)) { global.activeGames.delete(m.chat); m.reply(`⏳ *Waktu Habis!*\nJawaban: ${r.a}`); } }, 60000);
        }
    },
    {
        name: 'tebakbom', category: 'games', desc: 'Minesweeper mini',
        async execute({ m, sock }) {
            global.activeGames = global.activeGames || new Map();
            if (global.activeGames.has(m.chat)) global.activeGames.delete(m.chat);

            const bombs = [];
            while(bombs.length < 3) {
                const r = randomInt(0,8);
                if(!bombs.includes(r)) bombs.push(r);
            }

            const state = [0,0,0,0,0,0,0,0,0]; // 0=tutup, 1=buka aman
            let score = 0;

            const render = (reveal=false) => {
                let text = `💣 *TEBAK BOM*\n\n`;
                const labels = ['A','B','C'];
                text += `  1️⃣ 2️⃣ 3️⃣\n`;
                for(let row=0; row<3; row++) {
                    text += `${labels[row]} `;
                    for(let col=0; col<3; col++) {
                        const idx = row*3 + col;
                        if(reveal && bombs.includes(idx)) text += '💥 ';
                        else if(state[idx] === 1) text += '✅ ';
                        else text += '📦 ';
                    }
                    text += '\n';
                }
                return text;
            };

            const sentMsg = await m.reply(
                render() +
                `\n⚠️ Ada *3 BOM* yang tersembunyi!\n` +
                `📝 Ketik koordinat (contoh: *A1*, *B2*, *C3*) untuk membuka kotak.\n\n` +
                `💰 Setiap kotak aman = +200 balance\n💥 Jika kena bom, game selesai!`
            );

            global.activeGames.set(m.chat, {
                type: 'tebakbom',
                bombs, state, score,
                msgId: sentMsg.key.id,
                handlePick: async (msg, sock, pick) => {
                    const game = global.activeGames.get(msg.chat);
                    if(!game) return;
                    
                    const rowIdx = {'A':0, 'B':1, 'C':2}[pick[0]];
                    const colIdx = parseInt(pick[1]) - 1;
                    const idx = rowIdx*3 + colIdx;

                    if(game.state[idx] === 1) {
                        await msg.reply('❌ Kotak itu sudah dibuka! Pilih yang lain.');
                        return;
                    }

                    if(game.bombs.includes(idx)) {
                        global.activeGames.delete(msg.chat);
                        await sock.sendMessage(msg.chat, { text: render(true) + `\n\n💥 *BOOM!* Kamu kena bom di ${pick}!\n💸 Game berakhir. Total menang: ${game.score}` }, { quoted: msg.raw });
                    } else {
                        game.state[idx] = 1;
                        let reward = 200;
                        const { Settings } = require('../database');
                        const abuseVal = Settings.get('adminabuse_' + msg.chat);
                        const multiplier = parseInt(abuseVal) || (abuseVal === 'true' ? 2 : 1);
                        if (multiplier > 1) reward *= multiplier;
                        game.score += reward;
                        Users.addBalance(msg.sender, reward);
                        
                        if(game.state.filter(x=>x===1).length === 6) {
                            global.activeGames.delete(msg.chat);
                            await sock.sendMessage(msg.chat, { text: render(true) + `\n\n🎉 *KAMU MENANG SEMPURNA!*\n💰 Total reward: ${game.score} balance.` }, { quoted: msg.raw });
                        } else {
                            await sock.sendMessage(msg.chat, { text: render() + `\n\n✅ *Aman!* +${reward} balance.\n📝 Lanjut pilih kotak lain!` }, { quoted: msg.raw });
                        }
                    }
                }
            });
            setTimeout(() => { if (global.activeGames.has(m.chat) && global.activeGames.get(m.chat).type === 'tebakbom') global.activeGames.delete(m.chat); }, 120000);
        }
    },
    {
        name: 'ulartangga', category: 'games', desc: 'Ular tangga vs bot/player', usage: '(@tag)',
        async execute({ m, sock }) {
            global.activeGames = global.activeGames || new Map();
            if (global.activeGames.has(m.chat)) global.activeGames.delete(m.chat);

            const snakes = { 14: 4, 19: 8, 22: 2, 28: 10 };
            const ladders = { 3: 11, 6: 17, 9: 18, 15: 24 };
            const BOARD_SIZE = 30;
            
            const target = m.mentionedJid?.[0];
            const bet = 1000;

            if (target) {
                // PvP Mode
                const p1 = Users.getOrCreate(m.sender);
                const p2 = Users.getOrCreate(target);
                if (p1.balance < bet) return m.reply(`❌ Balance kamu kurang untuk taruhan ${bet}!`);
                if (p2.balance < bet) return m.reply(`❌ Lawanmu tidak punya cukup balance untuk taruhan ${bet}!`);
                
                global.activeGames.set(m.chat, {
                    type: 'pending_challenge',
                    targetJid: target,
                    onAccept: async (acceptMsg, acceptSock) => {
                        global.activeGames.set(acceptMsg.chat, {
                            type: 'ulartangga_play',
                            mode: 'pvp',
                            p1: m.sender,
                            p2: target,
                            pos1: 1,
                            pos2: 1,
                            turn: m.sender,
                            bet: bet,
                            msgId: null,
                            handleRoll: async (msg) => {
                                const g = global.activeGames.get(msg.chat);
                                if (!g || g.type !== 'ulartangga_play') return;
                                if (msg.sender !== g.turn) {
                                    await msg.reply(`❌ Bukan giliranmu! Sekarang giliran @${g.turn.split('@')[0]}`, { mentions: [g.turn] });
                                    return;
                                }

                                const isP1 = (msg.sender === g.p1);
                                const roll = randomInt(1, 6);
                                
                                if (isP1) {
                                    g.pos1 += roll;
                                    let pMsg = `👤 @${g.p1.split('@')[0]} lempar dadu dapat *${roll}* (Kotak ${g.pos1})`;
                                    if(ladders[g.pos1]) { g.pos1 = ladders[g.pos1]; pMsg += ` 🪜 Naik tangga ke ${g.pos1}!`; }
                                    else if(snakes[g.pos1]) { g.pos1 = snakes[g.pos1]; pMsg += ` 🐍 Kena ular turun ke ${g.pos1}!`; }

                                    if(g.pos1 >= BOARD_SIZE) {
                                        global.activeGames.delete(msg.chat);
                                        Users.addBalance(g.p2, -bet);
                                        Users.addBalance(g.p1, bet);
                                        await acceptSock.sendMessage(msg.chat, { text: `🐍🪜 *ULAR TANGGA PvP*\n\n${pMsg}\n\n🎉 *KAMU MENANG!* Tiba di Finish (30) duluan!\n💸 Transfer ${bet} balance dari @${g.p2.split('@')[0]}`, mentions: [g.p1, g.p2] }, { quoted: msg.raw });
                                        return;
                                    }
                                    g.turn = g.p2;
                                    await acceptSock.sendMessage(msg.chat, { text: `🐍🪜 *ULAR TANGGA PvP*\n\n${pMsg}\n\nPosisi @${g.p2.split('@')[0]}: Kotak ${g.pos2}\n🏁 Finish: ${BOARD_SIZE}\n📝 Giliran @${g.p2.split('@')[0]} ketik *.lempar* !`, mentions: [g.p1, g.p2] }, { quoted: msg.raw });
                                } else {
                                    g.pos2 += roll;
                                    let pMsg = `👤 @${g.p2.split('@')[0]} lempar dadu dapat *${roll}* (Kotak ${g.pos2})`;
                                    if(ladders[g.pos2]) { g.pos2 = ladders[g.pos2]; pMsg += ` 🪜 Naik tangga ke ${g.pos2}!`; }
                                    else if(snakes[g.pos2]) { g.pos2 = snakes[g.pos2]; pMsg += ` 🐍 Kena ular turun ke ${g.pos2}!`; }

                                    if(g.pos2 >= BOARD_SIZE) {
                                        global.activeGames.delete(msg.chat);
                                        Users.addBalance(g.p1, -bet);
                                        Users.addBalance(g.p2, bet);
                                        await acceptSock.sendMessage(msg.chat, { text: `🐍🪜 *ULAR TANGGA PvP*\n\n${pMsg}\n\n🎉 *KAMU MENANG!* Tiba di Finish (30) duluan!\n💸 Transfer ${bet} balance dari @${g.p1.split('@')[0]}`, mentions: [g.p1, g.p2] }, { quoted: msg.raw });
                                        return;
                                    }
                                    g.turn = g.p1;
                                    await acceptSock.sendMessage(msg.chat, { text: `🐍🪜 *ULAR TANGGA PvP*\n\n${pMsg}\n\nPosisi @${g.p1.split('@')[0]}: Kotak ${g.pos1}\n🏁 Finish: ${BOARD_SIZE}\n📝 Giliran @${g.p1.split('@')[0]} ketik *.lempar* !`, mentions: [g.p1, g.p2] }, { quoted: msg.raw });
                                }
                            }
                        });
                        await acceptMsg.reply(`⚔️ Permainan dimulai! @${m.sender.split('@')[0]} giliran pertama. Ketik *.lempar* !`, { mentions: [m.sender] });
                    }
                });

                await m.reply(`⚔️ Menantang @${target.split('@')[0]} bermain Ular Tangga!\nTaruhan: ${bet} balance.\n\nKetik *terima* untuk mulai, atau *tolak* untuk membatalkan.`, { mentions: [target] });
            } else {
                // PvE Mode (Solo vs Bot)
                const game = {
                    type: 'ulartangga_play',
                    mode: 'solo',
                    p1: m.sender,
                    playerPos: 1,
                    botPos: 1,
                    msgId: null,
                    handleRoll: async (msg) => {
                        const g = global.activeGames.get(msg.chat);
                        if(!g || g.type !== 'ulartangga_play') return;
                        if(msg.sender !== g.p1) return;

                        // Player Turn
                        const pRoll = randomInt(1,6);
                        g.playerPos += pRoll;
                        let pMsg = `👤 Kamu lempar dadu dapat *${pRoll}* (Kotak ${g.playerPos})`;
                        if(ladders[g.playerPos]) { g.playerPos = ladders[g.playerPos]; pMsg += ` 🪜 Naik tangga ke ${g.playerPos}!`; }
                        else if(snakes[g.playerPos]) { g.playerPos = snakes[g.playerPos]; pMsg += ` 🐍 Kena ular turun ke ${g.playerPos}!`; }

                        if(g.playerPos >= BOARD_SIZE) {
                            global.activeGames.delete(msg.chat);
                            Users.addBalance(msg.sender, 2000);
                            await msg.reply(`🐍🪜 *ULAR TANGGA*\n\n${pMsg}\n\n🎉 *KAMU MENANG!* Tiba di Finish (30) duluan!\n💰 +2000 balance`);
                            return;
                        }

                        // Bot Turn
                        const bRoll = randomInt(1,6);
                        g.botPos += bRoll;
                        let bMsg = `🤖 Bot lempar dadu dapat *${bRoll}* (Kotak ${g.botPos})`;
                        if(ladders[g.botPos]) { g.botPos = ladders[g.botPos]; bMsg += ` 🪜 Naik tangga ke ${g.botPos}!`; }
                        else if(snakes[g.botPos]) { g.botPos = snakes[g.botPos]; bMsg += ` 🐍 Kena ular turun ke ${g.botPos}!`; }

                        if(g.botPos >= BOARD_SIZE) {
                            global.activeGames.delete(msg.chat);
                            await msg.reply(`🐍🪜 *ULAR TANGGA*\n\n${pMsg}\n${bMsg}\n\n💀 *BOT MENANG!* Bot tiba di Finish duluan!`);
                            return;
                        }

                        await msg.reply(`🐍🪜 *ULAR TANGGA*\n\n${pMsg}\n${bMsg}\n\n🏁 Finish: ${BOARD_SIZE}\n📝 Ketik *.lempar* untuk giliran selanjutnya!`);
                    }
                };
                
                global.activeGames.set(m.chat, game);
                await m.reply(`🐍🪜 *ULAR TANGGA*\n\nKamu vs Bot! Siapa cepat sampai kotak 30 dia menang.\n\n📝 Ketik *.lempar* untuk mengocok dadumu!`);
            }
        }
    },
    {
        name: 'lempar', category: 'games', desc: 'Lempar dadu ular tangga',
        async execute({ m, sock }) {
            const g = global.activeGames?.get(m.chat);
            if(g && typeof g.handleRoll === 'function') {
                await g.handleRoll(m);
            } else {
                await m.reply('❌ Tidak ada game Ular Tangga yang aktif. Ketik .ulartangga untuk mulai.');
            }
        }
    },
    {
        name: 'catur', category: 'games', desc: 'Main catur (Text mode)',
        async execute({ m }) { await m.reply('♟️ *CATUR*\n\n_Bot sedang mempelajari gerakan catur. Fitur AI catur masih dalam pengembangan!_'); }
    },
    {
        name: 'sailorpiece', aliases: ['spcodes', 'sptierlist'], category: 'games', desc: 'Info code & tierlist Sailor Piece',
        async execute({ m }) {
            const axios = require('axios');
            const cheerio = require('cheerio');
            
            await m.reply('🔍 Sedang mencari informasi terbaru di Google (Web)...');
            
            try {
                // Tambahkan 'Indonesia' agar memprioritaskan hasil pencarian berbahasa Indonesia jika ada
                const query = encodeURIComponent("Sailor Piece Roblox Codes Tier List Indonesia " + new Date().getFullYear());
                const res = await axios.get(`https://html.duckduckgo.com/html/?q=${query}&kl=id-id`, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                    timeout: 5000
                });
                const $ = cheerio.load(res.data);
                const snippets = [];
                $('.result__snippet').each((i, e) => {
                    if (i < 5) snippets.push($(e).text().trim());
                });
                
                if (snippets.length > 0) {
                    let msg = `⚓ *INFO SAILOR PIECE (LIVE PENCARIAN WEB)* ⚓\n\n`;
                    msg += `_Berikut ringkasan hasil pencarian terbaru dari internet:_\n\n`;
                    snippets.forEach((s) => {
                        msg += `🔹 ${s}\n\n`;
                    });
                    msg += `_Catatan: Hasil di atas didapatkan langsung dari web (beberapa mungkin dalam bahasa Inggris jika sumber bahasa Indonesia tidak ditemukan)._`;
                    await m.reply(msg);
                } else {
                    throw new Error("No snippets found");
                }
            } catch (e) {
                // Fallback hardcoded if web search fails (e.g. server/ISP blocks the search)
                let msg = `⚓ *INFO SAILOR PIECE (DATA CADANGAN INTERNAL)* ⚓\n\n`;
                msg += `_Pencarian web terhalang jaringan, berikut adalah data terbaru yang tersimpan di memori bot:_\n\n`;
                msg += `🎟️ *Daftar Code Aktif (Kode Redeem):*\n`;
                msg += `- THEOTHERFREECODEMB (Syarat: Level 10.000)\n`;
                msg += `- YETANOTHERFREECODE2 (Syarat: Level 10.000)\n`;
                msg += `- BUGFIXESCODES (Syarat: Level 10.000)\n`;
                msg += `- 500KFAVORITES (Syarat: Level 10.000)\n`;
                msg += `- LASTRESTARTHOPEFULLY (Syarat: Level 10.000)\n`;
                msg += `- SEABEASTS (Syarat: Level 7.500)\n`;
                msg += `- 4SPECS (Syarat: Level 6.500)\n\n`;
                msg += `🏆 *Daftar Tier List Buah (Fruit Tier List Umum):*\n`;
                msg += `- Tier S+ (Sangat Kuat): Dragon, Dough, Leopard\n`;
                msg += `- Tier S (Kuat): Light, Magma, Buddha\n`;
                msg += `- Tier A (Bagus): Ice, Flame, Quake, Dark\n`;
                msg += `- Tier B (Biasa): Sand, Smoke, Bomb\n\n`;
                msg += `_💡 Tips: Masukkan code di dalam game melalui menu Settings (ikon gerigi) > Redeem Codes. Pastikan level kamu sudah memenuhi syarat sebelum memakai code agar tidak gagal._`;
                await m.reply(msg);
            }
        }
    },
    {
        name: 'akinator', category: 'games', desc: 'Main akinator',
        async execute({ m }) {
            global.activeGames = global.activeGames || new Map();
            if (global.activeGames.has(m.chat)) global.activeGames.delete(m.chat);

            const questions = [
                { id: 'q1', text: 'Apakah karakternya laki-laki?', yes: 'q2', no: 'q3' },
                { id: 'q2', text: 'Apakah karakternya nyata/pernah hidup?', yes: 'q4', no: 'q5' },
                { id: 'q3', text: 'Apakah karakternya nyata/pernah hidup?', yes: 'q6', no: 'q7' },
                { id: 'q4', text: 'Apakah dia seorang presiden/pemimpin negara?', yes: 'ans_sukarno', no: 'ans_habibie' },
                { id: 'q5', text: 'Apakah dia punya kekuatan super?', yes: 'ans_superman', no: 'ans_batman' },
                { id: 'q6', text: 'Apakah dia seorang penyanyi?', yes: 'ans_rossa', no: 'ans_megawati' },
                { id: 'q7', text: 'Apakah dia berasal dari anime?', yes: 'ans_hinata', no: 'ans_elsa' }
            ];

            const answers = {
                ans_sukarno: 'Ir. Soekarno',
                ans_habibie: 'B.J. Habibie',
                ans_superman: 'Superman',
                ans_batman: 'Batman',
                ans_rossa: 'Rossa',
                ans_megawati: 'Megawati Soekarnoputri',
                ans_hinata: 'Hinata Hyuga',
                ans_elsa: 'Elsa (Frozen)'
            };

            const ask = async (qId, msg, sock) => {
                const q = questions.find(x => x.id === qId);
                if (!q) {
                    const ans = answers[qId];
                    global.activeGames.delete(msg.chat);
                    if(ans) await msg.reply(`🧞 *AKINATOR MENEBAK:*\n\nKarakter yang kamu pikirkan adalah...\n🎉 *${ans}*!`);
                    else await msg.reply(`🧞 Akinator bingung... Aku menyerah!`);
                    return;
                }

                global.activeGames.set(msg.chat, {
                    type: 'akinator',
                    qId: qId,
                    handleAnswer: async (replyMsg, sck, ansTxt) => {
                        const isYes = ['ya','iya','y'].includes(ansTxt);
                        const nextId = isYes ? q.yes : q.no;
                        await ask(nextId, replyMsg, sck);
                    }
                });

                await msg.reply(`🧞 *AKINATOR*\n\n❓ ${q.text}\n\n📝 Jawab dengan *ya* atau *tidak*`);
            };

            await ask('q1', m, null);
        }
    },
    {
        name: 'nyerah', aliases: ['stopgame', 'berhenti'], category: 'games', desc: 'Menghentikan permainan yang sedang berlangsung',
        async execute({ m }) {
            if (global.activeGames && global.activeGames.has(m.chat)) {
                global.activeGames.delete(m.chat);
                await m.reply('🏳️ Permainan di chat ini telah dihentikan.');
            } else {
                await m.reply('❌ Tidak ada permainan yang sedang berlangsung di chat ini.');
            }
        }
    }
];
