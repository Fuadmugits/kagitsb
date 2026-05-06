const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Ensure storage directories
const storageDir = path.dirname(config.paths.database);
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
if (!fs.existsSync(config.paths.temp)) fs.mkdirSync(config.paths.temp, { recursive: true });
if (!fs.existsSync(config.paths.sessions)) fs.mkdirSync(config.paths.sessions, { recursive: true });

let db = null;

function saveDb() {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(config.paths.database, buffer);
}

// Auto-save every 30 seconds
setInterval(saveDb, 30000);

async function initDatabase() {
    const SQL = await initSqlJs();
    
    // Load existing database or create new one
    if (fs.existsSync(config.paths.database)) {
        const fileBuffer = fs.readFileSync(config.paths.database);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }
    
    // Create tables
    db.run(`CREATE TABLE IF NOT EXISTS users (
        jid TEXT PRIMARY KEY, name TEXT DEFAULT 'Unknown', role TEXT DEFAULT 'free',
        balance INTEGER DEFAULT 0, limit_count INTEGER DEFAULT ${config.limits.free},
        total_commands INTEGER DEFAULT 0, premium_expire TEXT,
        is_banned INTEGER DEFAULT 0, is_muted INTEGER DEFAULT 0, last_claim TEXT,
        exp INTEGER DEFAULT 0, level INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )`);
    
    // Auto-migrate columns if they don't exist
    try { db.run('ALTER TABLE users ADD COLUMN exp INTEGER DEFAULT 0'); } catch {}
    try { db.run('ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1'); } catch {}
    try { db.run('ALTER TABLE users ADD COLUMN jail_until TEXT'); } catch {}
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, jid TEXT, type TEXT, amount INTEGER,
        description TEXT, created_at TEXT DEFAULT (datetime('now'))
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS custom_commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT, trigger_word TEXT UNIQUE, response TEXT,
        is_locked INTEGER DEFAULT 0, created_by TEXT, created_at TEXT DEFAULT (datetime('now'))
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS message_store (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, content TEXT,
        created_by TEXT, created_at TEXT DEFAULT (datetime('now'))
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL, role TEXT DEFAULT 'admin', created_at TEXT DEFAULT (datetime('now'))
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS command_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, jid TEXT, command TEXT, chat_jid TEXT,
        is_group INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS warnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT, jid TEXT, group_jid TEXT, reason TEXT DEFAULT '',
        warned_by TEXT, created_at TEXT DEFAULT (datetime('now'))
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS afk_status (
        jid TEXT PRIMARY KEY, reason TEXT DEFAULT '', timestamp TEXT DEFAULT (datetime('now'))
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
    
    // Per-Group Leveling System
    db.run(`CREATE TABLE IF NOT EXISTS group_levels (
        jid TEXT NOT NULL, group_jid TEXT NOT NULL,
        exp INTEGER DEFAULT 0, level INTEGER DEFAULT 1,
        last_chat TEXT,
        PRIMARY KEY (jid, group_jid)
    )`);

    // Check-in streak system
    db.run(`CREATE TABLE IF NOT EXISTS checkin (
        jid TEXT PRIMARY KEY,
        streak INTEGER DEFAULT 0,
        last_checkin TEXT,
        total_checkins INTEGER DEFAULT 0
    )`);

    // Achievements / Badges
    db.run(`CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jid TEXT, badge_key TEXT,
        earned_at TEXT DEFAULT (datetime('now')),
        UNIQUE(jid, badge_key)
    )`);

    // Prayer time subscriptions (per group/chat)
    db.run(`CREATE TABLE IF NOT EXISTS prayer_subs (
        jid TEXT PRIMARY KEY,
        city TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
    )`);

    // Personal reminders
    db.run(`CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jid TEXT NOT NULL,
        chat_jid TEXT NOT NULL,
        remind_time TEXT NOT NULL,
        message TEXT NOT NULL,
        is_daily INTEGER DEFAULT 1,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
    )`);

    // Co-owners
    db.run(`CREATE TABLE IF NOT EXISTS co_owners (
        jid TEXT PRIMARY KEY,
        added_by TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    )`);

    // Custom titles (owner-assigned per user per group)
    db.run(`CREATE TABLE IF NOT EXISTS custom_titles (
        jid TEXT NOT NULL,
        group_jid TEXT NOT NULL,
        title TEXT NOT NULL,
        set_by TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (jid, group_jid)
    )`);

    // RPG System
    db.run(`CREATE TABLE IF NOT EXISTS rpg_users (
        jid TEXT PRIMARY KEY,
        weapon TEXT,
        helmet TEXT,
        armor TEXT,
        glove TEXT,
        legging TEXT,
        shoe TEXT,
        last_attack TEXT,
        last_mine TEXT,
        last_pvp TEXT,
        base_power INTEGER DEFAULT 10,
        base_defense INTEGER DEFAULT 10,
        base_luck INTEGER DEFAULT 0,
        rpg_coin INTEGER DEFAULT 0,
        asc_power INTEGER DEFAULT 0,
        asc_defense INTEGER DEFAULT 0,
        asc_luck INTEGER DEFAULT 0,
        hp INTEGER DEFAULT 1000,
        last_raid_attack TEXT
    )`);

    try { db.run('ALTER TABLE rpg_users ADD COLUMN base_power INTEGER DEFAULT 10'); } catch {}
    try { db.run('ALTER TABLE rpg_users ADD COLUMN base_defense INTEGER DEFAULT 10'); } catch {}
    try { db.run('ALTER TABLE rpg_users ADD COLUMN base_luck INTEGER DEFAULT 0'); } catch {}
    try { db.run('ALTER TABLE rpg_users ADD COLUMN rpg_coin INTEGER DEFAULT 0'); } catch {}
    try { db.run('ALTER TABLE rpg_users ADD COLUMN asc_power INTEGER DEFAULT 0'); } catch {}
    try { db.run('ALTER TABLE rpg_users ADD COLUMN asc_defense INTEGER DEFAULT 0'); } catch {}
    try { db.run('ALTER TABLE rpg_users ADD COLUMN asc_luck INTEGER DEFAULT 0'); } catch {}
    try { db.run('ALTER TABLE rpg_users ADD COLUMN hp INTEGER DEFAULT 1000'); } catch {}
    try { db.run('ALTER TABLE rpg_users ADD COLUMN last_raid_attack TEXT'); } catch {}
    try { db.run('ALTER TABLE rpg_users ADD COLUMN equipped_aura TEXT'); } catch {}
    try { db.run('ALTER TABLE rpg_users ADD COLUMN unlocked_auras TEXT DEFAULT "[]"'); } catch {}
    try { db.run('ALTER TABLE rpg_users ADD COLUMN boss_kills TEXT DEFAULT "{}"'); } catch {}

    // Redeem Codes System
    db.run(`CREATE TABLE IF NOT EXISTS gift_codes (
        code TEXT PRIMARY KEY,
        r_coin INTEGER DEFAULT 0,
        r_balance INTEGER DEFAULT 0,
        r_limit INTEGER DEFAULT 0,
        max_uses INTEGER DEFAULT 0,
        current_uses INTEGER DEFAULT 0,
        expires_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS gift_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jid TEXT NOT NULL,
        code TEXT NOT NULL,
        redeemed_at TEXT DEFAULT (datetime('now')),
        UNIQUE(jid, code)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS rpg_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jid TEXT,
        item_type TEXT,
        item_data TEXT,
        amount INTEGER DEFAULT 1
    )`);

    saveDb();
    console.log('✅ Database initialized');
    return db;
}

// Helper: run query and return rows
function all(sql, params = []) { try { return db.exec(sql, params)?.[0]?.values?.map(row => { const cols = db.exec(sql, params)?.[0]?.columns; const obj = {}; cols?.forEach((c,i) => obj[c] = row[i]); return obj; }) || []; } catch { return []; } }

// Better helper using prepared statements
function query(sql, params = []) {
    try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results = [];
        const cols = stmt.getColumnNames();
        while (stmt.step()) {
            const row = stmt.get();
            const obj = {};
            cols.forEach((c, i) => obj[c] = row[i]);
            results.push(obj);
        }
        stmt.free();
        return results;
    } catch { return []; }
}

function queryOne(sql, params = []) {
    const results = query(sql, params);
    return results[0] || null;
}

function run(sql, params = []) {
    try { db.run(sql, params); saveDb(); } catch (e) { console.error('DB Error:', e.message); }
}

// ═══════════════════════════════════════
//  USER FUNCTIONS
// ═══════════════════════════════════════
const Users = {
    get(jid) { return queryOne('SELECT * FROM users WHERE jid = ?', [jid]); },
    create(jid, name = 'Unknown') { run(`INSERT OR IGNORE INTO users (jid, name, limit_count) VALUES (?, ?, ?)`, [jid, name, config.limits.free]); return this.get(jid); },
    getOrCreate(jid, name = 'Unknown') { let u = this.get(jid); if (!u) u = this.create(jid, name); return u; },
    updateName(jid, name) { run('UPDATE users SET name = ?, updated_at = datetime("now") WHERE jid = ?', [name, jid]); },
    addBalance(jid, amount) {
        run('UPDATE users SET balance = balance + ?, updated_at = datetime("now") WHERE jid = ?', [amount, jid]);
    },
    setBalance(jid, amount) { run('UPDATE users SET balance = ?, updated_at = datetime("now") WHERE jid = ?', [amount, jid]); },
    addLimit(jid, amount) { run('UPDATE users SET limit_count = limit_count + ?, updated_at = datetime("now") WHERE jid = ?', [amount, jid]); },
    addLevel(jid, amount) { run('UPDATE users SET level = level + ?, updated_at = datetime("now") WHERE jid = ?', [amount, jid]); },
    setLevel(jid, amount) { run('UPDATE users SET level = ?, updated_at = datetime("now") WHERE jid = ?', [amount, jid]); },
    deductLimit(jid) { run('UPDATE users SET limit_count = limit_count - 1, total_commands = total_commands + 1, updated_at = datetime("now") WHERE jid = ?', [jid]); },
    addExp(jid, amount) {
        run('UPDATE users SET exp = exp + ?, updated_at = datetime("now") WHERE jid = ?', [amount, jid]);
        const u = this.get(jid);
        if (u) {
            const nextLevelExp = u.level * 100;
            if (u.exp >= nextLevelExp) {
                run('UPDATE users SET level = level + 1, exp = 0, updated_at = datetime("now") WHERE jid = ?', [jid]);
                return { leveledUp: true, newLevel: u.level + 1 };
            }
        }
        return { leveledUp: false };
    },
    setPremium(jid, days) {
        const expire = new Date(); expire.setDate(expire.getDate() + days);
        run('UPDATE users SET role = ?, premium_expire = ?, limit_count = ?, updated_at = datetime("now") WHERE jid = ?', ['premium', expire.toISOString(), config.limits.premium, jid]);
    },
    removePremium(jid) { run(`UPDATE users SET role = 'free', premium_expire = NULL, limit_count = ${config.limits.free}, updated_at = datetime("now") WHERE jid = ?`, [jid]); },
    ban(jid) { run('UPDATE users SET is_banned = 1 WHERE jid = ?', [jid]); },
    unban(jid) { run('UPDATE users SET is_banned = 0 WHERE jid = ?', [jid]); },
    mute(jid) { run('UPDATE users SET is_muted = 1 WHERE jid = ?', [jid]); },
    unmute(jid) { run('UPDATE users SET is_muted = 0 WHERE jid = ?', [jid]); },
    claim(jid) {
        const today = new Date().toISOString().split('T')[0];
        run('UPDATE users SET last_claim = ?, updated_at = datetime("now") WHERE jid = ?', [today, jid]);
        this.addBalance(jid, config.dailyClaim.balance);
        this.addLimit(jid, config.dailyClaim.limit);
    },
    canClaim(jid) { const u = this.get(jid); if (!u) return true; return u.last_claim !== new Date().toISOString().split('T')[0]; },
    getAll() { return query('SELECT * FROM users ORDER BY total_commands DESC'); },
    getPremium() { return query("SELECT * FROM users WHERE role = 'premium'"); },
    getBanned() { return query('SELECT * FROM users WHERE is_banned = 1'); },
    getLeaderboard() { return query('SELECT jid, name, balance, total_commands FROM users ORDER BY balance DESC LIMIT 10'); },
    count() { return queryOne('SELECT COUNT(*) as total FROM users')?.total || 0; },
    countPremium() { return queryOne("SELECT COUNT(*) as total FROM users WHERE role = 'premium'")?.total || 0; },
    isPremium(jid) {
        const u = this.get(jid); if (!u) return false;
        if (u.role === 'owner') return true;
        if (u.role !== 'premium') return false;
        if (u.premium_expire && new Date(u.premium_expire) < new Date()) { this.removePremium(jid); return false; }
        return true;
    },
    transfer(fromJid, toJid, amount) {
        const from = this.get(fromJid); if (!from || from.balance < amount) return false;
        this.addBalance(fromJid, -amount); this.addBalance(toJid, amount);
        Transactions.create(fromJid, 'transfer_out', -amount, `Transfer ke ${toJid}`);
        Transactions.create(toJid, 'transfer_in', amount, `Transfer dari ${fromJid}`);
        return true;
    },
    setJail(jid, minutes) {
        if (minutes <= 0) {
            run('UPDATE users SET jail_until = NULL WHERE jid = ?', [jid]);
        } else {
            const until = new Date(Date.now() + minutes * 60000).toISOString();
            run('UPDATE users SET jail_until = ? WHERE jid = ?', [until, jid]);
        }
    },
    isJailed(jid) {
        const u = this.get(jid);
        if (!u || !u.jail_until) return false;
        return new Date(u.jail_until).getTime() > Date.now();
    },
    getJailTimeLeft(jid) {
        const u = this.get(jid);
        if (!u || !u.jail_until) return 0;
        const diff = new Date(u.jail_until).getTime() - Date.now();
        return diff > 0 ? Math.ceil(diff / 60000) : 0;
    }
};

// ═══════════════════════════════════════
//  TRANSACTIONS
// ═══════════════════════════════════════
const Transactions = {
    create(jid, type, amount, desc) { run('INSERT INTO transactions (jid, type, amount, description) VALUES (?, ?, ?, ?)', [jid, type, amount, desc]); },
    getByUser(jid) { return query('SELECT * FROM transactions WHERE jid = ? ORDER BY created_at DESC LIMIT 20', [jid]); },
    getAll() { return query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 100'); },
    count() { return queryOne('SELECT COUNT(*) as total FROM transactions')?.total || 0; },
};

// ═══════════════════════════════════════
//  CUSTOM COMMANDS
// ═══════════════════════════════════════
const CustomCommands = {
    get(trigger) { return queryOne('SELECT * FROM custom_commands WHERE trigger_word = ?', [trigger]); },
    create(trigger, response, createdBy) { run('INSERT OR REPLACE INTO custom_commands (trigger_word, response, created_by) VALUES (?, ?, ?)', [trigger, response, createdBy]); },
    delete(trigger) { run('DELETE FROM custom_commands WHERE trigger_word = ?', [trigger]); },
    getAll() { return query('SELECT * FROM custom_commands ORDER BY created_at DESC'); },
};

// ═══════════════════════════════════════
//  MESSAGE STORE
// ═══════════════════════════════════════
const MessageStore = {
    get(name) { return queryOne('SELECT * FROM message_store WHERE name = ?', [name]); },
    create(name, content, createdBy) { run('INSERT OR REPLACE INTO message_store (name, content, created_by) VALUES (?, ?, ?)', [name, content, createdBy]); },
    delete(name) { run('DELETE FROM message_store WHERE name = ?', [name]); },
    getAll() { return query('SELECT name, created_by, created_at FROM message_store ORDER BY created_at DESC'); },
};

// ═══════════════════════════════════════
//  COMMAND LOGS
// ═══════════════════════════════════════
const CommandLogs = {
    create(jid, command, chatJid, isGroup) { run('INSERT INTO command_logs (jid, command, chat_jid, is_group) VALUES (?, ?, ?, ?)', [jid, command, chatJid, isGroup ? 1 : 0]); },
    getRecent() { return query('SELECT * FROM command_logs ORDER BY created_at DESC LIMIT 50'); },
    countToday() { return queryOne("SELECT COUNT(*) as total FROM command_logs WHERE DATE(created_at) = DATE('now')")?.total || 0; },
    countAll() { return queryOne('SELECT COUNT(*) as total FROM command_logs')?.total || 0; },
    popular() { return query('SELECT command, COUNT(*) as count FROM command_logs GROUP BY command ORDER BY count DESC LIMIT 10'); },
};

// ═══════════════════════════════════════
//  WARNINGS
// ═══════════════════════════════════════
const Warnings = {
    add(jid, groupJid, reason, warnedBy) { run('INSERT INTO warnings (jid, group_jid, reason, warned_by) VALUES (?, ?, ?, ?)', [jid, groupJid, reason, warnedBy]); },
    get(jid, groupJid) { return query('SELECT * FROM warnings WHERE jid = ? AND group_jid = ?', [jid, groupJid]); },
    count(jid, groupJid) { return queryOne('SELECT COUNT(*) as total FROM warnings WHERE jid = ? AND group_jid = ?', [jid, groupJid])?.total || 0; },
    reset(jid, groupJid) { run('DELETE FROM warnings WHERE jid = ? AND group_jid = ?', [jid, groupJid]); },
};

// ═══════════════════════════════════════
//  AFK
// ═══════════════════════════════════════
const AFK = {
    set(jid, reason) { run('INSERT OR REPLACE INTO afk_status (jid, reason, timestamp) VALUES (?, ?, datetime("now"))', [jid, reason]); },
    get(jid) { return queryOne('SELECT * FROM afk_status WHERE jid = ?', [jid]); },
    remove(jid) { run('DELETE FROM afk_status WHERE jid = ?', [jid]); },
};

// ═══════════════════════════════════════
//  ADMINS (Dashboard)
// ═══════════════════════════════════════
const Admins = {
    get(username) { return queryOne('SELECT * FROM admins WHERE username = ?', [username]); },
    create(username, hashedPassword, role = 'admin') { run('INSERT INTO admins (username, password, role) VALUES (?, ?, ?)', [username, hashedPassword, role]); },
    getAll() { return query('SELECT id, username, role, created_at FROM admins'); },
};

// ═══════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════
const Settings = {
    get(key, defaultVal = null) { const r = queryOne('SELECT value FROM settings WHERE key = ?', [key]); return r ? r.value : defaultVal; },
    set(key, value) { run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]); },
};

