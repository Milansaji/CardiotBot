const cron = require('node-cron');
const WorkflowModel = require('../models/workflowModel');
const templateService = require('./templateService');

class WorkflowScheduler {
    constructor() {
        this.isRunning = false;
    }

    start() {
        console.log('🤖 Starting workflow scheduler...');

        // Run every hour
        cron.schedule('0 * * * *', async () => {
            if (this.isRunning) {
                console.log('⏭️  Scheduler already running, skipping...');
                return;
            }

            this.isRunning = true;
            try {
                console.log('🔄 Running workflow scheduler...');
                await this.processInactiveLeads();
                await this.processWorkflowSteps();
                console.log('✅ Workflow scheduler completed');
            } catch (error) {
                console.error('❌ Workflow scheduler error:', error);
            } finally {
                this.isRunning = false;
            }
        });

        // Also run immediately on startup (after 30 seconds)
        setTimeout(async () => {
            console.log('🚀 Running initial workflow check...');
            this.isRunning = true;
            try {
                await this.processInactiveLeads();
                await this.processWorkflowSteps();
            } catch (error) {
                console.error('❌ Initial workflow check error:', error);
            } finally {
                this.isRunning = false;
            }
        }, 30000);

        console.log('✅ Workflow scheduler started (runs every hour)');
    }

    async processInactiveLeads() {
        try {
            const inactiveLeads = await WorkflowModel.getInactiveLeadsForEnrollment();

            if (inactiveLeads.length === 0) {
                console.log('📊 No inactive leads to enroll');
                return;
            }

            console.log(`📊 Found ${inactiveLeads.length} inactive leads to enroll`);

            for (const lead of inactiveLeads) {
                try {
                    // Enroll in workflow
                    await WorkflowModel.enrollContactInWorkflow(lead.id, lead.matched_workflow_id);

                    console.log(`✅ Enrolled ${lead.phone_number} in workflow "${lead.workflow_name}"`);
                } catch (error) {
                    console.error(`❌ Failed to enroll ${lead.phone_number}:`, error.message);
                }

                // Small delay to avoid overwhelming the system
                await this.delay(100);
            }
        } catch (error) {
            console.error('❌ Error processing inactive leads:', error);
        }
    }

    async processWorkflowSteps() {
        try {
            const contacts = await WorkflowModel.getContactsForWorkflowStep();

            if (contacts.length === 0) {
                console.log('📊 No workflow steps to process');
                return;
            }

            console.log(`📊 Processing ${contacts.length} workflow steps`);

            for (const contact of contacts) {
                try {
                    // Send template message
                    const components = contact.template_components
                        ? JSON.parse(contact.template_components)
                        : [];

                    await templateService.sendTemplateMessage(
                        contact.phone_number,
                        contact.template_name,
                        contact.template_language || 'en_US',
                        components
                    );

                    // Advance to next step
                    await WorkflowModel.advanceContactWorkflowStep(contact.id, contact.step_number);

                    // Log success
                    await WorkflowModel.logWorkflowMessage({
                        contact_id: contact.id,
                        workflow_id: contact.workflow_id,
                        step_id: contact.step_id,
                        status: 'sent'
                    });

                    console.log(`✅ Sent step ${contact.step_number} to ${contact.phone_number} (${contact.workflow_name})`);

                } catch (error) {
                    console.error(`❌ Failed to send to ${contact.phone_number}:`, error.message);

                    // Log failure
                    await WorkflowModel.logWorkflowMessage({
                        contact_id: contact.id,
                        workflow_id: contact.workflow_id,
                        step_id: contact.step_id,
                        status: 'failed',
                        error_message: error.message
                    });
                }

                // Rate limiting delay (80ms = ~12 msg/sec)
                await this.delay(80);
            }
        } catch (error) {
            console.error('❌ Error processing workflow steps:', error);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Singleton instance
const scheduler = new WorkflowScheduler();

module.exports = scheduler;
