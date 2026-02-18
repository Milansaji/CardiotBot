const axios = require('axios');
const fs = require('fs');
const path = require('path');
const whatsappService = require('./whatsappService');
const { MessageModel } = require('../models/queries');

class MediaService {
    constructor() {
        this.mediaDir = path.join(__dirname, '../../media');
        if (!fs.existsSync(this.mediaDir)) {
            fs.mkdirSync(this.mediaDir, { recursive: true });
        }
    }

    async downloadMedia(mediaId, messageId) {
        try {
            console.log(`📥 Downloading media: ${mediaId}`);

            // Get media URL from WhatsApp
            const mediaUrl = await whatsappService.getMediaUrl(mediaId);

            // Download the file
            const response = await axios.get(mediaUrl, {
                headers: {
                    'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
                },
                responseType: 'arraybuffer'
            });

            // Get content type
            const contentType = response.headers['content-type'];
            const extension = this.getExtensionFromMimeType(contentType);
            const filename = `${messageId}_${Date.now()}${extension}`;
            const filepath = path.join(this.mediaDir, filename);

            // Save file
            fs.writeFileSync(filepath, response.data);

            // Update database with local URL
            MessageModel.updateMediaUrl.run(`/media/${filename}`, messageId);

            console.log(`✅ Media downloaded: ${filename}`);
            return `/media/${filename}`;
        } catch (error) {
            console.error('❌ Error downloading media:', error.message);
            return null;
        }
    }

    getExtensionFromMimeType(mimeType) {
        const extensions = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'video/mp4': '.mp4',
            'video/3gpp': '.3gp',
            'audio/aac': '.aac',
            'audio/mp4': '.m4a',
            'audio/mpeg': '.mp3',
            'audio/amr': '.amr',
            'audio/ogg': '.ogg',
            'application/pdf': '.pdf',
            'application/vnd.ms-powerpoint': '.ppt',
            'application/msword': '.doc',
            'application/vnd.ms-excel': '.xls',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
        };
        return extensions[mimeType] || '.bin';
    }
}

module.exports = new MediaService();