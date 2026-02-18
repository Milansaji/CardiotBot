require('dotenv').config();
const express = require('express');
const path = require('path');
const requestLogger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const setupRoutes = require('./routes');

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - Allow React frontend to connect
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Request logging
app.use(requestLogger);

// Serve downloaded media files
app.use('/media', express.static(path.join(__dirname, '../media')));

// Setup routes (webhook + API)
setupRoutes(app);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'WhatsApp Dashboard Backend'
    });
});

// Webhook info endpoint
app.get('/webhook-info', (req, res) => {
    res.json({
        server: 'WhatsApp Dashboard',
        port: process.env.PORT || 3001,
        webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN,
        webhookUrl: `/webhook`,
        status: 'Server is running',
        instructions: {
            verify: `GET ${req.protocol}://${req.get('host')}/webhook?hub.mode=subscribe&hub.verify_token=${process.env.WEBHOOK_VERIFY_TOKEN}&hub.challenge=test123`,
            test: `POST ${req.protocol}://${req.get('host')}/webhook`
        }
    });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
