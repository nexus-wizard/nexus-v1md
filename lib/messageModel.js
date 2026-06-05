const { DataTypes } = require("sequelize");
const { sequelize } = require("./db");

const MessageLog = sequelize.define("MessageLog", {
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

        if (mediaType && sock) {
            try {
                const ext = mediaType === "image" ? "jpg" : mediaType === "video" ? "mp4" : mediaType === "audio" ? "mp3" : "webp";
                const stream = await downloadContentFromMessage(message[`${mediaType}Message`], mediaType);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                
                const filePath = path.join(TEMP_MEDIA_DIR, `${msgId}.${ext}`);
                fs.writeFileSync(filePath, buffer);
                mediaPath = filePath;
            } catch (err) { console.error("❌ Media Download Error:", err.message); }
        }

        const result = await MessageLog.upsert({
            msgId: m.key.id,
            remoteJid: m.key.remoteJid,
            participant: m.key.participant || m.key.remoteJid,
            pushName: m.pushName,
            messageType: Object.keys(m.message)[0],
            content: JSON.stringify(m.message),
            mediaPath: mediaPath,
            timestamp: m.messageTimestamp,
        });
        return result;

        console.log(`💾 Saved message: ${m.key.id}`);

    } catch (e) {
        console.error("❌ Error saving message to log:", e);
    }
};

const getMessage = async (msgId) => {
    try {
        const log = await MessageLog.findByPk(msgId);
        return log ? { ...log.dataValues, content: JSON.parse(log.content) } : null;
    } catch (e) {
        return null;
    }
};

// Sync the table immediately
MessageLog.sync({ alter: true }).then(() => {
    console.log("📊 MessageLog table synchronized.");
}).catch(err => {
    console.error("❌ MessageLog sync failed:", err);
});

module.exports = { MessageLog, saveMessage, getMessage };
