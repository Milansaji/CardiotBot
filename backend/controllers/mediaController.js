const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { MessageModel } = require('../models/queries');

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

class MediaController {
    /**
     * POST /api/media/upload - Upload media to WhatsApp
     */
    static async uploadMedia(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const file = req.file;
            console.log('📤 Uploading media:', file.originalname, file.mimetype, file.size);

            const formData = new FormData();
            formData.append('file', fs.createReadStream(file.path), {
                filename: file.originalname,
                contentType: file.mimetype
            });
            formData.append('messaging_product', 'whatsapp');

            const response = await axios.post(
                `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/media`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'Authorization': `Bearer ${WHATSAPP_TOKEN}`
                    }
                }
            );

            try { fs.unlinkSync(file.path); } catch (e) { }

            console.log('✅ Media uploaded successfully:', response.data.id);

            res.json({
                success: true,
                mediaId: response.data.id,
                filename: file.originalname,
                mimetype: file.mimetype,
                size: file.size
            });
        } catch (error) {
            console.error('❌ Error uploading media:', error.response?.data || error.message);

            if (req.file && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (e) { }
            }

            res.status(500).json({
                error: 'Failed to upload media',
                details: error.response?.data || error.message
            });
        }
    }

    /**
     * POST /api/media/send - Send media message and store in DB
     */
    static async sendMediaMessage(req, res) {
        try {
            const { to, mediaId, mediaType, caption, filename } = req.body;

            if (!to || !mediaId || !mediaType) {
                return res.status(400).json({
                    error: 'Missing required fields: to, mediaId, mediaType'
                });
            }

            console.log('📨 Sending media message:', { to, mediaType, mediaId });

            const messagePayload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: mediaType
            };

            if (mediaType === 'image') {
                messagePayload.image = { id: mediaId, caption: caption || '' };
            } else if (mediaType === 'document') {
                messagePayload.document = { id: mediaId, caption: caption || '', filename: filename || 'document' };
            } else if (mediaType === 'audio') {
                messagePayload.audio = { id: mediaId };
            } else if (mediaType === 'video') {
                messagePayload.video = { id: mediaId, caption: caption || '' };
            }

            const response = await axios.post(
                `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
                messagePayload,
                {
                    headers: {
                        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const sentMessageId = response.data.messages[0].id;
            const timestamp = Math.floor(Date.now() / 1000);

            try {
                const mediaLabel = caption || filename || (
                    mediaType === 'image' ? '📷 Image' :
                        mediaType === 'audio' ? '🎤 Voice message' :
                            mediaType === 'video' ? '🎥 Video' :
                                '📎 Document'
                );

                await MessageModel.insert({
                    whatsapp_message_id: sentMessageId,
                    from_number: to,
                    profile_name: 'Agent',
                    message_type: mediaType,
                    message_text: mediaLabel,
                    media_id: mediaId,
                    media_url: null,
                    media_mime_type: null, // We don't know it yet
                    timestamp,
                    direction: 'outgoing'
                });

                console.log('✅ Media message stored in DB as outgoing/Agent');
            } catch (dbErr) {
                console.error('⚠️ Failed to store media message in DB:', dbErr.message);
            }

            console.log('✅ Media message sent successfully:', sentMessageId);

            res.json({
                success: true,
                messageId: sentMessageId,
                to: to,
                mediaType: mediaType
            });
        } catch (error) {
            console.error('❌ Error sending media message:', error.response?.data || error.message);
            res.status(500).json({
                error: 'Failed to send media message',
                details: error.response?.data || error.message
            });
        }
    }
}

module.exports = MediaController;
