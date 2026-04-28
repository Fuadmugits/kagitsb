const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const config = require('../config');

function createWebServer(sock) {
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server, { cors: { origin: '*' } });

    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, 'public')));

    // API routes
    app.use('/api/auth', require('./api/auth'));
    app.use('/api/dashboard', require('./api/dashboard'));
    app.use('/api/users', require('./api/users'));
    app.use('/api/bot', require('./api/bot')(sock));
    app.use('/api/settings', require('./api/settings'));

    // Health check
    app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

    // SPA fallback
    app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
    app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
    app.get('/customer', (req, res) => res.sendFile(path.join(__dirname, 'public', 'customer.html')));
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

    // Socket.IO
    io.on('connection', (socket) => {
        console.log('🌐 Dashboard client connected');
        socket.on('disconnect', () => console.log('🌐 Dashboard client disconnected'));
    });

    return { app, server, io };
}

module.exports = { createWebServer };
