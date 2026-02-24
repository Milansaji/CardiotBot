const supabase = require('../config/supabase');

// ============================================================
// MESSAGE MODEL
// ============================================================
class MessageModel {
    static async insert(data) {
        const { whatsapp_message_id, from_number, profile_name, message_type,
            message_text, media_id, media_url, media_mime_type, timestamp, direction } = data;

        const { error } = await supabase.from('messages').insert({
            whatsapp_message_id,
            from_number,
            profile_name,
            message_type,
            message_text,
            media_id,
            media_url,
            media_mime_type,
            timestamp,
            direction
        });

        if (error && error.code !== '23505') { // 23505 = unique violation (duplicate)
            throw error;
        }
        return { isDuplicate: error?.code === '23505' };
    }

    static async updateStatus(status, whatsapp_message_id) {
        const { error } = await supabase.from('messages')
            .update({ status })
            .eq('whatsapp_message_id', whatsapp_message_id);
        if (error) throw error;
    }

    static async updateMediaUrl(media_url, whatsapp_message_id) {
        const { error } = await supabase.from('messages')
            .update({ media_url })
            .eq('whatsapp_message_id', whatsapp_message_id);
        if (error) throw error;
    }

    static async getByPhoneNumber(from_number) {
        const { data, error } = await supabase.from('messages')
            .select('*')
            .eq('from_number', from_number)
            .order('timestamp', { ascending: true });
        if (error) throw error;
        return data;
    }

    static async getById(whatsapp_message_id) {
        const { data, error } = await supabase.from('messages')
            .select('*')
            .eq('whatsapp_message_id', whatsapp_message_id)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    static async markAsRead(from_number) {
        const { error } = await supabase.from('messages')
            .update({ is_read: true })
            .eq('from_number', from_number);
        if (error) throw error;
    }
}

// ============================================================
// CONTACT MODEL
// ============================================================
class ContactModel {
    static async upsert(phone_number, profile_name, last_message_at) {
        // Check if contact already exists
        const { data: existing } = await supabase.from('contacts')
            .select('id, unread_count, profile_name')
            .eq('phone_number', phone_number)
            .single();

        if (existing) {
            // Contact exists: update timestamp and unread count
            // Do NOT overwrite profile_name — respect manually edited names
            const { error } = await supabase.from('contacts')
                .update({
                    last_message_at,
                    unread_count: (existing.unread_count || 0) + 1
                })
                .eq('phone_number', phone_number);
            if (error) throw error;
        } else {
            // New contact: use WhatsApp profile name
            const { error } = await supabase.from('contacts').insert({
                phone_number,
                profile_name,
                last_message_at,
                unread_count: 1
            });
            if (error && error.code !== '23505') throw error;
        }
    }

    static async insert(phone_number, profile_name, last_message_at, unread_count) {
        const { data, error } = await supabase.from('contacts').insert({
            phone_number,
            profile_name,
            last_message_at,
            unread_count
        }).select().single();
        if (error) throw error;
        return data;
    }

    static async getAll() {
        const { data, error } = await supabase.from('contacts')
            .select('*')
            .order('last_message_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    static async getByPhone(phone_number) {
        const { data, error } = await supabase.from('contacts')
            .select('*')
            .eq('phone_number', phone_number)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    static async resetUnreadCount(phone_number) {
        const { error } = await supabase.from('contacts')
            .update({ unread_count: 0 })
            .eq('phone_number', phone_number);
        if (error) throw error;
    }

    static async updateStatus(status, phone_number) {
        const { error } = await supabase.from('contacts')
            .update({ status })
            .eq('phone_number', phone_number);
        if (error) throw error;
    }

    static async updateTemperature(lead_temperature, phone_number) {
        const { error } = await supabase.from('contacts')
            .update({ lead_temperature })
            .eq('phone_number', phone_number);
        if (error) throw error;
    }

    static async updateName(profile_name, phone_number) {
        const { error } = await supabase.from('contacts')
            .update({ profile_name })
            .eq('phone_number', phone_number);
        if (error) throw error;
    }

    static async updateAssignedAgent(assigned_agent_id, phone_number) {
        const { error } = await supabase.from('contacts')
            .update({ assigned_agent_id: assigned_agent_id || null })
            .eq('phone_number', phone_number);
        if (error) throw error;
    }

    static async getByStatus(status) {
        const { data, error } = await supabase.from('contacts')
            .select('*')
            .eq('status', status)
            .order('last_message_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    static async getByTemperature(lead_temperature) {
        const { data, error } = await supabase.from('contacts')
            .select('*')
            .eq('lead_temperature', lead_temperature)
            .order('last_message_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    static async getByStatusAndTemp(status, lead_temperature) {
        const { data, error } = await supabase.from('contacts')
            .select('*')
            .eq('status', status)
            .eq('lead_temperature', lead_temperature)
            .order('last_message_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    static async deleteContact(phone_number) {
        const { error } = await supabase.from('contacts')
            .delete()
            .eq('phone_number', phone_number);
        if (error) throw error;
    }

    static async deleteMessages(from_number) {
        const { error } = await supabase.from('messages')
            .delete()
            .eq('from_number', from_number);
        if (error) throw error;
    }

    static async clearWorkflow(id) {
        const { error } = await supabase.from('contacts')
            .update({
                workflow_id: null,
                workflow_step: 0,
                workflow_paused: false,
                last_workflow_sent_at: null
            })
            .eq('id', id);
        if (error) throw error;
    }

    static async updateSource(source, phone_number) {
        const { error } = await supabase.from('contacts')
            .update({ source })
            .eq('phone_number', phone_number);
        if (error) throw error;
    }

    static async getBySource(source) {
        const { data, error } = await supabase.from('contacts')
            .select('*')
            .eq('source', source)
            .order('last_message_at', { ascending: false });
        if (error) throw error;
        return data;
    }
}

// ============================================================
// STATS MODEL
// ============================================================
class StatsModel {
    static async getTotalMessages() {
        const { count, error } = await supabase.from('messages').select('*', { count: 'exact', head: true });
        if (error) throw error;
        return { count: count || 0 };
    }

    static async getTotalContacts() {
        const { count, error } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
        if (error) throw error;
        return { count: count || 0 };
    }

    static async getUnreadMessages() {
        // Simple and robust: Fetch unread_count column and sum in JS
        // This avoids needing complex RPC functions that might be missing
        const { data: contacts, error } = await supabase
            .from('contacts')
            .select('unread_count');

        if (error) throw error;

        const total = contacts.reduce((sum, c) => sum + (c.unread_count || 0), 0);
        return { count: total };
    }

    static async getStatusBreakdown() {
        // Fetch all statuses and aggregate in JS
        // Much safer than relying on potentially missing RPC functions
        const { data: contacts, error } = await supabase
            .from('contacts')
            .select('status');

        if (error) throw error;

        const counts = {};
        contacts.forEach(row => {
            const s = row.status || 'ongoing';
            counts[s] = (counts[s] || 0) + 1;
        });

        // Convert to array format expected by controller
        return Object.entries(counts).map(([status, count]) => ({ status, count }));
    }

    static async getTemperatureBreakdown() {
        // Fetch all temperatures and aggregate in JS
        const { data: contacts, error } = await supabase
            .from('contacts')
            .select('lead_temperature');

        if (error) throw error;

        const counts = {};
        contacts.forEach(row => {
            const t = row.lead_temperature || 'cold';
            counts[t] = (counts[t] || 0) + 1;
        });

        return Object.entries(counts).map(([lead_temperature, count]) => ({ lead_temperature, count }));
    }
}

module.exports = { MessageModel, ContactModel, StatsModel };
