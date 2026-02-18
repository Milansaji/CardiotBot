const templateService = require('../services/templateService');
const SegmentModel = require('../models/segmentModel');
const db = require('../config/database');

class TemplateController {
    /**
     * GET /api/templates - Get all approved templates from Meta
     */
    static async getTemplates(req, res) {
        try {
            const templates = await templateService.getApprovedTemplates();
            res.json(templates);
        } catch (error) {
            console.error('Error fetching templates:', error);
            res.status(500).json({
                error: 'Failed to fetch templates',
                details: error.message
            });
        }
    }

    /**
     * GET /api/templates/:name - Get specific template by name
     */
    static async getTemplate(req, res) {
        try {
            const { name } = req.params;
            const template = await templateService.getTemplateByName(name);

            if (!template) {
                return res.status(404).json({ error: 'Template not found' });
            }

            res.json(template);
        } catch (error) {
            console.error('Error fetching template:', error);
            res.status(500).json({ error: 'Failed to fetch template' });
        }
    }

    /**
     * POST /api/templates/send - Send template message
     */
    static async sendTemplate(req, res) {
        try {
            const {
                to,
                templateName,
                languageCode = 'en_US',
                components = []
            } = req.body;

            if (!to || !templateName) {
                return res.status(400).json({
                    error: 'Missing required fields: to, templateName'
                });
            }

            const result = await templateService.sendTemplateMessage(
                to,
                templateName,
                languageCode,
                components
            );

            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
        } catch (error) {
            console.error('Error sending template:', error);
            res.status(500).json({
                error: 'Failed to send template',
                details: error.message
            });
        }
    }

    /**
     * POST /api/bulk/send - Send bulk template messages
     */
    static async sendBulk(req, res) {
        try {
            const {
                segmentId,
                contactIds,
                templateName,
                languageCode = 'en_US',
                components = []
            } = req.body;

            if (!templateName) {
                return res.status(400).json({ error: 'Template name is required' });
            }

            let contacts = [];

            // Get contacts from segment
            if (segmentId) {
                contacts = SegmentModel.getContacts.all(segmentId);
            }
            // Get specific contacts by IDs
            else if (contactIds && contactIds.length > 0) {
                const getContact = db.prepare('SELECT * FROM contacts WHERE id = ?');
                contacts = contactIds.map(id => getContact.get(id)).filter(Boolean);
            } else {
                return res.status(400).json({
                    error: 'Either segmentId or contactIds must be provided'
                });
            }

            if (contacts.length === 0) {
                return res.status(400).json({ error: 'No contacts found' });
            }

            console.log(`📤 Starting bulk send to ${contacts.length} contacts`);

            // Create bulk send record
            const createBulkSend = db.prepare(`
                INSERT INTO template_messages (template_name, segment_id, total_sent)
                VALUES (?, ?, 0)
            `);
            const bulkSendRecord = createBulkSend.run(templateName, segmentId || null);
            const bulkSendId = bulkSendRecord.lastInsertRowid;

            // Send in background (don't wait for completion)
            setImmediate(async () => {
                try {
                    const results = await templateService.sendBulkTemplateMessages(
                        contacts,
                        templateName,
                        languageCode,
                        components,
                        (progress) => {
                            console.log(`📊 Progress: ${progress.percentage}% (${progress.current}/${progress.total})`);
                        }
                    );

                    // Update bulk send record with actual results
                    const updateBulkSend = db.prepare(`
                        UPDATE template_messages 
                        SET total_sent = ?, total_failed = ?
                        WHERE id = ?
                    `);
                    updateBulkSend.run(results.sent, results.failed, bulkSendId);

                    console.log(`✅ Bulk send ${bulkSendId} completed: ${results.sent} sent, ${results.failed} failed out of ${results.total}`);
                } catch (error) {
                    console.error(`❌ Bulk send ${bulkSendId} failed:`, error);
                }
            });

            // Return immediately with job ID
            res.json({
                success: true,
                jobId: bulkSendId,
                totalContacts: contacts.length,
                message: 'Bulk send started in background'
            });

        } catch (error) {
            console.error('Error starting bulk send:', error);
            res.status(500).json({
                error: 'Failed to start bulk send',
                details: error.message
            });
        }
    }

    /**
     * GET /api/bulk/status/:jobId - Get bulk send status
     */
    static getBulkStatus(req, res) {
        try {
            const { jobId } = req.params;

            const getBulkSend = db.prepare(`
                SELECT * FROM template_messages WHERE id = ?
            `);
            const bulkSend = getBulkSend.get(jobId);

            if (!bulkSend) {
                return res.status(404).json({ error: 'Bulk send job not found' });
            }

            res.json(bulkSend);
        } catch (error) {
            console.error('Error fetching bulk send status:', error);
            res.status(500).json({ error: 'Failed to fetch status' });
        }
    }

    /**
     * GET /api/bulk/history - Get bulk send history
     */
    static getBulkHistory(req, res) {
        try {
            const getHistory = db.prepare(`
                SELECT tm.*, s.name as segment_name
                FROM template_messages tm
                LEFT JOIN segments s ON tm.segment_id = s.id
                ORDER BY tm.sent_at DESC
                LIMIT 50
            `);

            const history = getHistory.all();
            res.json(history);
        } catch (error) {
            console.error('Error fetching bulk send history:', error);
            res.status(500).json({ error: 'Failed to fetch history' });
        }
    }
}

module.exports = TemplateController;
