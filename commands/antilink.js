const { getSettings, updateSettings } = require("../lib/settings");

module.exports = {
    name: "antilink",
    description: "Toggles anti-link protection.",
    category: "admin",
    adminOnly: true,
    groupOnly: true,
    async execute({ sock, jid, args }) {
        const settings = getSettings();
        const action = args[0]?.toLowerCase();

        if (action === "on") settings.antiLink = true;
        else if (action === "off") settings.antiLink = false;
        else return await sock.sendMessage(jid, { text: "❓ *Usage:* `.antilink on` or `.antilink off`" });

        await updateSettings(settings);
        await sock.sendMessage(jid, { text: `✅ *Anti-Link* is now ${settings.antiLink ? "ON" : "OFF"}` });
    }
};
