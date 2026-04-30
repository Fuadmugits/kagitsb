const { getContentType, downloadMediaMessage, jidDecode } = require('@whiskeysockets/baileys');

/**
 * Serialize/normalize incoming Baileys message into a clean, consistent format.
 */
function serialize(msg, sock) {
    if (!msg) return msg;
    
    const m = {};
    
    // Basic info
    m.key = msg.key;
    m.id = msg.key.id;
    m.chat = msg.key.remoteJid;
    m.fromMe = msg.key.fromMe;
    m.isGroup = m.chat?.endsWith('@g.us') || false;
    m.sender = m.fromMe
        ? sock.user.id.replace(/:\d+@/, '@')
        : m.isGroup
            ? (() => {
                const p = msg.key.participant || '';
                // Keep @lid as-is so lid-map can resolve it
                // Strip device suffix for @s.whatsapp.net: "628xxx:42@s.whatsapp.net" → "628xxx@s.whatsapp.net"
                return p.includes('@lid') ? p : p.replace(/:\d+@/, '@');
              })()
            : m.chat;
    
    // Push name
    m.pushName = msg.pushName || 'Unknown';
    
    // Message type & content
    if (msg.message) {
        // Handle view-once
        if (msg.message.viewOnceMessage) {
            msg.message = msg.message.viewOnceMessage.message;
        }
        // Handle ephemeral
        if (msg.message.ephemeralMessage) {
            msg.message = msg.message.ephemeralMessage.message;
        }
        
        m.type = getContentType(msg.message);
        m.msg = msg.message[m.type];
        
        // Text body
        m.body = '';
        if (m.type === 'conversation') {
            m.body = msg.message.conversation || '';
        } else if (m.type === 'extendedTextMessage') {
            m.body = msg.message.extendedTextMessage?.text || '';
        } else if (m.type === 'imageMessage') {
            m.body = msg.message.imageMessage?.caption || '';
        } else if (m.type === 'videoMessage') {
            m.body = msg.message.videoMessage?.caption || '';
        } else if (m.type === 'templateButtonReplyMessage') {
            m.body = msg.message.templateButtonReplyMessage?.selectedId || '';
        } else if (m.type === 'buttonsResponseMessage') {
            m.body = msg.message.buttonsResponseMessage?.selectedButtonId || '';
        } else if (m.type === 'listResponseMessage') {
            m.body = msg.message.listResponseMessage?.singleSelectReply?.selectedRowId || '';
        } else if (m.type === 'interactiveResponseMessage') {
            m.body = JSON.parse(msg.message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson || '{}')?.id || '';
        }
        
        // Media detection
        m.isMedia = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'].includes(m.type);
        m.isImage = m.type === 'imageMessage';
        m.isVideo = m.type === 'videoMessage';
        m.isAudio = m.type === 'audioMessage';
        m.isSticker = m.type === 'stickerMessage';
        m.isDocument = m.type === 'documentMessage';
        
        // Quoted message
        const contextInfo = m.msg?.contextInfo;
        m.mentionedJid = contextInfo?.mentionedJid || [];
        
        if (contextInfo?.quotedMessage) {
            m.quoted = {};
            m.quoted.key = {
                remoteJid: m.chat,
                fromMe: contextInfo.participant === sock.user.id.replace(/:\d+/, ''),
                id: contextInfo.stanzaId,
                participant: contextInfo.participant,
            };
            m.quoted.message = contextInfo.quotedMessage;
            m.quoted.type = getContentType(contextInfo.quotedMessage);
            m.quoted.msg = contextInfo.quotedMessage[m.quoted.type];
            m.quoted.sender = contextInfo.participant || '';
            
            m.quoted.body = '';
            if (m.quoted.type === 'conversation') {
                m.quoted.body = contextInfo.quotedMessage.conversation || '';
            } else if (m.quoted.type === 'extendedTextMessage') {
                m.quoted.body = contextInfo.quotedMessage.extendedTextMessage?.text || '';
            } else if (m.quoted.type === 'imageMessage') {
                m.quoted.body = contextInfo.quotedMessage.imageMessage?.caption || '';
            } else if (m.quoted.type === 'videoMessage') {
                m.quoted.body = contextInfo.quotedMessage.videoMessage?.caption || '';
            }
            
            m.quoted.isMedia = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'].includes(m.quoted.type);
            m.quoted.isImage = m.quoted.type === 'imageMessage';
            m.quoted.isVideo = m.quoted.type === 'videoMessage';
            m.quoted.isAudio = m.quoted.type === 'audioMessage';
            m.quoted.isSticker = m.quoted.type === 'stickerMessage';
            
            // Download quoted media
            m.quoted.download = async () => {
                return await downloadMediaMessage(
                    { key: m.quoted.key, message: m.quoted.message },
                    'buffer',
                    {},
                    { reuploadRequest: sock.updateMediaMessage, logger: undefined }
                );
            };
        } else {
            m.quoted = null;
        }
    }
    
    // Download current media
    m.download = async () => {
        return await downloadMediaMessage(msg, 'buffer', {}, {
            reuploadRequest: sock.updateMediaMessage,
            logger: undefined
        });
    };
    
    // Reply helper
    m.reply = async (text, options = {}) => {
        return await sock.sendMessage(m.chat, { text, ...options }, { quoted: msg });
    };
    
    // React helper
    m.react = async (emoji) => {
        return await sock.sendMessage(m.chat, {
            react: { text: emoji, key: m.key }
        });
    };
    
    // Raw message reference
    m.raw = msg;
    
    return m;
}

module.exports = { serialize };
