const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/messageController');
const ContactController = require('../controllers/contactController');
const MediaController = require('../controllers/mediaController');
const SegmentController = require('../controllers/segmentController');
const TemplateController = require('../controllers/templateController');
const WorkflowController = require('../controllers/workflowController');
const upload = require('../middleware/upload');

// Message routes
router.get('/messages/:phoneNumber', MessageController.getMessages);
router.post('/send', MessageController.sendMessage);
router.post('/bot-message', MessageController.storeBotMessage);
router.put('/messages/read/:phoneNumber', MessageController.markAsRead);

// Contact routes
router.get('/contacts', ContactController.getAllContacts);
router.get('/contacts/export', ContactController.exportCSV);
router.get('/contacts/export/filtered', ContactController.exportCSVFiltered);
router.post('/contacts/import', ContactController.importCSV);
router.post('/contacts', ContactController.addContact);
router.put('/contacts/:phoneNumber/read', ContactController.resetUnreadCount);
router.put('/contacts/:phoneNumber/status', ContactController.updateStatus);
router.put('/contacts/:phoneNumber/temperature', ContactController.updateTemperature);
router.put('/contacts/:phoneNumber/name', ContactController.updateName);
router.delete('/contacts/:phoneNumber', ContactController.deleteContact);
router.get('/contacts/:phoneNumber/segments', SegmentController.getContactSegments);

// Segment routes
router.get('/segments', SegmentController.getAllSegments);
router.post('/segments', SegmentController.createSegment);
router.get('/segments/:id', SegmentController.getSegment);
router.put('/segments/:id', SegmentController.updateSegment);
router.delete('/segments/:id', SegmentController.deleteSegment);
router.get('/segments/:id/contacts', SegmentController.getSegmentContacts);
router.post('/segments/:id/contacts', SegmentController.addContactsToSegment);
router.delete('/segments/:id/contacts/:contactId', SegmentController.removeContactFromSegment);

// Template routes
router.get('/templates', TemplateController.getTemplates);
router.get('/templates/:name', TemplateController.getTemplate);
router.post('/templates/send', TemplateController.sendTemplate);

// Bulk send routes
router.post('/bulk/send', TemplateController.sendBulk);
router.get('/bulk/status/:jobId', TemplateController.getBulkStatus);
router.get('/bulk/history', TemplateController.getBulkHistory);

// Workflow routes
router.get('/workflows', WorkflowController.getAllWorkflows);
router.post('/workflows', WorkflowController.createWorkflow);
router.get('/workflows/:id', WorkflowController.getWorkflow);
router.put('/workflows/:id', WorkflowController.updateWorkflow);
router.delete('/workflows/:id', WorkflowController.deleteWorkflow);
router.patch('/workflows/:id/toggle', WorkflowController.toggleWorkflow);
router.get('/workflows/:id/stats', WorkflowController.getWorkflowStats);
router.get('/workflows/:id/logs', WorkflowController.getWorkflowLogs);
router.patch('/contacts/:contactId/workflow/pause', WorkflowController.pauseContactWorkflow);
router.patch('/contacts/:contactId/workflow/resume', WorkflowController.resumeContactWorkflow);
router.patch('/contacts/:contactId/workflow/remove', WorkflowController.removeContactFromWorkflow);

// Media routes
router.post('/media/upload', upload.single('file'), MediaController.uploadMedia);
router.post('/media/send', MediaController.sendMediaMessage);

// Stats routes
router.get('/stats', ContactController.getStats);
router.get('/dashboard/stats', ContactController.getDashboardStats);

module.exports = router;