// ═══════════════════════════════════════
//  GROUP LEVELING SYSTEM (Per-Group)
// ═══════════════════════════════════════
const LEVEL_TITLES = [
    { min: 1,   title: '🌱 Newbie' },
    { min: 5,   title: '🌿 Beginner' },
    { min: 10,  title: '🍃 Apprentice' },
    { min: 15,  title: '🌾 Trainee' },
    { min: 20,  title: '⚡ Fighter' },
    { min: 25,  title: '🔥 Warrior' },
    { min: 30,  title: '⚔️ Knight' },
    { min: 35,  title: '🛡️ Guardian' },
    { min: 40,  title: '🏹 Ranger' },
    { min: 45,  title: '🧙 Mage' },
    { min: 50,  title: '💎 Elite' },
    { min: 55,  title: '🌟 Master' },
    { min: 60,  title: '👑 Grand Master' },
    { min: 65,  title: '🔱 Champion' },
    { min: 70,  title: '🐉 Dragon Slayer' },
    { min: 75,  title: '⭐ Legendary' },
    { min: 80,  title: '🌌 Mythical' },
    { min: 85,  title: '🏆 Supreme' },
    { min: 90,  title: '💫 Divine' },
    { min: 95,  title: '🔮 Immortal' },
    { min: 100, title: '👑✨ Transcendent' },
];

