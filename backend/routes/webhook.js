const express = require('express');
const router = express.Router();
const WebhookController = require('../controllers/webhookController');

// GET /webhook - Webhook verification
router.get('/', WebhookController.verifyWebhook);

// POST /webhook - Receive messages
router.post('/', WebhookController.receiveWebhook);

module.exports = router;
