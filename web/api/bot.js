const { Router } = require('express');
const auth = require('../middleware/auth');

module.exports = function(sock) {
    const router = Router();

    router.post('/send', auth, async (req, res) => {
        try {
            const { jid, message } = req.body;
            if (!jid || !message) return res.status(400).json({ error: 'JID and message required' });
            await sock.sendMessage(jid, { text: message });
            res.json({ message: 'Sent' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.get('/groups', auth, async (req, res) => {
        try {
            const groups = await sock.groupFetchAllParticipating();
            const list = Object.values(groups).map(g => ({ id: g.id, name: g.subject, members: g.participants.length }));
            res.json(list);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.get('/status', auth, (req, res) => {
        res.json({ connected: !!sock?.user, user: sock?.user || null });
    });

    return router;
};
