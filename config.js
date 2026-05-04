require('dotenv').config();

module.exports = {
    bot: {
        name: process.env.BOT_NAME || 'MyBot',
        prefix: process.env.PREFIX || '.',
        ownerNumber: (process.env.OWNER_NUMBER || '').split(',').map(s => s.trim()).filter(Boolean),
        ownerName: process.env.OWNER_NAME || 'Owner',
        mode: 'public',       // 'public' | 'self' | 'group'
        autoRead: false,
        autoTyping: true,
        autoRecording: false,
    },
    web: {
        port: parseInt(process.env.PORT) || 3000,
        jwtSecret: process.env.JWT_SECRET || 'change_this_secret_key',
    },
    api: {
        geminiKey: process.env.GEMINI_API_KEY || '',
        openaiKey: process.env.OPENAI_API_KEY || '',
    },
    limits: {
        free: 20,
        premium: 999999,
        maxBalance: 100000000,   // Batas maksimal balance yang bisa dimiliki user
    },
    prices: {
        premium_30d: 25000,
        premium_7d: 5000,
        premium_14d: 10000,
        limit_10: 50000,
        limit_50: 200000,
        limit_100: 350000,
    },
    // Global game schedule (24-hour format HH:mm)
    gameSchedule: (() => {
        const schedule = [];
        for (let h = 0; h < 24; h++) {
            const hh = h.toString().padStart(2, '0');
            schedule.push({ time: `${hh}:00`, state: 'on' });
            schedule.push({ time: `${hh}:20`, state: 'off' });
            schedule.push({ time: `${hh}:40`, state: 'on' });
        }
        return schedule;
    })(),
    payment: {
        // Info rekening / kontak owner untuk pembelian premium dengan uang asli
        ownerWa: process.env.OWNER_NUMBER || '',   // Nomor WA owner (otomatis dari env)
        methods: [
            { name: 'Dana',    number: process.env.PAYMENT_DANA    || '-' },
            { name: 'GoPay',   number: process.env.PAYMENT_GOPAY   || '-' },
            { name: 'OVO',     number: process.env.PAYMENT_OVO     || '-' },
            { name: 'BCA',     number: process.env.PAYMENT_BCA     || '-' },
        ],
    },
    dailyClaim: {
        balance: 500,
        limit: 5,
    },
    paths: {
        sessions: require('path').join(process.cwd(), 'storage', 'session'),
        temp: require('path').join(process.cwd(), 'storage', 'temp'),
        database: require('path').join(process.cwd(), 'storage', 'database.db'),
    }
};
