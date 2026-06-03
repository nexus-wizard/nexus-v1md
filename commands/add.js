module.exports = {
    name: "add",
    description: "Adds a user by phone number.",
    category: "admin",
    adminOnly: true,
    groupOnly: true,
    async execute({ sock, jid, args }) {
        const phone = args[0]?.replace(/[^0-9]/g, "");
        if (!phone) return await sock.sendMessage(jid, { text: "❓ *Usage:* `.add 2547xxxxxxxx`" });

        const userJid = phone + "@s.whatsapp.net";

        try {
            await sock.groupParticipantsUpdate(jid, [userJid], "add");
            await sock.sendMessage(jid, { text: `✅ *User Added:* @${phone} has been invited/added to the group.`, mentions: [userJid] });
        } catch (err) {
            console.error("Add error:", err);
            await sock.sendMessage(jid, { text: "❌ Failed to add user. Ensure the bot is an admin and the number is correct." });
        }
    }
};
