const { Router } = require('express');
const auth = require('../middleware/auth');
const { getSocket, startConnection, getAllSessions, deleteSession } = require('../../lib/connection');

module.exports = function(io) {
    const router = Router();

    // Mengambil semua sesi aktif
    router.get('/list', auth, (req, res) => {
        try {
            const sessions = getAllSessions();
            res.json(sessions);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Menambah bot baru via QR
    router.post('/add', auth, async (req, res) => {
        try {
            const { sessionId } = req.body;
            if (!sessionId) return res.status(400).json({ error: 'Session ID required' });
            
            // Cek apakah sudah ada
            const existing = getSocket(sessionId);
            if (existing && existing.user) {
                return res.status(400).json({ error: 'Session already active' });
            }

            await startConnection(io, sessionId);
            res.json({ message: 'Session initialization started for QR' });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Menambah bot baru via Pairing Code
    router.post('/pairing', auth, async (req, res) => {
        try {
            const { sessionId, phone } = req.body;
            if (!sessionId || !phone) return res.status(400).json({ error: 'Session ID and Phone Number required' });
            
            const existing = getSocket(sessionId);
            if (existing && existing.user) {
                return res.status(400).json({ error: 'Session already active' });
            }

            await startConnection(io, sessionId, phone);
            res.json({ message: 'Pairing initialization started' });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Menghapus bot
    router.post('/delete', auth, (req, res) => {
        try {
            const { sessionId } = req.body;
            if (!sessionId) return res.status(400).json({ error: 'Session ID required' });
            deleteSession(sessionId);
            res.json({ message: 'Session deleted' });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    router.post('/send', auth, async (req, res) => {
        try {
            const sessionId = req.body.sessionId || 'default';
            const sock = getSocket(sessionId);
            if (!sock) return res.status(400).json({ error: 'Bot not connected' });
            const { jid, message } = req.body;
            if (!jid || !message) return res.status(400).json({ error: 'JID and message required' });
            await sock.sendMessage(jid, { text: message });
            res.json({ message: 'Sent' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.get('/groups', auth, async (req, res) => {
        try {
            const sessionId = req.query.sessionId || 'default';
            const sock = getSocket(sessionId);
            if (!sock) return res.status(400).json({ error: 'Bot not connected' });
            const groups = await sock.groupFetchAllParticipating();
            const list = Object.values(groups).map(g => ({ id: g.id, name: g.subject, members: g.participants.length }));
            res.json(list);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.get('/status', auth, (req, res) => {
        const sessionId = req.query.sessionId || 'default';
        const sock = getSocket(sessionId);
        res.json({ connected: !!sock?.user, user: sock?.user || null });
    });

    return router;
};
