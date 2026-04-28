const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../../config');
const { Admins } = require('../../database');

// Initialize default admin
(async () => {
    const existing = Admins.get(process.env.ADMIN_USERNAME || 'admin');
    if (!existing) {
        const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
        Admins.create(process.env.ADMIN_USERNAME || 'admin', hash, 'owner');
        console.log('👤 Default admin created');
    }
})();

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi' });
        const admin = Admins.get(username);
        if (!admin) return res.status(401).json({ error: 'Username atau password salah' });
        const valid = await bcrypt.compare(password, admin.password);
        if (!valid) return res.status(401).json({ error: 'Username atau password salah' });
        const token = jwt.sign({ id: admin.id, username: admin.username, role: admin.role }, config.web.jwtSecret, { expiresIn: '7d' });
        res.json({ token, user: { username: admin.username, role: admin.role } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { username, password, adminKey } = req.body;
        if (adminKey !== config.web.jwtSecret) return res.status(403).json({ error: 'Admin key salah' });
        const hash = await bcrypt.hash(password, 10);
        Admins.create(username, hash);
        res.json({ message: 'Admin berhasil dibuat' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
