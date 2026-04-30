const { getSocket } = require('./connection');
const { fetchJson } = require('./functions');

// ─── Cache & State ────────────────────────────────────
const prayerCache = {};       // key: `${city}_${dateStr}` → timings
const sentToday   = new Set();// prevent duplicate sends
let   lastDate    = '';       // detect date change for reset

const PRAYER_KEYS   = ['Imsak', 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_LABELS = {
    Imsak:   '⏰ Imsak',
    Fajr:    '🌅 Subuh',
    Dhuhr:   '☀️ Dzuhur',
    Asr:     '🌤️ Ashar',
    Maghrib: '🌆 Maghrib',
    Isha:    '🌙 Isya',
};
const QUOTES = [
    'Segera tunaikan sholat, jangan ditunda! 🙏',
    'Tinggalkan sejenak aktivitas, waktunya menghadap Allah! 💫',
    'Sholat adalah tiang agama. Jaga terus ya! 🌟',
    'Sempatkan sholat meski sedang sibuk, semua untuk Allah! 🤲',
    'Sholat tepat waktu adalah ciri orang bertakwa! ✨',
];

// ─── Helpers ─────────────────────────────────────────
async function getPrayerTimings(city, dateStr) {
    const cacheKey = `${city.toLowerCase()}_${dateStr}`;
    if (prayerCache[cacheKey]) return prayerCache[cacheKey];
    try {
        const res = await fetchJson(
            `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=Indonesia&method=11`
        );
        if (res?.data?.timings) {
            prayerCache[cacheKey] = res.data.timings;
            return res.data.timings;
        }
    } catch {}
    return null;
}

function buildPrayerMsg(label, time, city) {
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    return (
        `🕌 *PENGINGAT WAKTU SHOLAT*\n\n` +
        `${label} telah tiba!\n` +
        `⏰ Waktu : *${time} WIB*\n` +
        `📍 Kota  : *${city}*\n\n` +
        `_${q}_\n\n` +
        `_Matikan dengan .stopsholat_`
    );
}

// ─── Main tick (runs every minute) ───────────────────
async function tick() {
    const sock = getSocket();
    if (!sock) return;

    // WIB = UTC+7
    const nowWIB  = new Date(Date.now() + 7 * 3600 * 1000);
    const dateStr = nowWIB.toISOString().split('T')[0];      // YYYY-MM-DD
    const hhMM    = nowWIB.toISOString().slice(11, 16);       // HH:MM

    // Reset state on new day
    if (lastDate !== dateStr) {
        sentToday.clear();
        lastDate = dateStr;
        // Purge old cache entries
        for (const k of Object.keys(prayerCache)) {
            if (!k.endsWith(dateStr)) delete prayerCache[k];
        }
    }

    // ── 1. Prayer time reminders ──────────────────────
    try {
        const { PrayerSubs } = require('../database');
        const subs = PrayerSubs.getAll();

        for (const sub of subs) {
            const timings = await getPrayerTimings(sub.city, dateStr);
            if (!timings) continue;

            for (const pKey of PRAYER_KEYS) {
                const raw = timings[pKey];
                if (!raw) continue;
                const pTime = raw.split(' ')[0]; // strip "(WIB)" suffix if any
                if (pTime !== hhMM) continue;

                const sentKey = `${sub.jid}_${pKey}_${dateStr}`;
                if (sentToday.has(sentKey)) continue;
                sentToday.add(sentKey);

                const msg = buildPrayerMsg(PRAYER_LABELS[pKey], pTime, sub.city);
                try {
                    await sock.sendMessage(sub.jid, { text: msg });
                    console.log(`🕌 Prayer reminder sent: ${pKey} → ${sub.jid}`);
                } catch (e) {
                    console.log('⚠️ Prayer reminder failed:', e.message);
                }
            }
        }
    } catch (e) {
        console.log('Scheduler prayer error:', e.message);
    }

    // ── 2. Personal reminders ─────────────────────────
    try {
        const { Reminders } = require('../database');
        const dues = Reminders.getDue(hhMM);

        for (const r of dues) {
            const sentKey = `reminder_${r.id}_${dateStr}`;
            if (sentToday.has(sentKey)) continue;
            sentToday.add(sentKey);

            try {
                await sock.sendMessage(r.chat_jid, {
                    text: `⏰ *REMINDER*\n\n${r.message}\n\n_Untuk @${r.jid.split('@')[0]}_`,
                    mentions: [r.jid],
                });
                if (!r.is_daily) Reminders.deactivate(r.id);
            } catch (e) {
                console.log('⚠️ Reminder send failed:', e.message);
            }
        }
    } catch (e) {
        console.log('Scheduler reminder error:', e.message);
    }
}

// ─── Scheduler entry point ────────────────────────────
function startScheduler() {
    // Align to next full minute boundary, then tick every 60s
    const msToNext = 60000 - (Date.now() % 60000);
    setTimeout(() => {
        tick();
        setInterval(tick, 60000);
    }, msToNext);
    console.log(`⏰ Scheduler started (first tick in ${Math.round(msToNext / 1000)}s)`);
}

module.exports = { startScheduler, getPrayerTimings };
