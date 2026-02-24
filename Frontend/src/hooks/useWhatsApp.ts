import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import type { SendMessageRequest } from '../types/whatsapp';

// Fetch contacts with auto-refresh
export const useContacts = () => {
    return useQuery({
        queryKey: ['contacts'],
        queryFn: api.getContacts,
        refetchInterval: 5000, // Refresh every 5 seconds
        staleTime: 1000,
    });
};

// Fetch messages for a specific contact with auto-refresh
export const useMessages = (phoneNumber: string) => {
    return useQuery({
        queryKey: ['messages', phoneNumber],
        queryFn: () => api.getMessages(phoneNumber),
        enabled: !!phoneNumber,
        refetchInterval: 3000, // Refresh every 3 seconds for real-time feel
        staleTime: 0,
    });
};

// Send message mutation
export const useSendMessage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SendMessageRequest) => api.sendMessage(data),
        onSuccess: (_, variables) => {
            // Invalidate messages to show new sent message
            queryClient.invalidateQueries({ queryKey: ['messages', variables.to] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
        },
    });
};

// Mark messages as read
export const useMarkAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (phoneNumber: string) => api.markMessagesAsRead(phoneNumber),
        onSuccess: (_, phoneNumber) => {
            queryClient.invalidateQueries({ queryKey: ['messages', phoneNumber] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
        },
    });
};

// Reset unread count
export const useResetUnreadCount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (phoneNumber: string) => api.resetUnreadCount(phoneNumber),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
        },
    });
};

// Fetch stats
export const useStats = () => {
    return useQuery({
        queryKey: ['stats'],
        queryFn: api.getStats,
        refetchInterval: 10000, // Refresh every 10 seconds
    });
};

// Export contacts mutation
export const useExportContacts = () => {
    return useMutation({
        mutationFn: api.exportContactsCSV,
        onSuccess: (blob) => {
            // Download file
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `contacts-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        },
    });
};

// Import contacts mutation
export const useImportContacts = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: api.importContactsCSV,
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            alert(`✅ Imported ${result.imported} contacts! Skipped ${result.skipped} duplicates.`);
        },
    });
};

// Add contact mutation
export const useAddContact = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: api.addContact,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
        },
    });
};

// Update contact status
export const useUpdateContactStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ phoneNumber, status }: { phoneNumber: string; status: string }) =>
            api.updateContactStatus(phoneNumber, status),
        onSuccess: (data, variables) => {
            // Invalidate both contacts and dashboard stats for real-time updates
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });

            // Immediately update the cache for instant feedback
            queryClient.setQueryData(['contacts'], (old: any) => {
                if (!old) return old;
                return old.map((contact: any) =>
                    contact.phone_number === variables.phoneNumber
                        ? { ...contact, status: variables.status }
                        : contact
                );
            });
        },
    });
};

// Update contact temperature
export const useUpdateContactTemperature = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ phoneNumber, temperature }: { phoneNumber: string; temperature: string }) =>
            api.updateContactTemperature(phoneNumber, temperature),
        onSuccess: (data, variables) => {
            // Invalidate both contacts and dashboard stats for real-time updates
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });

            // Immediately update the cache for instant feedback
            queryClient.setQueryData(['contacts'], (old: any) => {
                if (!old) return old;
                return old.map((contact: any) =>
                    contact.phone_number === variables.phoneNumber
                        ? { ...contact, lead_temperature: variables.temperature }
                        : contact
                );
            });
        },
    });
};

// Update contact name
export const useUpdateContactName = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ phoneNumber, name }: { phoneNumber: string; name: string }) =>
            api.updateContactName(phoneNumber, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
        },
    });
};

// Delete contact
export const useDeleteContact = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (phoneNumber: string) => api.deleteContact(phoneNumber),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });
};

// Upload and send media message
export const useSendMediaMessage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ file, to, caption }: {
            file: File;
            to: string;
            caption?: string;
        }) => {
            // First upload the file
            const uploadResult = await api.uploadMedia(file);

            // Determine media type based on file MIME type
            let mediaType: 'image' | 'document' | 'audio' | 'video' = 'document';
            if (file.type.startsWith('image/')) mediaType = 'image';
            else if (file.type.startsWith('audio/')) mediaType = 'audio';
            else if (file.type.startsWith('video/')) mediaType = 'video';

            // Then send the media message
            return api.sendMediaMessage({
                to,
                mediaId: uploadResult.mediaId,
                mediaType,
                caption,
                filename: file.name
            });
        },
        onSuccess: (_, variables) => {
            // Invalidate the specific contact's messages so they refresh
            queryClient.invalidateQueries({ queryKey: ['messages', variables.to] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
        },
    });
};

// Dashboard stats with breakdowns
export const useDashboardStats = () => {
    return useQuery({
        queryKey: ['dashboardStats'],
        queryFn: api.getDashboardStats,
        refetchInterval: 10000,
    });
};

// Export with filters
export const useExportContactsFiltered = () => {
    return useMutation({
        mutationFn: api.exportContactsFiltered,
        onSuccess: (blob, variables) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const filterName = variables?.segment || variables?.status || variables?.temperature || 'all';
            a.download = `contacts-${filterName}-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        },
    });
};
