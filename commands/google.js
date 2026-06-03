const axios = require("axios");

module.exports = {
    name: "google",
    aliases: ["search", "g"],
    description: "Search anything on Google.",
    category: "general",
    async execute({ sock, jid, args, msg }) {
        const query = args.join(" ");
        if (!query) return await sock.sendMessage(jid, { text: "❓ *Usage:* `.google <query>`" });

        try {
            // Using a public API for reliable results
            const { data } = await axios.get(`https://api.giftedtech.my.id/api/search/google?apikey=gifted&query=${encodeURIComponent(query)}`);
            
            if (!data.results || data.results.length === 0) {
                return await sock.sendMessage(jid, { text: "❌ No results found for your query." });
            }

            let response = `🔍 *GOOGLE SEARCH: ${query}*\n\n`;
            data.results.slice(0, 5).forEach((res, i) => {
                response += `*#${i + 1}:* ${res.title}\n🔗 ${res.link}\n\n`;
            });

            await sock.sendMessage(jid, { text: response }, { quoted: msg });
        } catch (err) {
            console.error("Google error:", err);
            await sock.sendMessage(jid, { text: "❌ Error connecting to search service." });
        }
    }
};
