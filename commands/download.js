const { fetchJson, fetchBuffer } = require('../lib/functions');

module.exports = [
    { name: 'ytmp3', category: 'download', desc: 'Download audio YouTube (Premium)', usage: '(url)', premiumOnly: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan URL YouTube!');
            await m.react('⏳');
            try {
                // Mencoba beberapa API secara berurutan agar lebih stabil di Railway
                let dlUrl = null;
                const res = await fetchJson(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(text)}`);
                if (res?.data?.dl || res?.result?.dl) dlUrl = res?.data?.dl || res?.result?.dl;
                
                if (dlUrl) {
                    const buffer = await fetchBuffer(dlUrl);
                    if (buffer) await sock.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/mpeg' }, { quoted: m.raw });
                    else await m.reply('❌ Gagal mengunduh file audio dari server!');
                } else {
                    await m.reply('❌ Server download YouTube saat ini sedang offline/sibuk. Silakan coba lagi nanti.');
                }
            } catch { 
                await m.reply('❌ Mohon maaf, API YouTube downloader sedang bermasalah.'); 
            }
            await m.react('✅');
        }
    },
    { name: 'ytmp4', category: 'download', desc: 'Download video YouTube (Premium)', usage: '(url)', premiumOnly: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan URL YouTube!');
            await m.react('⏳');
            try {
                let dlUrl = null;
                const res = await fetchJson(`https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(text)}`);
                if (res?.data?.dl || res?.result?.dl) dlUrl = res?.data?.dl || res?.result?.dl;
                
                if (dlUrl) {
                    const buffer = await fetchBuffer(dlUrl);
                    if (buffer) await sock.sendMessage(m.chat, { video: buffer, caption: '╭───「 🎬 𝚈𝙾𝚄𝚃𝚄𝙱𝙴 𝙼𝙿𝟺 」\n│ \n│ ✅ Download berhasil!\n╰──────────────' }, { quoted: m.raw });
                    else await m.reply('❌ Gagal mengunduh video dari server!');
                } else {
                    await m.reply('❌ Server download YouTube saat ini sedang offline/sibuk. Silakan coba lagi nanti.');
                }
            } catch { 
                await m.reply('❌ Mohon maaf, API YouTube downloader sedang bermasalah.'); 
            }
            await m.react('✅');
        }
    },
    { name: 'tiktok', aliases: ['tt'], category: 'download', desc: 'Download video TikTok (Premium)', usage: '(url)', premiumOnly: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan URL TikTok!');
            await m.react('⏳');
            try {
                // Menggunakan API TikWM yang sangat stabil untuk TikTok
                const res = await fetchJson(`https://www.tikwm.com/api/?url=${encodeURIComponent(text)}`);
                const dl = res?.data?.play || res?.data?.hdplay || res?.data?.video;
                
                if (dl) {
                    const buffer = await fetchBuffer(dl);
                    if (buffer) await sock.sendMessage(m.chat, { video: buffer, caption: '╭───「 🎵 𝚃𝙸𝙺𝚃𝙾𝙺 𝚅𝙸𝙳𝙴𝙾 」\n│ \n│ ✅ Download berhasil!\n╰──────────────' }, { quoted: m.raw });
                    else await m.reply('❌ Gagal mengunduh video!');
                } else {
                    await m.reply('❌ Gagal download! Pastikan link TikTok valid dan publik.');
                }
            } catch { 
                await m.reply('❌ API TikTok sedang sibuk, coba beberapa saat lagi.'); 
            }
            await m.react('✅');
        }
    },
    { name: 'tiktokmp3', category: 'download', desc: 'Download audio TikTok (Premium)', usage: '(url)', premiumOnly: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan URL TikTok!');
            await m.react('⏳');
            try {
                // Menggunakan API TikWM untuk Audio
                const res = await fetchJson(`https://www.tikwm.com/api/?url=${encodeURIComponent(text)}`);
                const dl = res?.data?.music || res?.data?.audio;
                
                if (dl) {
                    const buffer = await fetchBuffer(dl);
                    if (buffer) await sock.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/mpeg' }, { quoted: m.raw });
                    else await m.reply('❌ Gagal mengunduh audio!');
                } else {
                    await m.reply('❌ Audio tidak ditemukan! Pastikan link valid.');
                }
            } catch { 
                await m.reply('❌ API TikTok sedang sibuk, coba beberapa saat lagi.'); 
            }
            await m.react('✅');
        }
    },
    { name: 'instagram', aliases: ['ig','igdl'], category: 'download', desc: 'Download Instagram (Premium)', usage: '(url)', premiumOnly: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan URL Instagram!');
            await m.react('⏳');
            try {
                const res = await fetchJson(`https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(text)}`);
                const dl = res?.data?.[0]?.url || res?.result?.[0]?.url || res?.data?.url;
                if (dl) {
                    const buffer = await fetchBuffer(dl);
                    if (buffer) await sock.sendMessage(m.chat, { video: buffer, caption: '╭───「 📸 𝙸𝙽𝚂𝚃𝙰𝙶𝚁𝙰𝙼 」\n│ \n│ ✅ Download berhasil!\n╰──────────────' }, { quoted: m.raw });
                    else await m.reply('❌ Gagal mengambil file media dari server.');
                } else {
                    await m.reply('❌ Server API Instagram sedang down. Coba lagi nanti atau gunakan web downloader.');
                }
            } catch { 
                await m.reply('❌ Mohon maaf, API Instagram downloader sedang bermasalah.'); 
            }
            await m.react('✅');
        }
    },
    { name: 'facebook', aliases: ['fb','fbdl'], category: 'download', desc: 'Download Facebook (Premium)', usage: '(url)', premiumOnly: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan URL Facebook!');
            await m.react('⏳');
            try {
                const res = await fetchJson(`https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(text)}`);
                const dl = res?.data?.sd || res?.data?.hd || res?.result?.url || res?.data?.url;
                if (dl) {
                    const buffer = await fetchBuffer(dl);
                    if (buffer) await sock.sendMessage(m.chat, { video: buffer, caption: '╭───「 📘 𝙵𝙰𝙲𝙴𝙱𝙾𝙾𝙺 」\n│ \n│ ✅ Download berhasil!\n╰──────────────' }, { quoted: m.raw });
                    else await m.reply('❌ Gagal download!');
                } else await m.reply('❌ Gagal download!');
            } catch { await m.reply('❌ Error download Facebook.'); }
            await m.react('✅');
        }
    },
    { name: 'spotifydl', category: 'download', desc: 'Download lagu Spotify (Premium)', usage: '(url)', premiumOnly: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan URL Spotify!');
            await m.react('⏳');
            try {
                const res = await fetchJson(`https://api.siputzx.my.id/api/d/spotify?url=${encodeURIComponent(text)}`);
                const dl = res?.data?.download || res?.result?.download || res?.data?.url;
                if (dl) {
                    const buffer = await fetchBuffer(dl);
                    if (buffer) await sock.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/mpeg' }, { quoted: m.raw });
                    else await m.reply('❌ Gagal download lagu!');
                } else await m.reply('❌ Gagal menemukan lagu Spotify.');
            } catch { await m.reply('❌ Error download Spotify.'); }
            await m.react('✅');
        }
    },
    { name: 'mediafire', aliases: ['mf'], category: 'download', desc: 'Download Mediafire (Premium)', usage: '(url)', premiumOnly: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan URL Mediafire!');
            await m.react('⏳');
            try {
                const res = await fetchJson(`https://api.siputzx.my.id/api/d/mediafire?url=${encodeURIComponent(text)}`);
                const dl = res?.data?.url || res?.result?.url;
                if (dl) {
                    const buffer = await fetchBuffer(dl);
                    if (buffer) {
                        await sock.sendMessage(m.chat, {
                            document: buffer,
                            fileName: res?.data?.filename || res?.result?.filename || 'Mediafire_Download.bin',
                            mimetype: 'application/octet-stream',
                            caption: `╭───「 📁 𝙼𝙴𝙳𝙸𝙰𝙵𝙸𝚁𝙴 」\n│ \n│ ✅ File: ${res?.data?.filename || 'Download.bin'}\n╰──────────────`
                        }, { quoted: m.raw });
                    } else await m.reply('❌ Gagal download file!');
                } else await m.reply('❌ Gagal menemukan file Mediafire.');
            } catch { await m.reply('❌ Error download Mediafire.'); }
            await m.react('✅');
        }
    },
];
