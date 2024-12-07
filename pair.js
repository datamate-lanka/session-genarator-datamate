const express = require('express');
const fs = require('fs');
const { exec } = require("child_process");
let router = express.Router();
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser
} = require("@whiskeysockets/baileys");

function removeFile(filePath) {
    if (fs.existsSync(filePath)) {
        fs.rmSync(filePath, { recursive: true, force: true });
    }
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function DataMatePair() {
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        try {
            let DataMateSessionGenerator = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            if (!DataMateSessionGenerator.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await DataMateSessionGenerator.requestPairingCode(num);
                if (!res.headersSent) {
                    res.send({ code });
                }
            }

            DataMateSessionGenerator.ev.on('creds.update', saveCreds);
            DataMateSessionGenerator.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection === "open") {
                    try {
                        await delay(10000);
                        const authPath = './session/creds.json';
                        const userJid = jidNormalizedUser(DataMateSessionGenerator.user.id);

                        if (fs.existsSync(authPath)) {
                            // Send the creds.json file first
                            const credsMessage = await DataMateSessionGenerator.sendMessage(userJid, {
                                document: { url: authPath },
                                mimetype: "application/json",
                                fileName: "creds.json",
                            });

                            // Send follow-up message
                            await DataMateSessionGenerator.sendMessage(userJid, {
                                text: "❌ Don't send this file to anyone. \n\n - Upload this file to `session_file_here` in your bot repository. \n\n > DataMate Inc",
                                contextInfo: { quotedMessage: credsMessage.message }, // Reply to creds.json
                            });
                        }
                    } catch (e) {
                        exec('pm2 restart datamate');
                    }

                    await delay(100);
                    removeFile('./session');
                    process.exit(0);
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                    await delay(10000);
                    DataMatePair();
                }
            });
        } catch (err) {
            exec('pm2 restart datamate-md');
            console.log("Service restarted");
            DataMatePair();
            removeFile('./session');
            if (!res.headersSent) {
                res.send({ code: "Service Unavailable" });
            }
        }
    }
    return await DataMatePair();
});

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
    exec('pm2 restart datamate');
});

module.exports = router;
