// Database Migration Script - Add Status and Temperature Columns
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'whatsapp.db');
const db = new Database(dbPath);

console.log('🔄 Migrating database...');

try {
    // Check if columns exist
    const tableInfo = db.pragma('table_info(contacts)');
    const hasStatus = tableInfo.some(col => col.name === 'status');
    const hasTemperature = tableInfo.some(col => col.name === 'lead_temperature');

    if (!hasStatus) {
        console.log('Adding status column...');
        db.exec("ALTER TABLE contacts ADD COLUMN status TEXT DEFAULT 'ongoing'");
        console.log('✅ Status column added');
    } else {
        console.log('✓ Status column already exists');
    }

    if (!hasTemperature) {
        console.log('Adding lead_temperature column...');
        db.exec("ALTER TABLE contacts ADD COLUMN lead_temperature TEXT DEFAULT 'warm'");
        console.log('✅ Lead temperature column added');
    } else {
        console.log('✓ Lead temperature column already exists');
    }

    console.log('');
    console.log('✅ Database migration complete!');
    console.log('');

} catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
}

db.close();
