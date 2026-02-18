const db = require('../config/database');

class MessageModel {
    static insert = db.prepare(`
        INSERT INTO messages (
            whatsapp_message_id, from_number, profile_name, message_type,
            message_text, media_id, media_url, media_mime_type, timestamp, direction
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    static updateStatus = db.prepare(`
        UPDATE messages SET status = ? WHERE whatsapp_message_id = ?
    `);

    static updateMediaUrl = db.prepare(`
        UPDATE messages SET media_url = ? WHERE whatsapp_message_id = ?
    `);

    static getByPhoneNumber = db.prepare(`
        SELECT * FROM messages
        WHERE from_number = ?
        ORDER BY timestamp ASC
    `);

    static getById = db.prepare(`
        SELECT * FROM messages WHERE whatsapp_message_id = ?
    `);

    static markAsRead = db.prepare(`
        UPDATE messages SET is_read = 1 WHERE from_number = ?
    `);
}

class ContactModel {
    static upsert = db.prepare(`
        INSERT INTO contacts (phone_number, profile_name, last_message_at, unread_count)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(phone_number) DO UPDATE SET
            profile_name = excluded.profile_name,
            last_message_at = excluded.last_message_at,
            unread_count = unread_count + 1
    `);

    static insert = db.prepare(`
        INSERT INTO contacts (phone_number, profile_name, last_message_at, unread_count)
        VALUES (?, ?, ?, ?)
    `);

    static getAll = db.prepare(`
        SELECT * FROM contacts ORDER BY last_message_at DESC
    `);

    static getByPhone = db.prepare(`
        SELECT * FROM contacts WHERE phone_number = ?
    `);

    static resetUnreadCount = db.prepare(`
        UPDATE contacts SET unread_count = 0 WHERE phone_number = ?
    `);

    static updateStatus = db.prepare(`
        UPDATE contacts SET status = ? WHERE phone_number = ?
    `);

    static updateTemperature = db.prepare(`
        UPDATE contacts SET lead_temperature = ? WHERE phone_number = ?
    `);

    static updateName = db.prepare(`
        UPDATE contacts SET profile_name = ? WHERE phone_number = ?
    `);


    static getByStatus = db.prepare(`
        SELECT * FROM contacts WHERE status = ? ORDER BY last_message_at DESC
    `);

    static getByTemperature = db.prepare(`
        SELECT * FROM contacts WHERE lead_temperature = ? ORDER BY last_message_at DESC
    `);

    static getByStatusAndTemp = db.prepare(`
        SELECT * FROM contacts WHERE status = ? AND lead_temperature = ? ORDER BY last_message_at DESC
    `);

    static deleteContact = db.prepare(`
        DELETE FROM contacts WHERE phone_number = ?
    `);

    static deleteMessages = db.prepare(`
        DELETE FROM messages WHERE from_number = ?
    `);
}

class StatsModel {
    static getTotalMessages = db.prepare(`
        SELECT COUNT(*) as count FROM messages
    `);

    static getTotalContacts = db.prepare(`
        SELECT COUNT(*) as count FROM contacts
    `);

    static getUnreadMessages = db.prepare(`
        SELECT SUM(unread_count) as count FROM contacts
    `);

    static getStatusBreakdown = db.prepare(`
        SELECT status, COUNT(*) as count FROM contacts GROUP BY status
    `);

    static getTemperatureBreakdown = db.prepare(`
        SELECT lead_temperature, COUNT(*) as count FROM contacts GROUP BY lead_temperature
    `);
}

module.exports = {
    MessageModel,
    ContactModel,
    StatsModel
};
