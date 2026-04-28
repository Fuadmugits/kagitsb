require('dotenv').config();

module.exports = {
    bot: {
        name: process.env.BOT_NAME || 'KageItsu',
        prefix: process.env.PREFIX || '.',
        ownerNumber: (process.env.OWNER_NUMBER || '6289616029864').split(','),
        ownerName: 'KageItsu Official',
        mode: 'public',       // 'public' | 'self' | 'group'
        autoRead: false,
        autoTyping: true,
        autoRecording: false,
    },
    web: {
        port: parseInt(process.env.PORT) || 3000,
        jwtSecret: process.env.JWT_SECRET || 'kagaitsb_default_secret_2026',
    },
    api: {
        geminiKey: process.env.GEMINI_API_KEY || '',
        openaiKey: process.env.OPENAI_API_KEY || '',
    },
    limits: {
        free: 20,
        premium: 999999,
    },
    prices: {
        premium_30d: 15000,
        limit_10: 2000,
        limit_50: 8000,
        limit_100: 14000,
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
