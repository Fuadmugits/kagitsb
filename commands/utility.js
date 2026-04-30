const { fetchJson, pickRandom, formatNumber } = require('../lib/functions');
const { PrayerSubs, Reminders } = require('../database');
const { getPrayerTimings } = require('../lib/scheduler');

// ─── Data ─────────────────────────────────────────────────
const SHOLAT_ORDER = ['Imsak', 'Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const SHOLAT_ICON  = { Imsak:'⏰', Fajr:'🌅', Sunrise:'🌄', Dhuhr:'☀️', Asr:'🌤️', Maghrib:'🌆', Isha:'🌙' };
const SHOLAT_ID    = { Imsak:'Imsak', Fajr:'Subuh', Sunrise:'Syuruq', Dhuhr:'Dzuhur', Asr:'Ashar', Maghrib:'Maghrib', Isha:'Isya' };

const DOA_LIST = [
    { judul:'Doa Sebelum Tidur', arab:'بِاسْمِكَ اللّٰهُمَّ أَمُوتُ وَأَحْيَا', latin:'Bismikallaahumma amuutu wa ahyaa', arti:'Dengan nama-Mu ya Allah aku mati dan aku hidup' },
    { judul:'Doa Bangun Tidur', arab:'اَلْحَمْدُ لِلّٰهِ الَّذِىْ أَحْيَانَا بَعْدَمَا أَمَاتَنَا وَإِلَيْهِ النُّشُوْرُ', latin:'Alhamdulillahil-ladzii ahyaanaa ba\'da maa amaatanaa wa ilaihin-nusyuur', arti:'Segala puji bagi Allah yang menghidupkan kami setelah mematikan kami, dan kepada-Nya kami kembali' },
    { judul:'Doa Sebelum Makan', arab:'اَللّٰهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ', latin:'Allaahumma baarik lanaa fiimaa razaqtanaa wa qinaa \'adzaabannaari', arti:'Ya Allah, berkahilah kami dalam apa yang Engkau rizkikan kepada kami dan peliharalah kami dari azab neraka' },
    { judul:'Doa Sesudah Makan', arab:'اَلْحَمْدُ لِلّٰهِ الَّذِيْ أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِيْنَ', latin:'Alhamdulillahil-ladzii ath\'amanaa wa saqaanaa wa ja\'alanaa muslimiin', arti:'Segala puji bagi Allah yang memberi makan dan minum kepada kami, dan yang menjadikan kami Muslim' },
    { judul:'Doa Keluar Rumah', arab:'بِسْمِ اللّٰهِ تَوَكَّلْتُ عَلَى اللّٰهِ لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللّٰهِ', latin:'Bismillaahi tawakkaltu \'alallaahi, laa haula wa laa quwwata illaa billaah', arti:'Dengan menyebut nama Allah, aku bertawakkal kepada Allah. Tiada daya dan tiada kekuatan kecuali dengan Allah' },
    { judul:'Doa Masuk Rumah', arab:'اَللّٰهُمَّ إِنِّيْ أَسْأَلُكَ خَيْرَ الْمَوْلِجِ وَخَيْرَ الْمَخْرَجِ', latin:'Allaahumma innii as\'aluka khairol mauliji wa khairol makhraj', arti:'Ya Allah, aku mohon kepada-Mu sebaik-baik tempat masuk dan sebaik-baik tempat keluar' },
    { judul:'Doa Keselamatan Dunia Akhirat', arab:'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', latin:'Rabbanaa aatinaa fid-dunyaa hasanatan wa fil-aakhirati hasanatan wa qinaa \'adzaaban-naar', arti:'Ya Tuhan kami, berikanlah kami kebaikan di dunia dan kebaikan di akhirat, dan selamatkanlah kami dari azab neraka' },
    { judul:'Doa Memohon Kemudahan', arab:'اَللّٰهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا', latin:'Allaahumma laa sahla illaa maa ja\'altahu sahlaa, wa anta taj\'alul hazna idzaa syi\'ta sahlaa', arti:'Ya Allah, tidak ada kemudahan kecuali yang Engkau buat mudah. Dan Engkau menjadikan kesedihan (kesulitan), jika Engkau kehendaki pasti akan menjadi mudah' },
    { judul:'Doa Masuk Masjid', arab:'اَللّٰهُمَّ افْتَحْ لِيْ أَبْوَابَ رَحْمَتِكَ', latin:'Allaahummaf-tahlii abwaaba rahmatik', arti:'Ya Allah, bukakanlah pintu-pintu rahmat-Mu untukku' },
    { judul:'Doa Keluar Masjid', arab:'اَللّٰهُمَّ إِنِّيْ أَسْأَلُكَ مِنْ فَضْلِكَ', latin:'Allaahumma innii as\'aluka min fadlik', arti:'Ya Allah, aku memohon kepada-Mu dari karunia-Mu' },
];

// ─── Helper: Get Today's Date WIB ─────────────────────
function getWIBDate() {
    const now = new Date(Date.now() + 7 * 3600 * 1000);
    const d = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const [y, m, day] = d.split('-');
    return { dateStr: d, dd: day, mm: m, yyyy: y };
}

// ─── Commands ─────────────────────────────────────────
module.exports = [

    // ── Jadwal Sholat ────────────────────────────────
    {
        name: 'sholat',
        aliases: ['jadwalsholat', 'sholatku'],
        category: 'utility',
        desc: 'Lihat jadwal sholat hari ini',
        usage: '(nama kota)',
        noLimit: true,
        async execute({ m, text, args }) {
            const city = text?.trim() || 'Jakarta';
            await m.react('⏳');
            const { dd, mm, yyyy } = getWIBDate();

            const timings = await getPrayerTimings(city, `${yyyy}-${mm}-${dd}`);
            if (!timings) return m.reply(`❌ Gagal mengambil jadwal sholat untuk kota *${city}*.\nPastikan nama kota benar (gunakan nama dalam bahasa Inggris, contoh: Surabaya, Medan, Makassar).`);

            let text2 = `🕌 *JADWAL SHOLAT*\n`;
            text2 += `📍 Kota : *${city}*\n`;
            text2 += `📅 Tanggal : ${dd}/${mm}/${yyyy}\n\n`;
            for (const key of SHOLAT_ORDER) {
                const raw = timings[key];
                if (!raw) continue;
                const time = raw.split(' ')[0];
                text2 += `${SHOLAT_ICON[key]} *${SHOLAT_ID[key]}*\t: ${time}\n`;
            }
            text2 += `\n_Sumber: aladhan.com | Metode: MWL_\n`;
            text2 += `_Aktifkan pengingat otomatis dengan .setsholat ${city}_`;

            await m.react('✅');
            await m.reply(text2);
        }
    },

    {
        name: 'setsholat',
        aliases: ['aktifkansholat', 'onremindersholat'],
        category: 'utility',
        desc: 'Aktifkan pengingat sholat otomatis di grup ini',
        usage: '(nama kota)',
        groupOnly: true,
        adminOnly: true,
        noLimit: true,
        async execute({ m, text }) {
            const city = text?.trim();
            if (!city) return m.reply('❌ Masukkan nama kota!\nContoh: *.setsholat Surabaya*');

            await m.react('⏳');
            // Validate city by fetching timings
            const { dateStr } = getWIBDate();
            const timings = await getPrayerTimings(city, dateStr);
            if (!timings) return m.reply(`❌ Kota *${city}* tidak ditemukan. Coba nama kota lain.`);

            PrayerSubs.set(m.chat, city);
            await m.react('✅');
            await m.reply(
                `✅ *Pengingat Sholat Aktif!*\n\n` +
                `📍 Kota: *${city}*\n` +
                `🕌 Bot akan mengirim pengingat otomatis setiap waktu sholat tiba.\n\n` +
                `_Matikan dengan .stopsholat_`
            );
        }
    },

    {
        name: 'stopsholat',
        aliases: ['matikansholat', 'offremindersholat'],
        category: 'utility',
        desc: 'Matikan pengingat sholat otomatis',
        groupOnly: true,
        adminOnly: true,
        noLimit: true,
        async execute({ m }) {
            const sub = PrayerSubs.get(m.chat);
            if (!sub) return m.reply('❌ Pengingat sholat tidak aktif di grup ini.');
            PrayerSubs.remove(m.chat);
            await m.reply('✅ Pengingat sholat dimatikan.');
        }
    },

    {
        name: 'infosholat',
        category: 'utility',
        desc: 'Cek status pengingat sholat grup ini',
        groupOnly: true,
        noLimit: true,
        async execute({ m }) {
            const sub = PrayerSubs.get(m.chat);
            if (!sub) return m.reply('❌ Pengingat sholat *tidak aktif* di grup ini.\nAktifkan dengan *.setsholat [kota]*');
            await m.reply(`✅ Pengingat sholat *aktif*!\n📍 Kota: *${sub.city}*\n\nMatikan dengan .stopsholat`);
        }
    },

    // ── Cuaca ─────────────────────────────────────────
    {
        name: 'cuaca',
        aliases: ['weather', 'iklim'],
        category: 'utility',
        desc: 'Cek info cuaca sebuah kota',
        usage: '(nama kota)',
        noLimit: true,
        async execute({ m, text }) {
            const city = text?.trim() || 'Jakarta';
            await m.react('⏳');
            try {
                const res = await fetchJson(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
                if (!res?.current_condition?.[0]) return m.reply('❌ Kota tidak ditemukan!');

                const cur = res.current_condition[0];
                const area = res.nearest_area?.[0];
                const areaName = area?.areaName?.[0]?.value || city;
                const country = area?.country?.[0]?.value || '';

                const desc = cur.lang_id?.[0]?.value || cur.weatherDesc?.[0]?.value || '-';
                const temp = cur.temp_C;
                const feels = cur.FeelsLikeC;
                const humidity = cur.humidity;
                const wind = cur.windspeedKmph;
                const visibility = cur.visibility;
                const uv = cur.uvIndex;

                // Emoji by condition
                const descLow = desc.toLowerCase();
                let emoji = '🌤️';
                if (descLow.includes('rain') || descLow.includes('hujan')) emoji = '🌧️';
                else if (descLow.includes('storm') || descLow.includes('thunder')) emoji = '⛈️';
                else if (descLow.includes('cloud') || descLow.includes('mendung')) emoji = '☁️';
                else if (descLow.includes('sun') || descLow.includes('cerah')) emoji = '☀️';
                else if (descLow.includes('fog') || descLow.includes('kabut')) emoji = '🌫️';

                let text2 = `${emoji} *INFO CUACA*\n\n`;
                text2 += `📍 Lokasi    : *${areaName}, ${country}*\n`;
                text2 += `🌡️ Suhu       : *${temp}°C* (terasa ${feels}°C)\n`;
                text2 += `☁️ Kondisi    : ${desc}\n`;
                text2 += `💧 Kelembapan : ${humidity}%\n`;
                text2 += `💨 Angin      : ${wind} km/h\n`;
                text2 += `👁️ Jarak Pandang: ${visibility} km\n`;
                text2 += `☀️ Indeks UV  : ${uv}\n\n`;

                // Next 2 days forecast
                const forecast = res.weather?.slice(0, 3) || [];
                if (forecast.length) {
                    text2 += `📅 *Prakiraan 3 Hari:*\n`;
                    for (const day of forecast) {
                        const d = day.date;
                        const maxT = day.maxtempC;
                        const minT = day.mintempC;
                        const dDesc = day.hourly?.[4]?.lang_id?.[0]?.value || day.hourly?.[4]?.weatherDesc?.[0]?.value || '-';
                        text2 += `  • ${d}: ${minT}°C - ${maxT}°C | ${dDesc}\n`;
                    }
                }
                text2 += `\n_Sumber: wttr.in_`;

                await m.react('✅');
                await m.reply(text2);
            } catch {
                await m.react('❌');
                await m.reply('❌ Gagal mengambil data cuaca. Coba lagi nanti.');
            }
        }
    },

    // ── Hijri Calendar ────────────────────────────────
    {
        name: 'hijri',
        aliases: ['kalenderhijri', 'tanggalhijri'],
        category: 'utility',
        desc: 'Lihat tanggal Hijriah hari ini',
        noLimit: true,
        async execute({ m }) {
            const { dd, mm, yyyy } = getWIBDate();
            try {
                const res = await fetchJson(`https://api.aladhan.com/v1/gToH?date=${dd}-${mm}-${yyyy}`);
                const h = res?.data?.hijri;
                if (!h) return m.reply('❌ Gagal mengambil data kalender Hijriah.');

                const text = (
                    `📅 *KALENDER HIJRIAH*\n\n` +
                    `🗓️ Masehi   : ${dd}/${mm}/${yyyy}\n` +
                    `☪️ Hijriah  : *${h.day} ${h.month.en} ${h.year} H*\n` +
                    `📖 Bulan    : ${h.month.ar} (${h.month.en})\n` +
                    `📆 Hari     : ${h.weekday.en} / ${h.weekday.ar}\n` +
                    (h.holidays?.length ? `🌙 Hari Istimewa: ${h.holidays.join(', ')}\n` : '') +
                    `\n_Sumber: aladhan.com_`
                );
                await m.reply(text);
            } catch {
                await m.reply('❌ Gagal mengambil kalender Hijriah.');
            }
        }
    },

    // ── Doa Harian ────────────────────────────────────
    {
        name: 'doa',
        aliases: ['doaharian', 'doaislam'],
        category: 'utility',
        desc: 'Tampilkan doa harian secara acak',
        noLimit: true,
        async execute({ m }) {
            const d = pickRandom(DOA_LIST);
            await m.reply(
                `🤲 *DOA HARIAN*\n\n` +
                `📖 *${d.judul}*\n\n` +
                `*Arab:*\n${d.arab}\n\n` +
                `*Latin:*\n_${d.latin}_\n\n` +
                `*Artinya:*\n"${d.arti}"\n\n` +
                `_Semoga amal ibadah kita diterima Allah SWT. Aamiin 🤲_`
            );
        }
    },

    // ── Kurs Mata Uang ────────────────────────────────
    {
        name: 'kurs',
        aliases: ['currency', 'valas'],
        category: 'utility',
        desc: 'Cek kurs mata uang terhadap Rupiah',
        noLimit: true,
        async execute({ m }) {
            await m.react('⏳');
            try {
                const res = await fetchJson('https://open.er-api.com/v6/latest/IDR');
                if (!res?.rates) return m.reply('❌ Gagal mengambil data kurs.');

                const rates = res.rates;
                const idr = 1;
                // Show how many IDR per 1 foreign currency
                const pairs = [
                    ['USD', '🇺🇸 Dollar AS'],
                    ['SGD', '🇸🇬 Dollar Singapura'],
                    ['MYR', '🇲🇾 Ringgit Malaysia'],
                    ['EUR', '🇪🇺 Euro'],
                    ['JPY', '🇯🇵 Yen Jepang'],
                    ['GBP', '🇬🇧 Pound Inggris'],
                    ['SAR', '🇸🇦 Riyal Arab Saudi'],
                    ['AUD', '🇦🇺 Dollar Australia'],
                    ['CNY', '🇨🇳 Yuan China'],
                    ['KRW', '🇰🇷 Won Korea'],
                ];

                let text = `💱 *KURS MATA UANG*\n`;
                text += `_Update: ${new Date(res.time_last_update_unix * 1000).toLocaleDateString('id-ID')}_\n\n`;
                text += `*1 Mata Uang = Rupiah (IDR)*\n`;
                text += `─────────────────\n`;

                for (const [code, name] of pairs) {
                    const rate = rates[code];
                    if (!rate) continue;
                    const idrPer1 = Math.round(1 / rate);
                    text += `${name}\n  *1 ${code}* = Rp ${formatNumber(idrPer1)}\n`;
                }
                text += `─────────────────\n`;
                text += `_Sumber: open.er-api.com_`;

                await m.react('✅');
                await m.reply(text);
            } catch {
                await m.react('❌');
                await m.reply('❌ Gagal mengambil data kurs. Coba lagi nanti.');
            }
        }
    },

    // ── Reminder Pribadi ──────────────────────────────
    {
        name: 'reminder',
        aliases: ['setalarm', 'ingatkan'],
        category: 'utility',
        desc: 'Set pengingat harian',
        usage: '(HH:MM) (pesan)',
        noLimit: true,
        async execute({ m, args, text }) {
            const timeArg = args[0];
            if (!timeArg || !/^\d{1,2}:\d{2}$/.test(timeArg)) {
                return m.reply(
                    '❌ Format salah!\n\n' +
                    'Contoh:\n*.reminder 14:30 Waktunya makan siang!*\n\n' +
                    'Pengingat bersifat harian dan akan dikirim ke chat ini setiap hari pada jam yang ditentukan.'
                );
            }
            // Normalize HH:MM
            const [h, min] = timeArg.split(':');
            const hhMM = `${h.padStart(2, '0')}:${min}`;
            const message = args.slice(1).join(' ');
            if (!message) return m.reply('❌ Masukkan isi pesan pengingat!\nContoh: *.reminder 07:00 Selamat pagi, jangan lupa sarapan!*');

            // Limit 5 reminders per user
            const existing = Reminders.getByUser(m.sender);
            if (existing.length >= 5) return m.reply('❌ Maksimal 5 reminder per orang. Hapus dulu dengan *.delreminder [id]*');

            Reminders.add(m.sender, m.chat, hhMM, message, 1);
            await m.reply(
                `✅ *Reminder berhasil disimpan!*\n\n` +
                `⏰ Waktu  : *${hhMM} WIB*\n` +
                `💬 Pesan  : ${message}\n` +
                `🔄 Tipe   : Harian (setiap hari)\n\n` +
                `_Lihat daftar reminder: .listreminder_\n` +
                `_Hapus: .delreminder [id]_`
            );
        }
    },

    {
        name: 'listreminder',
        aliases: ['reminderlist', 'daftarreminder'],
        category: 'utility',
        desc: 'Lihat daftar reminder kamu',
        noLimit: true,
        async execute({ m }) {
            const list = Reminders.getByUser(m.sender);
            if (!list.length) return m.reply('📭 Kamu belum punya reminder.\nBuat dengan *.reminder HH:MM pesan*');

            let text = `⏰ *DAFTAR REMINDER KAMU*\n\n`;
            list.forEach(r => {
                text += `[${r.id}] *${r.remind_time} WIB*\n`;
                text += `     💬 ${r.message}\n\n`;
            });
            text += `_Hapus dengan .delreminder [id]_`;
            await m.reply(text);
        }
    },

    {
        name: 'delreminder',
        aliases: ['hapusreminder', 'removereminder'],
        category: 'utility',
        desc: 'Hapus reminder berdasarkan ID',
        usage: '(id)',
        noLimit: true,
        async execute({ m, args }) {
            const id = parseInt(args[0]);
            if (!id) return m.reply('❌ Masukkan ID reminder!\nLihat ID dengan *.listreminder*');
            Reminders.delete(id, m.sender);
            await m.reply(`✅ Reminder #${id} berhasil dihapus.`);
        }
    },

    // ── Ayat Quran ────────────────────────────────────
    {
        name: 'quran',
        aliases: ['ayat'],
        category: 'utility',
        desc: 'Baca ayat Al-Quran',
        usage: '(surah):(ayat)',
        noLimit: true,
        async execute({ m, text }) {
            if (!text || !text.includes(':')) return m.reply('❌ Format: *.quran 1:1*\nContoh: .quran 2:255 (Ayat Kursi)');
            const [surahStr, ayatStr] = text.split(':');
            const surah = parseInt(surahStr);
            const ayat  = parseInt(ayatStr);
            if (!surah || !ayat) return m.reply('❌ Masukkan nomor surah dan ayat yang valid!');

            await m.react('⏳');
            try {
                const res = await fetchJson(`https://api.alquran.cloud/v1/ayah/${surah}:${ayat}/editions/quran-uthmani,id.indonesian`);
                if (!res?.data?.[0]) return m.reply('❌ Ayat tidak ditemukan. Periksa nomor surah dan ayat.');

                const arab  = res.data[0];
                const terjemah = res.data[1];
                const surahName = arab.surah?.englishName || '';
                const surahId   = arab.surah?.englishNameTranslation || '';

                let reply = `📖 *AL-QURAN*\n\n`;
                reply += `*Surah ${arab.surah?.number}. ${surahName}* (${arab.surah?.name})\n`;
                reply += `*Ayat ${ayat}*\n\n`;
                reply += `*Arab:*\n${arab.text}\n\n`;
                reply += `*Terjemahan:*\n_${terjemah?.text || '-'}_\n\n`;
                reply += `_QS. ${surahName} [${surah}:${ayat}]_`;

                await m.react('✅');
                await m.reply(reply);
            } catch {
                await m.react('❌');
                await m.reply('❌ Gagal mengambil ayat. Coba lagi nanti.');
            }
        }
    },
];
