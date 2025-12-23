import axios from 'axios'

const handler = async (m, { text, conn }) => {
    if (!text) throw 'Masukkan link Spotify'

    await m.reply('⏳ Tunggu bentar, ngambil data Spotify...')

    try {
        const { data } = await axios.post(
            'https://sssspotify.com/api/download/get-url',
            { url: text },
            {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Content-Type': 'application/json'
                }
            }
        )

        if (data.code !== 200) throw 'Gagal ambil data'

        const download =
            data.downloadUrl ||
            `https://sssspotify.com${data.originalVideoUrl}`

        let txt = `🎧 *Spotify Downloader*\n\n`
        txt += `🎵 Judul : ${data.title}\n`
        txt += `👤 Artist : ${data.authorName}\n\n`
        txt += `⬇️ Download:\n${download}`

        await conn.sendMessage(
            m.chat,
            {
                text: txt,
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

handler.command = /^(spotify|spotifydl)$/i
handler.tags = ['downloader']
handler.help = ['spotify <url>']
handler.limit = false

export default handler
