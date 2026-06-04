require("dotenv").config();
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
const { DisconnectReason, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const makeWASocket = require("@whiskeysockets/baileys").default;
const qrcode = require("qrcode-terminal");

const { authFolder } = require("./config");
const { handleMessages } = require("./lib/commandHandler");

let isFirstConnect = true;
let isReconnecting = false;

async function connectionLogic() {
    if (isReconnecting) return;
    isReconnecting = true;

    const fs = require("fs");
    const path = require("path");

    // 📦 SESSION ID AUTO-RESTORE
    if (process.env.SESSION_ID && !fs.existsSync(path.join(__dirname, authFolder, "creds.json"))) {
        console.log("📦 SESSION_ID found in .env. Attempting to restore session...");
        try {
            const sessionId = process.env.SESSION_ID.replace("Nexus~", "");
            const credsJson = Buffer.from(sessionId, "base64").toString("utf-8");
            
            if (!fs.existsSync(path.join(__dirname, authFolder))) {
                fs.mkdirSync(path.join(__dirname, authFolder), { recursive: true });
            }
            
            fs.writeFileSync(path.join(__dirname, authFolder, "creds.json"), credsJson);
            console.log("✅ Session restored successfully from SESSION_ID!");
        } catch (e) {
            console.error("❌ Failed to restore session from ID:", e.message);
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const usePairingCode = !!process.env.PAIRING_NUMBER && !state.creds.registered;
    
    const sock = makeWASocket({
        printQRInTerminal: !usePairingCode,
        auth: state,
        markOnline: true, 
        browser: ["Nexus-1MD", "Chrome", "1.0.0"],
    });

    if (usePairingCode && !state.creds.registered) {
        setTimeout(async () => {
            try {
                let pNumber = process.env.PAIRING_NUMBER.replace(/[^0-9]/g, "");
                const code = await sock.requestPairingCode(pNumber);
                console.clear();
                console.log("\n========================================");
                console.log("🔗 YOUR NEXUS-1MD PAIRING CODE:");
                console.log(`👉 ${code} 👈`);
                console.log("========================================\n");
                console.log("1. Open WhatsApp on your phone.");
                console.log("2. Go to Linked Devices > Link with Phone Number.");
                console.log(`3. Enter the code shown above.`);
            } catch (err) {
                console.error("❌ Failed to generate pairing code:", err);
            }
        }, 3000);
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.clear();
            console.log("📲 Scan this QR to login:\n");
            qrcode.generate(qr, { small: true });
        }

        if (connection === "open") {
            isReconnecting = false;
            console.log("✅ Bot connected and stable!");
            
            // Initialize Database
            const { initSettingsDB } = require("./database/settings");
            const { initWarningDB } = require("./database/warnings");
            const { initRulesDB } = require("./database/rules");
            const { initBadwordDB } = require("./database/badwords");
            const { loadSettings } = require("./lib/settings");
            await initSettingsDB();
            await initWarningDB();
            await initRulesDB();
            await initBadwordDB();
            await loadSettings(); 

            const myJid = sock.authState.creds.me.lid || sock.authState.creds.me.id || sock.user.id;
            global.myJid = myJid.includes(":") ? myJid.split(":")[0] + "@s.whatsapp.net" : (myJid.includes("@") ? myJid : myJid + "@s.whatsapp.net");
            
            console.log(`📊 Unified settings loaded. SELF-ID: ${global.myJid}`);

            if (isFirstConnect) {
                const { toJid } = require("./lib/utils");
                const { ownerNumbers } = require("./config");
                isFirstConnect = false;
                const primaryOwner = toJid(ownerNumbers[0]);
                await sock.sendMessage(primaryOwner, { text: "🤖 Bot is now online! (v1.0.0)" });
            }

            setInterval(async () => {
                const { MessageLog } = require("./lib/messageModel");
                const { Op } = require("sequelize");
                const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                try {
                    await MessageLog.destroy({ where: { timestamp: { [Op.lt]: sevenDaysAgo } } });
                } catch (e) {}
            }, 24 * 60 * 60 * 1000);
        }

        if (connection === "close") {
            isReconnecting = false;
            const statusCode = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {
                const delay = 10000;
                console.log(`🔌 Disconnected. Reconnecting in ${delay/1000}s...`);
                setTimeout(() => connectionLogic(), delay);
            }
        }
    });

    const { handleAutomation } = require("./lib/automation");
    sock.ev.on("messages.upsert", async (upsert) => {
        const m = upsert.messages[0];
        if (!m.message) return;

        const sender = m.key.fromMe ? (global.myJid || m.key.remoteJid) : (m.key.participant || m.key.remoteJid);
        const { isOwner } = require("./lib/middleware");
        const isOwnerStatus = isOwner(sender);
        
        if (m.key.fromMe && !isOwnerStatus) return;

        await handleAutomation(sock, m);
        await handleMessages(sock, upsert); 
    });

    sock.ev.on("group-participants.update", async (update) => {
        const { id, participants, action } = update;
        const { getSettings } = require("./lib/settings");
        const settings = getSettings();
        if (action === "add" && settings.welcome) {
            for (let user of participants) {
                try {
                    const metadata = await sock.groupMetadata(id);
                    let msg = settings.welcomeMsg.replace("@user", `@${user.split("@")[0]}`).replace("@group", metadata.subject);
                    await sock.sendMessage(id, { text: msg, mentions: [user] });
                } catch (e) {}
            }
        }
    });
}

connectionLogic();

// 🌐 Health Check Server
app.get("/", (req, res) => res.send("🤖 Nexus-1MD is Online and Healthy!"));
app.listen(PORT, () => console.log(`🌍 Heartbeat server listening on port ${PORT}`));