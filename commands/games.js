const { randomInt, formatNumber, pickRandom, fetchJson } = require('../lib/functions');
const { Users, Transactions } = require('../database');
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
            const win = Math.random() > 0.55;
            if (win) { Users.addBalance(m.sender, bet); Transactions.create(m.sender, 'casino_win', bet, 'Casino'); await m.reply(`🎰 *CASINO*\n\n🎉 Kamu MENANG!\n💰 +${formatNumber(bet)} balance`); }
            else { Users.addBalance(m.sender, -bet); Transactions.create(m.sender, 'casino_lose', -bet, 'Casino'); await m.reply(`🎰 *CASINO*\n\n😢 Kamu KALAH!\n💸 -${formatNumber(bet)} balance`); }
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
        name: 'tictactoe', aliases: ['ttt'], category: 'games', desc: 'Main Tic Tac Toe',
        async execute({ m }) {
            const board = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];
            let text = `❌⭕ *TIC TAC TOE*\n\n`;
            text += `${board[0]}${board[1]}${board[2]}\n${board[3]}${board[4]}${board[5]}\n${board[6]}${board[7]}${board[8]}\n\n`;
            text += `_Fitur TicTacToe interaktif akan tersedia di update berikutnya!_`;
            await m.reply(text);
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
        name: 'tebakkata', category: 'games', desc: 'Tebak kata',
        async execute({ m }) {
            await m.reply('⏳ _Mengenerate soal AI..._');
            const fallbacks = [
                {q:'Proses perubahan wujud dari gas menjadi padat tanpa melewati fase cair',a:'mengkristal'},
                {q:'Ilmu yang mempelajari gempa bumi dan gelombang seismik',a:'seismologi'},
                {q:'Senyawa organik yang memberikan warna hijau pada daun',a:'klorofil'},
                {q:'Cabang ilmu biologi yang mempelajari pewarisan sifat',a:'genetika'},
                {q:'Keadaan dimana dua atau lebih spesies saling menguntungkan satu sama lain',a:'simbiosis'},
                {q:'Penemu teori relativitas yang terkenal',a:'einstein'},
                {q:'Gas yang paling melimpah di atmosfer bumi',a:'nitrogen'},
                {q:'Zat antibodi yang diproduksi tubuh untuk melawan infeksi',a:'imunoglobulin'},
                {q:'Kumpulan bintang-bintang yang membentuk suatu pola di langit',a:'rasi'},
                {q:'Pergerakan lempeng tektonik yang saling menjauh',a:'divergen'}
            ];
            const w = await getDynamicQuestion('tebakkata', fallbacks);
            const hint = w.a[0] + '_'.repeat(w.a.length-2) + w.a[w.a.length-1];
            
            global.activeGames = global.activeGames || new Map();
            if (global.activeGames.has(m.chat)) return m.reply('❌ Selesaikan game sebelumnya dulu!');
            
            const sentMsg = await m.reply(`╭───「 🔤 𝚃𝙴𝙱𝙰𝙺 𝙺𝙰𝚃𝙰 」\n│ \n│ ❓ ${w.q}\n│ \n│ 💡 Hint: ${hint}\n│ 💡 Balas pesan ini untuk menjawab!
│ ⏳ Timeout: 60 Detik\n╰──────────────`);
            global.activeGames.set(m.chat, { answer: w.a.toLowerCase(), time: Date.now(), reward: 1000, msgId: sentMsg.key.id });
            setTimeout(() => { if (global.activeGames.has(m.chat)) { global.activeGames.delete(m.chat); m.reply(`⏳ *Waktu Habis!*\nJawaban: ${w.a}`); } }, 60000);
        }
    },
    {
        name: 'tebaklirik', category: 'games', desc: 'Tebak lirik lagu',
        async execute({ m }) { await m.reply('🎵 *TEBAK LIRIK*\n\n_Fitur ini akan tersedia di update berikutnya!_'); }
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
        name: 'tebakangka', category: 'games', desc: 'Tebak angka',
        async execute({ m }) {
            const answer = randomInt(1, 100);
            await m.reply(`🔢 *TEBAK ANGKA*\n\nAku memikirkan angka 1-100.\n💡 Jawabannya: ${answer}\n\n_Fitur interaktif akan tersedia di update berikutnya!_`);
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
        name: 'tebakgambar', category: 'games', desc: 'Tebak gambar',
        async execute({ m }) { await m.reply('🖼️ *TEBAK GAMBAR*\n\n_Fitur ini akan tersedia di update berikutnya!_'); }
    },
    {
        name: 'tebakbendera', category: 'games', desc: 'Tebak bendera',
        async execute({ m }) {
            const flags = [{e:'🇯🇵',a:'Jepang'},{e:'🇮🇩',a:'Indonesia'},{e:'🇺🇸',a:'Amerika Serikat'},{e:'🇬🇧',a:'Inggris'},{e:'🇫🇷',a:'Prancis'},{e:'🇩🇪',a:'Jerman'},{e:'🇧🇷',a:'Brasil'}];
            const f = pickRandom(flags);
            
            global.activeGames = global.activeGames || new Map();
            if (global.activeGames.has(m.chat)) return m.reply('❌ Selesaikan game sebelumnya dulu!');
            
            global.activeGames.set(m.chat, { answer: f.a.toLowerCase(), time: Date.now(), reward: 1000 });
            await m.reply(`╭───「 🏳️ 𝚃𝙴𝙱𝙰𝙺 𝙱𝙴𝙽𝙳𝙴𝚁𝙰 」\n│ \n│ ❓ Bendera negara mana ini?\n│ 🚩 ${f.e}\n│ \n│ 💡 Balas pesan ini untuk menjawab!
│ ⏳ Timeout: 60 Detik\n╰──────────────`);
            setTimeout(() => { if (global.activeGames.has(m.chat)) { global.activeGames.delete(m.chat); m.reply(`⏳ *Waktu Habis!*\nJawaban: ${f.a}`); } }, 60000);
        }
    },
    {
        name: 'susunkata', category: 'games', desc: 'Susun kata acak',
        async execute({ m }) {
            const words = ['KONSTITUSIONAL','KAPITALISME','INFRASTRUKTUR','KOMPREHENSIF','TERTANGGUNG','DIFERENSIASI','KARAKTERISTIK','TRANSFORMASI','INTERNASIONAL','METAMORFOSIS'];
            const w = pickRandom(words);
            const shuffled = w.split('').sort(() => Math.random()-0.5).join('');
            
            global.activeGames = global.activeGames || new Map();
            if (global.activeGames.has(m.chat)) return m.reply('❌ Selesaikan game sebelumnya dulu!');
            
            global.activeGames.set(m.chat, { answer: w.toLowerCase(), time: Date.now(), reward: 1000 });
            await m.reply(`╭───「 🔤 𝚂𝚄𝚂𝚄𝙽 𝙺𝙰𝚃𝙰 」\n│ \n│ 🔀 ${shuffled}\n│ \n│ 💡 Balas pesan ini untuk menjawab!
│ ⏳ Timeout: 60 Detik\n╰──────────────`);
            setTimeout(() => { if (global.activeGames.has(m.chat)) { global.activeGames.delete(m.chat); m.reply(`⏳ *Waktu Habis!*\nJawaban: ${w}`); } }, 60000);
        }
    },
    {
        name: 'colorblind', category: 'games', desc: 'Test buta warna',
        async execute({ m }) { await m.reply('🎨 *COLOR BLIND TEST*\n\n_Fitur ini akan tersedia di update berikutnya!_'); }
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
        name: 'tebakbom', category: 'games', desc: 'Tebak bom',
        async execute({ m }) { await m.reply('💣 *TEBAK BOM*\n\n_Fitur interaktif akan tersedia di update berikutnya!_'); }
    },
    {
        name: 'ulartangga', category: 'games', desc: 'Ular tangga',
        async execute({ m }) { await m.reply('🐍🪜 *ULAR TANGGA*\n\n_Fitur interaktif akan tersedia di update berikutnya!_'); }
    },
    {
        name: 'catur', category: 'games', desc: 'Main catur',
        async execute({ m }) { await m.reply('♟️ *CATUR*\n\n_Fitur interaktif akan tersedia di update berikutnya!_'); }
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
        async execute({ m }) { await m.reply('🧞 *AKINATOR*\n\n_Fitur ini akan tersedia di update berikutnya!_'); }
    },
];
