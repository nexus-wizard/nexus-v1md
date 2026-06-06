const { exec } = require("child_process");
const { isOwner } = require("../lib/middleware");

// 🔗 Always pull from the MAIN developer repo
const UPSTREAM_REPO = "https://github.com/devwhitewizard/nexus-v1md.git";
const UPSTREAM_BRANCH = "main";

module.exports = {
    name: "update",
    aliases: ["up", "upgrade"],
    description: "Update the bot to the latest version from the developer's GitHub.",
    category: "owner",
    execute: async ({ sock, jid, msg, args }) => {
        const sender = msg.key.participant || msg.key.remoteJid;
        if (!isOwner(sender)) return;

        await sock.sendMessage(jid, { text: "🔄 *Checking for updates from main repo...*" });

        // Function to run update logic
        const runUpdate = () => {
            exec(`git fetch ${UPSTREAM_REPO} ${UPSTREAM_BRANCH}`, async (err, stdout, stderr) => {
                if (err) {
                    return await sock.sendMessage(jid, { 
                        text: `❌ *Error checking for updates:*\n${err.message}` 
                    });
                }

                exec(`git log HEAD..FETCH_HEAD --oneline`, async (err2, stdout2) => {
                    if (err2 || !stdout2.trim()) {
                        return await sock.sendMessage(jid, { text: "✅ *Bot is already up-to-date!*" });
                    }

                    const commits = stdout2.trim().split("\n");
                    let updateMsg = `🆕 *${commits.length} New Update(s) Available!*\n\n`;
                    updateMsg += commits.map(c => `• ${c}`).join("\n");
                    updateMsg += `\n\n*Type .update now* to apply.`;

                    if (args[0] === "now") {
                        await sock.sendMessage(jid, { text: "🚀 *Applying update from main repo...*" });
                        
                        // Use -X theirs to force overwrite local changes if any
                        exec(`git pull ${UPSTREAM_REPO} ${UPSTREAM_BRANCH} --rebase -X theirs`, async (err3, out3) => {
                            if (err3) {
                                // If rebase fails, try a hard reset
                                exec(`git reset --hard FETCH_HEAD`, async (err4) => {
                                    if (err4) {
                                        return await sock.sendMessage(jid, { text: `❌ *Update Failed:* ${err3.message}` });
                                    }
                                    await sock.sendMessage(jid, { text: "✅ *Forced Update Complete!* Restarting..." });
                                    process.exit(1);
                                });
                            } else {
                                await sock.sendMessage(jid, { text: "✅ *Updated successfully!* Restarting..." });
                                process.exit(1);
                            }
                        });
                    } else {
                        await sock.sendMessage(jid, { text: updateMsg });
                    }
                });
            });
        };

        // Check if git is initialized
        exec("git rev-parse --is-inside-work-tree", (err) => {
            if (err) {
                // Not a git repo — try to initialize it!
                sock.sendMessage(jid, { text: "🛠️ *Initializing Git repository for updates...*" });
                exec(`git init && git remote add origin ${UPSTREAM_REPO} && git fetch origin`, (err2) => {
                    if (err2) {
                        return sock.sendMessage(jid, { text: "❌ *Could not initialize Git.* Please follow manual setup: delete everything EXCEPT `session/` and use the Panel's Git feature." });
                    }
                    runUpdate();
                });
            } else {
                runUpdate();
            }
        });
    }
};
