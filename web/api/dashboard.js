const router = require('express').Router();
const auth = require('../middleware/auth');
const { Users, CommandLogs, Transactions } = require('../../database');

router.get('/stats', auth, (req, res) => {
    try {
        res.json({
            totalUsers: Users.count(),
            premiumUsers: Users.countPremium(),
            commandsToday: CommandLogs.countToday(),
            totalCommands: CommandLogs.countAll(),
            popularCommands: CommandLogs.popular(),
            recentLogs: CommandLogs.getRecent(),
            transactions: Transactions.count(),
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/leaderboard', auth, (req, res) => {
    try { res.json(Users.getLeaderboard()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/recent-commands', auth, (req, res) => {
    try { res.json(CommandLogs.getRecent()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
