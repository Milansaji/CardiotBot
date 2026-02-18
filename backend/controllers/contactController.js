const { ContactModel, StatsModel } = require('../models/queries');

class ContactController {
    /**
     * GET /api/contacts - Get all contacts
     */
    static getAllContacts(req, res) {
        try {
            const contacts = ContactModel.getAll.all();
            res.json(contacts);
        } catch (error) {
            console.error('Error fetching contacts:', error);
            res.status(500).json({ error: 'Failed to fetch contacts' });
        }
    }

    /**
     * GET /api/dashboard/stats - Get enhanced dashboard statistics
     */
    static getDashboardStats(req, res) {
        try {
            const totalMessages = StatsModel.getTotalMessages.get();
            const totalContacts = StatsModel.getTotalContacts.get();
            const unreadMessages = StatsModel.getUnreadMessages.get();

            // Status breakdown
            const statusBreakdown = StatsModel.getStatusBreakdown.all();
            const statusCounts = {
                ongoing: 0,
                converted: 0,
                rejected: 0,
                human_takeover: 0
            };
            statusBreakdown.forEach(row => {
                statusCounts[row.status] = row.count;
            });

            // Temperature breakdown
            const tempBreakdown = StatsModel.getTemperatureBreakdown.all();
            const tempCounts = {
                hot: 0,
                warm: 0,
                cold: 0
            };
            tempBreakdown.forEach(row => {
                tempCounts[row.lead_temperature] = row.count;
            });

            res.json({
                totalMessages: totalMessages.count,
                totalContacts: totalContacts.count,
                unreadMessages: unreadMessages.count || 0,
                statusBreakdown: statusCounts,
                temperatureBreakdown: tempCounts
            });
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            res.status(500).json({ error: 'Failed to fetch statistics' });
        }
    }

