const axios = require('axios');

class WhatsAppService {
    constructor() {
        this.token = process.env.WHATSAPP_TOKEN;
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        this.apiVersion = 'v18.0';
        this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;
    }

    /**
     * Send a text message
     */
    async sendTextMessage(to, message) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: to,
                    type: 'text',
                    text: { body: message }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                messageId: response.data.messages[0].id,
                data: response.data
            };
        } catch (error) {
            console.error('❌ Error sending WhatsApp message:', error.response?.data || error.message);
            throw {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Download media from WhatsApp
     */
    async getMediaUrl(mediaId) {
        try {
            const response = await axios.get(
                `https://graph.facebook.com/${this.apiVersion}/${mediaId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                }
            );

            return response.data.url;
        } catch (error) {
            console.error('❌ Error getting media URL:', error.message);
            throw error;
        }
    }

    /**
     * Forward webhook to external bot
     */
    async forwardToBot(body, headers, botUrl) {
        if (!botUrl) return { success: true, skipped: true };

        try {
            console.log(`🤖 Forwarding webhook to bot: ${botUrl}`);
            const response = await axios.post(botUrl, body, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'WhatsApp-Dashboard-Forwarder/1.0',
                    'X-Hub-Signature-256': headers['x-hub-signature-256'] || '',
                    'X-Hub-Signature': headers['x-hub-signature'] || ''
                },
                timeout: 5000 // 5 second timeout
            });

            if (response.status === 200) {
                console.log('✅ Webhook forwarded to bot successfully');
                return { success: true };
            } else {
                console.log(`⚠️  Bot responded with status ${response.status}`);
                return { success: false, status: response.status };
            }
        } catch (error) {
            console.error('⚠️  Failed to forward to bot:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new WhatsAppService();
