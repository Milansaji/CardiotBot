const supabase = require('../config/supabase');

class SegmentModel {
    static async getAll() {
        const { data, error } = await supabase
            .from('segments')
            .select('*, contact_segments(count)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        // Map contact count
        return data.map(s => ({
            ...s,
            contact_count: s.contact_segments?.[0]?.count || 0,
            contact_segments: undefined
        }));
    }

    static async getById(id) {
        const { data, error } = await supabase
            .from('segments')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        if (!data) return null;

        // Get contact count
        const { count } = await supabase
            .from('contact_segments')
            .select('*', { count: 'exact', head: true })
            .eq('segment_id', id);

        return { ...data, contact_count: count || 0 };
    }

    static async getByName(name) {
        const { data, error } = await supabase
            .from('segments')
            .select('*')
            .eq('name', name)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    static async create(name, description) {
        const { data, error } = await supabase
            .from('segments')
            .insert({ name, description })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    static async update(id, name, description) {
        const { error } = await supabase
            .from('segments')
            .update({ name, description })
            .eq('id', id);
        if (error) throw error;
    }

    static async delete(id) {
        const { error } = await supabase
            .from('segments')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    static async getContacts(segmentId) {
        const { data, error } = await supabase
            .from('contact_segments')
            .select('contacts(*), added_at')
            .eq('segment_id', segmentId)
            .order('added_at', { ascending: false });
        if (error) throw error;
        return data.map(row => ({ ...row.contacts, segment_added_at: row.added_at }));
    }

    static async addContact(contactId, segmentId) {
        const { error } = await supabase
            .from('contact_segments')
            .upsert({ contact_id: contactId, segment_id: segmentId }, { onConflict: 'contact_id,segment_id' });
        if (error) throw error;
    }

    static async removeContact(contactId, segmentId) {
        const { error } = await supabase
            .from('contact_segments')
            .delete()
            .eq('contact_id', contactId)
            .eq('segment_id', segmentId);
        if (error) throw error;
    }

    static async getContactSegments(contactId) {
        const { data, error } = await supabase
            .from('contact_segments')
            .select('segments(*), added_at')
            .eq('contact_id', contactId)
            .order('added_at', { ascending: false });
        if (error) throw error;
        return data.map(row => row.segments);
    }

    static async addMultipleContacts(segmentId, contactIds) {
        const inserts = contactIds.map(id => ({ contact_id: id, segment_id: segmentId }));
        const { error } = await supabase
            .from('contact_segments')
            .upsert(inserts, { onConflict: 'contact_id,segment_id' });
        if (error) throw error;
    }

    static async getContactIdByPhone(phone_number) {
        const { data, error } = await supabase
            .from('contacts')
            .select('id')
            .eq('phone_number', phone_number)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }
}

module.exports = SegmentModel;
