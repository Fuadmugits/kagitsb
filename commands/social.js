const { formatNumber, pickRandom, randomInt } = require('../lib/functions');
const { Users, Transactions, CheckIn, Achievements } = require('../database');

// ═══════════════════════════════════════════════════════
//  DATA TRUTH OR DARE
// ═══════════════════════════════════════════════════════
const TRUTH_LIST = [
    'Siapa orang yang paling kamu sukai di grup ini?',
    'Apa hal paling memalukan yang pernah kamu lakukan?',
    'Pernahkah kamu berbohong kepada orang tua? Tentang apa?',
    'Siapa orang yang pertama kamu chat hari ini?',
    'Apa hal paling konyol yang pernah kamu lakukan karena suka seseorang?',
    'Sebutkan 3 kekurangan dirimu yang paling besar!',
    'Pernahkah kamu menyukai teman sendiri? Siapa?',
    'Apa aplikasi yang paling banyak kamu pakai dan kenapa?',
    'Kalau harus pilih 1 orang di grup ini untuk jadi pasangan, siapa?',
    'Apa mimpi terbesar yang belum kamu ceritakan ke siapapun?',
    'Pernahkah kamu menangis karena film atau anime? Film apa?',
    'Apa hal yang paling sering kamu bohongi ke orang tua?',
    'Seberapa sering kamu stalking mantan atau gebetan di medsos?',
    'Apa hal yang paling kamu sesali dalam hidupmu?',
    'Kalau bisa menghapus 1 kenangan, kenangan apa itu?',
    'Siapa orang yang paling kamu rindukan saat ini?',
    'Pernah naksir guru atau dosen? Ceritakan!',
    'Apa kebiasaan buruk yang kamu sembunyikan dari orang lain?',
    'Berapa lama kamu tidak mandi dalam sehari? 😅',
    'Apa hal paling gila yang pernah kamu lakukan demi perhatian seseorang?',
];

const DARE_LIST = [
    'Kirim foto selfie dengan muka paling konyol sekarang!',
    'Tulis status WA yang memalukan selama 10 menit!',
    'Tag semua member grup dan ucapkan "aku sayang kalian" 😂',
    'Ganti nama kontak kamu di WA menjadi "Anak Ajaib" selama 1 hari!',
    'Kirim voice note sambil nyanyi lagu anak-anak!',
    'Ceritakan rahasia kecilmu yang belum banyak orang tahu!',
    'Minta maaf ke seseorang yang pernah kamu sakiti via WA, screenshot dan kirim buktinya!',
    'Kirim foto isi tasmu/dompetmu sekarang!',
    'Tulis pesan "aku suka kamu" ke orang yang paling sering kamu chat!',
    'Kirim foto makanan yang kamu makan hari ini (atau terakhir)!',
    'Kirim voice note cerita horor yang paling bikin kamu takut!',
    'Ganti foto profil WA kamu ke foto lucu selama 30 menit!',
    'Kirim screenshot galeri foto terakhirmu (boleh sensor yang privat)!',
    'Sebutkan 5 hal yang kamu syukuri hari ini!',
    'Kirim meme paling lucu yang kamu punya!',
    'Ceritakan kejadian paling awkward yang pernah kamu alami!',
    'Kirim voice note sambil mengucapkan "Saya adalah artis terkenal"!',
    'Foto atau video joget 10 detik sekarang!',
    'Tulis sebuah puisi singkat (4 baris) untuk grup ini!',
    'Kirim screenshot chat terlama kamu hari ini (nama boleh disensor)!',
];