const SPAM_COOLDOWN_MS = 10 * 1000; // 10 detik cooldown
const MAX_LEVEL = 100;

const GroupLevels = {
    getTitle(level) {
        let title = LEVEL_TITLES[0].title;
        for (const t of LEVEL_TITLES) {
            if (level >= t.min) title = t.title;
        }
        return title;
    },

    getExpNeeded(level) {
        // EXP needed to level up from current level
        return level * 5;
    },

    getOrCreate(jid, groupJid) {
        let row = queryOne('SELECT * FROM group_levels WHERE jid = ? AND group_jid = ?', [jid, groupJid]);
        if (!row) {
            run('INSERT OR IGNORE INTO group_levels (jid, group_jid, exp, level) VALUES (?, ?, 0, 1)', [jid, groupJid]);
            row = queryOne('SELECT * FROM group_levels WHERE jid = ? AND group_jid = ?', [jid, groupJid]);
        }
        return row;
    },

    addExp(jid, groupJid) {
        const data = this.getOrCreate(jid, groupJid);
        if (!data) return { gained: false, leveledUp: false };

        // Already max level
        if (data.level >= MAX_LEVEL) return { gained: false, leveledUp: false, maxLevel: true };

        // Anti-spam: check cooldown (10 detik)
        const now = Date.now();
        if (data.last_chat) {
            const lastChat = new Date(data.last_chat).getTime();
            if (now - lastChat < SPAM_COOLDOWN_MS) {
                return { gained: false, leveledUp: false, cooldown: true };
            }
        }

        // Add EXP (Multiplier for Admin Abuse)
        const abuseVal = Settings.get('adminabuse_' + groupJid);
        const multiplier = parseInt(abuseVal) || (abuseVal === 'true' ? 2 : 1);
        const amount = 1 * multiplier;

        const newExp = data.exp + amount;
        const expNeeded = this.getExpNeeded(data.level);
        const nowISO = new Date(now).toISOString();

        if (newExp >= expNeeded) {
            // Level up!
            const newLevel = data.level + 1;
            const leftoverExp = newExp - expNeeded;
            run('UPDATE group_levels SET exp = ?, level = ?, last_chat = ? WHERE jid = ? AND group_jid = ?',
                [leftoverExp, newLevel, nowISO, jid, groupJid]);
            
            // Check custom title first, otherwise use level-based title
            const customTitle = CustomTitles.get(jid, groupJid);
            const oldTitle = customTitle ? customTitle.title : this.getTitle(data.level);
            const newTitle = customTitle ? customTitle.title : this.getTitle(newLevel);
            const gotNewTitle = !customTitle && oldTitle !== newTitle;

            return {
                gained: true,
                leveledUp: true,
                newLevel,
                newExp: leftoverExp,
                gotNewTitle,
                newTitle: gotNewTitle ? newTitle : null,
                customTitle: customTitle ? customTitle.title : null,
            };
        } else {
            // Just add EXP
            run('UPDATE group_levels SET exp = ?, last_chat = ? WHERE jid = ? AND group_jid = ?',
                [newExp, nowISO, jid, groupJid]);
            return { gained: true, leveledUp: false, newExp, currentLevel: data.level };
        }
    },

    // Owner can set level directly
    setLevel(jid, groupJid, level) {
        const clamped = Math.max(1, Math.min(level, MAX_LEVEL));
        this.getOrCreate(jid, groupJid);
        run('UPDATE group_levels SET level = ?, exp = 0 WHERE jid = ? AND group_jid = ?',
            [clamped, jid, groupJid]);
        return clamped;
    },

    getLeaderboard(groupJid, limit = 10) {
        return query(
            `SELECT gl.jid, gl.exp, gl.level, u.name 
             FROM group_levels gl 
             LEFT JOIN users u ON gl.jid = u.jid 
             WHERE gl.group_jid = ? 
             ORDER BY gl.level DESC, gl.exp DESC 
             LIMIT ?`,
            [groupJid, limit]
        );
    },

    getProfile(jid, groupJid) {
        const data = this.getOrCreate(jid, groupJid);
        if (!data) return null;
        const customTitle = CustomTitles.get(jid, groupJid);
        return {
            ...data,
            title: customTitle ? customTitle.title : this.getTitle(data.level),
            expNeeded: this.getExpNeeded(data.level),
            isMaxLevel: data.level >= MAX_LEVEL,
            hasCustomTitle: !!customTitle,
        };
    },

    getRank(jid, groupJid) {
        const result = queryOne(
            `SELECT COUNT(*) + 1 as rank FROM group_levels 
             WHERE group_jid = ? AND (level > (SELECT level FROM group_levels WHERE jid = ? AND group_jid = ?) 
             OR (level = (SELECT level FROM group_levels WHERE jid = ? AND group_jid = ?) 
             AND exp > (SELECT exp FROM group_levels WHERE jid = ? AND group_jid = ?)))`,
            [groupJid, jid, groupJid, jid, groupJid, jid, groupJid]
        );
        return result?.rank || 1;
    }
};

