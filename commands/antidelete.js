const { getSettings, updateSettings } = require("../lib/settings");

module.exports = {
    name: "antidelete",
    aliases: ["antidel"],
    description: "Toggle Anti-Delete feature.",
    category: "admin",
    async execute({ sock, jid, args, msg }) {
        const settings = getSettings();
        
        if (args[0] === "on") {
            settings.antiDelete = true;
        } else if (args[0] === "off") {
            settings.antiDelete = false;
        } else {
            settings.antiDelete = !settings.antiDelete;
        }

        await updateSettings(settings);
        return await sock.sendMessage(jid, { 
            text: `🛡️ *Anti-Delete* is now ${settings.antiDelete ? "✅ ON" : "❌ OFF"}\n\n_Recovered messages will be sent to the owner's DM._` 
        }, { quoted: msg });
    }
};
