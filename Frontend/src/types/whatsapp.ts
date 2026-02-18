// WhatsApp API Types

export interface WhatsAppContact {
    id: number;
    phone_number: string;
    profile_name: string;
    last_message_at: number;
    unread_count: number;
    status: 'ongoing' | 'converted' | 'rejected' | 'human_takeover';
    lead_temperature: 'hot' | 'warm' | 'cold';
}

export interface WhatsAppMessage {
    id: number;
    whatsapp_message_id: string;
    from_number: string;
    profile_name: string;
    message_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'interactive' | 'button';
    message_text: string;
    media_id: string | null;
    media_url: string | null;
    media_mime_type: string | null;
    timestamp: number;
    received_at: number;
    status: 'sent' | 'delivered' | 'read' | 'received';
    is_read: number;
    direction: 'incoming' | 'outgoing';
}

export interface DashboardStats {
    totalMessages: number;
    totalContacts: number;
    unreadMessages: number;
    statusBreakdown: {
        ongoing: number;
        converted: number;
        rejected: number;
        human_takeover: number;
    };
    temperatureBreakdown: {
        hot: number;
        warm: number;
        cold: number;
    };
}

export interface SendMessageRequest {
    to: string;
    message: string;
}

export interface SendMessageResponse {
    success: boolean;
    messageId: string;
}

// UI Mapped Types
export interface DashboardConversation {
    id: string;
    name: string;
    lastMessage: string;
    time: string;
    unread: number;
    status: 'ongoing' | 'human_takeover' | 'converted' | 'rejected' | 'follow_up';
    lead_temperature: 'hot' | 'warm' | 'cold';
    phone: string;
    avatar: string;
}

export interface DashboardMessage {
    id: string;
    text: string;
    time: string;
    sender: 'customer' | 'agent';
    status?: 'sent' | 'delivered' | 'read';
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'audio' | 'document';
}
