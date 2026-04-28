const { Settings, Users } = require('../database');
const { formatNumber, isOwner } = require('../lib/functions');

module.exports = [
    {
        name: 'katalog', aliases: ['produk', 'store', 'list'], category: 'business', desc: 'Lihat list produk',
        async execute({ sock, m }) {
            const list = Settings.get('katalog_produk', 'Mohon maaf, admin belum mensetting katalog produk.');
            await sock.sendMessage(m.chat, {
                text: `🛍️ *KATALOG PRODUK*\n\n${list}\n\n_Ketik .order untuk melakukan pemesanan._`
            });
        }
    },
    {
        name: 'setkatalog', category: 'business', desc: 'Set list produk (Owner)', usage: '(teks)',
        ownerOnly: true, noLimit: true,
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan teks katalog!');
            Settings.set('katalog_produk', text);
            await m.reply('✅ Katalog produk berhasil diperbarui!');
        }
    },
    {
        name: 'pay', aliases: ['payment', 'bayar', 'rek'], category: 'business', desc: 'Lihat metode pembayaran',
        async execute({ sock, m }) {
            const paymentInfo = Settings.get('payment_info', 'Admin belum mensetting metode pembayaran.');
            await sock.sendMessage(m.chat, {
                text: `💳 *METODE PEMBAYARAN*\n\n${paymentInfo}\n\n_Harap sertakan bukti transfer (screenshot) setelah melakukan pembayaran._`
            });
        }
    },
    {
        name: 'setpay', category: 'business', desc: 'Set metode pembayaran (Owner)', usage: '(teks)',
        ownerOnly: true, noLimit: true,
        async execute({ m, text }) {
            if (!text) return m.reply('❌ Masukkan detail pembayaran (Bank, e-Wallet, dll)!');
            Settings.set('payment_info', text);
            await m.reply('✅ Info pembayaran berhasil diperbarui!');
        }
    },
    {
        name: 'order', aliases: ['pesan', 'beli'], category: 'business', desc: 'Format pemesanan',
        async execute({ m }) {
            const format = `📝 *FORMAT ORDER*\n\nNama : \nBarang : \nJumlah : \nCatatan : \n\n_Silakan copy format ini dan isi sesuai pesananmu._`;
            await m.reply(format);
        }
    },
    {
        name: 'topup', category: 'business', desc: 'Topup saldo bot otomatis/manual', usage: '(jumlah)',
        async execute({ sock, m, args }) {
            const amount = parseInt(args[0]?.replace(/[^0-9]/g, ''));
            if (!amount || amount < 1000) return m.reply('❌ Minimal topup adalah Rp 1.000\nContoh: .topup 10000');
            
            const qrisUrl = Settings.get('qris_url', '');
            
            let text = `💳 *TOPUP REQUEST*\n\n👤 User: @${m.sender.split('@')[0]}\n💰 Jumlah: Rp ${formatNumber(amount)}\n\n`;
            
            if (qrisUrl) {
                text += `1️⃣ Scan QRIS di atas\n2️⃣ Bayar sesuai nominal (Rp ${formatNumber(amount)})\n3️⃣ Kirim bukti transfer / Screenshot ke chat ini.`;
                await sock.sendMessage(m.chat, { image: { url: qrisUrl }, caption: text, mentions: [m.sender] }, { quoted: m.raw });
            } else {
                text += `💡 *Instruksi:*\nSilakan ketik *.pay* untuk melihat nomor rekening/ewallet, lalu transfer sebesar Rp ${formatNumber(amount)}.\nKirim bukti transfer ke chat ini atau ke Owner.`;
                await m.reply(text);
            }
            
            // Notify owner
            const config = require('../config');
            const ownerJid = config.bot.ownerNumber[0] + '@s.whatsapp.net';
            await sock.sendMessage(ownerJid, {
                text: `🔔 *NEW TOPUP REQUEST*\n\nDari: @${m.sender.split('@')[0]}\nJumlah: Rp ${formatNumber(amount)}\n\n_Balas dengan:_\n.acc-topup ${m.sender.split('@')[0]} ${amount}`,
                mentions: [m.sender]
            });
        }
    },
    {
        name: 'setqris', category: 'business', desc: 'Set link gambar QRIS (Owner)', usage: '(url gambar)',
        ownerOnly: true, noLimit: true,
        async execute({ m, text }) {
            if (!text || !text.startsWith('http')) return m.reply('❌ Masukkan URL gambar QRIS yang valid (berawalan http/https)!');
            Settings.set('qris_url', text);
            await m.reply('✅ QRIS berhasil di-set!');
        }
    },
    {
        name: 'acc-topup', category: 'business', desc: 'Approve topup user (Owner)', usage: '(62xxx) (jumlah)',
        ownerOnly: true, noLimit: true,
        async execute({ sock, m, args }) {
            if (args.length < 2) return m.reply('❌ Format: .acc-topup 628xxx 10000');
            const jid = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            const amount = parseInt(args[1].replace(/[^0-9]/g, ''));
            if (!amount) return m.reply('❌ Jumlah tidak valid!');
            
            Users.addBalance(jid, amount);
            const { Transactions } = require('../database');
            Transactions.create(jid, 'topup', amount, 'Topup disetujui Admin');
            
            await m.reply(`✅ Berhasil menambahkan saldo Rp ${formatNumber(amount)} ke @${jid.split('@')[0]}`, [jid]);
            
            try {
                await sock.sendMessage(jid, {
                    text: `🎉 *TOPUP BERHASIL*\n\nSaldo sebesar Rp ${formatNumber(amount)} telah ditambahkan ke akunmu!\nKetik *.profile* untuk mengecek saldo.`,
                });
            } catch {}
        }
    }
];
