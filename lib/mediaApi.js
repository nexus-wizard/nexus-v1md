const axios = require('axios');
const yts = require('yt-search');

const AXIOS_OPTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

const mediaApi = {
    /**
     * Search for videos on YouTube
     */
    async ytSearch(query) {
        try {
            const search = await yts(query);
            return search.videos.length > 0 ? search.videos : null;
        } catch (error) {
            console.error('ytSearch error:', error);
            return null;
        }
    },

    /**
     * Download YouTube audio with fallback chain
     */
    async ytDownload(url) {
        const apis = [
            async (u) => {
                const { data } = await axios.get(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(u)}`, AXIOS_OPTS);
                if (data.status && data.data?.url) return { url: data.data.url, title: data.data.title };
                throw new Error('Siputzx fail');
            },
            async (u) => {
                const { data } = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(u)}`, AXIOS_OPTS);
                if (data.status && data.result?.download?.url) return { url: data.result.download.url, title: data.result.title };
                throw new Error('Vreden fail');
            }
        ];

        let lastUrl = null;
        let lastTitle = null;

        for (const api of apis) {
            try {
                const res = await api(url);
                if (res && res.url) {
                    lastUrl = res.url;
                    lastTitle = res.title;
                    const response = await axios.get(res.url, { ...AXIOS_OPTS, responseType: 'arraybuffer' });
                    return { buffer: Buffer.from(response.data), url: res.url, title: res.title };
                }
            } catch (err) {
                console.warn(`API fallback: ${err.message}`);
                continue;
            }
        }
        
        // If buffer download failed but we got a URL, return the URL as fallback
        if (lastUrl) return { url: lastUrl, title: lastTitle };
        return null;
    },

    /**
     * Download Facebook video
     */
    async facebookDownload(url) {
        try {
            const { data } = await axios.get(`https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(url)}`, AXIOS_OPTS);
            if (data.status && data.data) {
                const videoUrl = data.data.hd || data.data.sd || data.data.urls?.[0]?.url;
                if (videoUrl) {
                    try {
                        const response = await axios.get(videoUrl, { ...AXIOS_OPTS, responseType: 'arraybuffer' });
                        return { buffer: Buffer.from(response.data), url: videoUrl, title: data.data.title || "Facebook Video" };
                    } catch (e) {
                        return { url: videoUrl, title: data.data.title || "Facebook Video" };
                    }
                }
            }
        } catch (error) {
            console.error('facebookDownload error:', error);
        }
        return null;
    },

    /**
     * Download TikTok video (no watermark)
     */
    async tiktokDownload(url) {
        try {
            const { data } = await axios.get(`https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`, AXIOS_OPTS);
            if (data.status && data.data?.videoNoWatermark) {
                const videoUrl = data.data.videoNoWatermark;
                try {
                    const response = await axios.get(videoUrl, { ...AXIOS_OPTS, responseType: 'arraybuffer' });
                    return {
                        buffer: Buffer.from(response.data),
                        url: videoUrl,
                        author: data.data.author,
                        title: data.data.title
                    };
                } catch (e) {
                    return { url: videoUrl, author: data.data.author, title: data.data.title };
                }
            }
        } catch (error) {
            console.error('tiktokDownload error:', error);
        }
        return null;
    },

    /**
     * Download Instagram media
     */
    async igDownload(url) {
        try {
            const { data } = await axios.get(`https://api.vreden.my.id/api/igdl?url=${encodeURIComponent(url)}`, AXIOS_OPTS);
            if (data.status && data.result && data.result.length > 0) {
                const mediaItems = [];
                for (const item of data.result) {
                    const mediaUrl = item.url || item;
                    try {
                        const response = await axios.get(mediaUrl, { ...AXIOS_OPTS, responseType: 'arraybuffer' });
                        mediaItems.push({
                            buffer: Buffer.from(response.data),
                            url: mediaUrl,
                            isVideo: mediaUrl.includes(".mp4")
                        });
                    } catch (e) {
                        mediaItems.push({ url: mediaUrl, isVideo: mediaUrl.includes(".mp4") });
                    }
                }
                return mediaItems;
            }
        } catch (error) {
            console.error('igDownload error:', error);
        }
        return null;
    },

    /**
     * Get lyrics for a song (LRCLIB)
     */
    async getLyrics(query) {
        try {
            const { data } = await axios.get(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, AXIOS_OPTS);
            if (data && data.length > 0) {
                const bestMatch = data[0];
                return {
                    title: bestMatch.trackName,
                    artist: bestMatch.artistName,
                    lyrics: bestMatch.plainLyrics,
                    album: bestMatch.albumName
                };
            }
        } catch (error) {
            console.error('getLyrics error:', error);
        }
        return null;
    }
};

module.exports = mediaApi;
