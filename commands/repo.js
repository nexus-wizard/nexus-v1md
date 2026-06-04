module.exports = {
    name: "repo",
    aliases: ["github", "source", "script"],
    description: "Get the bot's source code repository link.",
    category: "general",
    execute: async ({ sock, jid, msg }) => {
        const text = `📂 *NEXUS-1MD SOURCE CODE*\n\n` +
                     `You can get the bot script and deployment guide from the official repository:\n\n` +
                     `🔗 *GitHub:* https://github.com/devwhitewizard/nexus-v1md\n\n` +
                     `👤 *Developer:* White Wizard\n` +
                     `🌐 *Portfolio:* https://jonathanmwanza.vercel.app/\n\n` +
                     `_Don't forget to give a ⭐ if you like the project!_`;

        await sock.sendMessage(jid, { 
            text,
            contextInfo: {
                externalAdReply: {
                    title: "GET NEXUS-1MD SCRIPT",
                    body: "Official GitHub Repository",
                    thumbnailUrl: "https://files.catbox.moe/p9pntu.jpg", // reuse existing banner
                    sourceUrl: "https://github.com/devwhitewizard/nexus-v1md",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: msg });
    }
};
