const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

module.exports = [
    // ==========================================
    // 1. AI: GEMINI
    // ==========================================
    {
        name: 'gemini',
        aliases: ['ai', 'ask'],
        category: 'ai',
        desc: 'Tanya AI Gemini 2.0 (Dari Backup)',
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan pertanyaan untuk Gemini! (Contoh: .gemini Siapa presiden Indonesia?)');
            
            await m.reply('⏳ _Gemini sedang berpikir..._');
            
            try {
                const GEMINI_API_KEY = "AIzaSyCURDo-PO29UjszVzZ89-1Ly2XlTGtqZZQ";
                const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
                
                // Coba ambil konteks jika me-reply chat sebelumnya
                let fullText = text;
                if (m.quoted && m.quoted.text) {
                    fullText = `Konteks: ${m.quoted.text}\n\nPertanyaan: ${text}`;
                }

                const data = {
                    contents: [{ parts: [{ text: fullText }] }]
                };

                const response = await axios.post(url, data);

                if (!response.data || !response.data.candidates) throw new Error('API Response Error');

                let aiResponse = response.data.candidates[0].content.parts[0].text;
                let formattedMessage = aiResponse.replace(/\*\*/g, '*'); // Format WA bold

                await sock.sendMessage(m.chat, {
                    text: `*🤖 G E M I N I*\n\n${formattedMessage}`
                }, { quoted: m.raw });
                
            } catch (error) {
                console.error('Gemini Error:', error.message);
                m.reply('❌ Gagal menghubungi API Gemini. Silakan coba lagi nanti.');
            }
        }
    },

    // ==========================================
    // 2. DOWNLOADER: TIKTOK
    // ==========================================
    {
        name: 'tiktok',
        aliases: ['tt', 'ttdl'],
        category: 'download',
        desc: 'Download Video TikTok tanpa Watermark',
        async execute({ sock, m, text }) {
            if (!text || !text.includes('tiktok.com')) {
                return m.reply("❌ Masukkan URL TikTok yang valid! (Contoh: .tiktok https://vm.tiktok.com/xxx/)");
            }

            await m.reply('⏳ _Sedang mengambil video TikTok..._');

            try {
                const response = await axios.post(
                    "https://ttsave.app/download",
                    { query: text, language_id: "1" },
                    {
                        headers: {
                            Accept: "application/json, text/plain, */*",
                            "Content-Type": "application/json",
                            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36",
                            Referer: "https://ttsave.app/en",
                        },
                    }
                );

                const $ = cheerio.load(response.data);
                const videoNoWatermark = $('a[type="no-watermark"]').attr("href");
                const videoWithWatermark = $('a[type="watermark"]').attr("href");
                const videoUrl = videoNoWatermark || videoWithWatermark;

                if (videoUrl) {
                    await sock.sendMessage(m.chat, { 
                        video: { url: videoUrl }, 
                        mimetype: 'video/mp4', 
                        caption: `*🎵 T I K T O K*\n\n> Request By @${m.sender.split('@')[0]}`,
                        mentions: [m.sender]
                    }, { quoted: m.raw });
                } else {
                    throw new Error("Link video tidak ditemukan");
                }
            } catch (error) {
                console.error('TikTok DL Error:', error.message);
                m.reply('❌ Gagal mengunduh video TikTok. Coba link lain atau coba lagi nanti.');
            }
        }
    },

    // ==========================================
    // 3. DOWNLOADER: INSTAGRAM
    // ==========================================
    {
        name: 'igdl',
        aliases: ['ig', 'instagram'],
        category: 'download',
        desc: 'Download Reels/Video Instagram',
        async execute({ sock, m, text }) {
            if (!text || !text.includes('instagram.com')) {
                return m.reply("❌ Masukkan URL Instagram yang valid! (Contoh: .igdl https://www.instagram.com/reel/xxx/)");
            }

            await m.reply('⏳ _Sedang mengambil video Instagram..._');

            try {
                const form = new URLSearchParams();
                form.append("q", text);
                form.append("vt", "home");

                const response = await axios.post('https://yt5s.io/api/ajaxSearch', form, {
                    headers: {
                        "Accept": "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                });

                if (response.data.status === "ok") {
                    const $ = cheerio.load(response.data.data);
                    const videoUrl = $('a[title="Download Video"]').attr("href");
                    
                    if (videoUrl) {
                        await sock.sendMessage(m.chat, { 
                            video: { url: videoUrl }, 
                            mimetype: 'video/mp4', 
                            caption: `*📸 I N S T A G R A M*\n\n> Request By @${m.sender.split('@')[0]}`,
                            mentions: [m.sender]
                        }, { quoted: m.raw });
                    } else {
                        throw new Error("Tidak ada link download yang tersedia dari API yt5s.");
                    }
                } else {
                    throw new Error("API menolak memproses URL tersebut.");
                }
            } catch (error) {
                console.error('IG DL Error:', error.message);
                m.reply('❌ Gagal mengunduh video Instagram. Pastikan akun tidak diprivate dan coba lagi nanti.');
            }
        }
    },

    // ==========================================
    // 4. SEARCH: WIKIPEDIA
    // ==========================================
    {
        name: 'wikipedia',
        aliases: ['wiki'],
        category: 'search',
        desc: 'Cari artikel di Wikipedia',
        async execute({ m, text }) {
            if (!text) return m.reply("❌ Mau cari apa? (Contoh: .wikipedia Indonesia)");

            await m.reply('⏳ _Mencari di Wikipedia..._');

            try {
                // Menggunakan public MediaWiki API (Tanpa API Key)
                const url = `https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(text)}`;
                const response = await axios.get(url);

                if (response.data && response.data.title && response.data.extract) {
                    const title = response.data.title;
                    const desc = response.data.extract;
                    const pageUrl = response.data.content_urls.desktop.page;

                    let replyText = `📚 *W I K I P E D I A*\n\n`;
                    replyText += `*Judul:* ${title}\n\n`;
                    replyText += `*Penjelasan:*\n${desc}\n\n`;
                    replyText += `*Baca selengkapnya:* ${pageUrl}`;

                    m.reply(replyText);
                } else {
                    throw new Error("Format tidak sesuai");
                }
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    m.reply(`❌ Artikel "${text}" tidak ditemukan di Wikipedia bahasa Indonesia.`);
                } else {
                    console.error('Wiki Error:', error.message);
                    m.reply('❌ Terjadi kesalahan saat mencari artikel Wikipedia.');
                }
            }
        }
    },

    // ==========================================
    // 5. FUN: CEK KHODAM
    // ==========================================
    {
        name: 'cekkodam',
        aliases: ['khodam', 'cekkhodam'],
        category: 'fun',
        desc: 'Cek khodam lucu-lucuan',
        async execute({ sock, m, text }) {
            // Jika ada text/mention, gunakan itu. Jika tidak, gunakan nama pengirim.
            let who = text || m.pushName || "Kamu";
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                // Jika mention seseorang, gunakan tag name sementara
                who = `@${m.mentionedJid[0].split('@')[0]}`;
            }

            let khodamList = [
                'Harimau Merah', 'Macan Putih', 'Belut Hitam', 'Nyi Brorong', 'Macan Tutul',
                'Tempe Goreng', 'Sayur Asem', 'Kucing Hitam', 'Cat Tembok', 'Pecel Lele',
                'Iwak Water', 'Asep Racing', 'Kunti Biang', 'Belalang Biru', 'Sendok',
                'Garpu', 'Ayam Jago', 'Nasi Goreng', 'Sate Padang', 'Bakso Urat',
                'Nasi Kucing', 'Mie Instan', 'Ayam Geprek', 'Es Cendol', 'Kopi Tubruk',
                'Cilok Bandung', 'Seblak', 'Rendang Lezat', 'Sambal Matah',
                'Sop Buntut', 'Bubur Ayam', 'Klepon Manis', 'Martabak Manis',
                'Keripik Singkong', 'Gorengan Renyah', 'Cendol Dawet', 'Cireng',
                'Batagor', 'Siomay', 'Es Dawet', 'Kue Lumpur', 'Kue Putu', 'Kue Ape',
                'Knalpot Racing', 'Ban', 'Spion', 'Velg Jari-jari', 'Karburator', 
                'Busi Panas', 'Rante Besi', 'Lampu LED', 'Klakson', 'Shockbreaker', 
                'Tromol Belakang', 'Rem Cakram', 'Tangki Bensin', 'Stang',
                'Batu Bata', 'Semen Gresik', 'Pasir', 'Genteng', 'Keramik',
                'Pintu', 'Jendela', 'Atap Seng', 'Cat Tembok', 'Kunci Inggris', 
                'Obeng Plus', 'Palang Besi', 'Paku Beton', 'Sekop Baja', 'Bor Listrik',
                'Kuntilanak', 'Pocong', 'Tuyul', 'Wewe Gombel', 'Genderuwo',
                'Sundel Bolong', 'Leak', 'Kuyang', 'Babi Ngepet', 'Jelangkung',
                'Monitor', 'Mouse', 'Keyboard', 'CPU', 'Hard Disk', 
                'RAM', 'Motherboard', 'Power Supply', 'Printer', 'Scanner', 
                'Router', 'Modem', 'VGA Card', 'SSD', 'USB Drive'
            ];
            
            let pilihan = khodamList[Math.floor(Math.random() * khodamList.length)];
            
            let replyText = `👻 *CEK KHODAM* 👻\n\n`;
            replyText += `👤 *Nama/Target:* ${who}\n`;
            replyText += `🔮 *Khodam:* ${pilihan}\n\n`;
            replyText += `_Note: Ini cuma lucu-lucuan dari script backup ya bang!_`;

            const options = m.mentionedJid && m.mentionedJid.length > 0 ? { mentions: m.mentionedJid } : {};
            await sock.sendMessage(m.chat, { text: replyText, ...options }, { quoted: m.raw });
        }
    }
];
