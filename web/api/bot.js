const { Router } = require('express');
const auth = require('../middleware/auth');
const { getSocket } = require('../../lib/connection');

module.exports = function() {
    const router = Router();

    router.post('/send', auth, async (req, res) => {
        try {
            const sock = getSocket();
            if (!sock) return res.status(400).json({ error: 'Bot not connected' });
            const { jid, message } = req.body;
            if (!jid || !message) return res.status(400).json({ error: 'JID and message required' });
            await sock.sendMessage(jid, { text: message });
            res.json({ message: 'Sent' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.get('/groups', auth, async (req, res) => {
        try {
            const sock = getSocket();
            if (!sock) return res.status(400).json({ error: 'Bot not connected' });
            const groups = await sock.groupFetchAllParticipating();
            const list = Object.values(groups).map(g => ({ id: g.id, name: g.subject, members: g.participants.length }));
            res.json(list);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.get('/status', auth, (req, res) => {
        const sock = getSocket();
        res.json({ connected: !!sock?.user, user: sock?.user || null });
    });

    router.post('/pairing', auth, async (req, res) => {
        try {
            const sock = getSocket();
            if (!sock) return res.status(400).json({ error: 'Bot is not initializing' });
            
            let phoneNum = phone.replace(/[^0-9]/g, '');
            if (phoneNum.startsWith('0')) phoneNum = '62' + phoneNum.slice(1);

            const code = await sock.requestPairingCode(phoneNum);
            console.log('\n🔑 KODE PAIRING ANDA:', code, '\n');
            res.json({ code });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    return router;
};
