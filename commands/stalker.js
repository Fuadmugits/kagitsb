module.exports = [
    { name: 'wastalk', category: 'stalker', desc: 'Stalk WhatsApp', usage: '(nomor)',
        async execute({ sock, m, text }) {
            const num = text?.replace(/[^0-9]/g, '');
            if (!num) return m.reply('❌ Masukkan nomor! .wastalk 628xxx');
            try {
                const jid = num + '@s.whatsapp.net';
                const status = await sock.fetchStatus(jid).catch(() => null);
                const pp = await sock.profilePictureUrl(jid, 'image').catch(() => null);
                let msg = `📱 *WA STALK*\n\n🆔 Nomor: ${num}\n`;
                if (status) msg += `📝 Bio: ${status.status || '-'}\n⏰ Updated: ${status.setAt ? new Date(status.setAt).toLocaleString('id') : '-'}\n`;
                if (pp) { const { fetchBuffer } = require('../lib/functions'); const buf = await fetchBuffer(pp); if (buf) return await sock.sendMessage(m.chat, { image: buf, caption: msg }, { quoted: m.raw }); }
                await m.reply(msg);
            } catch { await m.reply('❌ Gagal stalk. Nomor mungkin tidak terdaftar.'); }
        }
    },
    { name: 'igstalk', category: 'stalker', desc: 'Stalk Instagram', usage: '(username)',
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan username!');
            try {
                await m.react('⏳');
                const { fetchJson, fetchBuffer } = require('../lib/functions');
                
                // IG Stalk API (Siputzx is currently down/Cloudflare protected)
                // We'll try it, but provide a robust fallback message if it fails
                const res = await fetchJson(`https://api.siputzx.my.id/api/stalk/ig?u=${encodeURIComponent(text)}`);
                
                if (!res || !res.data) {
                    // Fallback to basic info if API is dead
                    let msg = `📸 *Instagram Stalk*\n\n`;
                    msg += `👤 Username: @${text}\n`;
                    msg += `🔗 Profile: https://instagram.com/${text}\n\n`;
                    msg += `_⚠️ Detail lengkap tidak dapat ditampilkan karena server API pihak ketiga sedang sibuk/down._`;
                    return m.reply(msg);
                }
                
                const data = res.data;
                let msg = `📸 *Instagram Stalk*\n\n`;
                msg += `👤 Name: ${data.full_name || data.username || '-'}\n`;
                msg += `🆔 Username: @${data.username || text}\n`;
                msg += `📝 Bio: ${data.biography || '-'}\n`;
                msg += `👥 Followers: ${data.followers || 0}\n`;
                msg += `👤 Following: ${data.following || 0}\n`;
                msg += `📦 Posts: ${data.posts || 0}\n`;
                msg += `🔗 Profile: https://instagram.com/${data.username || text}`;
                
                if (data.profile_pic_url) {
                    const buf = await fetchBuffer(data.profile_pic_url);
                    if (buf) return await sock.sendMessage(m.chat, { image: buf, caption: msg }, { quoted: m.raw });
                }
                await m.reply(msg);
            } catch { 
                await m.reply('❌ Server API Stalker sedang down. Coba lagi nanti.'); 
            }
        }
    },
    { name: 'tiktokstalk', category: 'stalker', desc: 'Stalk TikTok', usage: '(username)',
        async execute({ sock, m, text }) {
            if (!text) return m.reply('❌ Masukkan username!');
            try {
                await m.react('⏳');
                const { fetchJson, fetchBuffer } = require('../lib/functions');
                // Menggunakan API TikWM yang sangat stabil
                const username = text.replace('@', '');
                const res = await fetchJson(`https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(username)}`);
                
                if (!res || !res.data || !res.data.user) {
                    return m.reply('❌ User tidak ditemukan atau API sedang sibuk!');
                }
                
                const user = res.data.user;
                const stats = res.data.stats;
                
                let msg = `🎵 *TikTok Stalk*\n\n`;
                msg += `👤 Name: ${user.nickname || username}\n`;
                msg += `🆔 Username: @${user.uniqueId || username}\n`;
                msg += `📝 Bio: ${user.signature || '-'}\n`;
                msg += `👥 Followers: ${stats.followerCount || 0}\n`;
                msg += `👤 Following: ${stats.followingCount || 0}\n`;
                msg += `❤️ Likes: ${stats.heartCount || 0}\n`;
                msg += `🎬 Videos: ${stats.videoCount || 0}\n`;
                msg += `🔗 Profile: https://tiktok.com/@${user.uniqueId || username}`;
                
                if (user.avatarMedium) {
                    const buf = await fetchBuffer(user.avatarMedium);
                    if (buf) return await sock.sendMessage(m.chat, { image: buf, caption: msg }, { quoted: m.raw });
                }
                await m.reply(msg);
            } catch { 
                await m.reply('❌ Error saat menghubungi server TikTok.'); 
            }
        }
    },
    { name: 'githubstalk', aliases: ['gitstalk'], category: 'stalker', desc: 'Stalk GitHub', usage: '(username)',
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan username!');
            try {
                const { fetchJson } = require('../lib/functions');
                const res = await fetchJson(`https://api.github.com/users/${text}`);
                if (!res?.login) return m.reply('❌ User tidak ditemukan!');
                await m.reply(`💻 *GitHub Stalk*\n\n👤 ${res.name || res.login}\n🆔 @${res.login}\n📝 ${res.bio || '-'}\n📦 Repos: ${res.public_repos}\n👥 Followers: ${res.followers}\n🔗 ${res.html_url}`);
            } catch { await m.reply('❌ Error.'); }
        }
    },
    { name: 'telestalk', category: 'stalker', desc: 'Stalk Telegram', usage: '(username)',
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan username!');
            try {
                // We use a basic t.me link representation for telegram stalk
                let msg = `✈️ *Telegram Stalk*\n\n`;
                msg += `🆔 Username: @${text.replace('@', '')}\n`;
                msg += `🔗 Link: https://t.me/${text.replace('@', '')}\n\n`;
                msg += `_Note: Telegram tidak menyediakan public API untuk user details tanpa bot token._`;
                await m.reply(msg);
            } catch { await m.reply('❌ Error.'); }
        }
    },
    { name: 'genshinstalk', category: 'stalker', desc: 'Stalk Genshin', usage: '(uid)',
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan UID!');
            try {
                await m.react('⏳');
                const { fetchJson } = require('../lib/functions');
                // Note: Enka.Network API for Genshin Stalking
                const res = await fetchJson(`https://enka.network/api/uid/${text}`);
                if (!res?.playerInfo) return m.reply('❌ UID tidak ditemukan atau disembunyikan!');
                const p = res.playerInfo;
                let msg = `⚔️ *Genshin Stalk*\n\n`;
                msg += `👤 Name: ${p.nickname}\n`;
                msg += `🎚️ AR: ${p.level}\n`;
                msg += `🌍 WL: ${p.worldLevel || '-'}\n`;
                msg += `📝 Signature: ${p.signature || '-'}\n`;
                msg += `🏆 Achievements: ${p.finishAchievementNum || 0}\n`;
                msg += `🌀 Abyss: Floor ${p.towerFloorIndex || '-'} Chamber ${p.towerLevelIndex || '-'}\n`;
                await m.reply(msg);
                await m.react('✅');
            } catch { await m.reply('❌ Error. Pastikan UID valid dan detail karakter di-public.'); }
        }
    },
];