    /**
     * GET /api/stats - Get basic statistics (backwards compatibility)
     */
    static getStats(req, res) {
        try {
            const totalMessages = StatsModel.getTotalMessages.get();
            const totalContacts = StatsModel.getTotalContacts.get();
            const unreadMessages = StatsModel.getUnreadMessages.get();

            res.json({
                totalMessages: totalMessages.count,
                totalContacts: totalContacts.count,
                unreadMessages: unreadMessages.count || 0
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
            res.status(500).json({ error: 'Failed to fetch statistics' });
        }
    }

    /**
     * PUT /api/contacts/:phoneNumber/read - Reset unread count
     */
    static resetUnreadCount(req, res) {
        try {
            const { phoneNumber } = req.params;
            ContactModel.resetUnreadCount.run(phoneNumber);
            res.json({ success: true });
        } catch (error) {
            console.error('Error resetting unread count:', error);
            res.status(500).json({ error: 'Failed to reset unread count' });
        }
    }

    /**
     * DELETE /api/contacts/:phoneNumber - Delete contact and all their messages
     */
    static deleteContact(req, res) {
        try {
            const { phoneNumber } = req.params;

            // Delete all messages from this contact
            ContactModel.deleteMessages.run(phoneNumber);

            // Delete the contact
            ContactModel.deleteContact.run(phoneNumber);

            res.json({ success: true, message: 'Contact deleted successfully' });
        } catch (error) {
            console.error('Error deleting contact:', error);
            res.status(500).json({ error: 'Failed to delete contact' });
        }
    }

    /**
     * GET /api/contacts/export - Export contacts as CSV
     */
    static exportCSV(req, res) {
        try {
            const contacts = ContactModel.getAll.all();

            // Create CSV content
            const headers = ['Name', 'Phone Number', 'Unread Count', 'Last Message At'];
            const rows = contacts.map(c => [
                c.profile_name,
                c.phone_number,
                c.unread_count,
                new Date(c.last_message_at * 1000).toISOString()
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Set headers for file download
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="contacts-${Date.now()}.csv"`);
            res.send(csvContent);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            res.status(500).json({ error: 'Failed to export contacts' });
        }
    }

    /**
     * GET /api/contacts/export/filtered - Export contacts with filters (segment, temperature, status)
     */
    static exportCSVFiltered(req, res) {
        try {
            const { segment, temperature, status } = req.query;
            const db = require('../config/database');

            let query = `
                SELECT DISTINCT c.* 
                FROM contacts c
            `;
            const conditions = [];
            const params = [];

            // Join with segments if filtering by segment
            if (segment) {
                query += `
                    INNER JOIN contact_segments cs ON c.id = cs.contact_id
                    INNER JOIN segments s ON cs.segment_id = s.id
                `;
                conditions.push('s.name = ?');
                params.push(segment);
            }

            // Add temperature filter
            if (temperature) {
                conditions.push('c.lead_temperature = ?');
                params.push(temperature);
            }

            // Add status filter
            if (status) {
                conditions.push('c.status = ?');
                params.push(status);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY c.last_message_at DESC';

            const stmt = db.prepare(query);
            const contacts = stmt.all(...params);

            // Create CSV content with enhanced headers
            const headers = ['Name', 'Phone Number', 'Status', 'Temperature', 'Unread Count', 'Button Clicks', 'Last Message At'];
            const rows = contacts.map(c => [
                c.profile_name,
                c.phone_number,
                c.status,
                c.lead_temperature,
                c.unread_count,
                c.button_click_count || 0,
                new Date(c.last_message_at * 1000).toISOString()
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Set headers for file download with filter info
            const filterSuffix = [segment, temperature, status].filter(Boolean).join('-') || 'all';
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="contacts-${filterSuffix}-${Date.now()}.csv"`);
            res.send(csvContent);
        } catch (error) {
            console.error('Error exporting filtered CSV:', error);
            res.status(500).json({ error: 'Failed to export contacts' });
        }
    }

    /**
     * POST /api/contacts/import - Import contacts from CSV with optional segment assignment
     */
    static importCSV(req, res) {
        try {
            const { contacts, segmentId } = req.body;

            if (!Array.isArray(contacts) || contacts.length === 0) {
                return res.status(400).json({ error: 'Invalid contacts data' });
            }

            let imported = 0;
            let skipped = 0;
            const importedContactIds = [];

            for (const contact of contacts) {
                try {
                    // Check if contact already exists
                    const existing = ContactModel.getByPhone.get(contact.phone_number);

                    if (!existing) {
                        // Insert new contact
                        const result = ContactModel.insert.run(
                            contact.phone_number,
                            contact.profile_name || 'Unknown',
                            Math.floor(Date.now() / 1000),
                            0 // unread_count
                        );
                        imported++;
                        importedContactIds.push(result.lastInsertRowid);
                    } else {
                        // Contact exists, still add to segment if specified
                        if (segmentId) {
                            importedContactIds.push(existing.id);
                        }
                        skipped++;
                    }
                } catch (err) {
                    console.error('Error importing contact:', contact, err);
                    skipped++;
                }
            }

            // Add all contacts to segment if specified
            if (segmentId && importedContactIds.length > 0) {
                const SegmentModel = require('../models/segmentModel');
                SegmentModel.addMultipleContacts(segmentId, importedContactIds);
                console.log(`✅ Added ${importedContactIds.length} contacts to segment ${segmentId}`);
            }

            res.json({
                success: true,
                imported,
                skipped,
                total: contacts.length,
                addedToSegment: segmentId ? importedContactIds.length : 0
            });
        } catch (error) {
            console.error('Error importing CSV:', error);
            res.status(500).json({ error: 'Failed to import contacts' });
        }
    }

    /**
     * POST /api/contacts - Add single contact
     */
    static addContact(req, res) {
        try {
            const { phone_number, profile_name } = req.body;

            if (!phone_number || !profile_name) {
                return res.status(400).json({ error: 'Phone number and name are required' });
            }

            // Check if contact already exists
            const existing = ContactModel.getByPhone.get(phone_number);

            if (existing) {
                return res.status(409).json({ error: 'Contact already exists' });
            }

            // Insert new contact
            ContactModel.insert.run(
                phone_number,
                profile_name,
                Math.floor(Date.now() / 1000),
                0 // unread_count
            );

            res.json({
                success: true,
                message: 'Contact added successfully'
            });
        } catch (error) {
            console.error('Error adding contact:', error);
            res.status(500).json({ error: 'Failed to add contact' });
        }
    }

    /**
     * PUT /api/contacts/:phoneNumber/status - Update contact status
     */
    static updateStatus(req, res) {
        try {
            const { phoneNumber } = req.params;
            const { status } = req.body;

            const validStatuses = ['ongoing', 'converted', 'rejected', 'human_takeover'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            ContactModel.updateStatus.run(status, phoneNumber);
            res.json({ success: true, status });
        } catch (error) {
            console.error('Error updating status:', error);
            res.status(500).json({ error: 'Failed to update status' });
        }
    }

    /**
     * PUT /api/contacts/:phoneNumber/temperature - Update lead temperature
     */
    static updateTemperature(req, res) {
        try {
            const { phoneNumber } = req.params;
            const { temperature } = req.body;

            const validTemps = ['hot', 'warm', 'cold'];
            if (!validTemps.includes(temperature)) {
                return res.status(400).json({ error: 'Invalid temperature' });
            }

            ContactModel.updateTemperature.run(temperature, phoneNumber);
            res.json({ success: true, temperature });
        } catch (error) {
            console.error('Error updating temperature:', error);
            res.status(500).json({ error: 'Failed to update temperature' });
        }
    }

    /**
     * PUT /api/contacts/:phoneNumber/name - Update contact name
     */
    static updateName(req, res) {
        try {
            const { phoneNumber } = req.params;
            const { name } = req.body;

            if (!name || name.trim().length === 0) {
                return res.status(400).json({ error: 'Name cannot be empty' });
            }

            ContactModel.updateName.run(name.trim(), phoneNumber);
            res.json({ success: true, name: name.trim() });
        } catch (error) {
            console.error('Error updating contact name:', error);
            res.status(500).json({ error: 'Failed to update contact name' });
        }
    }


    /**
     * GET /api/contacts/export/filtered - Export contacts with filters
     */
    static exportCSVFiltered(req, res) {
        try {
            const { status, temperature } = req.query;

            let contacts;
            if (status && temperature) {
                contacts = ContactModel.getByStatusAndTemp.all(status, temperature);
            } else if (status) {
                contacts = ContactModel.getByStatus.all(status);
            } else if (temperature) {
                contacts = ContactModel.getByTemperature.all(temperature);
            } else {
                contacts = ContactModel.getAll.all();
            }

            // Create CSV content
            const headers = ['Name', 'Phone Number', 'Status', 'Temperature', 'Unread Count', 'Last Message At'];
            const rows = contacts.map(c => [
                c.profile_name,
                c.phone_number,
                c.status,
                c.lead_temperature,
                c.unread_count,
                new Date(c.last_message_at * 1000).toISOString()
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Set headers for file download
            const filename = status || temperature
                ? `contacts-${status || ''}-${temperature || ''}-${Date.now()}.csv`
                : `contacts-${Date.now()}.csv`;
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(csvContent);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            res.status(500).json({ error: 'Failed to export contacts' });
        }
    }
}

module.exports = ContactController;
