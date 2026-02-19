const { MessageModel, ContactModel } = require('../models/queries');
const supabase = require('../config/supabase');
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
        res.sendStatus(200);

        const botUrl = process.env.BOT_WEBHOOK_URL;
        if (botUrl) {
            whatsappService.forwardToBot(req.body, req.headers, botUrl).catch(err => {
                console.error('⚠️  Failed to forward to bot:', err.message);
            });
        }

        try {
            const body = req.body;

            if (!body.object || body.object !== 'whatsapp_business_account') {
                return;
            }

            if (body.entry && body.entry.length > 0) {
                for (const entry of body.entry) {
                    if (entry.changes && entry.changes.length > 0) {
                        for (const change of entry.changes) {
                            if (change.value?.messages) {
                                for (const message of change.value.messages) {
                                    await WebhookController.processIncomingMessage(
                                        message,
                                        change.value.contacts?.[0]
                                    );
                                }
                            }

                            if (change.value?.statuses) {
                                for (const status of change.value.statuses) {
                                    await WebhookController.processMessageStatus(status);
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
                        await WebhookController.trackButtonInteraction(fromNumber, messageId, buttonTitle);
                    } else if (message.interactive.type === 'list_reply') {
                        const listTitle = message.interactive.list_reply.title;
                        const listDesc = message.interactive.list_reply.description;
                        messageText = `📋 Selected: "${listTitle}"${listDesc ? ` - ${listDesc}` : ''}`;
                        await WebhookController.trackButtonInteraction(fromNumber, messageId, listTitle);
                    } else {
                        messageText = `[Interactive: ${message.interactive.type}]`;
                    }
                    break;
                case 'button':
                    messageText = message.button.text || '[Button Response]';
                    await WebhookController.trackButtonInteraction(fromNumber, messageId, messageText);
                    break;
                default:
                    messageText = `[${messageType}]`;
            }

            console.log(`📨 Processing ${messageType} message from ${fromNumber}: ${messageText}`);

            // Store message
            const result = await MessageModel.insert({
                whatsapp_message_id: messageId,
                from_number: fromNumber,
                profile_name: profileName,
                message_type: messageType,
                message_text: messageText,
                media_id: mediaId,
                media_url: metaMediaUrl,
                media_mime_type: mediaMimeType,
                timestamp,
                direction: 'incoming'
            });

            if (result.isDuplicate) {
                console.log('ℹ️  Duplicate message, skipping...');
                return;
            }

            console.log('✅ Message stored in database');

            // Update contact
            await ContactModel.upsert(fromNumber, profileName, timestamp);
            console.log('✅ Contact updated');

            // Exit workflow if contact replies
            const contactData = await ContactModel.getByPhone(fromNumber);
            if (contactData && contactData.workflow_id) {
                await ContactModel.clearWorkflow(contactData.id);
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
     * Process message status update
     */
    static async processMessageStatus(status) {
        try {
            const messageId = status.id;
            const statusValue = status.status;
            const recipientId = status.recipient_id;

            console.log(`📊 Status for ${messageId}: ${statusValue} → ${recipientId}`);

            const existingMessage = await MessageModel.getById(messageId);

            if (!existingMessage && (statusValue === 'sent' || statusValue === 'delivered')) {
                console.log(`💾 Storing bot's outgoing message to ${recipientId}`);
                const timestamp = Math.floor(Date.now() / 1000);

                try {
                    await MessageModel.insert({
                        whatsapp_message_id: messageId,
                        from_number: recipientId,
                        profile_name: 'Bot',
                        message_type: 'text',
                        message_text: '[Bot Message]',
                        media_id: null,
                        media_url: null,
                        media_mime_type: null,
                        timestamp,
                        direction: 'outgoing'
                    });
                    await ContactModel.upsert(recipientId, recipientId, timestamp);
                    console.log('✅ Bot message stored');
                } catch (error) {
                    console.error('⚠️  Error storing bot message:', error.message);
                }
            }

            await MessageModel.updateStatus(statusValue, messageId);
            console.log(`✅ Status updated to: ${statusValue}`);
        } catch (error) {
            console.error('❌ Error processing status:', error);
        }
    }

    /**
     * Track button interaction and auto-update lead temperature
     */
    static async trackButtonInteraction(phoneNumber, messageId, buttonText) {
        try {
            const contact = await ContactModel.getByPhone(phoneNumber);
            if (!contact) {
                console.log('⚠️  Contact not found for button tracking');
                return;
            }

            // Insert button interaction
            await supabase.from('button_interactions').insert({
                contact_id: contact.id,
                message_id: messageId,
                button_text: buttonText
            });

            // Increment click count
            const newCount = (contact.button_click_count || 0) + 1;
            await supabase.from('contacts')
                .update({ button_click_count: newCount })
                .eq('id', contact.id);

            // Auto-update temperature
            const newTemperature = newCount >= 5 ? 'hot' : 'cold';
            if (newTemperature !== contact.lead_temperature) {
                await supabase.from('contacts')
                    .update({ lead_temperature: newTemperature })
                    .eq('id', contact.id);
                console.log(`🌡️  Lead temperature auto-updated: ${contact.lead_temperature} → ${newTemperature} (${newCount} clicks)`);
            }

            console.log(`✅ Button interaction tracked: ${phoneNumber} clicked "${buttonText}" (Total: ${newCount} clicks)`);
        } catch (error) {
            console.error('❌ Error tracking button interaction:', error);
        }
    }
}

module.exports = WebhookController;
