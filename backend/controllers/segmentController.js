const SegmentModel = require('../models/segmentModel');

class SegmentController {
    /**
     * GET /api/segments - Get all segments
     */
    static getAllSegments(req, res) {
        try {
            const segments = SegmentModel.getAll.all();
            res.json(segments);
        } catch (error) {
            console.error('Error fetching segments:', error);
            res.status(500).json({ error: 'Failed to fetch segments' });
        }
    }

    /**
     * GET /api/segments/:id - Get segment by ID
     */
    static getSegment(req, res) {
        try {
            const { id } = req.params;
            const segment = SegmentModel.getById.get(id);

            if (!segment) {
                return res.status(404).json({ error: 'Segment not found' });
            }

            res.json(segment);
        } catch (error) {
            console.error('Error fetching segment:', error);
            res.status(500).json({ error: 'Failed to fetch segment' });
        }
    }

    /**
     * POST /api/segments - Create new segment
     */
    static createSegment(req, res) {
        try {
            const { name, description = '' } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Segment name is required' });
            }

            // Check if segment already exists
            const existing = SegmentModel.getByName.get(name);
            if (existing) {
                return res.status(409).json({ error: 'Segment with this name already exists' });
            }

            const result = SegmentModel.create.run(name, description);
            const newSegment = SegmentModel.getById.get(result.lastInsertRowid);

            console.log(`✅ Created segment: ${name}`);
            res.status(201).json(newSegment);
        } catch (error) {
            console.error('Error creating segment:', error);
            res.status(500).json({ error: 'Failed to create segment' });
        }
    }

    /**
     * PUT /api/segments/:id - Update segment
     */
    static updateSegment(req, res) {
        try {
            const { id } = req.params;
            const { name, description } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Segment name is required' });
            }

            const segment = SegmentModel.getById.get(id);
            if (!segment) {
                return res.status(404).json({ error: 'Segment not found' });
            }

            SegmentModel.update.run(name, description || '', id);
            const updated = SegmentModel.getById.get(id);

            console.log(`✅ Updated segment: ${name}`);
            res.json(updated);
        } catch (error) {
            console.error('Error updating segment:', error);
            res.status(500).json({ error: 'Failed to update segment' });
        }
    }

    /**
     * DELETE /api/segments/:id - Delete segment
     */
    static deleteSegment(req, res) {
        try {
            const { id } = req.params;

            const segment = SegmentModel.getById.get(id);
            if (!segment) {
                return res.status(404).json({ error: 'Segment not found' });
            }

            SegmentModel.delete.run(id);

            console.log(`✅ Deleted segment: ${segment.name}`);
            res.json({ success: true, message: 'Segment deleted' });
        } catch (error) {
            console.error('Error deleting segment:', error);
            res.status(500).json({ error: 'Failed to delete segment' });
        }
    }

    /**
     * GET /api/segments/:id/contacts - Get contacts in segment
     */
    static getSegmentContacts(req, res) {
        try {
            const { id } = req.params;
            const contacts = SegmentModel.getContacts.all(id);
            res.json(contacts);
        } catch (error) {
            console.error('Error fetching segment contacts:', error);
            res.status(500).json({ error: 'Failed to fetch contacts' });
        }
    }

    /**
     * POST /api/segments/:id/contacts - Add contacts to segment
     */
    static addContactsToSegment(req, res) {
        try {
            const { id } = req.params;
            const { contactIds, phoneNumbers } = req.body;

            const segment = SegmentModel.getById.get(id);
            if (!segment) {
                return res.status(404).json({ error: 'Segment not found' });
            }

            let idsToAdd = contactIds || [];

            // If phone numbers provided, convert to IDs
            if (phoneNumbers && phoneNumbers.length > 0) {
                for (const phone of phoneNumbers) {
                    const contact = SegmentModel.getContactIdByPhone.get(phone);
                    if (contact) {
                        idsToAdd.push(contact.id);
                    }
                }
            }

            if (idsToAdd.length === 0) {
                return res.status(400).json({ error: 'No valid contacts provided' });
            }

            SegmentModel.addMultipleContacts(id, idsToAdd);

            console.log(`✅ Added ${idsToAdd.length} contacts to segment: ${segment.name}`);
            res.json({
                success: true,
                added: idsToAdd.length,
                segment: SegmentModel.getById.get(id)
            });
        } catch (error) {
            console.error('Error adding contacts to segment:', error);
            res.status(500).json({ error: 'Failed to add contacts' });
        }
    }

    /**
     * DELETE /api/segments/:id/contacts/:contactId - Remove contact from segment
     */
    static removeContactFromSegment(req, res) {
        try {
            const { id, contactId } = req.params;

            SegmentModel.removeContact.run(contactId, id);

            console.log(`✅ Removed contact ${contactId} from segment ${id}`);
            res.json({ success: true });
        } catch (error) {
            console.error('Error removing contact from segment:', error);
            res.status(500).json({ error: 'Failed to remove contact' });
        }
    }

    /**
     * GET /api/contacts/:phoneNumber/segments - Get segments for a contact
     */
    static getContactSegments(req, res) {
        try {
            const { phoneNumber } = req.params;
            const contact = SegmentModel.getContactIdByPhone.get(phoneNumber);

            if (!contact) {
                return res.status(404).json({ error: 'Contact not found' });
            }

            const segments = SegmentModel.getContactSegments.all(contact.id);
            res.json(segments);
        } catch (error) {
            console.error('Error fetching contact segments:', error);
            res.status(500).json({ error: 'Failed to fetch segments' });
        }
    }
}

module.exports = SegmentController;
