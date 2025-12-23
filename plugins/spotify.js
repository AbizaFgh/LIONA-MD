import axios from 'axios'

const handler = async (m, { text, conn }) => {
    if (!text) throw 'Masukkan URL Spotify\n\nContoh:\nhttps://open.spotify.com/track/xxxx'

    try {
        const { data } = await axios.post(
            'https://sssspotify.com/api/download/get-url',
            { url: text },
            {
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                }
            }
        )

        if (data.code !== 200) throw 'Gagal mengambil data Spotify'

        const downloadUrl =
            data.downloadUrl ||
            `https://sssspotify.com${data.originalVideoUrl}`

        await conn.sendMessage(
            m.chat,
            {
                audio: { url: downloadUrl },
                mimetype: 'audio/mpeg',
                fileName: `${data.title}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: data.title,
                        body: data.authorName,
                        thumbnailUrl: data.coverUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            },
            { quoted: m }
        )

    } catch (e) {
        m.reply('❌ Error: ' + (e.message || e))
    }
}

handler.help = ['spotifydl <url>']
handler.tags = ['downloader']
handler.command = /^(spotifydl|spotify)$/i
handler.limit = false

export default handler