// ═══════════════════════════════════════
//  CHECK-IN / DAILY STREAK
// ═══════════════════════════════════════
const CheckIn = {
    get(jid) { return queryOne('SELECT * FROM checkin WHERE jid = ?', [jid]); },

    // Returns { ok, streak, reward, isNewStreak, lost }
    doCheckIn(jid) {
        const todayWIB = new Date(Date.now() + 7 * 3600 * 1000).toISOString().split('T')[0];
        const row = this.get(jid);

        if (!row) {
            // First ever check-in
            run('INSERT INTO checkin (jid, streak, last_checkin, total_checkins) VALUES (?, 1, ?, 1)', [jid, todayWIB]);
            return { ok: true, streak: 1, reward: 500, isFirst: true, lost: false };
        }

        if (row.last_checkin === todayWIB) return { ok: false, already: true };

        const yesterday = new Date(Date.now() + 7 * 3600 * 1000 - 86400000).toISOString().split('T')[0];
        const isConsecutive = row.last_checkin === yesterday;
        const newStreak = isConsecutive ? row.streak + 1 : 1;
        const lost = !isConsecutive && row.streak > 1;

        // Reward: base 500 + streak bonus (max streak bonus di 30 hari)
        const streakBonus = Math.min(newStreak - 1, 29) * 50;
        const reward = 500 + streakBonus;

        run('UPDATE checkin SET streak = ?, last_checkin = ?, total_checkins = total_checkins + 1 WHERE jid = ?',
            [newStreak, todayWIB, jid]);
        Users.addBalance(jid, reward);
        Transactions.create(jid, 'checkin', reward, `Daily check-in streak ${newStreak}`);

        return { ok: true, streak: newStreak, reward, lost, isFirst: false };
    },

    getLeaderboard() {
        return query(`SELECT c.jid, c.streak, c.total_checkins, u.name
            FROM checkin c LEFT JOIN users u ON c.jid = u.jid
            ORDER BY c.streak DESC LIMIT 10`);
    }
};

