const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
const pino = require('pino');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    Browsers,
    delay,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    DisconnectReason,
} = require("@whiskeysockets/baileys");

const router = express.Router();

// Memory store kwa ajili ya ku-stream session ID kwenda browser/website
const pairSessions = new Map();

function removeFile(filePath) {
    if (!fs.existsSync(filePath)) return false;
    fs.rmSync(filePath, { recursive: true, force: true });
}

// 1. Route ya kuomba Pairing Code
router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    async function JUNEX() {
        const sessionPath = './temp/' + id;
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        try {
            const { version } = await fetchLatestBaileysVersion();
            const logger = pino({ level: 'silent' });

            const client = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                printQRInTerminal: false,
                logger,
                browser: Browsers.ubuntu('Chrome'),
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 10000,
            });

            client.ev.on('creds.update', saveCreds);

            client.ev.on('connection.update', async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === 'open') {
                    try {
                        await delay(3000);

                        const credsData = fs.readFileSync(`${sessionPath}/creds.json`);
                        const b64data = Buffer.from(credsData).toString('base64');
                        const sessionId = 'ADEVOS-X:~' + b64data;

                        // Hifadhi session ID ili web/browser iipate
                        pairSessions.set(id, { status: 'success', session: sessionId });

                        // Tuma WhatsApp
                        const sessionMsg = await client.sendMessage(client.user.id, { text: sessionId });

                        const englishInstructions = 
                            `*✨ ADEVOS-X BOT SESSION ID GENERATED SUCCESSFULLY ✨*\n\n` +
                            `Dear user, your authentication process is complete!\n\n` +
                            `📌 *IMPORTANT INSTRUCTIONS:*\n` +
                            `1. *Copy Your Session ID:* Copy the session code above or return to the web dashboard to copy it directly.\n` +
                            `2. *Keep It Confidential:* Do **NEVER** share this Session ID with anyone. It gives full access to your WhatsApp account.\n` +
                            `3. *Bot Deployment:* Paste this Session ID into your deployment environment variable (\`SESSION_ID\`) when setting up your **Adevos-X Bot** instance.\n\n` +
                            `Powered by *Adevos-X Tech* 🚀`;

                        await client.sendMessage(client.user.id, { text: englishInstructions }, { quoted: sessionMsg });

                        await delay(2000);
                        await client.ws.close();
                        removeFile(sessionPath);
                    } catch (e) {
                        console.log('Error sending session messages:', e);
                    }
                } else if (connection === 'close') {
                    const code = lastDisconnect?.error?.output?.statusCode;
                    if (code !== DisconnectReason.loggedOut) {
                        await delay(3000);
                        JUNEX();
                    }
                }
            });

            if (!client.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await client.requestPairingCode(num);
                if (!res.headersSent) {
                    pairSessions.set(id, { status: 'pending', session: null });
                    // Tunarudisha na reqId ili browser iweze kutumia kuomba Session ID
                    await res.send({ code, reqId: id });
                }
            }

        } catch (err) {
            console.log('Pair service error:', err);
            removeFile(sessionPath);
            if (!res.headersSent) {
                await res.send({ code: 'Service Currently Unavailable' });
            }
        }
    }

    await JUNEX();
});

// 2. Route mpya ya ku-check kama Session ID imezalishwa kwa ajili ya Website
router.get('/get-session', (req, res) => {
    const reqId = req.query.id;
    if (!reqId || !pairSessions.has(reqId)) {
        return res.status(404).json({ status: 'not_found' });
    }
    return res.json(pairSessions.get(reqId));
});

module.exports = router;
