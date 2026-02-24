const SegmentModel = require('../models/segmentModel');

class SegmentController {
    static async getAllSegments(req, res) {
        try {
            const segments = await SegmentModel.getAll();
            res.json(segments);
        } catch (error) {
            console.error('Error fetching segments:', error);
            res.status(500).json({ error: 'Failed to fetch segments' });
        }
    }

    static async getSegment(req, res) {
        try {
            const { id } = req.params;
            const segment = await SegmentModel.getById(id);
            if (!segment) return res.status(404).json({ error: 'Segment not found' });
            res.json(segment);
        } catch (error) {
            console.error('Error fetching segment:', error);
            res.status(500).json({ error: 'Failed to fetch segment' });
        }
    }

    static async createSegment(req, res) {
        try {
            const { name, description = '' } = req.body;
            if (!name) return res.status(400).json({ error: 'Segment name is required' });

            const existing = await SegmentModel.getByName(name);
            if (existing) return res.status(409).json({ error: 'Segment with this name already exists' });

            const newSegment = await SegmentModel.create(name, description);
            console.log(`✅ Created segment: ${name}`);
            res.status(201).json(newSegment);
        } catch (error) {
            console.error('Error creating segment:', error);
            res.status(500).json({ error: 'Failed to create segment' });
        }
    }

    static async updateSegment(req, res) {
        try {
            const { id } = req.params;
            const { name, description } = req.body;
            if (!name) return res.status(400).json({ error: 'Segment name is required' });

            const segment = await SegmentModel.getById(id);
            if (!segment) return res.status(404).json({ error: 'Segment not found' });

            await SegmentModel.update(id, name, description || '');
            const updated = await SegmentModel.getById(id);
            res.json(updated);
        } catch (error) {
            console.error('Error updating segment:', error);
            res.status(500).json({ error: 'Failed to update segment' });
        }
    }

    static async deleteSegment(req, res) {
        try {
            const { id } = req.params;
            const segment = await SegmentModel.getById(id);
            if (!segment) return res.status(404).json({ error: 'Segment not found' });

            await SegmentModel.delete(id);
            res.json({ success: true, message: 'Segment deleted' });
        } catch (error) {
            console.error('Error deleting segment:', error);
            res.status(500).json({ error: 'Failed to delete segment' });
        }
    }

    static async getSegmentContacts(req, res) {
        try {
            const { id } = req.params;
            const contacts = await SegmentModel.getContacts(id);
            res.json(contacts);
        } catch (error) {
            console.error('Error fetching segment contacts:', error);
            res.status(500).json({ error: 'Failed to fetch contacts' });
        }
    }

    static async addContactsToSegment(req, res) {
        try {
            const { id } = req.params;
            const { contactIds, phoneNumbers } = req.body;

            const segment = await SegmentModel.getById(id);
            if (!segment) return res.status(404).json({ error: 'Segment not found' });

            let idsToAdd = contactIds || [];

            if (phoneNumbers && phoneNumbers.length > 0) {
                for (const phone of phoneNumbers) {
                    const contact = await SegmentModel.getContactIdByPhone(phone);
                    if (contact) idsToAdd.push(contact.id);
                }
            }

            if (idsToAdd.length === 0) return res.status(400).json({ error: 'No valid contacts provided' });

            await SegmentModel.addMultipleContacts(id, idsToAdd);
            const updated = await SegmentModel.getById(id);
            res.json({ success: true, added: idsToAdd.length, segment: updated });
        } catch (error) {
            console.error('Error adding contacts to segment:', error);
            res.status(500).json({ error: 'Failed to add contacts' });
        }
    }

    static async removeContactFromSegment(req, res) {
        try {
            const { id, contactId } = req.params;
            await SegmentModel.removeContact(contactId, id);
            res.json({ success: true });
        } catch (error) {
            console.error('Error removing contact from segment:', error);
            res.status(500).json({ error: 'Failed to remove contact' });
        }
    }

    static async getContactSegments(req, res) {
        try {
            const { phoneNumber } = req.params;
            const contact = await SegmentModel.getContactIdByPhone(phoneNumber);
            if (!contact) return res.status(404).json({ error: 'Contact not found' });

            const segments = await SegmentModel.getContactSegments(contact.id);
            res.json(segments);
        } catch (error) {
            console.error('Error fetching contact segments:', error);
            res.status(500).json({ error: 'Failed to fetch segments' });
        }
    }
}

module.exports = SegmentController;
