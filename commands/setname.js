module.exports = {
    name: "setname",
    description: "Updates the group name.",
    category: "admin",
    adminOnly: true,
    groupOnly: true,
    async execute({ sock, jid, args }) {
        const name = args.join(" ");
        if (!name) return await sock.sendMessage(jid, { text: "❓ *Usage:* `.setname <new group name>`" });

        try {
            await sock.groupUpdateSubject(jid, name);
            await sock.sendMessage(jid, { text: `✅ *Group Name Updated:* The group is now called *${name}*` });
        } catch (err) {
            console.error("Setname error:", err);
            await sock.sendMessage(jid, { text: "❌ Failed to update group name." });
        }
    }
};