// ═══════════════════════════════════════
//  ACHIEVEMENTS / BADGES
// ═══════════════════════════════════════
const BADGE_DEFS = [
    { key: 'first_checkin',   icon: '🌟', name: 'Pemula Setia',     desc: 'Check-in pertama kali' },
    { key: 'streak_7',        icon: '🔥', name: 'On Fire!',          desc: 'Streak check-in 7 hari' },
    { key: 'streak_30',       icon: '💎', name: 'Diamond Streak',    desc: 'Streak check-in 30 hari' },
    { key: 'casino_jackpot',  icon: '🎰', name: 'Penjudi Ulung',     desc: 'Menang jackpot casino' },
    { key: 'rich_100k',       icon: '💰', name: 'Sultan',            desc: 'Punya balance 100.000+' },
    { key: 'transfer_first',  icon: '💸', name: 'Dermawan',          desc: 'Transfer balance pertama' },
    { key: 'werewolf_win',    icon: '🐺', name: 'Werewolf Master',   desc: 'Menang game werewolf' },
    { key: 'game_100',        icon: '🏆', name: 'Gamer Sejati',      desc: '100x main game' },
];

const Achievements = {
    getBadgeDef(key) { return BADGE_DEFS.find(b => b.key === key) || null; },
    getAllDefs() { return BADGE_DEFS; },

    // Grant a badge — returns true if newly earned, false if already had it
    grant(jid, badgeKey) {
        try {
            db.run('INSERT OR IGNORE INTO achievements (jid, badge_key) VALUES (?, ?)', [jid, badgeKey]);
            saveDb();
            // Check if insert happened (changes > 0)
            const changes = db.exec('SELECT changes() as c')?.[0]?.values?.[0]?.[0];
            return changes > 0;
        } catch { return false; }
    },

    // Check multiple badge conditions at once after an action
    check(jid) {
        const earned = [];
        const user = Users.get(jid);
        const ci = CheckIn.get(jid);

        if (ci?.total_checkins === 1)    if (this.grant(jid, 'first_checkin'))  earned.push('first_checkin');
        if (ci?.streak >= 7)             if (this.grant(jid, 'streak_7'))       earned.push('streak_7');
        if (ci?.streak >= 30)            if (this.grant(jid, 'streak_30'))      earned.push('streak_30');
        if (user?.balance >= 100000)     if (this.grant(jid, 'rich_100k'))      earned.push('rich_100k');

        return earned.map(k => this.getBadgeDef(k)).filter(Boolean);
    },

    getUserBadges(jid) {
        const rows = query('SELECT badge_key, earned_at FROM achievements WHERE jid = ? ORDER BY earned_at DESC', [jid]);
        return rows.map(r => {
            const def = BADGE_DEFS.find(b => b.key === r.badge_key);
            return def ? { ...def, earned_at: r.earned_at } : null;
        }).filter(Boolean);
    },

    count(jid) { return queryOne('SELECT COUNT(*) as total FROM achievements WHERE jid = ?', [jid])?.total || 0; }
};

