const { exec } = require("child_process");
const { isOwner } = require("../lib/middleware");

module.exports = {
    name: "update",
    aliases: ["up", "upgrade"],
    description: "Update the bot to the latest version from GitHub.",
    category: "owner",
    execute: async ({ sock, jid, msg, args }) => {
        // Strict owner-only check
        const sender = msg.key.participant || msg.key.remoteJid;
        if (!isOwner(sender)) return;

        await sock.sendMessage(jid, { text: "🔄 *Checking for updates...*" });

        exec("git fetch origin main", async (err, stdout, stderr) => {
            if (err) {
                if (err.message.includes("not a git repository")) {
                    return await sock.sendMessage(jid, { 
                        text: "❌ *Manual ZIP detected.*\n\nBecause you uploaded a ZIP file instead of using `git clone`, the auto-update feature is disabled.\n\n💡 *Recommendation:* Host your bot by linking your GitHub repo to your panel (Render/Heroku/Railway) for automatic updates!" 
                    });
                }
                return await sock.sendMessage(jid, { text: `❌ *Error fetching updates:* ${err.message}` });
            }

            exec("git log main..origin/main --oneline", async (err, stdout, stderr) => {
                if (err) {
                    return await sock.sendMessage(jid, { text: "✅ *Bot is already up-to-date!*" });
                }

                if (!stdout.trim()) {
                    return await sock.sendMessage(jid, { text: "✅ *Bot is already up-to-date!*" });
                }

                const commits = stdout.trim().split("\n");
                let updateMsg = `🆕 *Updates Available! (${commits.length} new commits)*\n\n`;
                updateMsg += commits.map(c => `• ${c}`).join("\n");
                updateMsg += `\n\n*Type .update now* to apply these changes.`;

                if (args[0] === "now") {
                    await sock.sendMessage(jid, { text: "🚀 *Applying updates and restarting...*" });
                    exec("git pull origin main", async (err, stdout, stderr) => {
                        if (err) {
                            return await sock.sendMessage(jid, { text: `❌ *Update Failed:* ${err.message}` });
                        }
                        await sock.sendMessage(jid, { text: "✅ *Updated successfully!* Restarting bot..." });
                        process.exit(1); // Auto-restart handled by Panel/PM2
                    });
                } else {
                    await sock.sendMessage(jid, { text: updateMsg });
                }
            });
        });
    }
};
