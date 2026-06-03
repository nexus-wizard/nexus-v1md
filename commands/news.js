const axios = require("axios");

module.exports = {
    name: "news",
    description: "Get latest global headlines.",
    category: "general",
    async execute({ sock, jid, msg }) {
        try {
            const { data } = await axios.get("https://api.giftedtech.my.id/api/search/google_news?apikey=gifted&query=latest");
            
            if (!data.results || data.results.length === 0) {
                return await sock.sendMessage(jid, { text: "❌ No news found at the moment." });
            }

            let response = `📰 *LATEST GLOBAL HEADLINES*\n\n`;
            data.results.slice(0, 5).forEach((news, i) => {
                response += `*#${i + 1}:* ${news.title}\n🔗 ${news.url}\n\n`;
            });

            await sock.sendMessage(jid, { text: response }, { quoted: msg });
        } catch (err) {
            console.error("News error:", err);
            await sock.sendMessage(jid, { text: "❌ Error fetching news headlines." });
        }
    }
};
