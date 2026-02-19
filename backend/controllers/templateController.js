const templateService = require('../services/templateService');
const SegmentModel = require('../models/segmentModel');
const supabase = require('../config/supabase');

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
                contacts = await SegmentModel.getContacts(segmentId);
            }
            // Get specific contacts by IDs
            else if (contactIds && contactIds.length > 0) {
                const { data, error } = await supabase
                    .from('contacts')
                    .select('*')
                    .in('id', contactIds);

                if (error) throw error;
                contacts = data;
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
            const { data: bulkSendRecord, error: createError } = await supabase
                .from('template_messages')
                .insert({
                    template_name: templateName,
                    segment_id: segmentId || null,
                    total_sent: 0
                })
                .select()
                .single();

            if (createError) throw createError;
            const bulkSendId = bulkSendRecord.id;

            // Send in background (don't wait for completion)
            // Note: In a serverless environment (like Vercel functions), this pattern might not work 
            // and you'd need a queue. For a persistent Node server, this is fine.
            setImmediate(async () => {
                try {
                    const results = await templateService.sendBulkTemplateMessages(
                        contacts,
                        templateName,
                        languageCode,
                        components,
                        async (progress) => {
                            // Optional: Update progress in DB if you want real-time progress bars
                            // For now we just log to console to save DB writes
                            console.log(`📊 Progress: ${progress.percentage}% (${progress.current}/${progress.total})`);
                        }
                    );

                    // Update bulk send record with actual results
                    await supabase
                        .from('template_messages')
                        .update({
                            total_sent: results.sent,
                            total_failed: results.failed
                        })
                        .eq('id', bulkSendId);

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
    static async getBulkStatus(req, res) {
        try {
            const { jobId } = req.params;

            const { data: bulkSend, error } = await supabase
                .from('template_messages')
                .select('*')
                .eq('id', jobId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

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
    static async getBulkHistory(req, res) {
        try {
            const { data: history, error } = await supabase
                .from('template_messages')
                .select('*, segments(name)')
                .order('sent_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            // Flatten segment name
            const result = history.map(item => ({
                ...item,
                segment_name: item.segments?.name
            }));

            res.json(result);
        } catch (error) {
            console.error('Error fetching bulk send history:', error);
            res.status(500).json({ error: 'Failed to fetch history' });
        }
    }
}

module.exports = TemplateController;
