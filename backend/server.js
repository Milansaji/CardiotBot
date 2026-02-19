const fs = require('fs');
const path = require('path');

// Try loading .env from current directory first, then parent directory
if (fs.existsSync('.env')) {
    require('dotenv').config();
} else if (fs.existsSync('../.env')) {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
} else {
    console.warn('⚠️  No .env file found! Please create one with your credentials.');
}

const app = require('./app');

// Initialize database (this will create tables if they don't exist)
// Initialize Supabase client
require('./config/supabase');

const PORT = process.env.PORT || 3001;

// Start server
const server = app.listen(PORT, () => {
    console.log('🚀 WhatsApp Dashboard Server Started!');
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌐 Dashboard: http://localhost:${PORT}`);
    console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook`);
    console.log('\n⚠️  Remember to use Cloudflare tunnel or deploy to get HTTPS URL for Meta webhook!');
    console.log('   Run: cloudflared tunnel --url http://localhost:3001\n');

    // Start workflow scheduler
    const workflowScheduler = require('./services/workflowScheduler');
    workflowScheduler.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n👋 Server shutting down...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n👋 Server shutting down...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

module.exports = server;
