/**
 * LID Map — WhatsApp @lid JID → actual phone number mapping
 *
 * WhatsApp multi-device uses @lid (Linked ID) to anonymize phone numbers.
 * This module maintains a mapping so isOwner() and other checks still work.
 */

const lidToPhone = new Map(); // "113052632518775@lid" → "6285xxx"
const phoneToLid = new Map(); // "6285xxx" → "113052632518775@lid"

/**
 * Update the map from a Baileys contacts array or object
 * Each contact can be: { id: "628xxx@s.whatsapp.net", lid: "113xxx@lid", ... }
 */
function updateFromContacts(contacts) {
    if (!contacts) return;
    const arr = Array.isArray(contacts) ? contacts : Object.values(contacts);
    for (const c of arr) {
        if (!c) continue;
        try {
            // Pattern 1: c.id is phone JID, c.lid is the LID string
            if (c.id && c.lid) {
                const phone = c.id.replace(/:\d+@.*$/, '').replace(/@.*$/, '');
                const lid = c.lid.includes('@') ? c.lid : c.lid + '@lid';
                if (phone && phone.length >= 7) {
                    lidToPhone.set(lid, phone);
                    phoneToLid.set(phone, lid);
                }
            }
            // Pattern 2: c.id IS the LID, phone might be in c.phone or c.notify
            if (c.id?.includes('@lid') && c.phone) {
                const phone = c.phone.replace(/[^0-9]/g, '');
                if (phone.length >= 7) {
                    lidToPhone.set(c.id, phone);
                    phoneToLid.set(phone, c.id);
                }
            }
        } catch {}
    }
}

/**
 * Resolve a @lid JID to a phone number string, or return null if unknown
 */
function resolvePhone(lidJid) {
    return lidToPhone.get(lidJid) || null;
}

/**
 * Resolve a phone number to its @lid JID, or return null if unknown
 */
function resolveLid(phone) {
    return phoneToLid.get(phone) || null;
}

function size() {
    return lidToPhone.size;
}

module.exports = { updateFromContacts, resolvePhone, resolveLid, size };
