const { pickRandom, randomInt } = require('../lib/functions');

const motivasi = [
    'Kesuksesan adalah hasil dari persiapan, kerja keras, dan belajar dari kegagalan.',
    'Jangan pernah menyerah, karena hal-hal besar membutuhkan waktu.',
    'Keberanian bukan berarti tanpa rasa takut, tapi kemampuan melangkah meski takut.',
    'Hidup ini seperti sepeda, kamu harus terus bergerak agar tidak jatuh.',
    'Setiap pencapaian besar dimulai dari keputusan untuk mencoba.',
    'Gagal itu biasa, tapi menyerah itu pilihan. Tetap semangat!',
    'Kamu lebih kuat dari yang kamu pikirkan.',
    'Hari ini mungkin sulit, tapi besok akan lebih baik.',
];

const bijak = [
    'Ilmu tanpa amal ibarat pohon tanpa buah.',
    'Orang bijak belajar dari kesalahan orang lain, orang bodoh belajar dari kesalahannya sendiri.',
    'Waktu adalah pedang, jika kamu tidak memanfaatkannya, ia akan memotongmu.',
    'Sabar itu tidak ada batasnya, yang ada batasnya adalah kesabaran manusia.',
    'Kebaikan yang paling baik adalah kebaikan yang dilakukan dengan ikhlas.',
];

const bucin = [
    'Aku nggak butuh Google, karena kamu adalah jawaban dari segalanya.',
    'Kalau kamu bintang, aku rela jadi langit yang selalu memelukmu.',
    'Matamu seperti wifi, bikin aku selalu ingin terhubung.',
    'Kamu itu seperti charger, selalu bikin hidupku penuh energi.',
    'Kalau hidup ini game, kamu adalah achievement terbesarku.',
];

const renungan = [
    'Kadang kita terlalu sibuk mencari kebahagiaan, sampai lupa bahwa kebahagiaan ada di hal-hal sederhana.',
    'Hidup bukan tentang menunggu badai berlalu, tapi belajar menari di tengah hujan.',
    'Kita tidak bisa mengubah arah angin, tapi kita bisa menyesuaikan layar.',
    'Setiap orang yang kamu temui sedang berjuang dalam pertempuran yang tidak kamu ketahui. Berbaik hatilah.',
];

module.exports = [
    { name: 'motivasi', category: 'quotes', desc: 'Quote motivasi', async execute({ m }) { await m.reply(`💪 *MOTIVASI*\n\n"${pickRandom(motivasi)}"`); } },
    { name: 'quotes', category: 'quotes', desc: 'Random quotes', async execute({ m }) { await m.reply(`📝 *QUOTES*\n\n"${pickRandom([...motivasi, ...bijak])}"`); } },
    { name: 'bijak', category: 'quotes', desc: 'Kata bijak', async execute({ m }) { await m.reply(`🧠 *KATA BIJAK*\n\n"${pickRandom(bijak)}"`); } },
    { name: 'bucin', category: 'quotes', desc: 'Kata bucin', async execute({ m }) { await m.reply(`💕 *BUCIN*\n\n"${pickRandom(bucin)}"`); } },
    { name: 'renungan', category: 'quotes', desc: 'Renungan', async execute({ m }) { await m.reply(`🤔 *RENUNGAN*\n\n"${pickRandom(renungan)}"`); } },
    { name: 'truth', category: 'quotes', desc: 'Truth or Dare - Truth', async execute({ m }) {
        const truths = ['Siapa crush kamu saat ini?','Apa rahasia terbesarmu?','Pernahkah kamu berbohong ke sahabat?','Apa hal paling memalukan yang pernah kamu alami?','Siapa orang yang paling sering kamu stalking di sosmed?'];
        await m.reply(`🔮 *TRUTH*\n\n${pickRandom(truths)}`);
    }},
    { name: 'dare', category: 'quotes', desc: 'Truth or Dare - Dare', async execute({ m }) {
        const dares = ['Kirim chat ke crush kamu sekarang!','Post story paling jelek kamu!','Nyanyi satu lagu dan kirim voice note!','Ganti foto profil jadi foto terjelek kamu selama 1 jam!','Chat mantan dan bilang kangen!'];
        await m.reply(`🎯 *DARE*\n\n${pickRandom(dares)}`);
    }},
];
