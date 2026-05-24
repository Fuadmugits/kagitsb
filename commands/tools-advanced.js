const { fetchBuffer, fetchJson, toWebp } = require('../lib/functions');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Audio effect helper
async function processAudio(sock, m, effectName, ffmpegFilter) {
    const media = m.quoted?.isAudio ? m.quoted : m.isAudio ? m : null;
    if (!media) return m.reply('❌ Reply audio/voice note!');
    try {
        await m.react('⏳');
        const buffer = await media.download();
        const inputPath = path.join(config.paths.temp, `input_${Date.now()}.mp3`);
        const outputPath = path.join(config.paths.temp, `output_${Date.now()}.mp3`);
        fs.writeFileSync(inputPath, buffer);

        const ffmpegPath = require('ffmpeg-static');
        const { exec } = require('child_process');
        await new Promise((resolve, reject) => {
            exec(`"${ffmpegPath}" -i "${inputPath}" ${ffmpegFilter} "${outputPath}" -y`, (err) => {
                if (err) reject(err); else resolve();
            });
        });

        if (fs.existsSync(outputPath)) {
            const outBuffer = fs.readFileSync(outputPath);
            await sock.sendMessage(m.chat, {
                audio: outBuffer,
                mimetype: 'audio/mpeg',
                ptt: true
            }, { quoted: m.raw });
            // Cleanup
            try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch {}
        } else {
            await m.reply('❌ Gagal memproses audio.');
        }
        await m.react('✅');
    } catch (e) {
        await m.reply(`❌ Error ${effectName}: ${e.message}\n\n💡 Pastikan FFmpeg sudah terinstall di sistem.`);
    }
}

async function generateQuote(sock, m, text, isImage = false) {
    if (!text && !m.quoted?.text && !isImage) return m.reply('❌ Masukkan teks atau reply pesan!');
    
    let mediaBuffer = null;
    let mimeType = 'image/jpeg';
    if (isImage) {
        if (!m.quoted?.isImage && !m.isImage) return m.reply('❌ Reply gambar untuk iqc!');
        try {
            mediaBuffer = await (m.quoted?.isImage ? m.quoted : m).download();
            mimeType = (m.quoted?.isImage ? m.quoted : m).mimetype || 'image/jpeg';
        } catch (e) {
            return m.reply('❌ Gagal mendownload gambar!');
        }
    }

    const msgText = text || (m.quoted?.text ? m.quoted.text : '');
    const target = m.quoted ? m.quoted.sender : m.sender;
    const targetName = m.quoted ? (m.quoted.pushName || 'User') : (m.pushName || 'User');
    
    try {
        await m.react('⏳');
        let avatarUrl = 'https://i.ibb.co/0Jwqm2p/profile.png';
        try {
            const url = await sock.profilePictureUrl(target, 'image');
            if (url) avatarUrl = url;
        } catch {}

        const payload = {
            type: "quote",
            format: "png",
            backgroundColor: "#1b1429",
            width: 512,
            height: 768,
            scale: 2,
            messages: [{
                entities: [],
                avatar: true,
                from: {
                    id: 1,
                    name: targetName,
                    photo: { url: avatarUrl }
                },
                text: msgText,
                replyMessage: {}
            }]
        };

        if (mediaBuffer) {
            payload.messages[0].media = {
                url: `data:${mimeType};base64,${mediaBuffer.toString('base64')}`
            };
        }

        const res = await fetch('https://bot.lyo.su/quote/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000)
        });
        
        if (!res.ok) throw new Error(`API Error ${res.status}`);
        const json = await res.json();
        
        if (json.ok && json.result && json.result.image) {
            let buffer = Buffer.from(json.result.image, 'base64');
            buffer = await toWebp(buffer);
            await sock.sendMessage(m.chat, { sticker: buffer }, { quoted: m.raw });
            await m.react('✅');
        } else {
            await m.reply('❌ Gagal generate QC.');
        }
    } catch (e) {
        await m.reply('❌ Error: ' + e.message);
    }
}

