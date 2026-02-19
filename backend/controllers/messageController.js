const { MessageModel } = require('../models/queries');
const whatsappService = require('../services/whatsappService');

class MessageController {
    /**
     * GET /api/messages/:phoneNumber - Get messages for a contact
     */
    static async getMessages(req, res) {
        try {
            const { phoneNumber } = req.params;
            const messages = await MessageModel.getByPhoneNumber(phoneNumber);
            res.json(messages);
        } catch (error) {
            console.error('Error fetching messages:', error);
            res.status(500).json({ error: 'Failed to fetch messages' });
        }
    }

    /**
     * POST /api/send - Send a message to WhatsApp
     */
    static async sendMessage(req, res) {
        try {
            const { to, message } = req.body;

            if (!to || !message) {
                return res.status(400).json({ error: 'Missing required fields: to, message' });
            }

            const result = await whatsappService.sendTextMessage(to, message);

            if (!result.success) {
                throw new Error(result.error);
            }

            const messageId = result.messageId;
            const timestamp = Math.floor(Date.now() / 1000);

            await MessageModel.insert({
                whatsapp_message_id: messageId,
                from_number: to,
                profile_name: 'You',
                message_type: 'text',
                message_text: message,
                media_id: null,
                media_url: null,
                media_mime_type: null,
                timestamp,
                direction: 'outgoing'
            });

            console.log(`✅ Message sent to ${to}`);
            res.json({ success: true, messageId });
        } catch (error) {
            console.error('❌ Error sending message:', error);
            res.status(500).json({
                error: 'Failed to send message',
                details: error.message
            });
        }
    }

    /**
     * POST /api/bot-message - Store bot's sent message
     */
    static async storeBotMessage(req, res) {
        try {
            const {
                whatsapp_message_id,
                to_number,
                message_text,
                message_type = 'text',
                media_url = null,
                timestamp = Math.floor(Date.now() / 1000)
            } = req.body;

            console.log(`📥 Bot message for ${to_number}: ${message_text}`);

            await MessageModel.insert({
                whatsapp_message_id,
                from_number: to_number,
                profile_name: 'Bot',
                message_type,
                message_text,
                media_id: null,
                media_url,
                media_mime_type: null,
                timestamp,
                direction: 'outgoing'
            });

            console.log('✅ Bot message stored');
            res.json({ success: true });
        } catch (error) {
            console.error('❌ Error storing bot message:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * PUT /api/messages/read/:phoneNumber - Mark messages as read
     */
    static async markAsRead(req, res) {
        try {
            const { phoneNumber } = req.params;
            await MessageModel.markAsRead(phoneNumber);
            res.json({ success: true });
        } catch (error) {
            console.error('Error marking messages as read:', error);
            res.status(500).json({ error: 'Failed to mark messages as read' });
        }
    }
}

module.exports = MessageController;
