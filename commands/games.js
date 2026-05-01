const { randomInt, formatNumber, pickRandom, fetchJson } = require('../lib/functions');
const { Users, Transactions, Achievements } = require('../database');
const config = require('../config');

const activeGames = new Map();

async function getDynamicQuestion(type, fallback) {
    try {
        let p = '';
        const seed = Math.random().toString(36).substring(2, 10); // Random string agar AI tidak cache jawaban
        const extra = `\n(Wajib: Buat soal yang SANGAT BERBEDA dari sebelumnya. Jangan gunakan contoh pasaran. Kode seed acak untuk variasi: ${seed})`;
        
        if (type === 'tebakkata') p = 'Berikan 1 soal tebak kata bahasa Indonesia TINGKAT SULIT. JSON murni tanpa awalan backtick: {"q":"pertanyaan panjang","a":"jawaban_1_kata"}' + extra;
        else if (type === 'tebakkimia') p = 'Berikan 1 soal tebak unsur kimia (simbol/sifat) TINGKAT SULIT. JSON murni tanpa awalan backtick: {"q":"deskripsi unsur","a":"nama_unsur"}' + extra;
        else if (type === 'caklontong') p = 'Berikan 1 tebakan logika meleset ala Cak Lontong TINGKAT SULIT. JSON murni tanpa awalan backtick: {"q":"pertanyaan","a":"jawaban"}' + extra;
        else if (type === 'tebaknegara') p = 'Berikan 1 tebakan negara dari fakta unik/geografi TINGKAT SULIT. JSON murni tanpa awalan backtick: {"q":"pertanyaan","a":"negara"}' + extra;
        else if (type === 'tekateki') p = 'Berikan 1 teka-teki bahasa Indonesia menjebak TINGKAT SULIT. JSON murni tanpa awalan backtick: {"q":"pertanyaan","a":"jawaban"}' + extra;
        
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
            const user = Users.getOrCreate(m.sender, m.pushName);
            const emojis = ['🍒','🍋','🍊','🍇','💎','7️⃣','🔔','⭐'];
            const s = [pickRandom(emojis), pickRandom(emojis), pickRandom(emojis)];
            let win = 0;
            if (s[0]===s[1] && s[1]===s[2]) { win = s[0]==='💎' ? 5000 : s[0]==='7️⃣' ? 3000 : 1000; }
            else if (s[0]===s[1] || s[1]===s[2] || s[0]===s[2]) { win = 250; }
            if (win > 0) { Users.addBalance(m.sender, win); Transactions.create(m.sender, 'game_win', win, 'Slot machine'); }
            await m.reply(`🎰 *SLOT MACHINE*\n\n┃ ${s.join(' ┃ ')} ┃\n\n${win > 0 ? `🎉 MENANG! +${formatNumber(win)} balance!` : '😢 Coba lagi!'}`);
        }
    },
    {
        name: 'casino', category: 'games', desc: 'Main casino', usage: '(nominal)',
        async execute({ m, args }) {
            const bet = parseInt(args[0]) || 100;
            const user = Users.getOrCreate(m.sender, m.pushName);
            if (user.balance < bet) return m.reply(`❌ Balance tidak cukup! Kamu punya ${formatNumber(user.balance)}`);
            if (bet < 100) return m.reply('❌ Minimal bet 100!');

            const roll = Math.random();
            // 10% jackpot → +2x modal | 35% menang → +1x modal | 55% kalah → -1x modal
            if (roll < 0.10) {
                const jackpotWin = bet * 2;
                Users.addBalance(m.sender, jackpotWin);
                Transactions.create(m.sender, 'casino_jackpot', jackpotWin, 'Casino');
                Achievements.grant(m.sender, 'casino_jackpot'); // 🏅 Badge Penjudi Ulung
                await m.reply(`🎰 *CASINO*\n\n🎊🎊 *JACKPOT!!!* 🎊🎊\n\n🍀 Selamat! Kamu mendapatkan JACKPOT!\n💰 +${formatNumber(jackpotWin)} balance *(2x modal!)*\n📊 Modal: ${formatNumber(bet)}\n\n🏅 _Badge "Penjudi Ulung" telah kamu dapatkan!_`);
            } else if (roll < 0.45) {
                Users.addBalance(m.sender, bet);
                Transactions.create(m.sender, 'casino_win', bet, 'Casino');
                await m.reply(`🎰 *CASINO*\n\n🎉 Kamu MENANG!\n💰 +${formatNumber(bet)} balance\n📊 Modal: ${formatNumber(bet)}`);
            } else {
                Users.addBalance(m.sender, -bet);
                Transactions.create(m.sender, 'casino_lose', -bet, 'Casino');
                await m.reply(`🎰 *CASINO*\n\n😢 Kamu KALAH!\n💸 -${formatNumber(bet)} balance\n📊 Modal: ${formatNumber(bet)}`);
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
            else if ((user==='batu'&&bot==='gunting')||(user==='gunting'&&bot==='kertas')||(user==='kertas'&&bot==='batu')) { result = '🎉 Kamu MENANG!'; Users.addBalance(m.sender, 100); }
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
                            Users.addBalance(moveMsg.sender, 1000);
                            await sck.sendMessage(moveMsg.chat, { text: `❌⭕ *HASIL*\n\n${renderBoard()}\n\n🎉 *Kamu MENANG!* +1000 balance💰` }, { quoted: moveMsg.raw });
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
            const bet = parseInt(args[0]) || 100;
            const user = Users.getOrCreate(m.sender, m.pushName);
            if (user.balance < bet) return m.reply('❌ Balance tidak cukup!');
            const draw3 = () => [randomInt(1,10),randomInt(1,10),randomInt(1,10)];
            const val = cards => cards.reduce((a,b)=>a+b,0) % 10;
            const p = draw3(); const d = draw3();
            const pv = val(p); const dv = val(d);
            const win = pv > dv;
            if (win) { Users.addBalance(m.sender, bet); } else { Users.addBalance(m.sender, -bet); }
            await m.reply(`🎴 *SAMGONG*\n\n👤 Kamu: [${p.join(',')}] = ${pv}\n🤖 Bot: [${d.join(',')}] = ${dv}\n\n${win ? `🎉 MENANG! +${formatNumber(bet)}` : `😢 KALAH! -${formatNumber(bet)}`}`);
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
                // Sains & Biologi Lanjut
                { q: 'Proses dimana ribosom membaca mRNA untuk menyintesis rantai polipeptida disebut', a: 'translasi' },
                { q: 'Fenomena optik ketika cahaya melewati celah sempit dan menghasilkan pola gelap terang selang-seling', a: 'difraksi' },
                { q: 'Cabang matematika yang mempelajari hubungan antara sudut dan sisi segitiga', a: 'trigonometri' },
                { q: 'Proses pembelahan sel yang menghasilkan empat sel anak dengan jumlah kromosom setengahnya', a: 'meiosis' },
                { q: 'Zat kimia yang dilepaskan neuron untuk menyampaikan sinyal ke sel saraf lain di sinapsis', a: 'neurotransmiter' },
                { q: 'Lapisan atmosfer bumi tempat sebagian besar ozon terkonsentrasi, melindungi dari radiasi UV', a: 'stratosfer' },
                { q: 'Reaksi kimia yang menyerap kalor dari lingkungan sehingga suhu sistem turun', a: 'endoterm' },
                { q: 'Pori-pori kecil pada permukaan daun yang berfungsi sebagai tempat pertukaran gas', a: 'stomata' },
                // Sejarah & Geografi
                { q: 'Perjanjian yang mengakhiri Perang Dunia Pertama, ditandatangani di istana yang sama namanya', a: 'versailles' },
                { q: 'Kota purba di Yordania yang sepenuhnya dipahat dari tebing batu berwarna merah muda', a: 'petra' },
                { q: 'Nama operasi militer besar Sekutu saat mendarat di Normandia pada 6 Juni 1944', a: 'overlord' },
                { q: 'Dinasti yang memerintah Mesir Kuno selama ribuan tahun dan membangun piramida', a: 'firaun' },
                // Bahasa & Linguistik
                { q: 'Ilmu yang mempelajari perubahan makna kata dan hubungan makna dalam suatu bahasa', a: 'semantik' },
                { q: 'Gaya bahasa yang melebih-lebihkan kenyataan untuk menciptakan efek dramatis atau humor', a: 'hiperbola' },
                { q: 'Kata yang maknanya berlawanan dengan kata lain disebut memiliki hubungan', a: 'antonim' },
                // Filsafat & Ekonomi
                { q: 'Nilai dari pilihan terbaik yang dikorbankan saat kamu memilih satu opsi dari banyak pilihan', a: 'biayapeluang' },
                { q: 'Filsuf Yunani yang menulis Republic dan murid langsung Sokrates', a: 'plato' },
                { q: 'Prinsip fisika kuantum yang menyatakan posisi dan momentum partikel tidak bisa diukur bersamaan secara presisi', a: 'ketidakpastian' },
                // Teknologi & Astronomi
                { q: 'Bintang yang meledak dengan sangat terang di akhir siklus hidupnya, bisa sesaat lebih terang dari galaksi', a: 'supernova' },
                { q: 'Titik di alam semesta dengan gravitasi begitu kuat sehingga cahaya pun tidak bisa lolos', a: 'lubbanghitam' },
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
                { s: 'Kangen', a: 'dewa 19', l: 'Semua kata rindumu semakin membuatku tak berdaya...' },
                { s: 'Dan', a: 'sheila on 7', l: 'Dan bila esok datang kembali, seperti sedia kala...' },
                { s: 'Hampa', a: 'ari lasso', l: 'Entah di mana dirimu berada, hampa terasa hidupku tanpa dirimu...' },
                { s: 'Pupus', a: 'dewa 19', l: 'Baru kusadari cintaku bertepuk sebelah tangan...' },
                { s: 'Sempurna', a: 'andra and the backbone', l: 'Kau begitu sempurna, di mataku kau begitu indah...' },
                { s: 'Menghapus Jejakmu', a: 'peterpan', l: 'Terus melangkah melupakanmu, lelah hati perhatikan sikapmu...' },
                { s: 'Separuh Aku', a: 'noah', l: 'Dengar laraku, suara hati ini memanggil namamu...' },
                { s: 'Kekasih Bayangan', a: 'cakra khan', l: 'Padamu pemilik hati yang tak pernah kumiliki...' },
                { s: 'Surat Cinta Untuk Starla', a: 'virgoun', l: 'Kutuliskan kenangan tentang caraku menemukan dirimu...' },
                { s: 'Akad', a: 'payung teduh', l: 'Bila nanti saatnya tlah tiba, kuingin kau menjadi istriku...' }
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
                {q:'Unsur logam berwujud cair pada suhu ruang',a:'Raksa'},
                {q:'Gas mulia yang sering digunakan pada lampu neon berwarna merah',a:'Neon'},
                {q:'Unsur radioaktif yang ditemukan oleh ilmuwan Marie Curie',a:'Radium'},
                {q:'Unsur dengan simbol W yang memiliki titik leleh sangat tinggi',a:'Tungsten'},
                {q:'Unsur penyusun utama tulang belulang dan gigi',a:'Kalsium'},
                {q:'Unsur non-logam yang paling melimpah di kerak bumi',a:'Oksigen'},
                {q:'Gas yang sangat ringan dan mudah terbakar, digunakan pada balon udara awal',a:'Hidrogen'},
                {q:'Unsur yang digunakan sebagai bahan baku utama pembuatan mikrochip',a:'Silikon'},
                {q:'Logam berharga yang tidak dapat berkarat dan digunakan sebagai standar moneter',a:'Emas'},
                {q:'Unsur halogen yang ditambahkan ke pasta gigi untuk mencegah gigi berlubang',a:'Fluor'}
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
                {q:'Mawar melati semuanya...',a:'Bunga'},
                {q:'Yang sering mendapat nilai 100 saat ulangan',a:'Kertas'},
                {q:'Hewan yang memakan rumput',a:'Lapar'},
                {q:'Kalau haus minum...',a:'Masuk'},
                {q:'Orang yang berenang di laut pakai',a:'Celana'},
                {q:'Rendang adalah makanan khas',a:'Enak'},
                {q:'Kucing mengeong saat...',a:'Bisa'},
                {q:'Bumi berputar pada...',a:'Sini'},
                {q:'Supaya bersih kita harus...',a:'Sadar'},
                {q:'Candi Borobudur ada di...',a:'Sana'}
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
                        Users.addBalance(guessMsg.sender, 800);
                        global.activeGames.delete(m.chat);
                        await guessMsg.reply(
                            `🎉 *BENAR!* Angkanya *${answer}*!\n` +
                            `📊 Dicapai dalam *${attempts} percobaan*\n` +
                            `💰 +800 balance untuk @${guessMsg.sender.split('@')[0]}!`
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
                {q:'Negara dengan julukan Zamrud Khatulistiwa',a:'Indonesia'},
                {q:'Negara di Amerika Selatan yang memiliki reruntuhan kota Inca Machu Picchu',a:'Peru'},
                {q:'Negara kota merdeka yang merupakan enklave terkecil di dunia',a:'Vatikan'},
                {q:'Negara di benua Afrika yang tidak pernah dijajah oleh bangsa Eropa',a:'Ethiopia'},
                {q:'Negara yang memiliki danau air tawar terdalam di dunia (Danau Baikal)',a:'Rusia'},
                {q:'Negara di Timur Tengah tempat Petra yang bersejarah berada',a:'Yordania'},
                {q:'Negara kepulauan di Samudra Hindia dengan ibu kota Malé',a:'Maladewa'},
                {q:'Satu-satunya negara yang menempati seluruh benua',a:'Australia'},
                {q:'Negara Nordik yang terkenal dengan fenomena matahari tengah malam dan aurora borealis',a:'Norwegia'},
                {q:'Negara dengan garis pantai terpanjang di dunia',a:'Kanada'}
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
                { o: 'Televisi', d: 'Benda elektronik berbentuk kotak, ada layarnya, memancarkan gambar bergerak dan suara.' },
                { o: 'Sepeda', d: 'Kendaraan roda dua yang digerakkan dengan cara dikayuh menggunakan kaki.' },
                { o: 'Kacamata', d: 'Dipakai di wajah, memiliki dua lensa, membantu orang melihat lebih jelas.' },
                { o: 'Payung', d: 'Terbuat dari kain kedap air yang bisa dilipat, dipakai saat hujan agar tidak basah.' },
                { o: 'Sepatu', d: 'Alas kaki tertutup yang melindungi kaki hingga mata kaki, biasanya ada talinya.' },
                { o: 'Buku', d: 'Kumpulan kertas berjilid yang berisi tulisan atau gambar untuk dibaca.' },
                { o: 'Gitar', d: 'Alat musik petik yang memiliki senar, umumnya berjumlah enam senar.' },
                { o: 'Kulkas', d: 'Mesin pendingin berbentuk lemari besar untuk mengawetkan makanan dan minuman.' },
                { o: 'Jam Tangan', d: 'Alat penunjuk waktu berukuran kecil yang dilingkarkan di pergelangan tangan.' },
                { o: 'Kamera', d: 'Alat yang digunakan untuk memotret atau merekam kejadian dalam bentuk visual.' }
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
                {e:'🇯🇵',a:'jepang'}, {e:'🇮🇩',a:'indonesia'}, {e:'🇺🇸',a:'amerika serikat'},
                {e:'🇬🇧',a:'inggris'}, {e:'🇫🇷',a:'prancis'}, {e:'🇩🇪',a:'jerman'},
                {e:'🇧🇷',a:'brasil'}, {e:'🇮🇳',a:'india'}, {e:'🇨🇳',a:'china'},
                {e:'🇰🇷',a:'korea selatan'}, {e:'🇦🇺',a:'australia'}, {e:'🇨🇦',a:'kanada'},
                {e:'🇮🇹',a:'italia'}, {e:'🇪🇸',a:'spanyol'}, {e:'🇲🇽',a:'meksiko'},
                {e:'🇷🇺',a:'rusia'}, {e:'🇸🇦',a:'arab saudi'}, {e:'🇹🇷',a:'turki'},
                {e:'🇳🇱',a:'belanda'}, {e:'🇵🇹',a:'portugis'}, {e:'🇸🇬',a:'singapura'},
                {e:'🇲🇾',a:'malaysia'}, {e:'🇹🇭',a:'thailand'}, {e:'🇵🇭',a:'filipina'},
                {e:'🇻🇳',a:'vietnam'}, {e:'🇪🇬',a:'mesir'}, {e:'🇿🇦',a:'afrika selatan'},
                {e:'🇦🇷',a:'argentina'}, {e:'🇨🇱',a:'chile'}, {e:'🇵🇰',a:'pakistan'},
                {e:'🇧🇩',a:'bangladesh'}, {e:'🇳🇬',a:'nigeria'}, {e:'🇺🇦',a:'ukraina'},
                {e:'🇵🇱',a:'polandia'}, {e:'🇸🇪',a:'swedia'}, {e:'🇳🇴',a:'norwegia'},
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
                'KONSTITUSIONAL','KAPITALISME','INFRASTRUKTUR','KOMPREHENSIF','TERTANGGUNG',
                'DIFERENSIASI','KARAKTERISTIK','TRANSFORMASI','INTERNASIONAL','METAMORFOSIS',
                'BERKELANJUTAN','KESEIMBANGAN','PEMBANGUNAN','PENGEMBANGAN','PERTUMBUHAN',
                'KOMUNIKASI','KEBIJAKSANAAN','PENGETAHUAN','KEMERDEKAAN','PERSATUAN'
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
            const target = m.mentionedJid?.[0] || m.quoted?.sender;
            if (!target) return m.reply('❌ Tag target!');
            const success = Math.random() > 0.6;
            const amount = randomInt(50, 300);
            if (success) {
                const targetUser = Users.getOrCreate(target);
                if (targetUser.balance >= amount) {
                    Users.addBalance(target, -amount);
                    Users.addBalance(m.sender, amount);
                    await m.reply(`🔫 Berhasil merampok @${target.split('@')[0]}!\n💰 +${formatNumber(amount)} balance`);
                } else { await m.reply(`😢 @${target.split('@')[0]} terlalu miskin untuk dirampok!`); }
            } else { await m.reply(`👮 Kamu gagal merampok dan kena tangkap! Denda ${formatNumber(amount)} balance.`); Users.addBalance(m.sender, -Math.min(amount, Users.get(m.sender)?.balance || 0)); }
        }
    },
    {
        name: 'begal', category: 'games', desc: 'Begal balance',
        async execute({ m }) {
            const amount = randomInt(100, 500);
            const success = Math.random() > 0.5;
            if (success) { Users.addBalance(m.sender, amount); await m.reply(`🔪 Begal berhasil! +${formatNumber(amount)} balance`); }
            else { await m.reply('👮 Begal gagal! Kamu tertangkap!'); }
        }
    },
    {
        name: 'tekateki', category: 'games', desc: 'Teka-teki',
        async execute({ m }) {
            await m.reply('⏳ _Mengenerate soal AI..._');
            const fallbacks = [
                {q:'Punya banyak gigi tapi tidak bisa menggigit, apa itu?',a:'Sisir'},
                {q:'Punya mata tapi tidak bisa melihat, apakah itu?',a:'Jarum'},
                {q:'Bisa dipegang tapi tidak bisa disentuh secara fisik, apa itu?',a:'Janji'},
                {q:'Selalu berjalan ke depan dan tidak pernah bisa mundur, apakah itu?',a:'Waktu'},
                {q:'Benda apa yang kalau dibalik semakin besar?',a:'Angka sembilan'},
                {q:'Aku bisa menangis tanpa mata dan terbang tanpa sayap. Siapakah aku?',a:'Awan'},
                {q:'Milikmu tapi lebih sering digunakan oleh orang lain, apakah itu?',a:'Nama'},
                {q:'Semakin banyak yang ada, semakin sedikit yang bisa kamu lihat, apakah itu?',a:'Kegelapan'},
                {q:'Benda apa yang harus dipecahkan sebelum bisa digunakan?',a:'Telur'},
                {q:'Kamu masuk melalui satu lubang, dan keluar melalui dua lubang. Apa itu?',a:'Celana'}
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
                        game.score += 200;
                        Users.addBalance(msg.sender, 200);
                        
                        if(game.state.filter(x=>x===1).length === 6) {
                            global.activeGames.delete(msg.chat);
                            await sock.sendMessage(msg.chat, { text: render(true) + `\n\n🎉 *KAMU MENANG SEMPURNA!*\n💰 Total reward: ${game.score} balance.` }, { quoted: msg.raw });
                        } else {
                            await sock.sendMessage(msg.chat, { text: render() + `\n\n✅ *Aman!* +200 balance.\n📝 Lanjut pilih kotak lain!` }, { quoted: msg.raw });
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
