const axios = require('axios');

class TemplateService {
    constructor() {
        this.token = process.env.WHATSAPP_TOKEN;
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        this.wabaId = process.env.WABA_ID; // WhatsApp Business Account ID
        this.apiVersion = 'v18.0';
    }

    /**
     * Fetch all approved templates from Meta
     */
    async getApprovedTemplates() {
        try {
            if (!this.wabaId) {
                console.warn('⚠️  WABA_ID not set. Cannot fetch templates.');
                return [];
            }

            const response = await axios.get(
                `https://graph.facebook.com/${this.apiVersion}/${this.wabaId}/message_templates`,
                {
                    params: {
                        status: 'APPROVED',
                        limit: 100
                    },
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                }
            );

            return response.data.data || [];
        } catch (error) {
            console.error('❌ Error fetching templates:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get template by name
     */
    async getTemplateByName(templateName) {
        try {
            const templates = await this.getApprovedTemplates();
            return templates.find(t => t.name === templateName);
        } catch (error) {
            console.error(`❌ Error fetching template ${templateName}:`, error.message);
            throw error;
        }
    }

    /**
     * Send template message to a single contact
     */
    async sendTemplateMessage(toNumber, templateName, languageCode = 'en_US', components = []) {
        try {
            const response = await axios.post(
                `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: toNumber,
                    type: 'template',
                    template: {
                        name: templateName,
                        language: { code: languageCode },
                        components: components
                    }
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
            console.error(`❌ Error sending template to ${toNumber}:`, error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Send bulk template messages with rate limiting
     * @param {Array} contacts - Array of contact objects with phone_number
     * @param {String} templateName - Name of approved template
     * @param {String} languageCode - Language code (default: en_US)
     * @param {Array} components - Template components (variables, buttons, etc.)
     * @param {Function} progressCallback - Optional callback for progress updates
     */
    async sendBulkTemplateMessages(contacts, templateName, languageCode = 'en_US', components = [], progressCallback = null) {
        const results = [];
        const DELAY_MS = 80; // ~80ms delay = ~12.5 messages/second (safe rate)

        console.log(`📤 Starting bulk send: ${contacts.length} contacts, template: ${templateName}`);

        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];

            try {
                const result = await this.sendTemplateMessage(
                    contact.phone_number,
                    templateName,
                    languageCode,
                    components
                );

                results.push({
                    contact: contact.phone_number,
                    name: contact.profile_name,
                    status: result.success ? 'sent' : 'failed',
                    messageId: result.messageId,
                    error: result.error
                });

                // Progress callback
                if (progressCallback) {
                    progressCallback({
                        current: i + 1,
                        total: contacts.length,
                        percentage: Math.round(((i + 1) / contacts.length) * 100)
                    });
                }

                // Rate limiting delay
                if (i < contacts.length - 1) {
                    await this.delay(DELAY_MS);
                }
            } catch (error) {
                results.push({
                    contact: contact.phone_number,
                    name: contact.profile_name,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        const summary = {
            total: contacts.length,
            sent: results.filter(r => r.status === 'sent').length,
            failed: results.filter(r => r.status === 'failed').length,
            results: results
        };

        console.log(`✅ Bulk send complete: ${summary.sent}/${summary.total} sent successfully`);
        return summary;
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Parse template components for dynamic variables
     * Example: components = [{ type: "body", parameters: [{ type: "text", text: "John" }] }]
     */
    static buildTemplateComponents(bodyVariables = [], headerVariables = []) {
        const components = [];

        if (headerVariables.length > 0) {
            components.push({
                type: 'header',
                parameters: headerVariables.map(text => ({ type: 'text', text }))
            });
        }

        if (bodyVariables.length > 0) {
            components.push({
                type: 'body',
                parameters: bodyVariables.map(text => ({ type: 'text', text }))
            });
        }

        return components;
    }
}

module.exports = new TemplateService();
