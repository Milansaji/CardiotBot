const { ContactModel, StatsModel } = require('../models/queries');
const supabase = require('../config/supabase');

class ContactController {
    /**
     * GET /api/contacts - Get all contacts
     */
    static async getAllContacts(req, res) {
        try {
            const contacts = await ContactModel.getAll();
            res.json(contacts);
        } catch (error) {
            console.error('Error fetching contacts:', error);
            res.status(500).json({ error: 'Failed to fetch contacts' });
        }
    }

    /**
     * GET /api/dashboard/stats - Get enhanced dashboard statistics
     */
    static async getDashboardStats(req, res) {
        try {
            const totalMessages = await StatsModel.getTotalMessages();
            const totalContacts = await StatsModel.getTotalContacts();
            const unreadMessages = await StatsModel.getUnreadMessages();
            const statusBreakdown = await StatsModel.getStatusBreakdown();
            const tempBreakdown = await StatsModel.getTemperatureBreakdown();

            const statusCounts = { ongoing: 0, converted: 0, rejected: 0, human_takeover: 0 };
            statusBreakdown.forEach(row => { statusCounts[row.status] = row.count; });

            const tempCounts = { hot: 0, warm: 0, cold: 0 };
            tempBreakdown.forEach(row => { tempCounts[row.lead_temperature] = row.count; });

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
     * GET /api/stats - Get basic statistics
     */
    static async getStats(req, res) {
        try {
            const totalMessages = await StatsModel.getTotalMessages();
            const totalContacts = await StatsModel.getTotalContacts();
            const unreadMessages = await StatsModel.getUnreadMessages();

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
    static async resetUnreadCount(req, res) {
        try {
            const { phoneNumber } = req.params;
            await ContactModel.resetUnreadCount(phoneNumber);
            res.json({ success: true });
        } catch (error) {
            console.error('Error resetting unread count:', error);
            res.status(500).json({ error: 'Failed to reset unread count' });
        }
    }

    /**
     * DELETE /api/contacts/:phoneNumber - Delete contact and all their messages
     */
    static async deleteContact(req, res) {
        try {
            const { phoneNumber } = req.params;
            await ContactModel.deleteMessages(phoneNumber);
            await ContactModel.deleteContact(phoneNumber);
            res.json({ success: true, message: 'Contact deleted successfully' });
        } catch (error) {
            console.error('Error deleting contact:', error);
            res.status(500).json({ error: 'Failed to delete contact' });
        }
    }

    /**
     * GET /api/contacts/export - Export contacts as CSV
     */
    static async exportCSV(req, res) {
        try {
            const contacts = await ContactModel.getAll();

            const headers = ['Name', 'Phone Number', 'Unread Count', 'Last Message At'];
            const rows = contacts.map(c => [
                c.profile_name,
                c.phone_number,
                c.unread_count,
                c.last_message_at ? new Date(c.last_message_at * 1000).toISOString() : ''
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="contacts-${Date.now()}.csv"`);
            res.send(csvContent);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            res.status(500).json({ error: 'Failed to export contacts' });
        }
    }

    /**
     * GET /api/contacts/export/filtered - Export contacts with filters
     */
    static async exportCSVFiltered(req, res) {
        try {
            const { segment, temperature, status } = req.query;

            let query = supabase.from('contacts').select('*');

            if (status) query = query.eq('status', status);
            if (temperature) query = query.eq('lead_temperature', temperature);

            if (segment) {
                // Get segment ID first
                const { data: seg } = await supabase.from('segments').select('id').eq('name', segment).single();
                if (seg) {
                    const { data: cs } = await supabase.from('contact_segments').select('contact_id').eq('segment_id', seg.id);
                    const ids = cs.map(r => r.contact_id);
                    query = query.in('id', ids);
                }
            }

            const { data: contacts, error } = await query.order('last_message_at', { ascending: false });
            if (error) throw error;

            const headers = ['Name', 'Phone Number', 'Status', 'Temperature', 'Unread Count', 'Button Clicks', 'Last Message At'];
            const rows = contacts.map(c => [
                c.profile_name,
                c.phone_number,
                c.status,
                c.lead_temperature,
                c.unread_count,
                c.button_click_count || 0,
                c.last_message_at ? new Date(c.last_message_at * 1000).toISOString() : ''
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

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
     * POST /api/contacts/import - Import contacts from CSV
     */
    static async importCSV(req, res) {
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
                    const existing = await ContactModel.getByPhone(contact.phone_number);

                    if (!existing) {
                        const newContact = await ContactModel.insert(
                            contact.phone_number,
                            contact.profile_name || 'Unknown',
                            Math.floor(Date.now() / 1000),
                            0
                        );
                        imported++;
                        if (newContact) importedContactIds.push(newContact.id);
                    } else {
                        if (segmentId) importedContactIds.push(existing.id);
                        skipped++;
                    }
                } catch (err) {
                    console.error('Error importing contact:', contact, err);
                    skipped++;
                }
            }

            if (segmentId && importedContactIds.length > 0) {
                const inserts = importedContactIds.map(id => ({ contact_id: id, segment_id: segmentId }));
                await supabase.from('contact_segments').upsert(inserts, { onConflict: 'contact_id,segment_id' });
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
    static async addContact(req, res) {
        try {
            const { phone_number, profile_name } = req.body;

            if (!phone_number || !profile_name) {
                return res.status(400).json({ error: 'Phone number and name are required' });
            }

            const existing = await ContactModel.getByPhone(phone_number);
            if (existing) {
                return res.status(409).json({ error: 'Contact already exists' });
            }

            await ContactModel.insert(phone_number, profile_name, Math.floor(Date.now() / 1000), 0);
            res.json({ success: true, message: 'Contact added successfully' });
        } catch (error) {
            console.error('Error adding contact:', error);
            res.status(500).json({ error: 'Failed to add contact' });
        }
    }

    /**
     * PUT /api/contacts/:phoneNumber/status - Update contact status
     */
    static async updateStatus(req, res) {
        try {
            const { phoneNumber } = req.params;
            const { status } = req.body;

            const validStatuses = ['ongoing', 'converted', 'rejected', 'human_takeover', 'follow_up'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            await ContactModel.updateStatus(status, phoneNumber);
            res.json({ success: true, status });
        } catch (error) {
            console.error('Error updating status:', error);
            res.status(500).json({ error: 'Failed to update status' });
        }
    }

    /**
     * PUT /api/contacts/:phoneNumber/temperature - Update lead temperature
     */
    static async updateTemperature(req, res) {
        try {
            const { phoneNumber } = req.params;
            const { temperature } = req.body;

            const validTemps = ['hot', 'warm', 'cold'];
            if (!validTemps.includes(temperature)) {
                return res.status(400).json({ error: 'Invalid temperature' });
            }

            await ContactModel.updateTemperature(temperature, phoneNumber);
            res.json({ success: true, temperature });
        } catch (error) {
            console.error('Error updating temperature:', error);
            res.status(500).json({ error: 'Failed to update temperature' });
        }
    }

    /**
     * PUT /api/contacts/:phoneNumber/name - Update contact name
     */
    static async updateName(req, res) {
        try {
            const { phoneNumber } = req.params;
            const { name } = req.body;

            if (!name || name.trim().length === 0) {
                return res.status(400).json({ error: 'Name cannot be empty' });
            }

            await ContactModel.updateName(name.trim(), phoneNumber);
            res.json({ success: true, name: name.trim() });
        } catch (error) {
            console.error('Error updating contact name:', error);
            res.status(500).json({ error: 'Failed to update contact name' });
        }
    }

    /**
     * PUT /api/contacts/:phoneNumber/source - Update contact source
     */
    static async updateSource(req, res) {
        try {
            const { phoneNumber } = req.params;
            const { source } = req.body;

            const validSources = ['instagram', 'meta_ads', 'qr_code', 'facebook', 'whatsapp_link', 'referral', 'website', 'other', null, ''];
            if (source !== undefined && !validSources.includes(source)) {
                return res.status(400).json({ error: 'Invalid source' });
            }

            await ContactModel.updateSource(source || null, phoneNumber);
            res.json({ success: true, source: source || null });
        } catch (error) {
            console.error('Error updating source:', error);
            res.status(500).json({ error: 'Failed to update source' });
        }
    }

    /**
     * GET /api/sources/breakdown - Get source breakdown counts
     */
    static async getSourceBreakdown(req, res) {
        try {
            const supabase = require('../config/supabase');
            const { data: contacts, error } = await supabase
                .from('contacts')
                .select('source');
            if (error) throw error;

            const counts = {};
            contacts.forEach(c => {
                const s = c.source || 'unknown';
                counts[s] = (counts[s] || 0) + 1;
            });

            const breakdown = Object.entries(counts)
                .map(([source, count]) => ({ source, count }))
                .sort((a, b) => b.count - a.count);

            res.json(breakdown);
        } catch (error) {
            console.error('Error fetching source breakdown:', error);
            res.status(500).json({ error: 'Failed to fetch source breakdown' });
        }
    }

    /**
     * GET /api/sources/:source/contacts - Get contacts by source
     */
    static async getContactsBySource(req, res) {
        try {
            const { source } = req.params;
            const contacts = await ContactModel.getBySource(source === 'unknown' ? null : source);
            res.json(contacts);
        } catch (error) {
            console.error('Error fetching contacts by source:', error);
            res.status(500).json({ error: 'Failed to fetch contacts by source' });
        }
    }
}

module.exports = ContactController;