// ═══════════════════════════════════════════════════════
//  COMMANDS
// ═══════════════════════════════════════════════════════
module.exports = [
    // ─────────────────────────────────────────
    //  1. DAILY CHECK-IN
    // ─────────────────────────────────────────
    {
        name: 'checkin',
        aliases: ['absen', 'ci', 'hadir'],
        category: 'social',
        desc: 'Check-in harian untuk dapat balance + streak bonus',
        noLimit: true,
        async execute({ m }) {
            Users.getOrCreate(m.sender, m.pushName);
            const result = CheckIn.doCheckIn(m.sender);

            if (result.already) {
                const ci = CheckIn.get(m.sender);
                return m.reply(
                    `⏰ *DAILY CHECK-IN*\n\n` +
                    `✅ Kamu sudah check-in hari ini!\n` +
                    `🔥 Streak saat ini: *${ci.streak} hari*\n` +
                    `📆 Total check-in: ${ci.total_checkins}x\n\n` +
                    `_Kembali lagi besok ya! Jangan sampai streak-mu putus!_ 💪`
                );
            }

            // Check badge conditions
            const newBadges = Achievements.check(m.sender);
            const badgeText = newBadges.length
                ? `\n\n🏅 *BADGE BARU!*\n` + newBadges.map(b => `${b.icon} *${b.name}* — ${b.desc}`).join('\n')
                : '';

            let streakEmoji = '🌱';
            if (result.streak >= 30) streakEmoji = '💎';
            else if (result.streak >= 14) streakEmoji = '🏆';
            else if (result.streak >= 7)  streakEmoji = '🔥';
            else if (result.streak >= 3)  streakEmoji = '⚡';

            const lostText = result.lost ? `\n⚠️ _Streak sebelumnya putus! Mulai dari awal..._` : '';
            const firstText = result.isFirst ? `\n\n🎉 *Selamat check-in pertama kali!*` : '';
            const nextBonus = Math.min(result.streak, 29) * 50 + 50;

            await m.reply(
                `${streakEmoji} *DAILY CHECK-IN*\n\n` +
                `✅ Check-in berhasil!${firstText}${lostText}\n\n` +
                `🔥 Streak: *${result.streak} hari*\n` +
                `💰 Reward: *+${formatNumber(result.reward)} balance*\n` +
                `📈 Bonus besok: +${formatNumber(nextBonus)} (jika streak berlanjut)\n\n` +
                `_Kalau streak putus, bonus hilang. Jangan lupa besok!_` +
                badgeText
            );
        }
    },

    // ─────────────────────────────────────────
    //  STREAK LEADERBOARD
    // ─────────────────────────────────────────
    {
        name: 'streakboard',
        aliases: ['topstreak', 'lbstreak'],
        category: 'social',
        desc: 'Leaderboard streak check-in terpanjang',
        noLimit: true,
        async execute({ m }) {
            const rows = CheckIn.getLeaderboard();
            if (!rows.length) return m.reply('❌ Belum ada yang check-in!');

            const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
            let text = `🔥 *TOP STREAK CHECK-IN*\n\n`;
            rows.forEach((r, i) => {
                text += `${medals[i]} *${r.name || r.jid.split('@')[0]}*\n`;
                text += `    🔥 ${r.streak} hari | 📆 Total: ${r.total_checkins}x\n`;
            });
            text += `\n_Check-in setiap hari dengan .checkin untuk naik peringkat!_`;
            await m.reply(text);
        }
    },

    // ─────────────────────────────────────────
    //  2. TRANSFER BALANCE
    // ─────────────────────────────────────────
    {
        name: 'transfer',
        aliases: ['kirim', 'tf'],
        category: 'social',
        desc: 'Transfer balance ke member lain',
        usage: '(@tag/nomor) (jumlah)',
        async execute({ m, args, text }) {
            const sender = Users.getOrCreate(m.sender, m.pushName);

            // Parse target: dari mention atau arg pertama
            let targetJid = m.mentionedJid?.[0];
            let amountStr;

            if (targetJid) {
                amountStr = args[1] || args[0];
            } else {
                // arg pertama mungkin nomor
                const numArg = args[0]?.replace(/[^0-9]/g, '');
                if (numArg && numArg.length > 5) {
                    let num = numArg;
                    if (num.startsWith('0')) num = '62' + num.slice(1);
                    targetJid = num + '@s.whatsapp.net';
                    amountStr = args[1];
                }
            }

            if (!targetJid) return m.reply('❌ Format: *.transfer @tag 1000* atau *.transfer 628xxx 1000*');
            if (targetJid === m.sender) return m.reply('❌ Kamu tidak bisa transfer ke diri sendiri!');

            const amount = parseInt(amountStr);
            if (!amount || amount < 100) return m.reply('❌ Jumlah minimal transfer: 100!');
            if (sender.balance < amount) return m.reply(`❌ Balance tidak cukup!\n💰 Balance kamu: ${formatNumber(sender.balance)}`);

            const target = Users.getOrCreate(targetJid);
            const ok = Users.transfer(m.sender, targetJid, amount);
            if (!ok) return m.reply('❌ Transfer gagal!');

            // Badge Dermawan untuk pengirim
            const newBadge = Achievements.grant(m.sender, 'transfer_first');
            const badgeText = newBadge ? '\n\n🏅 *Badge baru:* 💸 *Dermawan* — Transfer balance pertama!' : '';

            const targetNum = targetJid.split('@')[0];
            await m.reply(
                `💸 *TRANSFER BERHASIL*\n\n` +
                `👤 Pengirim: @${m.sender.split('@')[0]}\n` +
                `👤 Penerima: @${targetNum}\n` +
                `💰 Jumlah: *${formatNumber(amount)}*\n\n` +
                `Sisa balance kamu: ${formatNumber(sender.balance - amount)}` +
                badgeText,
                { mentions: [m.sender, targetJid] }
            );
        }
    },

    // ─────────────────────────────────────────
    //  3. TRUTH OR DARE
    // ─────────────────────────────────────────
    {
        name: 'truth',
        aliases: ['kebenaran'],
        category: 'social',
        desc: 'Dapat pertanyaan Truth acak',
        noLimit: true,
        async execute({ m }) {
            const q = pickRandom(TRUTH_LIST);
            const num = randomInt(1, TRUTH_LIST.length);
            await m.reply(
                `🤍 *TRUTH #${num}*\n\n` +
                `❓ ${q}\n\n` +
                `_Jawab jujur ya! Atau pilih DARE dengan .dare 😏_`
            );
        }
    },
    {
        name: 'dare',
        aliases: ['tantangan'],
        category: 'social',
        desc: 'Dapat tantangan Dare acak',
        noLimit: true,
        async execute({ m }) {
            const d = pickRandom(DARE_LIST);
            const num = randomInt(1, DARE_LIST.length);
            await m.reply(
                `🔴 *DARE #${num}*\n\n` +
                `🎯 ${d}\n\n` +
                `_Berani? Lakukan sekarang! Atau pilih TRUTH dengan .truth 🤍_`
            );
        }
    },
    {
        name: 'tod',
        aliases: ['truthordare', 'tordare'],
        category: 'social',
        desc: 'Truth or Dare acak (campuran)',
        noLimit: true,
        async execute({ m }) {
            const isTruth = Math.random() > 0.5;
            if (isTruth) {
                const q = pickRandom(TRUTH_LIST);
                await m.reply(`🎲 *TRUTH OR DARE — kamu dapat:*\n\n🤍 *TRUTH*\n\n❓ ${q}\n\n_Jawab jujur! Ketik .tod lagi untuk soal baru._`);
            } else {
                const d = pickRandom(DARE_LIST);
                await m.reply(`🎲 *TRUTH OR DARE — kamu dapat:*\n\n🔴 *DARE*\n\n🎯 ${d}\n\n_Berani lakukan? Ketik .tod lagi untuk soal baru._`);
            }
        }
    },

    // ─────────────────────────────────────────
    //  4. ACHIEVEMENTS / BADGES
    // ─────────────────────────────────────────
    {
        name: 'badge',
        aliases: ['achievement', 'achiev', 'pencapaian'],
        category: 'social',
        desc: 'Lihat badge / pencapaianmu',
        noLimit: true,
        async execute({ m }) {
            const jid = m.mentionedJid?.[0] || m.sender;
            const user = Users.getOrCreate(jid, m.pushName);
            const badges = Achievements.getUserBadges(jid);
            const allDefs = Achievements.getAllDefs();
            const earned = new Set(badges.map(b => b.key));

            const name = jid === m.sender ? 'kamu' : `@${jid.split('@')[0]}`;
            let text = `🏅 *BADGE & PENCAPAIAN*\n👤 ${name}\n\n`;

            text += `*Sudah didapat (${badges.length}/${allDefs.length}):*\n`;
            if (badges.length === 0) {
                text += `_Belum ada badge. Yuk aktif!_\n`;
            } else {
                badges.forEach(b => {
                    text += `${b.icon} *${b.name}*\n   └ ${b.desc}\n`;
                });
            }

            const locked = allDefs.filter(b => !earned.has(b.key));
            if (locked.length) {
                text += `\n*Belum didapat (${locked.length}):*\n`;
                locked.forEach(b => {
                    text += `🔒 *${b.name}* — ${b.desc}\n`;
                });
            }

            text += `\n_Semakin aktif, semakin banyak badge!_ 💪`;
            await m.reply(text, jid !== m.sender ? { mentions: [jid] } : {});
        }
    },

    {
        name: 'badgelist',
        aliases: ['daftarbadge', 'allbadge'],
        category: 'social',
        desc: 'Lihat semua badge yang tersedia',
        noLimit: true,
        async execute({ m }) {
            const defs = Achievements.getAllDefs();
            let text = `🏅 *DAFTAR SEMUA BADGE*\n\n`;
            defs.forEach(b => {
                text += `${b.icon} *${b.name}*\n   📝 ${b.desc}\n\n`;
            });
            text += `_Kumpulkan semua badge dengan terus aktif!_ 🚀`;
            await m.reply(text);
        }
    },
];
