const WorkflowModel = require('../models/workflowModel');

class WorkflowController {
    // ========== WORKFLOW CRUD ==========

    static async getAllWorkflows(req, res) {
        try {
            const workflows = await WorkflowModel.getAllWorkflows();
            res.json(workflows);
        } catch (error) {
            console.error('Error fetching workflows:', error);
            res.status(500).json({ error: 'Failed to fetch workflows' });
        }
    }

    static async getWorkflow(req, res) {
        try {
            const { id } = req.params;
            const workflow = await WorkflowModel.getWorkflowById(id);
            if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

            const steps = await WorkflowModel.getWorkflowSteps(id);
            res.json({ ...workflow, steps });
        } catch (error) {
            console.error('Error fetching workflow:', error);
            res.status(500).json({ error: 'Failed to fetch workflow' });
        }
    }

    static async createWorkflow(req, res) {
        try {
            const { name, description, trigger_after_days, steps } = req.body;
            if (!name || !trigger_after_days) {
                return res.status(400).json({ error: 'Name and trigger_after_days are required' });
            }

            const workflowId = await WorkflowModel.createWorkflow({ name, description, trigger_after_days, is_active: true });

            if (steps && Array.isArray(steps)) {
                for (let i = 0; i < steps.length; i++) {
                    const step = steps[i];
                    await WorkflowModel.createWorkflowStep({
                        workflow_id: workflowId,
                        step_number: i + 1,
                        delay_hours: step.delay_hours,
                        template_name: step.template_name,
                        template_language: step.template_language || 'en_US',
                        template_components: step.template_components ? JSON.stringify(step.template_components) : null
                    });
                }
            }

            res.json({ success: true, workflowId });
        } catch (error) {
            console.error('Error creating workflow:', error);
            res.status(500).json({ error: 'Failed to create workflow' });
        }
    }

    static async updateWorkflow(req, res) {
        try {
            const { id } = req.params;
            const { name, description, trigger_after_days, is_active, steps } = req.body;

            await WorkflowModel.updateWorkflow(id, { name, description, trigger_after_days, is_active });

            if (steps && Array.isArray(steps)) {
                await WorkflowModel.deleteWorkflowSteps(id);
                for (let i = 0; i < steps.length; i++) {
                    const step = steps[i];
                    await WorkflowModel.createWorkflowStep({
                        workflow_id: id,
                        step_number: i + 1,
                        delay_hours: step.delay_hours,
                        template_name: step.template_name,
                        template_language: step.template_language || 'en_US',
                        template_components: step.template_components ? JSON.stringify(step.template_components) : null
                    });
                }
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Error updating workflow:', error);
            res.status(500).json({ error: 'Failed to update workflow' });
        }
    }

    static async deleteWorkflow(req, res) {
        try {
            const { id } = req.params;
            await WorkflowModel.deleteWorkflow(id);
            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting workflow:', error);
            res.status(500).json({ error: 'Failed to delete workflow' });
        }
    }

    static async toggleWorkflow(req, res) {
        try {
            const { id } = req.params;
            const { is_active } = req.body;
            await WorkflowModel.toggleWorkflow(id, Boolean(is_active));
            res.json({ success: true });
        } catch (error) {
            console.error('Error toggling workflow:', error);
            res.status(500).json({ error: 'Failed to toggle workflow' });
        }
    }

    // ========== CONTACT WORKFLOW MANAGEMENT ==========

    static async pauseContactWorkflow(req, res) {
        try {
            const { contactId } = req.params;
            await WorkflowModel.pauseContactWorkflow(contactId);
            res.json({ success: true });
        } catch (error) {
            console.error('Error pausing workflow:', error);
            res.status(500).json({ error: 'Failed to pause workflow' });
        }
    }

    static async resumeContactWorkflow(req, res) {
        try {
            const { contactId } = req.params;
            await WorkflowModel.resumeContactWorkflow(contactId);
            res.json({ success: true });
        } catch (error) {
            console.error('Error resuming workflow:', error);
            res.status(500).json({ error: 'Failed to resume workflow' });
        }
    }

    static async removeContactFromWorkflow(req, res) {
        try {
            const { contactId } = req.params;
            await WorkflowModel.removeContactFromWorkflow(contactId);
            res.json({ success: true });
        } catch (error) {
            console.error('Error removing from workflow:', error);
            res.status(500).json({ error: 'Failed to remove from workflow' });
        }
    }

    // ========== ANALYTICS ==========

    static async getWorkflowStats(req, res) {
        try {
            const { id } = req.params;
            const stats = await WorkflowModel.getWorkflowStats(id);
            res.json(stats);
        } catch (error) {
            console.error('Error fetching workflow stats:', error);
            res.status(500).json({ error: 'Failed to fetch stats' });
        }
    }

    static async getWorkflowLogs(req, res) {
        try {
            const { id } = req.params;
            const { limit = 100 } = req.query;
            const logs = await WorkflowModel.getWorkflowLogs(id, parseInt(limit));
            res.json(logs);
        } catch (error) {
            console.error('Error fetching workflow logs:', error);
            res.status(500).json({ error: 'Failed to fetch logs' });
        }
    }
}

module.exports = WorkflowController;