function test() {
    console.log('📊 Users:', Users.count());
    console.log('📊 Premium:', Users.countPremium());
    console.log('📊 Commands logged:', CommandLogs.countAll());
}

// ═══════════════════════════════════════
//  PRAYER SUBSCRIPTIONS
// ═══════════════════════════════════════
const PrayerSubs = {
    get(jid) { return queryOne('SELECT * FROM prayer_subs WHERE jid = ?', [jid]); },
    set(jid, city) { run('INSERT OR REPLACE INTO prayer_subs (jid, city, active) VALUES (?, ?, 1)', [jid, city]); },
    remove(jid) { run('DELETE FROM prayer_subs WHERE jid = ?', [jid]); },
    getAll() { return query('SELECT * FROM prayer_subs WHERE active = 1'); },
};

// ═══════════════════════════════════════
//  PERSONAL REMINDERS
// ═══════════════════════════════════════
const Reminders = {
    add(jid, chatJid, time, message, isDaily = 1) {
        run('INSERT INTO reminders (jid, chat_jid, remind_time, message, is_daily) VALUES (?, ?, ?, ?, ?)',
            [jid, chatJid, time, message, isDaily ? 1 : 0]);
        return queryOne('SELECT last_insert_rowid() as id')?.id;
    },
    getByUser(jid) { return query('SELECT * FROM reminders WHERE jid = ? AND active = 1 ORDER BY remind_time', [jid]); },
    getDue(hhMM) { return query('SELECT * FROM reminders WHERE remind_time = ? AND active = 1', [hhMM]); },
    deactivate(id) { run('UPDATE reminders SET active = 0 WHERE id = ?', [id]); },
    delete(id, jid) { run('DELETE FROM reminders WHERE id = ? AND jid = ?', [id, jid]); },
};

// ═══════════════════════════════════════
//  CO-OWNERS
// ═══════════════════════════════════════
const CoOwners = {
    add(jid, addedBy) { run('INSERT OR IGNORE INTO co_owners (jid, added_by) VALUES (?, ?)', [jid, addedBy]); },
    remove(jid) { run('DELETE FROM co_owners WHERE jid = ?', [jid]); },
    isCoOwner(jid) { return !!queryOne('SELECT 1 FROM co_owners WHERE jid = ?', [jid]); },
    getAll() { return query('SELECT co.jid, co.added_by, co.created_at, u.name FROM co_owners co LEFT JOIN users u ON co.jid = u.jid'); },
};

