const db = require('../config/database');

class WorkflowModel {
    // ========== WORKFLOWS ==========

    static getAllWorkflows() {
        return db.prepare(`
            SELECT * FROM workflows
            ORDER BY created_at DESC
        `).all();
    }

    static getActiveWorkflows() {
        return db.prepare(`
            SELECT * FROM workflows
            WHERE is_active = 1
            ORDER BY trigger_after_days ASC
        `).all();
    }

    static getWorkflowById(id) {
        return db.prepare(`
            SELECT * FROM workflows WHERE id = ?
        `).get(id);
    }

    static createWorkflow(data) {
        const { name, description, trigger_after_days, is_active = 1 } = data;
        const result = db.prepare(`
            INSERT INTO workflows (name, description, trigger_after_days, is_active)
            VALUES (?, ?, ?, ?)
        `).run(name, description, trigger_after_days, is_active);

        return result.lastInsertRowid;
    }

    static updateWorkflow(id, data) {
        const { name, description, trigger_after_days, is_active } = data;
        return db.prepare(`
            UPDATE workflows
            SET name = ?, description = ?, trigger_after_days = ?, is_active = ?
            WHERE id = ?
        `).run(name, description, trigger_after_days, is_active, id);
    }

    static deleteWorkflow(id) {
        return db.prepare(`DELETE FROM workflows WHERE id = ?`).run(id);
    }

    static toggleWorkflow(id, is_active) {
        return db.prepare(`
            UPDATE workflows SET is_active = ? WHERE id = ?
        `).run(is_active, id);
    }

    // ========== WORKFLOW STEPS ==========

    static getWorkflowSteps(workflowId) {
        return db.prepare(`
            SELECT * FROM workflow_steps
            WHERE workflow_id = ?
            ORDER BY step_number ASC
        `).all(workflowId);
    }

