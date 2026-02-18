const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname, '../../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new Database(process.env.DB_PATH || path.join(dbDir, 'whatsapp.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    whatsapp_message_id TEXT UNIQUE,
    from_number TEXT NOT NULL,
    profile_name TEXT,
    message_type TEXT DEFAULT 'text',
    message_text TEXT,
    media_id TEXT,
    media_url TEXT,
    media_mime_type TEXT,
    timestamp INTEGER,
    received_at INTEGER DEFAULT (strftime('%s', 'now')),
    status TEXT DEFAULT 'received',
    is_read INTEGER DEFAULT 0,
    direction TEXT DEFAULT 'incoming'
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT UNIQUE NOT NULL,
    profile_name TEXT,
    last_message_at INTEGER,
    unread_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ongoing',
    lead_temperature TEXT DEFAULT 'warm',
    button_click_count INTEGER DEFAULT 0,
    workflow_id INTEGER,
    workflow_step INTEGER DEFAULT 0,
    workflow_paused INTEGER DEFAULT 0,
    last_workflow_sent_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    contact_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS contact_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    segment_id INTEGER NOT NULL,
    added_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE,
    UNIQUE(contact_id, segment_id)
  );

  CREATE TABLE IF NOT EXISTS template_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL,
    segment_id INTEGER,
    total_sent INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_read INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    sent_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (segment_id) REFERENCES segments(id)
  );

  CREATE TABLE IF NOT EXISTS button_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    message_id TEXT NOT NULL,
    button_text TEXT,
    clicked_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
  );

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

  CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_number);
  CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_contacts_last_message ON contacts(last_message_at DESC);
  CREATE INDEX IF NOT EXISTS idx_contact_segments_contact ON contact_segments(contact_id);
  CREATE INDEX IF NOT EXISTS idx_contact_segments_segment ON contact_segments(segment_id);
  CREATE INDEX IF NOT EXISTS idx_button_interactions_contact ON button_interactions(contact_id);
  CREATE INDEX IF NOT EXISTS idx_workflows_active ON workflows(is_active);
  CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow ON workflow_steps(workflow_id);
  CREATE INDEX IF NOT EXISTS idx_workflow_logs_contact ON workflow_logs(contact_id);
  CREATE INDEX IF NOT EXISTS idx_contacts_workflow ON contacts(workflow_id);
`);

// Run migrations for existing databases (ALTER TABLE for new columns)
try {
  db.exec(`ALTER TABLE template_messages ADD COLUMN total_failed INTEGER DEFAULT 0`);
  console.log('✅ Migration: added total_failed column to template_messages');
} catch (e) {
  // Column already exists - that's fine
}

console.log('✅ Database initialized successfully');

module.exports = db;
