module.exports = {
    name: "owner",
    description: "Identifies the group creator.",
    category: "group",
    groupOnly: true,
    async execute({ sock, jid, msg }) {
        try {
            const metadata = await sock.groupMetadata(jid);
            const owner = metadata.owner || metadata.participants.find(p => p.admin === "superadmin")?.id;
            
            if (!owner) return await sock.sendMessage(jid, { text: "❓ Could not identify the group creator." });

            await sock.sendMessage(jid, { 
                text: `👑 *GROUP OWNER*\n\nThe creator of this group is: @${owner.split("@")[0]}`,
                mentions: [owner] 
            }, { quoted: msg });
        } catch (err) {
            console.error("Owner detect error:", err);
        }
    }
};
