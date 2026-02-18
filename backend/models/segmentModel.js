const db = require('../config/database');

class SegmentModel {
    // Get all segments
    static getAll = db.prepare(`
        SELECT s.*, 
               COUNT(DISTINCT cs.contact_id) as contact_count
        FROM segments s
        LEFT JOIN contact_segments cs ON s.id = cs.segment_id
        GROUP BY s.id
        ORDER BY s.created_at DESC
    `);

    // Get segment by ID
    static getById = db.prepare(`
        SELECT s.*, 
               COUNT(DISTINCT cs.contact_id) as contact_count
        FROM segments s
        LEFT JOIN contact_segments cs ON s.id = cs.segment_id
        WHERE s.id = ?
        GROUP BY s.id
    `);

    // Get segment by name
    static getByName = db.prepare(`
        SELECT * FROM segments WHERE name = ?
    `);

    // Create segment
    static create = db.prepare(`
        INSERT INTO segments (name, description)
        VALUES (?, ?)
    `);

    // Update segment
    static update = db.prepare(`
        UPDATE segments 
        SET name = ?, description = ?
        WHERE id = ?
    `);

    // Delete segment
    static delete = db.prepare(`
        DELETE FROM segments WHERE id = ?
    `);

    // Get contacts in segment
    static getContacts = db.prepare(`
        SELECT c.*, cs.added_at as segment_added_at
        FROM contacts c
        INNER JOIN contact_segments cs ON c.id = cs.contact_id
        WHERE cs.segment_id = ?
        ORDER BY cs.added_at DESC
    `);

    // Add contact to segment
    static addContact = db.prepare(`
        INSERT OR IGNORE INTO contact_segments (contact_id, segment_id)
        VALUES (?, ?)
    `);

    // Remove contact from segment
    static removeContact = db.prepare(`
        DELETE FROM contact_segments 
        WHERE contact_id = ? AND segment_id = ?
    `);

    // Get segments for a contact
    static getContactSegments = db.prepare(`
        SELECT s.*
        FROM segments s
        INNER JOIN contact_segments cs ON s.id = cs.segment_id
        WHERE cs.contact_id = ?
        ORDER BY cs.added_at DESC
    `);

    // Add multiple contacts to segment
    static addMultipleContacts(segmentId, contactIds) {
        const insert = db.prepare(`
            INSERT OR IGNORE INTO contact_segments (contact_id, segment_id)
            VALUES (?, ?)
        `);

        const insertMany = db.transaction((contacts) => {
            for (const contactId of contacts) {
                insert.run(contactId, segmentId);
            }
        });

        insertMany(contactIds);
    }

    // Get contact ID by phone number
    static getContactIdByPhone = db.prepare(`
        SELECT id FROM contacts WHERE phone_number = ?
    `);
}

module.exports = SegmentModel;