// ═══════════════════════════════════════
//  CUSTOM TITLES (Owner-assigned)
// ═══════════════════════════════════════
const TITLE_EMOJI_MAP = [
    { keywords: ['raja', 'king'],                    emoji: '👑' },
    { keywords: ['ratu', 'queen'],                   emoji: '👸' },
    { keywords: ['pangeran', 'prince'],              emoji: '🤴' },
    { keywords: ['putri', 'princess'],               emoji: '👸' },
    { keywords: ['jenderal', 'general', 'komandan'], emoji: '⚔️' },
    { keywords: ['master', 'guru', 'sensei'],        emoji: '🧙' },
    { keywords: ['legend', 'legendary', 'legenda'],  emoji: '⭐' },
    { keywords: ['pro', 'expert', 'ahli'],           emoji: '🔥' },
    { keywords: ['admin', 'moderator', 'mod'],       emoji: '🛡️' },
    { keywords: ['sultan', 'tajir', 'rich'],         emoji: '💎' },
    { keywords: ['god', 'dewa', 'tuhan'],            emoji: '✨' },
    { keywords: ['warrior', 'pejuang', 'fighter'],   emoji: '⚔️' },
    { keywords: ['vip'],                             emoji: '💠' },
    { keywords: ['bot', 'robot'],                    emoji: '🤖' },
    { keywords: ['naga', 'dragon'],                  emoji: '🐉' },
    { keywords: ['iblis', 'demon', 'devil'],         emoji: '😈' },
    { keywords: ['malaikat', 'angel'],               emoji: '😇' },
    { keywords: ['samurai', 'ninja'],                emoji: '🥷' },
    { keywords: ['kapten', 'captain'],               emoji: '🎖️' },
    { keywords: ['presiden', 'president'],           emoji: '🏛️' },
    { keywords: ['emperor', 'kaisar'],               emoji: '👑' },
    { keywords: ['hunter', 'pemburu'],               emoji: '🏹' },
    { keywords: ['wizard', 'penyihir', 'mage'],      emoji: '🔮' },
    { keywords: ['knight', 'ksatria'],               emoji: '🗡️' },
    { keywords: ['hero', 'pahlawan'],                emoji: '🦸' },
    { keywords: ['villain', 'penjahat'],             emoji: '🦹' },
    { keywords: ['sniper', 'tembak'],                emoji: '🎯' },
    { keywords: ['hacker', 'coder', 'programmer'],   emoji: '💻' },
    { keywords: ['music', 'musik', 'singer'],        emoji: '🎵' },
    { keywords: ['chef', 'koki', 'cook'],            emoji: '👨‍🍳' },
    { keywords: ['dokter', 'doctor', 'medic'],       emoji: '⚕️' },
    { keywords: ['noob', 'newbie', 'pemula'],        emoji: '🐣' },
];

const CustomTitles = {
    /**
     * Auto-detect emoji from title text based on keywords
     */
    detectEmoji(titleText) {
        const lower = titleText.toLowerCase();
        for (const entry of TITLE_EMOJI_MAP) {
            for (const kw of entry.keywords) {
                if (lower.includes(kw)) return entry.emoji;
            }
        }
        return '🏷️'; // default
    },

    /**
     * Set custom title for user in group with auto-emoji
     */
    set(jid, groupJid, titleText, setBy) {
        const emoji = this.detectEmoji(titleText);
        const fullTitle = `${emoji} ${titleText}`;
        run('INSERT OR REPLACE INTO custom_titles (jid, group_jid, title, set_by) VALUES (?, ?, ?, ?)',
            [jid, groupJid, fullTitle, setBy]);
        return fullTitle;
    },

    /**
     * Get custom title for user in group
     */
    get(jid, groupJid) {
        return queryOne('SELECT * FROM custom_titles WHERE jid = ? AND group_jid = ?', [jid, groupJid]);
    },

    /**
     * Remove custom title
     */
    remove(jid, groupJid) {
        run('DELETE FROM custom_titles WHERE jid = ? AND group_jid = ?', [jid, groupJid]);
    },

    /**
     * Get all custom titles in a group
     */
    getByGroup(groupJid) {
        return query(
            `SELECT ct.jid, ct.title, ct.set_by, ct.created_at, u.name 
             FROM custom_titles ct LEFT JOIN users u ON ct.jid = u.jid 
             WHERE ct.group_jid = ? ORDER BY ct.created_at DESC`,
            [groupJid]
        );
    },

    /**
     * Get all emoji mappings (for help display)
     */
    getEmojiMap() {
        return TITLE_EMOJI_MAP;
    }
};

