const axios = require("axios");

module.exports = {
    name: "lyrics",
    aliases: ["lyric", "songlyrics"],
    description: "Get the lyrics for a song.",
    category: "media",
    execute: async ({ sock, jid, args, msg }) => {
        const query = args.join(" ");
        if (!query) {
            return await sock.sendMessage(jid, { text: "❓ *Usage:* `.lyrics <song name>`\n\nExample: `.lyrics Blinding Lights`" });
        }

        try {
            await sock.sendMessage(jid, { text: `🔍 Searching for lyrics: *${query}*...` });

            // Lyrist API is a free and reliable source for lyrics
            const { data } = await axios.get(`https://lyrist.vercel.app/api/${encodeURIComponent(query)}`);

            if (!data || !data.lyrics) {
                return await sock.sendMessage(jid, { text: `❌ Could not find lyrics for: *${query}*` });
            }

            const caption = 
                `🎵 *SONG LYRICS*\n\n` +
                `🎼 *Title:* ${data.title}\n` +
                `👤 *Artist:* ${data.artist}\n\n` +
                `${data.lyrics}\n\n` +
                `_Nexus-1MD Media Hub_`;

            if (data.image) {
                await sock.sendMessage(jid, {
                    image: { url: data.image },
                    caption: caption
                }, { quoted: msg });
            } else {
                await sock.sendMessage(jid, { text: caption }, { quoted: msg });
            }

        } catch (error) {
            console.error("Lyrics command error:", error);
            await sock.sendMessage(jid, { text: "❌ Oops! Something went wrong while fetching lyrics. Please try again later." });
        }
    }
};
