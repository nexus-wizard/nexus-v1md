const { DataTypes } = require("sequelize");
const { sequelize, isOnline } = require("./db");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const jsonStore = require("./jsonStore");
const { getSettings } = require("./settings");

const TEMP_MEDIA_DIR = path.join(__dirname, "../temp_media");
if (!fs.existsSync(TEMP_MEDIA_DIR)) fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });

let MessageLog = null;

if (sequelize) {
    MessageLog = sequelize.define("MessageLog", {
        msgId: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        remoteJid: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        participant: {
            type: DataTypes.STRING, // For groups
        },
        pushName: {
            type: DataTypes.STRING,
        },
        messageType: {
            type: DataTypes.STRING,
        },
        content: {
            type: DataTypes.TEXT, // JSON stringified message content
        },
        mediaPath: {
            type: DataTypes.STRING,
        },
        timestamp: {
            type: DataTypes.BIGINT,
        }
    }, {
        timestamps: true,
    });
}

const saveMessage = async (m, sock) => {
    try {
        if (!m.message || m.message.protocolMessage) return;
        
        let mediaPath = null;
        const msgId = m.key.id;
        const message = m.message.viewOnceMessageV2?.message || m.message.viewOnceMessage?.message || m.message;
        
        const mediaType = message.imageMessage ? "image" : 
                         message.videoMessage ? "video" : 
                         message.audioMessage ? "audio" : 
                         message.stickerMessage ? "sticker" : null;

        const settings = getSettings();
        const isViewOnce = m.message.viewOnceMessageV2 || m.message.viewOnceMessage;
        
        // Only download media if Anti-Delete, Status Anti-Delete, or View-Once is active
        const shouldDownload = isViewOnce || settings.antiDelete || settings.statusAntiDelete;

        if (mediaType && sock && shouldDownload) {
            try {
                const mediaMsg = message[`${mediaType}Message`];
                const size = mediaMsg?.fileLength ? parseInt(mediaMsg.fileLength, 10) : 0;
                const maxDownloadSize = 15 * 1024 * 1024; // Capped at 15MB to prevent CPU/memory spikes on panels

                if (size < maxDownloadSize) {
                    const ext = mediaType === "image" ? "jpg" : mediaType === "video" ? "mp4" : mediaType === "audio" ? "mp3" : "webp";
                    const stream = await downloadContentFromMessage(mediaMsg, mediaType);
                    const chunks = [];
                    for await (const chunk of stream) {
                        chunks.push(chunk);
                    }
                    const buffer = Buffer.concat(chunks);
                    
                    const filePath = path.join(TEMP_MEDIA_DIR, `${msgId}.${ext}`);
                    await fs.promises.writeFile(filePath, buffer);
                    mediaPath = filePath;
                }
            } catch (err) { } // Silently handle media download errors to reduce log noise
        }

        // 🛡️ CRITICAL: Only attempt DB operation if database is actually ONLINE
        if (MessageLog && isOnline()) {
            await MessageLog.upsert({
                msgId: m.key.id,
                remoteJid: m.key.remoteJid,
                participant: m.key.participant || m.key.remoteJid,
                pushName: m.pushName,
                messageType: Object.keys(m.message)[0],
                content: JSON.stringify(m.message),
                mediaPath: mediaPath,
                timestamp: m.messageTimestamp,
            }).catch(() => {
                // Silently discard log if DB connection was lost mid-operation
            });
        } else {
            // 💾 JSON Fallback: Store message log to JSON cache
            const logs = jsonStore.get("message_logs") || {};
            logs[m.key.id] = {
                msgId: m.key.id,
                remoteJid: m.key.remoteJid,
                participant: m.key.participant || m.key.remoteJid,
                pushName: m.pushName,
                messageType: Object.keys(m.message)[0],
                content: m.message,
                mediaPath: mediaPath,
                timestamp: m.messageTimestamp,
            };
            
            // Maintain a rolling buffer of 200 messages to prevent file bloat
            const keys = Object.keys(logs);
            if (keys.length > 200) {
                delete logs[keys[0]];
            }
            jsonStore.set("message_logs", logs);
        }
        
        // 💾 ALWAYS maintain a rolling buffer for AI Summarization (even if DB is offline)
        // Store only the text content to keep storage light
        const textContent = (message.conversation || message.extendedTextMessage?.text || message.imageMessage?.caption || "").trim();
        if (textContent) {
            const history = jsonStore.get(`history_${m.key.remoteJid}`) || [];
            history.push({
                name: m.pushName || "User",
                text: textContent,
                time: m.messageTimestamp
            });
            
            // Keep only the last 50 messages
            if (history.length > 50) history.shift();
            jsonStore.set(`history_${m.key.remoteJid}`, history);
        }
        
        return null;

    } catch (e) {
        // Silently skip log errors
    }
};

const getMessage = async (msgId) => {
    try {
        if (MessageLog && isOnline()) {
            const log = await MessageLog.findByPk(msgId);
            return log ? { ...log.dataValues, content: JSON.parse(log.content) } : null;
        }
        // JSON Fallback retrieve
        const logs = jsonStore.get("message_logs") || {};
        return logs[msgId] || null;
    } catch (e) {
        return null;
    }
};

const getGroupHistory = async (jid, limit = 50) => {
    try {
        // Preference 1: SQL Database
        if (MessageLog && isOnline()) {
            const logs = await MessageLog.findAll({
                where: { remoteJid: jid },
                order: [['timestamp', 'DESC']],
                limit: limit
            });
            return logs.map(l => ({
                name: l.pushName || "User",
                text: (JSON.parse(l.content).conversation || JSON.parse(l.content).extendedTextMessage?.text || ""),
                time: l.timestamp
            })).reverse();
        }
        
        // Preference 2: JSON Store Fallback
        const history = jsonStore.get(`history_${jid}`) || [];
        return history.slice(-limit);
    } catch (e) {
        return [];
    }
};

module.exports = { MessageLog, saveMessage, getMessage, getGroupHistory };
