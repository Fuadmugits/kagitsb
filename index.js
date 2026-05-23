const config = require('./config');
const fs = require('fs');
const path = require('path');

// --- PASTIKAN FOLDER STORAGE ADA ---
const sessionPath = config.paths.sessions;
const storagePath = path.dirname(sessionPath);
try {
    if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });
} catch (e) {
    console.log('ℹ️ Gagal membuat folder storage:', e.message);
}
// ---------------------------------------------

const { startConnection, onMessage, onGroupParticipants } = require('./lib/connection');
const { loadCommands, handleMessage } = require('./lib/handler');
const { createWebServer } = require('./web/server');
const { initDatabase, test: dbTest } = require('./database');
const { startScheduler } = require('./lib/scheduler');

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
            console.log(`👥 [Welcome System] Received update for group ${id}: ${action} for ${participants.join(', ')}`);
            const { Settings } = require('./database');
            const isWelcomeEnabled = Settings.get(`welcome_${id}`) === 'true';
            console.log(`👥 [Welcome System] Group ${id} welcome status: ${isWelcomeEnabled ? 'ENABLED' : 'DISABLED'}`);
            
            if (!isWelcomeEnabled) return;

            for (const jid of participants) {
                if (action === 'add') {
                    const customMsg = Settings.get(`welcomemsg_${id}`, '👋 Selamat datang @user di grup!\n\nKetik *.menu* untuk melihat fitur bot.');
                    console.log(`👥 [Welcome System] Sending welcome message to ${jid} in ${id}`);
                    await sock.sendMessage(id, {
                        text: customMsg.replace(/@user/g, `@${jid.split('@')[0]}`),
                        mentions: [jid]
                    });
                } else if (action === 'remove') {
                    const customMsg = Settings.get(`goodbyemsg_${id}`, '👋 Selamat tinggal @user!');
                    console.log(`👥 [Welcome System] Sending goodbye message to ${jid} in ${id}`);
                    await sock.sendMessage(id, {
                        text: customMsg.replace(/@user/g, `@${jid.split('@')[0]}`),
                        mentions: [jid]
                    });
                }
            }
        });
        
        // 6. Start WhatsApp connection
        console.log('\n📱 Menghubungkan ke WhatsApp...');
        await startConnection(io);

        // 7. Start scheduler (prayer reminders & personal reminders)
        startScheduler();
        
        console.log('✅ Bot siap digunakan!\n');
        
    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

main();
