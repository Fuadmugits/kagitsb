const router = require('express').Router();
const auth = require('../middleware/auth');
const { Users, Transactions } = require('../../database');

router.get('/', auth, (req, res) => {
    try { res.json(Users.getAll()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/premium', auth, (req, res) => {
    try { res.json(Users.getPremium()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/banned', auth, (req, res) => {
    try { res.json(Users.getBanned()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/addprem', auth, (req, res) => {
    try { const { jid, days } = req.body; Users.getOrCreate(jid); Users.setPremium(jid, days || 30); res.json({ message: 'Premium added' }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/delprem', auth, (req, res) => {
    try { const { jid } = req.body; Users.removePremium(jid); res.json({ message: 'Premium removed' }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ban', auth, (req, res) => {
    try { const { jid } = req.body; Users.getOrCreate(jid); Users.ban(jid); res.json({ message: 'User banned' }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/unban', auth, (req, res) => {
    try { const { jid } = req.body; Users.unban(jid); res.json({ message: 'User unbanned' }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/addbalance', auth, (req, res) => {
    try { const { jid, amount } = req.body; Users.getOrCreate(jid); Users.addBalance(jid, amount); Transactions.create(jid, 'topup', amount, 'Dashboard topup'); res.json({ message: 'Balance added' }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// Customer profile endpoint (no auth, uses phone number)
router.get('/profile/:phone', (req, res) => {
    try {
        const jid = req.params.phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        const user = Users.get(jid);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const txns = Transactions.getByUser(jid);
        res.json({ ...user, transactions: txns });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
