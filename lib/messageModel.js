const { DataTypes } = require("sequelize");
const sequelize = require("./db");

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
    timestamp: {
        type: DataTypes.BIGINT,
    }
}, {
    timestamps: true,
});

const saveMessage = async (m) => {
    try {
        if (!m.message || m.message.protocolMessage) return;
        
        await MessageLog.upsert({
            msgId: m.key.id,
            remoteJid: m.key.remoteJid,
            participant: m.key.participant || m.key.remoteJid,
            pushName: m.pushName,
            messageType: Object.keys(m.message)[0],
            content: JSON.stringify(m.message),
            timestamp: m.messageTimestamp,
        });
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
