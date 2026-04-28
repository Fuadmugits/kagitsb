const config = require('./config');
const fs = require('fs');
const path = require('path');

// --- AUTO FIX SESSION CORRUPTION ---
const sessionPath = config.paths.sessions;
const storagePath = path.dirname(sessionPath);
const clearedFlag = path.join(storagePath, '.session_cleared_v3'); // v3 untuk reset ke QR

if (!fs.existsSync(clearedFlag)) {
    console.log('\n🧹 [SETUP] Menghapus session lama untuk beralih kembali ke QR Code...');
    try {
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }
        if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });
        fs.writeFileSync(clearedFlag, 'true');
        console.log('✅ Session dihapus! Silakan scan QR ulang di Dashboard.\n');
    } catch (e) {
        console.log('ℹ️ Gagal menghapus session:', e.message);
    }
}
// ---------------------------------------------

const { startConnection, onMessage, onGroupParticipants } = require('./lib/connection');
const { loadCommands, handleMessage } = require('./lib/handler');
const { createWebServer } = require('./web/server');
const { initDatabase, test: dbTest } = require('./database');

console.log(`
╔═══════════════════════════════════╗
║     🤖 KagaITSB WhatsApp Bot     ║
║     💎 Premium Bot Dashboard      ║
╚═══════════════════════════════════╝
`);

async function main() {
    try {
        // 1. Init database (async for sql.js)
        await initDatabase();
        dbTest();
        
        // 2. Load commands
        loadCommands();
        
        // 3. Start web server
        const { server, io } = createWebServer(null);
        
        server.listen(config.web.port, () => {
            console.log(`🌐 Dashboard: http://localhost:${config.web.port}`);
            console.log(`🌐 Customer:  http://localhost:${config.web.port}/customer`);
            console.log(`🌐 Login:     http://localhost:${config.web.port}/login`);
        });
        
        // 4. Register message handler (survives reconnects)
        onMessage(async (sock, msg) => {
            await handleMessage(sock, msg, io);
        });
        
        // 5. Register group participants handler (survives reconnects)
        onGroupParticipants(async (sock, { id, participants, action }) => {
            const { Settings } = require('./database');
            const isWelcomeEnabled = Settings.get(`welcome_${id}`) === 'true';
            
            if (!isWelcomeEnabled) return;

            for (const jid of participants) {
                if (action === 'add') {
                    const customMsg = Settings.get(`welcomemsg_${id}`, '👋 Selamat datang @user di grup!\n\nKetik *.menu* untuk melihat fitur bot.');
                    await sock.sendMessage(id, {
                        text: customMsg.replace('@user', `@${jid.split('@')[0]}`),
                        mentions: [jid]
                    });
                } else if (action === 'remove') {
                    const customMsg = Settings.get(`goodbyemsg_${id}`, '👋 Selamat tinggal @user!');
                    await sock.sendMessage(id, {
                        text: customMsg.replace('@user', `@${jid.split('@')[0]}`),
                        mentions: [jid]
                    });
                }
            }
        });
        
        // 6. Start WhatsApp connection
        console.log('\n📱 Menghubungkan ke WhatsApp...');
        await startConnection(io);
        
        console.log('✅ Bot siap digunakan!\n');
        
    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

main();
