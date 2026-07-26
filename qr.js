const { makeid } = require('./id');
const QRCode = require('qrcode');
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

let router = express.Router();
const qrSessions = new Map();

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();

    async function JUNEX() {
        const sessionPath = './temp/' + id;
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        try {
            const { version } = await fetchLatestBaileysVersion();
            const logger = pino({ level: 'silent' });

            let client = makeWASocket({
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
                const { connection, lastDisconnect, qr } = s;

                if (qr && !res.headersSent) {
                    qrSessions.set(id, { status: 'pending', session: null });
                    res.setHeader('X-Req-ID', id);
                    await res.end(await QRCode.toBuffer(qr));
                }

                if (connection === 'open') {
                    try {
                        await delay(3000);

                        let credsData = fs.readFileSync(`${sessionPath}/creds.json`);
                        let b64data = Buffer.from(credsData).toString('base64');
                        let sessionId = 'ADEVOS-X:~' + b64data;

                        // Hifadhi Session ID kwa ajili ya Website
                        qrSessions.set(id, { status: 'success', session: sessionId });

                        // Tuma WhatsApp
                        let sessionMsg = await client.sendMessage(client.user.id, { text: sessionId });

                        const englishInstructions = 
                            `*✨ ADEVOS-X BOT SESSION ID GENERATED SUCCESSFULLY ✨*\n\n` +
                            `Dear user, your QR Code authentication was successful!\n\n` +
                            `📌 *IMPORTANT INSTRUCTIONS:*\n` +
                            `1. *Copy Your Session ID:* Copy the session code above or return to the web interface to copy it instantly.\n` +
                            `2. *Keep It Confidential:* Do **NOT** share this Session ID with anyone under any circumstances to prevent unauthorized access.\n` +
                            `3. *Bot Deployment:* Use this Session ID inside your deployment environment variables (\`SESSION_ID\`) for your **Adevos-X Bot**.\n\n` +
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

        } catch (err) {
            console.log('QR service error:', err);
            if (!res.headersSent) {
                await res.json({ code: 'Service is Currently Unavailable' });
            }
            removeFile(sessionPath);
        }
    }

    return await JUNEX();
});

// Route ya kuomba Session ID kwenye Web
router.get('/get-session', (req, res) => {
    const reqId = req.query.id;
    if (!reqId || !qrSessions.has(reqId)) {
        return res.status(404).json({ status: 'not_found' });
    }
    return res.json(qrSessions.get(reqId));
});

module.exports = router;