    static createWorkflowStep(data) {
        const { workflow_id, step_number, delay_hours, template_name, template_language, template_components } = data;
        const result = db.prepare(`
            INSERT INTO workflow_steps (workflow_id, step_number, delay_hours, template_name, template_language, template_components)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(workflow_id, step_number, delay_hours, template_name, template_language || 'en_US', template_components || null);

        return result.lastInsertRowid;
    }

    static updateWorkflowStep(id, data) {
        const { delay_hours, template_name, template_language, template_components } = data;
        return db.prepare(`
            UPDATE workflow_steps
            SET delay_hours = ?, template_name = ?, template_language = ?, template_components = ?
            WHERE id = ?
        `).run(delay_hours, template_name, template_language, template_components, id);
    }

    static deleteWorkflowStep(id) {
        return db.prepare(`DELETE FROM workflow_steps WHERE id = ?`).run(id);
    }

    static deleteWorkflowSteps(workflowId) {
        return db.prepare(`DELETE FROM workflow_steps WHERE workflow_id = ?`).run(workflowId);
    }

    // ========== CONTACT WORKFLOW MANAGEMENT ==========

    static enrollContactInWorkflow(contactId, workflowId) {
        return db.prepare(`
            UPDATE contacts
            SET workflow_id = ?, workflow_step = 0, workflow_paused = 0, last_workflow_sent_at = NULL
            WHERE id = ?
        `).run(workflowId, contactId);
    }

    static removeContactFromWorkflow(contactId) {
        return db.prepare(`
            UPDATE contacts
            SET workflow_id = NULL, workflow_step = 0, workflow_paused = 0, last_workflow_sent_at = NULL
            WHERE id = ?
        `).run(contactId);
    }

    static pauseContactWorkflow(contactId) {
        return db.prepare(`
            UPDATE contacts SET workflow_paused = 1 WHERE id = ?
        `).run(contactId);
    }

    static resumeContactWorkflow(contactId) {
        return db.prepare(`
            UPDATE contacts SET workflow_paused = 0 WHERE id = ?
        `).run(contactId);
    }

    static advanceContactWorkflowStep(contactId, stepNumber) {
        const now = Math.floor(Date.now() / 1000);
        return db.prepare(`
            UPDATE contacts
            SET workflow_step = ?, last_workflow_sent_at = ?
            WHERE id = ?
        `).run(stepNumber, now, contactId);
    }

    // ========== WORKFLOW LOGS ==========

    static logWorkflowMessage(data) {
        const { contact_id, workflow_id, step_id, status, error_message } = data;
        return db.prepare(`
            INSERT INTO workflow_logs (contact_id, workflow_id, step_id, status, error_message)
            VALUES (?, ?, ?, ?, ?)
        `).run(contact_id, workflow_id, step_id, status || 'sent', error_message || null);
    }

    static getWorkflowLogs(workflowId, limit = 100) {
        return db.prepare(`
            SELECT wl.*, c.phone_number, c.profile_name, ws.step_number, ws.template_name
            FROM workflow_logs wl
            JOIN contacts c ON wl.contact_id = c.id
            JOIN workflow_steps ws ON wl.step_id = ws.id
            WHERE wl.workflow_id = ?
            ORDER BY wl.sent_at DESC
            LIMIT ?
        `).all(workflowId, limit);
    }

    static getContactWorkflowLogs(contactId) {
        return db.prepare(`
            SELECT wl.*, w.name as workflow_name, ws.step_number, ws.template_name
            FROM workflow_logs wl
            JOIN workflows w ON wl.workflow_id = w.id
            JOIN workflow_steps ws ON wl.step_id = ws.id
            WHERE wl.contact_id = ?
            ORDER BY wl.sent_at DESC
        `).all(contactId);
    }

    // ========== ANALYTICS ==========

    static getWorkflowStats(workflowId) {
        const stats = db.prepare(`
            SELECT 
                ws.step_number,
                ws.template_name,
                COUNT(wl.id) as messages_sent,
                SUM(CASE WHEN wl.status = 'sent' THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN wl.status = 'failed' THEN 1 ELSE 0 END) as failed
            FROM workflow_steps ws
            LEFT JOIN workflow_logs wl ON wl.step_id = ws.id
            WHERE ws.workflow_id = ?
            GROUP BY ws.id, ws.step_number, ws.template_name
            ORDER BY ws.step_number ASC
        `).all(workflowId);

        const enrolled = db.prepare(`
            SELECT COUNT(*) as count FROM contacts WHERE workflow_id = ?
        `).get(workflowId);

        const completed = db.prepare(`
            SELECT COUNT(DISTINCT contact_id) as count
            FROM workflow_logs
            WHERE workflow_id = ?
        `).get(workflowId);

        return {
            steps: stats,
            enrolled_contacts: enrolled.count,
            completed_contacts: completed.count
        };
    }

    // ========== SCHEDULER QUERIES ==========

    static getInactiveLeadsForEnrollment() {
        const now = Math.floor(Date.now() / 1000);
        return db.prepare(`
            SELECT c.*, w.id as matched_workflow_id, w.name as workflow_name
            FROM contacts c
            CROSS JOIN workflows w
            WHERE w.is_active = 1
              AND c.workflow_id IS NULL
              AND c.last_message_at IS NOT NULL
              AND c.last_message_at < (? - (w.trigger_after_days * 86400))
              AND c.status != 'converted'
              AND c.status != 'rejected'
            ORDER BY c.last_message_at ASC
            LIMIT 100
        `).all(now);
    }

    static getContactsForWorkflowStep() {
        const now = Math.floor(Date.now() / 1000);
        return db.prepare(`
            SELECT 
                c.*,
                ws.id as step_id,
                ws.step_number,
                ws.delay_hours,
                ws.template_name,
                ws.template_language,
                ws.template_components,
                w.name as workflow_name
            FROM contacts c
            JOIN workflows w ON w.id = c.workflow_id
            JOIN workflow_steps ws ON ws.workflow_id = c.workflow_id
                AND ws.step_number = (c.workflow_step + 1)
            WHERE c.workflow_id IS NOT NULL
              AND c.workflow_paused = 0
              AND c.status != 'converted'
              AND c.status != 'rejected'
              AND (
                  c.last_workflow_sent_at IS NULL
                  OR c.last_workflow_sent_at < (? - (ws.delay_hours * 3600))
              )
            ORDER BY c.last_workflow_sent_at ASC NULLS FIRST
            LIMIT 50
        `).all(now);
    }
}

module.exports = WorkflowModel;
