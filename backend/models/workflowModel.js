const supabase = require('../config/supabase');

class WorkflowModel {
    // ========== WORKFLOWS ==========

    static async getAllWorkflows() {
        const { data, error } = await supabase.from('workflows').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    static async getActiveWorkflows() {
        const { data, error } = await supabase.from('workflows').select('*').eq('is_active', true).order('trigger_after_days', { ascending: true });
        if (error) throw error;
        return data;
    }

    static async getWorkflowById(id) {
        const { data, error } = await supabase.from('workflows').select('*').eq('id', id).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    static async createWorkflow(data) {
        const { name, description, trigger_after_days, is_active = true } = data;
        const { data: result, error } = await supabase.from('workflows')
            .insert({ name, description, trigger_after_days, is_active })
            .select().single();
        if (error) throw error;
        return result.id;
    }

    static async updateWorkflow(id, data) {
        const { name, description, trigger_after_days, is_active } = data;
        const { error } = await supabase.from('workflows')
            .update({ name, description, trigger_after_days, is_active })
            .eq('id', id);
        if (error) throw error;
    }

    static async deleteWorkflow(id) {
        const { error } = await supabase.from('workflows').delete().eq('id', id);
        if (error) throw error;
    }

    static async toggleWorkflow(id, is_active) {
        const { error } = await supabase.from('workflows').update({ is_active }).eq('id', id);
        if (error) throw error;
    }

    // ========== WORKFLOW STEPS ==========

    static async getWorkflowSteps(workflowId) {
        const { data, error } = await supabase.from('workflow_steps')
            .select('*').eq('workflow_id', workflowId).order('step_number', { ascending: true });
        if (error) throw error;
        return data;
    }

    static async createWorkflowStep(data) {
        const { workflow_id, step_number, delay_hours, template_name, template_language, template_components } = data;
        const { data: result, error } = await supabase.from('workflow_steps')
            .insert({ workflow_id, step_number, delay_hours, template_name, template_language: template_language || 'en_US', template_components: template_components || null })
            .select().single();
        if (error) throw error;
        return result.id;
    }

    static async updateWorkflowStep(id, data) {
        const { delay_hours, template_name, template_language, template_components } = data;
        const { error } = await supabase.from('workflow_steps')
            .update({ delay_hours, template_name, template_language, template_components })
            .eq('id', id);
        if (error) throw error;
    }

    static async deleteWorkflowStep(id) {
        const { error } = await supabase.from('workflow_steps').delete().eq('id', id);
        if (error) throw error;
    }

    static async deleteWorkflowSteps(workflowId) {
        const { error } = await supabase.from('workflow_steps').delete().eq('workflow_id', workflowId);
        if (error) throw error;
    }

    // ========== CONTACT WORKFLOW MANAGEMENT ==========

    static async enrollContactInWorkflow(contactId, workflowId) {
        const { error } = await supabase.from('contacts')
            .update({ workflow_id: workflowId, workflow_step: 0, workflow_paused: false, last_workflow_sent_at: null })
            .eq('id', contactId);
        if (error) throw error;
    }

    static async removeContactFromWorkflow(contactId) {
        const { error } = await supabase.from('contacts')
            .update({ workflow_id: null, workflow_step: 0, workflow_paused: false, last_workflow_sent_at: null })
            .eq('id', contactId);
        if (error) throw error;
    }

    static async pauseContactWorkflow(contactId) {
        const { error } = await supabase.from('contacts').update({ workflow_paused: true }).eq('id', contactId);
        if (error) throw error;
    }

    static async resumeContactWorkflow(contactId) {
        const { error } = await supabase.from('contacts').update({ workflow_paused: false }).eq('id', contactId);
        if (error) throw error;
    }

    static async advanceContactWorkflowStep(contactId, stepNumber) {
        const now = Math.floor(Date.now() / 1000);
        const { error } = await supabase.from('contacts')
            .update({ workflow_step: stepNumber, last_workflow_sent_at: now })
            .eq('id', contactId);
        if (error) throw error;
    }

    // ========== WORKFLOW LOGS ==========

    static async logWorkflowMessage(data) {
        const { contact_id, workflow_id, step_id, status, error_message } = data;
        const { error } = await supabase.from('workflow_logs')
            .insert({ contact_id, workflow_id, step_id, status: status || 'sent', error_message: error_message || null });
        if (error) throw error;
    }

    static async getWorkflowLogs(workflowId, limit = 100) {
        const { data, error } = await supabase.from('workflow_logs')
            .select('*, contacts(phone_number, profile_name), workflow_steps(step_number, template_name)')
            .eq('workflow_id', workflowId)
            .order('sent_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data.map(row => ({
            ...row,
            phone_number: row.contacts?.phone_number,
            profile_name: row.contacts?.profile_name,
            step_number: row.workflow_steps?.step_number,
            template_name: row.workflow_steps?.template_name,
        }));
    }

