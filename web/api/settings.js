const router = require('express').Router();
const auth = require('../middleware/auth');
const { Settings } = require('../../database');
const config = require('../../config');

router.get('/', auth, (req, res) => {
    res.json({
        botName: config.bot.name,
        prefix: config.bot.prefix,
        mode: config.bot.mode,
        autoRead: config.bot.autoRead,
        autoTyping: config.bot.autoTyping,
        ownerNumber: config.bot.ownerNumber,
    });
});

router.post('/', auth, (req, res) => {
    try {
        const { key, value } = req.body;
        const allowed = ['botName','prefix','mode','autoRead','autoTyping'];
        if (!allowed.includes(key)) return res.status(400).json({ error: 'Invalid setting' });
        Settings.set(key, value);
        if (key === 'botName') config.bot.name = value;
        if (key === 'prefix') config.bot.prefix = value;
        if (key === 'mode') config.bot.mode = value;
        if (key === 'autoRead') config.bot.autoRead = value === 'true' || value === true;
        if (key === 'autoTyping') config.bot.autoTyping = value === 'true' || value === true;
        res.json({ message: 'Setting updated', key, value });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
