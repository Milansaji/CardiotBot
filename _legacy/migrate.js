const Database = require('better-sqlite3');
const path = require('path');

// Connect to existing database
const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/whatsapp.db');
const db = new Database(dbPath);

console.log('🔄 Running database migration...');

try {
    // Add workflow columns to contacts table if they don't exist
    const columns = db.pragma('table_info(contacts)');
    const columnNames = columns.map(col => col.name);

    if (!columnNames.includes('workflow_id')) {
        console.log('Adding workflow_id column...');
        db.exec('ALTER TABLE contacts ADD COLUMN workflow_id INTEGER');
    }

    if (!columnNames.includes('workflow_step')) {
        console.log('Adding workflow_step column...');
        db.exec('ALTER TABLE contacts ADD COLUMN workflow_step INTEGER DEFAULT 0');
    }

    if (!columnNames.includes('workflow_paused')) {
        console.log('Adding workflow_paused column...');
        db.exec('ALTER TABLE contacts ADD COLUMN workflow_paused INTEGER DEFAULT 0');
    }

    if (!columnNames.includes('last_workflow_sent_at')) {
        console.log('Adding last_workflow_sent_at column...');
        db.exec('ALTER TABLE contacts ADD COLUMN last_workflow_sent_at INTEGER');
    }

    // Create workflow tables
    console.log('Creating workflow tables...');

    db.exec(`
        CREATE TABLE IF NOT EXISTS workflows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            trigger_after_days INTEGER NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );

        CREATE TABLE IF NOT EXISTS workflow_steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id INTEGER NOT NULL,
            step_number INTEGER NOT NULL,
            delay_hours INTEGER NOT NULL,
            template_name TEXT NOT NULL,
            template_language TEXT DEFAULT 'en_US',
            template_components TEXT,
            FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS workflow_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contact_id INTEGER NOT NULL,
            workflow_id INTEGER NOT NULL,
            step_id INTEGER NOT NULL,
            sent_at INTEGER DEFAULT (strftime('%s', 'now')),
            status TEXT DEFAULT 'sent',
            error_message TEXT,
            FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
            FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
            FOREIGN KEY (step_id) REFERENCES workflow_steps(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_workflows_active ON workflows(is_active);
        CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow ON workflow_steps(workflow_id);
        CREATE INDEX IF NOT EXISTS idx_workflow_logs_contact ON workflow_logs(contact_id);
        CREATE INDEX IF NOT EXISTS idx_contacts_workflow ON contacts(workflow_id);
    `);

    console.log('✅ Migration completed successfully!');
    db.close();
    process.exit(0);

} catch (error) {
    console.error('❌ Migration failed:', error);
    db.close();
    process.exit(1);
}
