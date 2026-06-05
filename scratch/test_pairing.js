const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function testPairing() {
    const { state, saveCreds } = await useMultiFileAuthState('./storage/sessions/test_pairing');
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: Browsers.ubuntu('Chrome'), 
        // browser: ['Chrome (Linux)', 'Chrome', '']
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode("6281234567890");
                console.log("Success! Code:", code);
            } catch (err) {
                console.error("Error requesting code:", err.message);
            }
            process.exit(0);
        }, 3000);
    }
}
testPairing();
