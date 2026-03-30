const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    downloadContentFromMessage, 
    DisconnectReason,
    fetchLatestBaileysVersion,
    delay
} = require("@whiskeysockets/baileys");
const pino = require('pino');
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startZ() {
    const { state, saveCreds } = await useMultiFileAuthState('session_relax');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    if (!sock.authState.creds.registered) {
        console.clear();
        console.log("\x1b[32m[ Z-RELAX PAIRING SYSTEM ]\x1b[0m");
        const phoneNumber = await question('\x1b[36mMasukin nomor WA lo (Contoh: 628xxx): \x1b[0m');
        await delay(3000);
        const code = await sock.requestPairingCode(phoneNumber.trim());
        console.log("\x1b[33m\nKODE PAIRING LO: \x1b[1m" + code + "\x1b[0m\n");
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (chat) => {
        const m = chat.messages[0];
        if (!m.message) return; 
        const from = m.key.remoteJid;
        const type = Object.keys(m.message)[0];
        const body = (type === 'conversation') ? m.message.conversation : (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : (type === 'imageMessage') ? m.message.imageMessage.caption : (type === 'videoMessage') ? m.message.videoMessage.caption : '';
        const command = body.toLowerCase();

        if (command === '.hai') {
            await sock.sendMessage(from, { text: 'Hai juga, enjoy yaa make Z-RELAX bot. Relax cuy ini ga bahaya kok!' }, { quoted: m });
        }

        if (command === '.rvo') {
            const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
            const viewOnce = quoted?.viewOnceMessageV2?.message || quoted?.viewOnceMessage?.message;
            if (viewOnce) {
                const typeVo = Object.keys(viewOnce)[0];
                const stream = await downloadContentFromMessage(viewOnce[typeVo], typeVo.replace('Message', ''));
                let buffer = Buffer.from([]);
                for await(const chunk of stream) { buffer = Buffer.concat([buffer, chunk]) }
                if (typeVo === 'imageMessage') {
                    await sock.sendMessage(from, { image: buffer, caption: 'Nih rvo fotonya, Relax cuy ini ga bahaya kok!' }, { quoted: m });
                } else {
                    await sock.sendMessage(from, { video: buffer, caption: 'Nih rvo videonya, Relax cuy ini ga bahaya kok!' }, { quoted: m });
                }
            }
        }
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.clear();
            console.log("\x1b[32m\n███████╗███████╗██╗  ██╗██████╗  ██████╗  ██╗\n╚══███╔╝██╔════╝╚██╗██╔╝██╔══██╗██╔═████╗███║\n  ███╔╝ █████╗   ╚███╔╝ ██████╔╝██║██╔██║╚██║\n ███╔╝  ██╔══╝   ██╔██╗ ██╔══██╗████╔╝██║ ██║\n███████╗███████╗██╔╝ ██╗██║  ██║╚██████╔╝ ██║\n╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝  ╚═╝\x1b[0m");
            console.log("--------------------------------------------------");
            console.log("\x1b[36mInstagram : @hznxwick\x1b[0m");
            console.log("\x1b[35mTiktok    : @morphdzt\x1b[0m");
            console.log("--------------------------------------------------");
            console.log("\x1b[32m[ STATUS ] Z-RELAX Online! Gaskeun ZEXR01! 🔥\x1b[0m\n");
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startZ();
        }
    });
}
startZ();

