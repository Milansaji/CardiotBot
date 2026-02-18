const { MessageModel, ContactModel } = require('../models/queries');
const whatsappService = require('../services/whatsappService');
const mediaService = require('../services/mediaService');

class WebhookController {
    /**
     * GET /webhook - Webhook verification
     */
    static verifyWebhook(req, res) {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        console.log('📞 Webhook verification request received');
        console.log('Mode:', mode);
        console.log('Token:', token);

        if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
            console.log('✅ Webhook verified successfully!');
            res.status(200).send(challenge);
        } else {
            console.log('❌ Webhook verification failed!');
            res.sendStatus(403);
        }
    }

    /**
     * POST /webhook - Receive messages from WhatsApp
     */
    static async receiveWebhook(req, res) {
        // Respond immediately to Meta (requirement: within 20 seconds)
        res.sendStatus(200);

        // Forward to bot if configured (async, non-blocking)
        const botUrl = process.env.BOT_WEBHOOK_URL;
        if (botUrl) {
            whatsappService.forwardToBot(req.body, req.headers, botUrl).catch(err => {
                console.error('⚠️  Failed to forward to bot:', err.message);
            });
        }

        try {
            const body = req.body;

            // Validate webhook
            if (!body.object || body.object !== 'whatsapp_business_account') {
                console.log('⚠️  Invalid webhook object:', body.object);
                return;
            }

            console.log('✅ Valid WhatsApp Business Account webhook detected');

            // Process entries
            if (body.entry && body.entry.length > 0) {
                console.log(`📦 Processing ${body.entry.length} entry/entries`);

                for (const entry of body.entry) {
                    if (entry.changes && entry.changes.length > 0) {
                        for (const change of entry.changes) {
                            // Handle incoming messages
                            if (change.value?.messages) {
                                for (const message of change.value.messages) {
                                    await WebhookController.processIncomingMessage(
                                        message,
                                        change.value.contacts?.[0]
                                    );
                                }
                            }

                            // Handle status updates (delivery, read, sent by bot)
                            if (change.value?.statuses) {
                                for (const status of change.value.statuses) {
                                    WebhookController.processMessageStatus(status);
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error processing webhook:', error);
        }
    }

    /**
     * Process incoming message
     */
    static async processIncomingMessage(message, contact) {
        try {
            const messageId = message.id;
            const fromNumber = message.from;
            const profileName = contact?.profile?.name || fromNumber;
            const timestamp = parseInt(message.timestamp);
            const messageType = message.type;

            let messageText = '';
            let mediaId = null;
            let metaMediaUrl = null;
            let mediaMimeType = null;

            // Extract message content based on type
            switch (messageType) {
                case 'text':
                    messageText = message.text.body;
                    break;

                case 'image':
                    mediaId = message.image.id;
                    mediaMimeType = message.image.mime_type;
                    metaMediaUrl = message.image.url;
                    messageText = message.image.caption || '[Image]';
                    break;

                case 'video':
                    mediaId = message.video.id;
                    mediaMimeType = message.video.mime_type;
                    metaMediaUrl = message.video.url;
                    messageText = message.video.caption || '[Video]';
                    break;

                case 'audio':
                    mediaId = message.audio.id;
                    mediaMimeType = message.audio.mime_type;
                    metaMediaUrl = message.audio.url;
                    messageText = '[Audio]';
                    break;

                case 'document':
                    mediaId = message.document.id;
                    mediaMimeType = message.document.mime_type;
                    metaMediaUrl = message.document.url;
                    messageText = message.document.filename || '[Document]';
                    break;

                case 'interactive':
                    if (message.interactive.type === 'button_reply') {
                        const buttonTitle = message.interactive.button_reply.title;
                        messageText = `🔘 Clicked: "${buttonTitle}"`;

                        // Track button interaction
                        await WebhookController.trackButtonInteraction(
                            fromNumber,
                            messageId,
                            buttonTitle
                        );
                    } else if (message.interactive.type === 'list_reply') {
                        const listTitle = message.interactive.list_reply.title;
                        const listDesc = message.interactive.list_reply.description;
                        messageText = `📋 Selected: "${listTitle}"${listDesc ? ` - ${listDesc}` : ''}`;

                        // Track list interaction as button click
                        await WebhookController.trackButtonInteraction(
                            fromNumber,
                            messageId,
                            listTitle
                        );
                    } else {
                        messageText = `[Interactive: ${message.interactive.type}]`;
                    }
                    break;

                case 'button':
                    messageText = message.button.text || '[Button Response]';

                    // Track button interaction
                    await WebhookController.trackButtonInteraction(
                        fromNumber,
                        messageId,
                        messageText
                    );
                    break;

                default:
                    messageText = `[${messageType}]`;
            }

            console.log(`📨 Processing ${messageType} message from ${fromNumber}: ${messageText}`);

            // Store message in database
            try {
                MessageModel.insert.run(
                    messageId,
                    fromNumber,
                    profileName,
                    messageType,
                    messageText,
                    mediaId,
                    metaMediaUrl,
                    mediaMimeType,
                    timestamp,
                    'incoming'
                );
                console.log('✅ Message stored in database');
            } catch (error) {
                if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    console.log('ℹ️  Duplicate message, skipping...');
                    return;
                }
                throw error;
            }

            // Update contact
            ContactModel.upsert.run(fromNumber, profileName, timestamp);
            console.log('✅ Contact updated');

            // Exit workflow if contact replies (they're now active again)
            const db = require('../config/database');
            const dbContact = db.prepare('SELECT id, workflow_id FROM contacts WHERE phone_number = ?').get(fromNumber);
            if (dbContact && dbContact.workflow_id) {
                db.prepare(`
                    UPDATE contacts 
                    SET workflow_id = NULL, 
                        workflow_step = 0, 
                        workflow_paused = 0,
                        last_workflow_sent_at = NULL
                    WHERE id = ?
                `).run(dbContact.id);
                console.log(`🔄 Contact ${fromNumber} removed from workflow (replied)`);
            }

            // Download media in background
            if (mediaId) {
                mediaService.downloadMedia(mediaId, messageId).catch(err => {
                    console.error('⚠️  Media download failed:', err.message);
                });
            }

        } catch (error) {
            console.error('❌ Error processing incoming message:', error);
        }
    }

    /**
     * Process message status update (delivery, read, sent by bot)
     */
    static processMessageStatus(status) {
        try {
            const messageId = status.id;
            const statusValue = status.status;
            const recipientId = status.recipient_id;

            console.log(`📊 Status for ${messageId}: ${statusValue} → ${recipientId}`);

            // Check if message exists
            const existingMessage = MessageModel.getById.get(messageId);

            // If doesn't exist and is sent/delivered, it's a bot's outgoing message
            if (!existingMessage && (statusValue === 'sent' || statusValue === 'delivered')) {
                console.log(`💾 Storing bot's outgoing message to ${recipientId}`);
                const timestamp = Math.floor(Date.now() / 1000);

                try {
                    MessageModel.insert.run(
                        messageId,
                        recipientId,
                        'Bot',
                        'text',
                        '[Bot Message]',
                        null,
                        null,
                        null,
                        timestamp,
                        'outgoing'
                    );
                    ContactModel.upsert.run(recipientId, recipientId, timestamp);
                    console.log('✅ Bot message stored');
                } catch (error) {
                    if (error.code !== 'SQLITE_CONSTRAINT_UNIQUE') {
                        console.error('⚠️  Error storing bot message:', error.message);
                    }
                }
            }

            // Update status
            const result = MessageModel.updateStatus.run(statusValue, messageId);
            if (result.changes > 0) {
                console.log(`✅ Status updated to: ${statusValue}`);
            }
        } catch (error) {
            console.error('❌ Error processing status:', error);
        }
    }

    /**
     * Track button interaction and auto-update lead temperature
     */
    static async trackButtonInteraction(phoneNumber, messageId, buttonText) {
        try {
            const db = require('../config/database');

            // Get contact ID
            const contact = ContactModel.getByPhone.get(phoneNumber);
            if (!contact) {
                console.log('⚠️  Contact not found for button tracking');
                return;
            }

            // Insert button interaction
            const insertInteraction = db.prepare(`
                INSERT INTO button_interactions (contact_id, message_id, button_text)
                VALUES (?, ?, ?)
            `);
            insertInteraction.run(contact.id, messageId, buttonText);

            // Update button click count
            const updateClickCount = db.prepare(`
                UPDATE contacts 
                SET button_click_count = button_click_count + 1
                WHERE id = ?
            `);
            updateClickCount.run(contact.id);

            // Get updated click count
            const getClickCount = db.prepare(`
                SELECT button_click_count FROM contacts WHERE id = ?
            `);
            const updated = getClickCount.get(contact.id);
            const clickCount = updated.button_click_count;

            // Auto-update lead temperature based on clicks:
            // Default = warm, < 5 total clicks = cold, >= 5 clicks = hot
            let newTemperature;
            if (clickCount >= 5) {
                newTemperature = 'hot';
            } else if (clickCount < 5) {
                newTemperature = 'cold';
            } else {
                newTemperature = 'warm'; // fallback
            }

            // Only update if temperature changed
            if (newTemperature !== contact.lead_temperature) {
                const updateTemp = db.prepare(`
                    UPDATE contacts 
                    SET lead_temperature = ?
                    WHERE id = ?
                `);
                updateTemp.run(newTemperature, contact.id);
                console.log(`🌡️  Lead temperature auto-updated: ${contact.lead_temperature} → ${newTemperature} (${clickCount} clicks)`);
            }

            console.log(`✅ Button interaction tracked: ${phoneNumber} clicked "${buttonText}" (Total: ${clickCount} clicks)`);
        } catch (error) {
            console.error('❌ Error tracking button interaction:', error);
        }
    }
}

module.exports = WebhookController;
