const { saveMessage, getMessage } = require("./messageModel");
const { getSettings } = require("./settings");
const { ownerNumbers } = require("../config");
const { getAfk, removeAfk } = require("./afk");

/**
 * Handles all background automation (Anti-Delete, Auto-Status, etc.)
 */
const handleAutomation = async (sock, m) => {
    try {
        const settings = getSettings();
        const jid = m.key.remoteJid;

    const isGroup = jid.endsWith("@g.us");

    // 1. Presence Logic (Typing/Recording)
    if (m.message && !m.key.fromMe) {
        if ((isGroup && settings.groupPresence) || (!isGroup && settings.dmPresence)) {
            await sock.sendPresenceUpdate("composing", jid);
        }
    }

    // 2. Advanced Auto-Status System (Check this BEFORE m.message guard)
    if (jid === "status@broadcast") {
        console.log("🌟 Status update detected!");
        // A. Auto View
        if (settings.autoViewStatus) {
            await sock.readMessages([m.key]);
            console.log(`👁️ Status viewed from: ${m.pushName || "User"}`);
        }

        // B. Auto Like (React)
        if (settings.autoLikeStatus) {
            const emojis = settings.statusLikeEmojis.split(",");
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            await sock.sendMessage("status@broadcast", {
                react: { text: randomEmoji.trim(), key: m.key }
            }, { statusJidList: [m.key.participant] });
            console.log(`❤️ Status liked with ${randomEmoji} from: ${m.pushName}`);
        }

        // C. Auto Reply
        if (settings.autoReplyStatus) {
            await sock.sendMessage(m.key.participant, { 
                text: settings.statusReplyText 
            }, { quoted: m });
            console.log(`💬 Auto-replied to status from: ${m.pushName}`);
        }
        return; // Don't log status messages to DB
    }

    if (!m.message) return;

    // A. AFK Mention Detection
    const sender = m.key.participant || m.key.remoteJid;
    const mentionedJids = m.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    
    for (const mentioned of mentionedJids) {
        const afk = getAfk(jid, mentioned);
        if (afk) {
            await sock.sendMessage(jid, { 
                text: `🤫 *@${mentioned.split("@")[0]}* is currently AFK!\n📝 *Reason:* ${afk.reason}\n⏳ *Since:* ${new Date(afk.time).toLocaleTimeString()}`,
                mentions: [mentioned]
            }, { quoted: m });
        }
    }

    // B. AFK Removal Detection
    if (getAfk(jid, sender)) {
        removeAfk(jid, sender);
        await sock.sendMessage(jid, { 
            text: `👋 *@${sender.split("@")[0]}* is back! AFK status removed.`,
            mentions: [sender]
        }, { quoted: m });
    }

    // 3. Message Logger (Save for recovery)
    await saveMessage(m);

    // 4. Anti-Link Protection
    if (isGroup && settings.antiLink && !m.key.fromMe) {
        const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
        if (text.includes("chat.whatsapp.com") || text.includes("wa.me/settings")) {
            const groupMetadata = await sock.groupMetadata(jid).catch(() => null);
            const sender = m.key.participant || m.key.remoteJid;
            if (groupMetadata) {
                const groupAdmins = groupMetadata.participants.filter(p => p.admin || p.isSuperAdmin).map(p => p.id);
                if (!groupAdmins.includes(sender)) {
                    console.log(`🚫 Anti-Link: Deleting link from ${sender}`);
                    await sock.sendMessage(jid, { delete: m.key });
                    return await sock.sendMessage(jid, { text: `🚫 *Anti-Link:* @${sender.split("@")[0]}, links are not allowed.`, mentions: [sender] });
                }
            }
        }
    }

    // 5. Anti-Badword Protection
    if (isGroup && settings.antiBadword && !m.key.fromMe) {
        const { getBadwords } = require("../database/badwords");


        const badwords = await getBadwords();
        const text = (m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || "").toLowerCase();
        
        if (badwords.some(word => text.includes(word.toLowerCase()))) {
            console.log(`🚫 Anti-Badword: Deleting offensive message from ${m.key.participant}`);
            await sock.sendMessage(jid, { delete: m.key });
            return;
        }
    }

    // 6. Anti-Spam Protection
    if (isGroup && settings.antiSpam && !m.key.fromMe) {
        if (!global.spamTracker) global.spamTracker = {};
        const sender = m.key.participant || m.key.remoteJid;
        const now = Date.now();
        const key = `${jid}_${sender}`;

        if (!global.spamTracker[key]) global.spamTracker[key] = { count: 0, last: now };
        
        const userData = global.spamTracker[key];
        if (now - userData.last < 2000) { // 2 seconds window
            userData.count++;
            if (userData.count > 5) {
                console.log(`🚫 Anti-Spam: Deleting flood from ${sender}`);
                await sock.sendMessage(jid, { delete: m.key });
                userData.count = 0; // reset
                return;
            }
        } else {
            userData.count = 1;
        }
        userData.last = now;
    }

    // 7. Anti-Delete Logic
    if (m.message.protocolMessage?.type === 0) {
        if (settings.antiDelete) {
            const key = m.message.protocolMessage.key;
            const original = await getMessage(key.id);

            if (original) {
                const name = original.pushName || "User";
                const rawSender = original.participant && original.participant !== original.remoteJid ? original.participant : original.remoteJid;
                const number = rawSender.split("@")[0].split(":")[0];
                const chat = original.remoteJid.endsWith("@g.us") ? "Group" : "Private Chat";

                let logMsg = (settings.antiDeleteNotification || "🕵️ *Nexus Anti-Delete Update*") + `\n\n`;
                logMsg += `👤 *Sender:* ${name}\n`;
                logMsg += `📞 *Number:* ${number}\n`;
                logMsg += `📍 *In:* ${chat}\n\n`;

                const content = original.content;
                const textPreview = content.conversation || content.extendedTextMessage?.text || content.imageMessage?.caption || content.videoMessage?.caption || "";
                if (textPreview) logMsg += `📝 *Content Preview:* ${textPreview}\n\n`;
                logMsg += `👇 *Original Message Forwarded Below:*`;

                const primaryOwner = ownerNumbers[0];
                if (primaryOwner) {
                    await sock.sendMessage(primaryOwner, { text: logMsg });
                    const recoveredMsg = {
                        key: {
                            remoteJid: original.remoteJid,
                            fromMe: false,
                            id: original.msgId,
                            participant: original.participant
                        },
                        message: original.content,
                        pushName: original.pushName
                    };
                    await sock.sendMessage(primaryOwner, { forward: recoveredMsg }, { quoted: m });
                    console.log(`✅ Anti-Delete processed via Database Settings.`);
                }
            }
        }
    }
} catch (err) {
        console.error("⚠️ Automation Error:", err);
    }
};

module.exports = { handleAutomation };
