const axios = require("axios");

module.exports = {
    name: "instagram",
    aliases: ["ig", "reels"],
    description: "Download Instagram media.",
    category: "download",
    async execute({ sock, jid, args, msg }) {
        const url = args[0];
        if (!url || !url.includes("instagram.com")) {
            return await sock.sendMessage(jid, { text: "❓ *Usage:* `.ig <link>`" });
        }

        await sock.sendMessage(jid, { text: "⏳ *Processing Instagram media...*" });

        try {
            const { data } = await axios.get(`https://api.giftedtech.my.id/api/download/instagram?apikey=gifted&url=${encodeURIComponent(url)}`);
            
            if (!data.result || data.result.length === 0) {
                return await sock.sendMessage(jid, { text: "❌ Failed to fetch Instagram media. Is it a private account?" });
            }

            const mediaUrl = data.result[0].url;
            const isVideo = mediaUrl.includes(".mp4");

            if (isVideo) {
                await sock.sendMessage(jid, { video: { url: mediaUrl }, caption: "📸 *Instagram Reel/Video*" }, { quoted: msg });
            } else {
                await sock.sendMessage(jid, { image: { url: mediaUrl }, caption: "📸 *Instagram Image*" }, { quoted: msg });
            }
        } catch (err) {
            console.error("Instagram error:", err);
            await sock.sendMessage(jid, { text: "❌ Error connecting to Instagram service." });
        }
    }
};
