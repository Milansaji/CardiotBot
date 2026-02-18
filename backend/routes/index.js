const webhookRoutes = require('./webhook');
const apiRoutes = require('./api');

function setupRoutes(app) {
    // Webhook routes
    app.use('/webhook', webhookRoutes);

    // API routes
    app.use('/api', apiRoutes);
}

module.exports = setupRoutes;
