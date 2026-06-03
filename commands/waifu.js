const axios = require("axios");

module.exports = {
    name: "waifu",
    description: "Get a random anime waifu image.",
    category: "anime",
    execute: async ({ sock, jid, msg }) => {
        try {
            await sock.sendMessage(jid, { text: "💞 Finding a waifu for you..." });

            const { data } = await axios.get("https://api.waifu.pics/sfw/waifu");
            
            if (data.url) {
                await sock.sendMessage(jid, {
                    image: { url: data.url },
                    caption: `💞 *RANDOM WAIFU*\n\n_Your daily dose of anime charm!_\n_Nexus-1MD Anime Hub_`
                }, { quoted: msg });
            } else {
                throw new Error("Invalid API response");
            }

        } catch (error) {
            console.error("Waifu command error:", error);
            await sock.sendMessage(jid, { text: "❌ Could not fetch a waifu at the moment. Please try again later." });
        }
    }
};