    static async getContactWorkflowLogs(contactId) {
        const { data, error } = await supabase.from('workflow_logs')
            .select('*, workflows(name), workflow_steps(step_number, template_name)')
            .eq('contact_id', contactId)
            .order('sent_at', { ascending: false });
        if (error) throw error;
        return data.map(row => ({
            ...row,
            workflow_name: row.workflows?.name,
            step_number: row.workflow_steps?.step_number,
            template_name: row.workflow_steps?.template_name,
        }));
    }

    // ========== ANALYTICS ==========

    static async getWorkflowStats(workflowId) {
        const { data: steps, error: stepsErr } = await supabase.from('workflow_steps')
            .select('*, workflow_logs(status)')
            .eq('workflow_id', workflowId)
            .order('step_number', { ascending: true });
        if (stepsErr) throw stepsErr;

        const { count: enrolledCount } = await supabase.from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq('workflow_id', workflowId);

        const { data: completedData } = await supabase.from('workflow_logs')
            .select('contact_id')
            .eq('workflow_id', workflowId);
        const completedCount = new Set(completedData?.map(r => r.contact_id)).size;

        const stepStats = steps.map(step => ({
            step_number: step.step_number,
            template_name: step.template_name,
            messages_sent: step.workflow_logs?.length || 0,
            successful: step.workflow_logs?.filter(l => l.status === 'sent').length || 0,
            failed: step.workflow_logs?.filter(l => l.status === 'failed').length || 0,
        }));

        return {
            steps: stepStats,
            enrolled_contacts: enrolledCount || 0,
            completed_contacts: completedCount
        };
    }

    // ========== SCHEDULER QUERIES ==========

    static async getInactiveLeadsForEnrollment() {
        const now = Math.floor(Date.now() / 1000);

        // Get active workflows
        const workflows = await WorkflowModel.getActiveWorkflows();
        if (!workflows.length) return [];

        const results = [];
        for (const workflow of workflows) {
            const cutoff = now - (workflow.trigger_after_days * 86400);
            const { data, error } = await supabase.from('contacts')
                .select('*')
                .is('workflow_id', null)
                .not('last_message_at', 'is', null)
                .lt('last_message_at', cutoff)
                .not('status', 'in', '("converted","rejected")')
                .order('last_message_at', { ascending: true })
                .limit(100);

            if (!error && data) {
                data.forEach(contact => {
                    results.push({ ...contact, matched_workflow_id: workflow.id, workflow_name: workflow.name });
                });
            }
        }
        return results;
    }

    static async getContactsForWorkflowStep() {
        const now = Math.floor(Date.now() / 1000);

        // Get contacts in workflows
        const { data: contacts, error } = await supabase.from('contacts')
            .select('*, workflows(*)')
            .not('workflow_id', 'is', null)
            .eq('workflow_paused', false)
            .not('status', 'in', '("converted","rejected")')
            .limit(50);

        if (error) throw error;
        if (!contacts.length) return [];

        const result = [];
        for (const contact of contacts) {
            const nextStep = (contact.workflow_step || 0) + 1;
            const { data: step } = await supabase.from('workflow_steps')
                .select('*')
                .eq('workflow_id', contact.workflow_id)
                .eq('step_number', nextStep)
                .single();

            if (!step) continue;

            const delaySeconds = step.delay_hours * 3600;
            const lastSent = contact.last_workflow_sent_at || 0;
            if (lastSent && now < lastSent + delaySeconds) continue;

            result.push({
                ...contact,
                step_id: step.id,
                step_number: step.step_number,
                delay_hours: step.delay_hours,
                template_name: step.template_name,
                template_language: step.template_language,
                template_components: step.template_components,
                workflow_name: contact.workflows?.name
            });
        }
        return result;
    }
}

module.exports = WorkflowModel;