module.exports = [
    // ═══ AUDIO EFFECTS ═══
    {
        name: 'bass', category: 'tools', desc: 'Tambah bass audio', usage: '(reply audio)',
        async execute({ sock, m }) { await processAudio(sock, m, 'bass', '-af equalizer=f=54:width_type=o:width=2:g=20'); }
    },
    {
        name: 'fat', category: 'tools', desc: 'Efek fat audio', usage: '(reply audio)',
        async execute({ sock, m }) { await processAudio(sock, m, 'fat', '-af "asetrate=44100*0.7,aresample=44100,atempo=1.2"'); }
    },
    {
        name: 'fast', category: 'tools', desc: 'Percepat audio', usage: '(reply audio)',
        async execute({ sock, m }) { await processAudio(sock, m, 'fast', '-af atempo=1.5'); }
    },
    {
        name: 'slow', category: 'tools', desc: 'Perlambat audio', usage: '(reply audio)',
        async execute({ sock, m }) { await processAudio(sock, m, 'slow', '-af atempo=0.7'); }
    },
    {
        name: 'tupai', category: 'tools', desc: 'Efek suara tupai', usage: '(reply audio)',
        async execute({ sock, m }) { await processAudio(sock, m, 'tupai', '-af "asetrate=44100*1.7,aresample=44100"'); }
    },
    {
        name: 'deep', category: 'tools', desc: 'Efek suara deep', usage: '(reply audio)',
        async execute({ sock, m }) { await processAudio(sock, m, 'deep', '-af "asetrate=44100*0.6,aresample=44100"'); }
    },
    {
        name: 'robot', category: 'tools', desc: 'Efek suara robot', usage: '(reply audio)',
        async execute({ sock, m }) { await processAudio(sock, m, 'robot', '-af "afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75"'); }
    },
    {
        name: 'blown', category: 'tools', desc: 'Efek blown audio', usage: '(reply audio)',
        async execute({ sock, m }) { await processAudio(sock, m, 'blown', '-af acrusher=.1:1:64:0:log'); }
    },
    {
        name: 'reverse', category: 'tools', desc: 'Balikkan audio', usage: '(reply audio)',
        async execute({ sock, m }) { await processAudio(sock, m, 'reverse', '-af areverse'); }
    },
    {
        name: 'smooth', category: 'tools', desc: 'Efek smooth audio', usage: '(reply audio)',
        async execute({ sock, m }) { await processAudio(sock, m, 'smooth', '-af "extrastereo=m=2.5,aecho=0.8:0.88:60:0.4"'); }
    },
    {
        name: 'earrape', category: 'tools', desc: 'Efek earrape', usage: '(reply audio)',
        async execute({ sock, m }) { await processAudio(sock, m, 'earrape', '-af volume=15'); }
    },
    {
        name: 'nightcore', category: 'tools', desc: 'Efek nightcore', usage: '(reply audio)',
        async execute({ sock, m }) { await processAudio(sock, m, 'nightcore', '-af "asetrate=44100*1.25,aresample=44100,bass=g=5"'); }
    },

    // ═══ MEDIA CONVERTERS ═══
    {
        name: 'toaudio', category: 'tools', desc: 'Convert video ke audio', usage: '(reply video)',
        async execute({ sock, m }) {
            const media = m.quoted?.isVideo ? m.quoted : m.isVideo ? m : null;
            if (!media) return m.reply('❌ Reply video!');
            try {
                await m.react('⏳');
                const buffer = await media.download();
                const inputPath = path.join(config.paths.temp, `vin_${Date.now()}.mp4`);
                const outputPath = path.join(config.paths.temp, `aout_${Date.now()}.mp3`);
                fs.writeFileSync(inputPath, buffer);
                const ffmpegPath = require('ffmpeg-static');
                const { exec } = require('child_process');
                await new Promise((res, rej) => { exec(`"${ffmpegPath}" -i "${inputPath}" -vn -ar 44100 -ac 2 -b:a 192k "${outputPath}" -y`, (e) => e ? rej(e) : res()); });
                if (fs.existsSync(outputPath)) {
                    const out = fs.readFileSync(outputPath);
                    await sock.sendMessage(m.chat, { audio: out, mimetype: 'audio/mpeg' }, { quoted: m.raw });
                    try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch {}
                }
                await m.react('✅');
            } catch (e) { await m.reply('❌ Error: ' + e.message); }
        }
    },
    {
        name: 'tomp3', category: 'tools', desc: 'Convert ke MP3', usage: '(reply audio/video)',
        async execute({ sock, m }) {
            const media = m.quoted?.isAudio || m.quoted?.isVideo ? m.quoted : (m.isAudio || m.isVideo) ? m : null;
            if (!media) return m.reply('❌ Reply audio atau video!');
            try {
                await m.react('⏳');
                const buffer = await media.download();
                await sock.sendMessage(m.chat, {
                    document: buffer,
                    fileName: `audio_${Date.now()}.mp3`,
                    mimetype: 'audio/mpeg'
                }, { quoted: m.raw });
                await m.react('✅');
            } catch (e) { await m.reply('❌ Error: ' + e.message); }
        }
    },
    {
        name: 'tovn', category: 'tools', desc: 'Convert ke voice note', usage: '(reply audio)',
        async execute({ sock, m }) {
            const media = m.quoted?.isAudio ? m.quoted : m.isAudio ? m : null;
            if (!media) return m.reply('❌ Reply audio!');
            try {
                const buffer = await media.download();
                await sock.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m.raw });
            } catch (e) { await m.reply('❌ Error: ' + e.message); }
        }
    },
    {
        name: 'toptv', category: 'tools', desc: 'Convert audio ke PTV (round video)', usage: '(reply audio)',
        async execute({ sock, m }) {
            const media = m.quoted?.isAudio ? m.quoted : m.isAudio ? m : null;
            if (!media) return m.reply('❌ Reply audio!');
            try {
                const buffer = await media.download();
                await sock.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/mpeg', ptt: true }, { quoted: m.raw });
            } catch (e) { await m.reply('❌ Error: ' + e.message); }
        }
    },
    {
        name: 'tourl', category: 'tools', desc: 'Upload media dan dapatkan URL', usage: '(reply media)',
        async execute({ m }) {
            if (!m.quoted?.isMedia && !m.isMedia) return m.reply('❌ Reply media (gambar/video/audio)!');
            try {
                await m.react('⏳');
                const buffer = await (m.quoted?.isMedia ? m.quoted : m).download();
                const FormData = require('form-data');
                const axios = require('axios');
                const form = new FormData();
                form.append('file', buffer, { filename: 'file.bin' });
                const res = await axios.post('https://tmpfiles.org/api/v1/upload', form, { headers: form.getHeaders() });
                const url = res.data?.data?.url?.replace('tmpfiles.org/', 'tmpfiles.org/dl/') || 'Gagal upload';
                await m.reply(`🔗 *Upload Berhasil!*\n\n📎 URL: ${url}\n\n⚠️ _Link berlaku sementara_`);
                await m.react('✅');
            } catch (e) { await m.reply('❌ Error upload: ' + e.message); }
        }
    },

    // ═══ IMAGE TOOLS ═══
    {
        name: 'hd', category: 'tools', desc: 'Upscale gambar/video jadi HD', usage: '(reply img/video)',
        premiumOnly: true,
        async execute({ sock, m }) {
            const isImg = m.quoted?.isImage || m.isImage;
            const isVid = m.quoted?.isVideo || m.isVideo;
            if (!isImg && !isVid) return m.reply('❌ Reply gambar atau video!');

            if (isImg) {
                try {
                    await m.react('⏳');
                    const buffer = await (m.quoted?.isImage ? m.quoted : m).download();
                    const sharp = require('sharp');
                    const meta = await sharp(buffer).metadata();
                    const upscaled = await sharp(buffer)
                        .resize(meta.width * 2, meta.height * 2, { kernel: 'lanczos3' })
                        .sharpen()
                        .toBuffer();
                    await sock.sendMessage(m.chat, {
                        image: upscaled,
                        caption: `✅ *HD Upscale*\n📐 ${meta.width}x${meta.height} → ${meta.width * 2}x${meta.height * 2}`
                    }, { quoted: m.raw });
                    await m.react('✅');
                } catch (e) { await m.reply('❌ Error: ' + e.message); }
            } else if (isVid) {
                try {
                    await m.react('⏳');
                    const media = m.quoted?.isVideo ? m.quoted : m;
                    const buffer = await media.download();
                    
                    if (!fs.existsSync(config.paths.temp)) {
                        fs.mkdirSync(config.paths.temp, { recursive: true });
                    }
                    
                    const inputPath = path.join(config.paths.temp, `vid_in_${Date.now()}.mp4`);
                    const outputPath = path.join(config.paths.temp, `vid_out_${Date.now()}.mp4`);
                    
                    fs.writeFileSync(inputPath, buffer);
                    
                    const ffmpegPath = require('ffmpeg-static');
                    const { exec } = require('child_process');
                    let success = false;
                    try {
                        await new Promise((resolve, reject) => {
                            exec(`"${ffmpegPath}" -i "${inputPath}" -vf "scale=min(iw*2\\,1280):-2:flags=bicubic,unsharp=3:3:0.5:3:3:0.0" -c:v libx264 -preset ultrafast -crf 24 -c:a aac -b:a 128k "${outputPath}" -y`, (err) => {
                                if (err) reject(err); else resolve();
                            });
                        });
                        success = true;
                    } catch (err) {
                        // Fallback: try without audio in case the video is silent/has no audio stream
                        await new Promise((resolve, reject) => {
                            exec(`"${ffmpegPath}" -i "${inputPath}" -vf "scale=min(iw*2\\,1280):-2:flags=bicubic,unsharp=3:3:0.5:3:3:0.0" -c:v libx264 -preset ultrafast -crf 24 -an "${outputPath}" -y`, (err) => {
                                if (err) reject(err); else resolve();
                            });
                        });
                        success = true;
                    }
                    
                    if (fs.existsSync(outputPath)) {
                        const outBuffer = fs.readFileSync(outputPath);
                        await sock.sendMessage(m.chat, {
                            video: outBuffer,
                            caption: `✅ *HD Video Upscale*\n📐 Kualitas video berhasil ditingkatkan ke HD`
                        }, { quoted: m.raw });
                        
                        // Cleanup
                        try {
                            fs.unlinkSync(inputPath);
                            fs.unlinkSync(outputPath);
                        } catch {}
                        await m.react('✅');
                    } else {
                        await m.reply('❌ Gagal memproses video ke HD.');
                    }
                } catch (e) {
                    await m.reply(`❌ Error: ${e.message}\n\n💡 Pastikan FFmpeg sudah terinstall di sistem.`);
                }
            }
        }
    },
    {
        name: 'colong', category: 'tools', desc: 'Ambil sticker jadi gambar', usage: '(reply sticker)',
        async execute({ sock, m }) {
            if (!m.quoted?.isSticker) return m.reply('❌ Reply sticker!');
            try {
                const buffer = await m.quoted.download();
                await sock.sendMessage(m.chat, { image: buffer, caption: '✅ Sticker colongan~' }, { quoted: m.raw });
            } catch (e) { await m.reply('❌ Error: ' + e.message); }
        }
    },
    {
        name: 'smeme', category: 'tools', desc: 'Buat sticker/gambar meme', usage: '<top|bottom> (reply img/sticker)',
        async execute({ sock, m, text }) {
            const isImg = m.quoted?.isImage || m.isImage;
            const isStik = m.quoted?.isSticker;
            if (!isImg && !isStik) return m.reply('❌ Reply gambar atau sticker!');
            if (!text) return m.reply('❌ Masukkan teks meme!\nContoh: .smeme atas|bawah');
            
            try {
                await m.react('⏳');
                const buffer = await (m.quoted ? m.quoted : m).download();
                
                // Upload to get public URL
                const FormData = require('form-data');
                const axios = require('axios');
                const form = new FormData();
                form.append('file', buffer, { filename: 'file.bin' });
                const uploadRes = await axios.post('https://tmpfiles.org/api/v1/upload', form, { headers: form.getHeaders() });
                const mediaUrl = uploadRes.data?.data?.url?.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                if (!mediaUrl) return m.reply('❌ Gagal mengunggah media ke server sementara.');
                
                const [top, bottom] = text.split('|').map(t => t.trim());
                const topText = top || '';
                const bottomText = bottom || '';
                
                const apiUrl = `https://api.siputzx.my.id/api/m/smeme?url=${encodeURIComponent(mediaUrl)}&text=${encodeURIComponent(topText)}&text2=${encodeURIComponent(bottomText)}`;
                
                let resultBuffer = await fetchBuffer(apiUrl);
                if (resultBuffer) {
                    let stickerBuffer = await toWebp(resultBuffer);
                    await sock.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m.raw });
                    await m.react('✅');
                } else {
                    await m.reply('❌ Gagal menghasilkan meme.');
                }
            } catch (e) {
                await m.reply('❌ Error: ' + e.message);
            }
        }
    },
    {
        name: 'emojimix', category: 'tools', desc: 'Mix dua emoji', usage: '🙃+💀',
        async execute({ sock, m, text }) {
            if (!text || !text.includes('+')) return m.reply('❌ Format: .emojimix 😀+😂');
            const [e1, e2] = text.split('+').map(e => e.trim());
            try {
                const url = `https://tenor.googleapis.com/v2/featured?q=${encodeURIComponent(e1)}_${encodeURIComponent(e2)}&key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&collection=emoji_kitchen_v5&contentfilter=high`;
                const res = await fetchJson(url);
                const imgUrl = res?.results?.[0]?.media_formats?.png?.url;
                if (!imgUrl) return m.reply('❌ Kombinasi emoji tidak tersedia!');
                let buffer = await fetchBuffer(imgUrl);
                if (buffer) {
                    buffer = await toWebp(buffer);
                    await sock.sendMessage(m.chat, { sticker: buffer }, { quoted: m.raw });
                }
                else await m.reply('❌ Gagal download emoji mix.');
            } catch { await m.reply('❌ Error emoji mix.'); }
        }
    },
    {
        name: 'brat', category: 'tools', desc: 'Buat teks brat style', usage: '(text)',
        async execute({ sock, m, text }) {
            const msgText = text || (m.quoted && m.quoted.text ? m.quoted.text : '');
            if (!msgText) return m.reply('❌ Masukkan teks atau reply pesan dengan teks!');
            try {
                await m.react('⏳');
                let buffer = await fetchBuffer(`https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(msgText)}`);
                if (buffer) {
                    buffer = await toWebp(buffer);
                    await sock.sendMessage(m.chat, { sticker: buffer }, { quoted: m.raw });
                    await m.react('✅');
                }
                else await m.reply('❌ Gagal generate brat.');
            } catch { await m.reply('❌ Error.'); }
        }
    },
    {
        name: 'nulis', category: 'tools', desc: 'Tulis teks di kertas', usage: '(text)',
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan teks!');
            try {
                const buffer = await fetchBuffer(`https://api.siputzx.my.id/api/m/nulis?text=${encodeURIComponent(text)}`);
                if (buffer) await sock.sendMessage(m.chat, { image: buffer, caption: '✏️ Nulis' }, { quoted: m.raw });
                else await m.reply('❌ Gagal generate.');
            } catch { await m.reply('❌ Error.'); }
        }
    },
    {
        name: 'qc', category: 'tools', desc: 'Buat quote card', usage: '(pesannya)',
        async execute({ sock, m, text }) {
            await generateQuote(sock, m, text, false);
        }
    },
    {
        name: 'iqc', category: 'tools', desc: 'Buat image quote card', usage: '(reply gambar)',
        async execute({ sock, m, text }) {
            await generateQuote(sock, m, text, true);
        }
    },
    {
        name: 'get', category: 'tools', desc: 'Download file dari URL', usage: '(url)',
        premiumOnly: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan URL!');
            try {
                await m.react('⏳');
                const buffer = await fetchBuffer(text);
                if (!buffer) return m.reply('❌ Gagal download!');
                if (buffer.length > 50 * 1024 * 1024) return m.reply('❌ File terlalu besar (max 50MB)!');
                const ext = text.split('.').pop()?.split('?')[0] || 'bin';
                await sock.sendMessage(m.chat, {
                    document: buffer,
                    fileName: `download_${Date.now()}.${ext}`,
                    mimetype: 'application/octet-stream'
                }, { quoted: m.raw });
                await m.react('✅');
            } catch (e) { await m.reply('❌ Error: ' + e.message); }
        }
    },
    {
        name: 'ssweb', category: 'tools', desc: 'Screenshot website', usage: '(url)',
        premiumOnly: true,
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan URL!');
            try {
                await m.react('⏳');
                const buffer = await fetchBuffer(`https://api.siputzx.my.id/api/tools/ssweb?url=${encodeURIComponent(text)}`);
                if (buffer) await sock.sendMessage(m.chat, { image: buffer, caption: `📸 Screenshot: ${text}` }, { quoted: m.raw });
                else await m.reply('❌ Gagal screenshot.');
                await m.react('✅');
            } catch { await m.reply('❌ Error.'); }
        }
    },
    {
        name: 'gitclone', category: 'tools', desc: 'Clone repository GitHub', usage: '(url)',
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan URL repo GitHub!');
            const match = text.match(/github\.com\/([^\/]+)\/([^\/\s]+)/);
            if (!match) return m.reply('❌ URL GitHub tidak valid!');
            try {
                await m.react('⏳');
                const url = `https://api.github.com/repos/${match[1]}/${match[2].replace('.git', '')}/zipball`;
                const buffer = await fetchBuffer(url);
                if (buffer) {
                    await sock.sendMessage(m.chat, {
                        document: buffer,
                        fileName: `${match[2].replace('.git', '')}.zip`,
                        mimetype: 'application/zip'
                    }, { quoted: m.raw });
                } else { await m.reply('❌ Gagal clone.'); }
                await m.react('✅');
            } catch { await m.reply('❌ Error.'); }
        }
    },
    {
        name: 'getexif', category: 'tools', desc: 'Lihat exif info sticker', usage: '(reply sticker)',
        async execute({ m }) {
            if (!m.quoted?.isSticker) return m.reply('❌ Reply sticker!');
            const contextInfo = m.quoted.msg?.contextInfo;
            let text = `📋 *Sticker EXIF Info*\n\n`;
            text += `🆔 ID: ${m.quoted.key?.id || '-'}\n`;
            text += `📦 Packname: ${m.quoted.msg?.stickerSentTs || '-'}\n`;
            text += `🔗 URL: ${m.quoted.msg?.url || '-'}\n`;
            text += `📐 Size: ${m.quoted.msg?.fileLength || '-'} bytes\n`;
            text += `🖼️ Animated: ${m.quoted.msg?.isAnimated ? 'Yes' : 'No'}\n`;
            await m.reply(text);
        }
    },
];
