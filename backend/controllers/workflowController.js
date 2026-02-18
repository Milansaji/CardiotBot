const WorkflowModel = require('../models/workflowModel');

class WorkflowController {
    // ========== WORKFLOW CRUD ==========

    static getAllWorkflows(req, res) {
        try {
            const workflows = WorkflowModel.getAllWorkflows();
            res.json(workflows);
        } catch (error) {
            console.error('Error fetching workflows:', error);
            res.status(500).json({ error: 'Failed to fetch workflows' });
        }
    }

    static getWorkflow(req, res) {
        try {
            const { id } = req.params;
            const workflow = WorkflowModel.getWorkflowById(id);

            if (!workflow) {
                return res.status(404).json({ error: 'Workflow not found' });
            }

            const steps = WorkflowModel.getWorkflowSteps(id);
            res.json({ ...workflow, steps });
        } catch (error) {
            console.error('Error fetching workflow:', error);
            res.status(500).json({ error: 'Failed to fetch workflow' });
        }
    }

    static createWorkflow(req, res) {
        try {
            const { name, description, trigger_after_days, steps } = req.body;

            if (!name || !trigger_after_days) {
                return res.status(400).json({ error: 'Name and trigger_after_days are required' });
            }

            const workflowId = WorkflowModel.createWorkflow({
                name,
                description,
                trigger_after_days,
                is_active: 1
            });

            // Create steps if provided
            if (steps && Array.isArray(steps)) {
                steps.forEach((step, index) => {
                    WorkflowModel.createWorkflowStep({
                        workflow_id: workflowId,
                        step_number: index + 1,
                        delay_hours: step.delay_hours,
                        template_name: step.template_name,
                        template_language: step.template_language || 'en_US',
                        template_components: step.template_components ? JSON.stringify(step.template_components) : null
                    });
                });
            }

            res.json({ success: true, workflowId });
        } catch (error) {
            console.error('Error creating workflow:', error);
            res.status(500).json({ error: 'Failed to create workflow' });
        }
    }

    static updateWorkflow(req, res) {
        try {
            const { id } = req.params;
            const { name, description, trigger_after_days, is_active, steps } = req.body;

            WorkflowModel.updateWorkflow(id, {
                name,
                description,
                trigger_after_days,
                is_active
            });

            // Update steps if provided
            if (steps && Array.isArray(steps)) {
                // Delete existing steps
                WorkflowModel.deleteWorkflowSteps(id);

                // Create new steps
                steps.forEach((step, index) => {
                    WorkflowModel.createWorkflowStep({
                        workflow_id: id,
                        step_number: index + 1,
                        delay_hours: step.delay_hours,
                        template_name: step.template_name,
                        template_language: step.template_language || 'en_US',
                        template_components: step.template_components ? JSON.stringify(step.template_components) : null
                    });
                });
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Error updating workflow:', error);
            res.status(500).json({ error: 'Failed to update workflow' });
        }
    }

    static deleteWorkflow(req, res) {
        try {
            const { id } = req.params;
            WorkflowModel.deleteWorkflow(id);
            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting workflow:', error);
            res.status(500).json({ error: 'Failed to delete workflow' });
        }
    }

    static toggleWorkflow(req, res) {
        try {
            const { id } = req.params;
            const { is_active } = req.body;
            WorkflowModel.toggleWorkflow(id, is_active ? 1 : 0);
            res.json({ success: true });
        } catch (error) {
            console.error('Error toggling workflow:', error);
            res.status(500).json({ error: 'Failed to toggle workflow' });
        }
    }

    // ========== CONTACT WORKFLOW MANAGEMENT ==========

    static pauseContactWorkflow(req, res) {
        try {
            const { contactId } = req.params;
            WorkflowModel.pauseContactWorkflow(contactId);
            res.json({ success: true });
        } catch (error) {
            console.error('Error pausing workflow:', error);
            res.status(500).json({ error: 'Failed to pause workflow' });
        }
    }

    static resumeContactWorkflow(req, res) {
        try {
            const { contactId } = req.params;
            WorkflowModel.resumeContactWorkflow(contactId);
            res.json({ success: true });
        } catch (error) {
            console.error('Error resuming workflow:', error);
            res.status(500).json({ error: 'Failed to resume workflow' });
        }
    }

    static removeContactFromWorkflow(req, res) {
        try {
            const { contactId } = req.params;
            WorkflowModel.removeContactFromWorkflow(contactId);
            res.json({ success: true });
        } catch (error) {
            console.error('Error removing from workflow:', error);
            res.status(500).json({ error: 'Failed to remove from workflow' });
        }
    }

    // ========== ANALYTICS ==========

    static getWorkflowStats(req, res) {
        try {
            const { id } = req.params;
            const stats = WorkflowModel.getWorkflowStats(id);
            res.json(stats);
        } catch (error) {
            console.error('Error fetching workflow stats:', error);
            res.status(500).json({ error: 'Failed to fetch stats' });
        }
    }

    static getWorkflowLogs(req, res) {
        try {
            const { id } = req.params;
            const { limit = 100 } = req.query;
            const logs = WorkflowModel.getWorkflowLogs(id, parseInt(limit));
            res.json(logs);
        } catch (error) {
            console.error('Error fetching workflow logs:', error);
            res.status(500).json({ error: 'Failed to fetch logs' });
        }
    }
}

module.exports = WorkflowController;
