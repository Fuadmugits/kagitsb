const jwt = require('jsonwebtoken');
const config = require('../../config');

function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;
    if (!token) return res.status(401).json({ error: 'Token required' });
    try {
        const decoded = jwt.verify(token, config.web.jwtSecret);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

module.exports = authMiddleware;
