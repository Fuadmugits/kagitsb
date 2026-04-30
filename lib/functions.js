const moment = require('moment-timezone');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// ═══════════════════════════════════════
//  TIME & DATE
// ═══════════════════════════════════════
function getTime() {
    return moment.tz('Asia/Jakarta').format('HH:mm:ss');
}

function getDate() {
    return moment.tz('Asia/Jakarta').format('DD/MM/YYYY');
}

function getDay() {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[moment.tz('Asia/Jakarta').day()];
}

function getGreeting() {
    const hour = moment.tz('Asia/Jakarta').hour();
    if (hour >= 3 && hour < 11) return 'Selamat Pagi 🌅';
    if (hour >= 11 && hour < 15) return 'Selamat Siang ☀️';
    if (hour >= 15 && hour < 18) return 'Selamat Sore 🌇';
    return 'Selamat Malam 🌙';
}

function runtime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d} hari`);
    if (h > 0) parts.push(`${h} jam`);
    if (m > 0) parts.push(`${m} menit`);
    parts.push(`${s} detik`);
    return parts.join(' ');
}

// ═══════════════════════════════════════
//  FORMATTING
// ═══════════════════════════════════════
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function msToDate(ms) {
    const d = new Date(ms);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════
//  JID HELPERS
// ═══════════════════════════════════════
function parseJid(text) {
    if (!text) return null;
    let num = text.replace(/[^0-9]/g, '');
    if (!num) return null;
    // Normalize Indonesian numbers: 08xxx → 628xxx
    if (num.startsWith('0')) {
        num = '62' + num.slice(1);
    }
    return num + '@s.whatsapp.net';
}

function getNumberFromJid(jid) {
    if (!jid) return '';
    // Handle WhatsApp @lid JIDs (multi-device privacy feature)
    if (jid.includes('@lid')) {
        const lidMap = require('./lid-map');
        const resolved = lidMap.resolvePhone(jid);
        if (resolved) return resolved;
        // Fallback: return the raw number part (won't match phone, but won't crash)
        return jid.replace('@lid', '');
    }
    return jid?.replace(/:\d+@/, '@').replace(/@s\.whatsapp\.net|@g\.us/g, '') || '';
}

function isOwner(jid) {
    const number = getNumberFromJid(jid); // e.g. '628123456789'
    const ownerNumbers = config.bot.ownerNumber;

    // Try multiple format comparisons to handle inconsistencies
    for (const owned of ownerNumbers) {
        const o = owned.trim().replace(/[^0-9]/g, '');
        const n = number.replace(/[^0-9]/g, '');
        if (!n || !o) continue;

        if (n === o) return true;               // exact match: 628xxx === 628xxx
        // Normalize: 08xxx <-> 628xxx
        const nNorm = n.startsWith('0') ? '62' + n.slice(1) : n;
        const oNorm = o.startsWith('0') ? '62' + o.slice(1) : o;
        if (nNorm === oNorm) return true;
    }

    // Check co-owners in database
    try {
        const { CoOwners } = require('../database');
        return CoOwners.isCoOwner(jid);
    } catch { return false; }
}

// ═══════════════════════════════════════
//  NETWORK
// ═══════════════════════════════════════
async function fetchBuffer(url, options = {}) {
    try {
        const https = require('https');
        const res = await axios.get(url, {
            ...options,
            responseType: 'arraybuffer',
            timeout: 30000,
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ...options.headers,
            }
        });
        return Buffer.from(res.data);
    } catch (e) {
        console.error('fetchBuffer error:', e.message);
        return null;
    }
}

async function fetchJson(url, options = {}) {
    try {
        const https = require('https');
        const res = await axios.get(url, {
            ...options,
            timeout: 30000,
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ...options.headers,
            }
        });
        return res.data;
    } catch (e) {
        console.error('fetchJson error:', e.message);
        return null;
    }
}

// ═══════════════════════════════════════
//  FILE HELPERS
// ═══════════════════════════════════════
function saveTempFile(buffer, ext) {
    const filePath = path.join(config.paths.temp, `${Date.now()}.${ext}`);
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

function cleanTemp() {
    const tempDir = config.paths.temp;
    if (!fs.existsSync(tempDir)) return;
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        // Delete files older than 10 minutes
        if (now - stats.mtimeMs > 600000) {
            try { fs.unlinkSync(filePath); } catch {}
        }
    }
}

// Clean temp every 5 minutes
setInterval(cleanTemp, 300000);

// ═══════════════════════════════════════
//  MEDIA CONVERTERS
// ═══════════════════════════════════════
async function toWebp(mediaBuffer) {
    try {
        const sharp = require('sharp');
        return await sharp(mediaBuffer)
            .resize(512, 512, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
            .webp({ quality: 80 })
            .toBuffer();
    } catch (e) {
        console.error('toWebp error:', e.message);
        return mediaBuffer; // Fallback
    }
}

// ═══════════════════════════════════════
//  TEXT TEMPLATES
// ═══════════════════════════════════════
function monospace(text) {
    return '```' + text + '```';
}

function bold(text) {
    return '*' + text + '*';
}

function italic(text) {
    return '_' + text + '_';
}

function strikethrough(text) {
    return '~' + text + '~';
}

module.exports = {
    getTime,
    getDate,
    getDay,
    getGreeting,
    runtime,
    formatNumber,
    msToDate,
    pickRandom,
    randomInt,
    sleep,
    parseJid,
    getNumberFromJid,
    isOwner,
    fetchBuffer,
    fetchJson,
    saveTempFile,
    cleanTemp,
    toWebp,
    monospace,
    bold,
    italic,
    strikethrough,
};