// ═══════════════════════════════════════
//  RPG SYSTEM
// ═══════════════════════════════════════
const RPG = {
    getUser(jid) {
        let row = queryOne('SELECT * FROM rpg_users WHERE jid = ?', [jid]);
        if (!row) {
            run('INSERT OR IGNORE INTO rpg_users (jid) VALUES (?)', [jid]);
            row = queryOne('SELECT * FROM rpg_users WHERE jid = ?', [jid]);
        }
        return row;
    },
    updateEquip(jid, slot, itemDataJSON) {
        const slots = ['weapon', 'helmet', 'armor', 'glove', 'legging', 'shoe'];
        if (!slots.includes(slot)) return false;
        run(`UPDATE rpg_users SET ${slot} = ? WHERE jid = ?`, [itemDataJSON, jid]);
        return true;
    },
    setAura(jid, auraId) {
        run('UPDATE rpg_users SET equipped_aura = ? WHERE jid = ?', [auraId, jid]);
    },
    addUnlockedAura(jid, auraId) {
        const user = this.getUser(jid);
        let auras = [];
        try { auras = JSON.parse(user.unlocked_auras || '[]'); } catch(e) {}
        if (!auras.includes(auraId)) {
            auras.push(auraId);
            run('UPDATE rpg_users SET unlocked_auras = ? WHERE jid = ?', [JSON.stringify(auras), jid]);
        }
    },
    addBossKill(jid, bossId) {
        const user = this.getUser(jid);
        let kills = {};
        try { kills = JSON.parse(user.boss_kills || '{}'); } catch(e) {}
        kills[bossId] = (kills[bossId] || 0) + 1;
        run('UPDATE rpg_users SET boss_kills = ? WHERE jid = ?', [JSON.stringify(kills), jid]);
        return kills[bossId];
    },
    addStat(jid, statType, amount) {
        const validStats = ['power', 'defense', 'luck'];
        if (!validStats.includes(statType)) return false;
        run(`UPDATE rpg_users SET base_${statType} = base_${statType} + ? WHERE jid = ?`, [amount, jid]);
        return true;
    },
    resetStat(jid, statType) {
        const validStats = ['power', 'defense', 'luck'];
        if (!validStats.includes(statType)) return false;
        run(`UPDATE rpg_users SET base_${statType} = 0, asc_${statType} = asc_${statType} + 1 WHERE jid = ?`, [jid]);
        return true;
    },
    fullRebirth(jid, ascendedStat) {
        const validStats = ['power', 'defense', 'luck'];
        if (!validStats.includes(ascendedStat)) return false;
        
        // 1. Increment specific ascension level
        run(`UPDATE rpg_users SET asc_${ascendedStat} = asc_${ascendedStat} + 1 WHERE jid = ?`, [jid]);
        
        // 2. Reset all base stats
        run(`UPDATE rpg_users SET base_power = 10, base_defense = 10, base_luck = 0, hp = 1000 WHERE jid = ?`, [jid]);
        
        // 3. Clear equipped items
        run(`UPDATE rpg_users SET weapon = NULL, helmet = NULL, armor = NULL, glove = NULL, legging = NULL, shoe = NULL WHERE jid = ?`, [jid]);
        
        // 4. Delete all inventory items
        run(`DELETE FROM rpg_inventory WHERE jid = ?`, [jid]);
        
        return true;
    },
    resetRPG() {
        run('DELETE FROM rpg_users');
        run('DELETE FROM rpg_inventory');
    },
    addHp(jid, amount) {
        this.getUser(jid); 
        run(`UPDATE rpg_users SET hp = hp + ? WHERE jid = ?`, [amount, jid]);
    },
    setHp(jid, amount) {
        run(`UPDATE rpg_users SET hp = ? WHERE jid = ?`, [amount, jid]);
    },
    addCoin(jid, amount) {
        this.getUser(jid); // ensure exists
        run(`UPDATE rpg_users SET rpg_coin = rpg_coin + ? WHERE jid = ?`, [amount, jid]);
    },
    getCoin(jid) {
        return this.getUser(jid).rpg_coin || 0;
    },
    getTopRPGCoin() {
        return query('SELECT r.jid, r.rpg_coin, u.name FROM rpg_users r LEFT JOIN users u ON r.jid = u.jid ORDER BY r.rpg_coin DESC LIMIT 10');
    },
    updateCooldown(jid, type) {
        const types = ['attack', 'mine', 'pvp'];
        if (!types.includes(type)) return false;
        run(`UPDATE rpg_users SET last_${type} = datetime("now") WHERE jid = ?`, [jid]);
    },
    getInventory(jid) {
        return query('SELECT * FROM rpg_inventory WHERE jid = ? AND amount > 0', [jid]);
    },
    addInventory(jid, itemType, itemDataJSON, amount = 1) {
        run('INSERT INTO rpg_inventory (jid, item_type, item_data, amount) VALUES (?, ?, ?, ?)', [jid, itemType, itemDataJSON, amount]);
    },
    removeInventory(id, amount = 1) {
        const item = queryOne('SELECT * FROM rpg_inventory WHERE id = ?', [id]);
        if (!item) return false;
        if (item.amount <= amount) {
            run('DELETE FROM rpg_inventory WHERE id = ?', [id]);
        } else {
            run('UPDATE rpg_inventory SET amount = amount - ? WHERE id = ?', [amount, id]);
        }
        return true;
    },
    getInventoryItem(id) {
        return queryOne('SELECT * FROM rpg_inventory WHERE id = ?', [id]);
    }
};

const RedeemCodes = {
    create(code, coin, balance, limit, maxUses = 0) {
        // Set expiry to 7 days from now
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        run('INSERT INTO gift_codes (code, r_coin, r_balance, r_limit, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)', 
            [code.toUpperCase(), coin, balance, limit, maxUses, expiresAt]);
        return { code: code.toUpperCase(), coin, balance, limit, expiresAt };
    },
    get(code) {
        return queryOne('SELECT * FROM gift_codes WHERE code = ?', [code.toUpperCase()]);
    },
    delete(code) {
        run('DELETE FROM gift_codes WHERE code = ?', [code.toUpperCase()]);
    },
    list() {
        return query('SELECT * FROM gift_codes');
    },
    hasRedeemed(jid, code) {
        return queryOne('SELECT * FROM gift_history WHERE jid = ? AND code = ?', [jid, code.toUpperCase()]) != null;
    },
    redeem(jid, code) {
        const c = code.toUpperCase();
        run('INSERT INTO gift_history (jid, code) VALUES (?, ?)', [jid, c]);
        run('UPDATE gift_codes SET current_uses = current_uses + 1 WHERE code = ?', [c]);
    }
};

module.exports = { initDatabase, Users, Transactions, CustomCommands, MessageStore, CommandLogs, Warnings, AFK, Admins, Settings, GroupLevels, CheckIn, Achievements, PrayerSubs, Reminders, CoOwners, CustomTitles, RPG, RedeemCodes, test };
