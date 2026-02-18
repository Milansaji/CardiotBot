import axios from 'axios';
import type { WhatsAppContact, WhatsAppMessage, DashboardStats, SendMessageRequest, SendMessageResponse } from '../types/whatsapp';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Contacts
export const getContacts = async (): Promise<WhatsAppContact[]> => {
    const response = await api.get('/api/contacts');
    return response.data;
};

// Messages
export const getMessages = async (phoneNumber: string): Promise<WhatsAppMessage[]> => {
    const response = await api.get(`/api/messages/${phoneNumber}`);
    return response.data;
};

export const sendMessage = async (data: SendMessageRequest): Promise<SendMessageResponse> => {
    const response = await api.post('/api/send', data);
    return response.data;
};

export const markMessagesAsRead = async (phoneNumber: string): Promise<void> => {
    await api.put(`/api/messages/read/${phoneNumber}`);
};

// Contacts
export const resetUnreadCount = async (phoneNumber: string): Promise<void> => {
    await api.put(`/api/contacts/${phoneNumber}/read`);
};

// Export contacts as CSV
export const exportContactsCSV = async (): Promise<Blob> => {
    const response = await api.get('/api/contacts/export', {
        responseType: 'blob'
    });
    return response.data;
};

// Import contacts from CSV
export const importContactsCSV = async (contacts: any[]): Promise<any> => {
    const response = await api.post('/api/contacts/import', { contacts });
    return response.data;
};

// Update contact status
export const updateContactStatus = async (phoneNumber: string, status: string): Promise<any> => {
    const response = await api.put(`/api/contacts/${phoneNumber}/status`, { status });
    return response.data;
};

// Update lead temperature
export const updateContactTemperature = async (phoneNumber: string, temperature: string): Promise<any> => {
    const response = await api.put(`/api/contacts/${phoneNumber}/temperature`, { temperature });
    return response.data;
};

// Update contact name
export const updateContactName = async (phoneNumber: string, name: string): Promise<any> => {
    const response = await api.put(`/api/contacts/${phoneNumber}/name`, { name });
    return response.data;
};

// Delete contact
export const deleteContact = async (phoneNumber: string): Promise<any> => {
    const response = await api.delete(`/api/contacts/${phoneNumber}`);
    return response.data;
};

// Upload media file
export const uploadMedia = async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/media/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

// Send media message
export const sendMediaMessage = async (data: {
    to: string;
    mediaId: string;
    mediaType: 'image' | 'document' | 'audio' | 'video';
    caption?: string;
    filename?: string;
}): Promise<any> => {
    const response = await api.post('/api/media/send', data);
    return response.data;
};

// Get dashboard stats with breakdowns
export const getDashboardStats = async (): Promise<DashboardStats> => {
    const response = await api.get('/api/dashboard/stats');
    return response.data;
};

// Export with filters (segment, temperature, status)
export const exportContactsFiltered = async (filters?: { status?: string; temperature?: string; segment?: string }): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.temperature) params.append('temperature', filters.temperature);
    if (filters?.segment) params.append('segment', filters.segment);

    const response = await api.get(`/api/contacts/export/filtered?${params.toString()}`, {
        responseType: 'blob'
    });
    return response.data;
};

// Add single contact
export const addContact = async (data: { phone_number: string; profile_name: string }): Promise<any> => {
    const response = await api.post('/api/contacts', data);
    return response.data;
};

// Stats
export const getStats = async (): Promise<DashboardStats> => {
    const response = await api.get('/api/stats');
    return response.data;
};

// Health check
export const healthCheck = async (): Promise<{ status: string }> => {
    const response = await api.get('/health');
    return response.data;
};

// ========== SEGMENTS ==========

export const getSegments = async (): Promise<any[]> => {
    const response = await api.get('/api/segments');
    return response.data;
};

export const getSegment = async (id: number): Promise<any> => {
    const response = await api.get(`/api/segments/${id}`);
    return response.data;
};

export const createSegment = async (data: { name: string; description?: string }): Promise<any> => {
    const response = await api.post('/api/segments', data);
    return response.data;
};

export const updateSegment = async (id: number, data: { name: string; description?: string }): Promise<any> => {
    const response = await api.put(`/api/segments/${id}`, data);
    return response.data;
};

export const deleteSegment = async (id: number): Promise<any> => {
    const response = await api.delete(`/api/segments/${id}`);
    return response.data;
};

export const getSegmentContacts = async (id: number): Promise<any[]> => {
    const response = await api.get(`/api/segments/${id}/contacts`);
    return response.data;
};

export const addContactsToSegment = async (id: number, data: { contactIds?: number[]; phoneNumbers?: string[] }): Promise<any> => {
    const response = await api.post(`/api/segments/${id}/contacts`, data);
    return response.data;
};

export const removeContactFromSegment = async (segmentId: number, contactId: number): Promise<any> => {
    const response = await api.delete(`/api/segments/${segmentId}/contacts/${contactId}`);
    return response.data;
};

export const getContactSegments = async (phoneNumber: string): Promise<any[]> => {
    const response = await api.get(`/api/contacts/${phoneNumber}/segments`);
    return response.data;
};

// ========== TEMPLATES ==========

export const getTemplates = async (): Promise<any[]> => {
    const response = await api.get('/api/templates');
    return response.data;
};

export const getTemplate = async (name: string): Promise<any> => {
    const response = await api.get(`/api/templates/${name}`);
    return response.data;
};

export const sendTemplate = async (data: {
    to: string;
    templateName: string;
    languageCode?: string;
    components?: any[];
}): Promise<any> => {
    const response = await api.post('/api/templates/send', data);
    return response.data;
};

// ========== BULK SEND ==========

export const sendBulk = async (data: {
    segmentId?: number;
    contactIds?: number[];
    templateName: string;
    languageCode?: string;
    components?: any[];
}): Promise<any> => {
    const response = await api.post('/api/bulk/send', data);
    return response.data;
};

export const getBulkStatus = async (jobId: number): Promise<any> => {
    const response = await api.get(`/api/bulk/status/${jobId}`);
    return response.data;
};

export const getBulkHistory = async (): Promise<any[]> => {
    const response = await api.get('/api/bulk/history');
    return response.data;
};

// ========== ENHANCED IMPORT/EXPORT ==========

export const importContactsWithSegment = async (data: { contacts: any[]; segmentId?: number }): Promise<any> => {
    const response = await api.post('/api/contacts/import', data);
    return response.data;
};

export const exportContactsFilteredEnhanced = async (filters?: {
    segment?: string;
    temperature?: string;
    status?: string;
}): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters?.segment) params.append('segment', filters.segment);
    if (filters?.temperature) params.append('temperature', filters.temperature);
    if (filters?.status) params.append('status', filters.status);

    const response = await api.get(`/api/contacts/export/filtered?${params.toString()}`, {
        responseType: 'blob'
    });
    return response.data;
};

export default api;
