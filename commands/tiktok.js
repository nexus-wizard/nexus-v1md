const axios = require("axios");

module.exports = {
    name: "tiktok",
    aliases: ["tt"],
    description: "Download TikTok videos (no watermark).",
    category: "download",
    async execute({ sock, jid, args, msg }) {
        const url = args[0];
        if (!url || !url.includes("tiktok.com")) {
            return await sock.sendMessage(jid, { text: "❓ *Usage:* `.tiktok <link>`" });
        }

        await sock.sendMessage(jid, { text: "⏳ *Processing TikTok...*" });

        try {
            const { data } = await axios.get(`https://api.giftedtech.my.id/api/download/tiktok?apikey=gifted&url=${encodeURIComponent(url)}`);
            
            if (!data.results || !data.results.video) {
                return await sock.sendMessage(jid, { text: "❌ Failed to fetch TikTok. Ensure the link is public." });
            }

            await sock.sendMessage(jid, { 
                video: { url: data.results.video },
                caption: `🎬 *TikTok Downloader*\n\n✨ *User:* ${data.results.title}\n📦 *Format:* No Watermark\n\n_Nexus-1MD • Media Delivery_`
            }, { quoted: msg });
        } catch (err) {
            console.error("TikTok error:", err);
            await sock.sendMessage(jid, { text: "❌ Error connecting to TikTok downloader." });
        }
    }
};
