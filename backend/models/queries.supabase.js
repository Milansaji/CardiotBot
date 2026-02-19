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
        // Try insert first
        const { data: existing } = await supabase.from('contacts')
            .select('id, unread_count')
            .eq('phone_number', phone_number)
            .single();

        if (existing) {
            const { error } = await supabase.from('contacts')
                .update({
                    profile_name,
                    last_message_at,
                    unread_count: (existing.unread_count || 0) + 1
                })
                .eq('phone_number', phone_number);
            if (error) throw error;
        } else {
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
        // Use RPC function for efficient SUM
        const { data, error } = await supabase.rpc('get_total_unread_count');

        // If RPC fails (e.g. function not created yet), fallback to client-side sum
        if (error) {
            console.warn('RPC get_total_unread_count failed, falling back to client-side sum', error.message);
            const { data: contacts, error: fetchError } = await supabase.from('contacts').select('unread_count');
            if (fetchError) throw fetchError;
            const total = contacts.reduce((sum, c) => sum + (c.unread_count || 0), 0);
            return { count: total };
        }

        return { count: data || 0 };
    }

    static async getStatusBreakdown() {
        const { data, error } = await supabase.rpc('get_status_breakdown');

        if (error) {
            console.warn('RPC get_status_breakdown failed, falling back to client-side aggregation', error.message);
            const { data: contacts, error: fetchError } = await supabase.from('contacts').select('status');
            if (fetchError) throw fetchError;
            const counts = {};
            contacts.forEach(row => {
                counts[row.status] = (counts[row.status] || 0) + 1;
            });
            return Object.entries(counts).map(([status, count]) => ({ status, count }));
        }

        return data; // already in format [{ status: '...', count: N }]
    }

    static async getTemperatureBreakdown() {
        const { data, error } = await supabase.rpc('get_temperature_breakdown');

        if (error) {
            console.warn('RPC get_temperature_breakdown failed, falling back to client-side aggregation', error.message);
            const { data: contacts, error: fetchError } = await supabase.from('contacts').select('lead_temperature');
            if (fetchError) throw fetchError;
            const counts = {};
            contacts.forEach(row => {
                counts[row.lead_temperature] = (counts[row.lead_temperature] || 0) + 1;
            });
            return Object.entries(counts).map(([lead_temperature, count]) => ({ lead_temperature, count }));
        }

        return data;
    }
}

module.exports = { MessageModel, ContactModel, StatsModel };
