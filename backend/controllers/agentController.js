const supabase = require('../config/supabase');

class AgentController {
    static async getAllAgents(req, res) {
        try {
            // Use Supabase Auth Admin API to list all users
            // This works because backend uses the service_role key
            const { data: { users }, error } = await supabase.auth.admin.listUsers();

            if (error) throw error;

            // Get contact counts for each agent (assigned contacts)
            const { data: contactCounts, error: countError } = await supabase
                .from('contacts')
                .select('assigned_agent_id');

            // Build a count map: agentId -> number of assigned contacts
            const countMap = {};
            if (!countError && contactCounts) {
                contactCounts.forEach(c => {
                    if (c.assigned_agent_id) {
                        countMap[c.assigned_agent_id] = (countMap[c.assigned_agent_id] || 0) + 1;
                    }
                });
            }

            // Transform auth users to agent format for frontend
            const agents = users.map(user => ({
                id: user.id,
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
                email: user.email,
                avatar: user.user_metadata?.avatar_url || null,
                role: user.user_metadata?.role || 'agent',
                active_chats: countMap[user.id] || 0
            }));

            // Sort by name
            agents.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            res.json(agents);
        } catch (error) {
            console.error('Error fetching agents:', error);
            res.status(500).json({ error: 'Failed to fetch agents' });
        }
    }

    static async getAgentStats(req, res) {
        try {
            const { id } = req.params;

            const { count, error } = await supabase
                .from('contacts')
                .select('*', { count: 'exact', head: true })
                .eq('assigned_agent_id', id);

            if (error) throw error;

            res.json({
                active_chats: count || 0,
                avg_response_time: '5m',
                resolution_rate: '95%'
            });
        } catch (error) {
            console.error('Error fetching agent stats:', error);
            res.status(500).json({ error: 'Failed to fetch agent stats' });
        }
    }

    static async getAgentContacts(req, res) {
        try {
            const { id } = req.params;

            const { data: contacts, error } = await supabase
                .from('contacts')
                .select('*')
                .eq('assigned_agent_id', id);

            if (error) throw error;

            res.json(contacts);
        } catch (error) {
            console.error('Error fetching agent contacts:', error);
            res.status(500).json({ error: 'Failed to fetch agent contacts' });
        }
    }

    static async assignAgent(req, res) {
        try {
            const { phoneNumber } = req.params;
            const { agentId } = req.body;

            // If assigning a real agent (not clearing), ensure their profile row exists.
            // contacts.assigned_agent_id has a FK that references profiles(id), NOT auth.users(id).
            // Users created before the trigger was set up may be missing a row in profiles.
            // We back-fill it here using the service_role key (which bypasses RLS).
            if (agentId) {
                // Look up the auth user so we have their metadata
                const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(agentId);

                if (userError || !user) {
                    console.error('Agent user not found in auth:', agentId, userError);
                    return res.status(404).json({ error: 'Agent user not found' });
                }

                // Upsert the profile row so the FK target always exists
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        email: user.email,
                        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
                        avatar_url: user.user_metadata?.avatar_url || null,
                        role: user.user_metadata?.role || 'agent',
                    }, { onConflict: 'id' });

                if (profileError) {
                    console.error('Error upserting agent profile:', profileError);
                    return res.status(500).json({ error: 'Failed to sync agent profile before assignment' });
                }

                console.log(`✅ Profile ensured for agent ${user.email} (${user.id})`);
            }

            // Now safely update the contact with the agent assignment
            const { error } = await supabase
                .from('contacts')
                .update({
                    assigned_agent_id: agentId || null,
                    status: agentId ? 'human_takeover' : 'ongoing'
                })
                .eq('phone_number', phoneNumber);

            if (error) throw error;

            res.json({ success: true });
        } catch (error) {
            console.error('Error assigning agent:', error);
            res.status(500).json({ error: 'Failed to assign agent' });
        }
    }

    // create/update/delete are handled via Supabase Auth sign-up
    static async createAgent(req, res) {
        res.status(400).json({ error: 'New agents join by signing up on the login page.' });
    }

    static async updateAgent(req, res) {
        res.status(400).json({ error: 'Profile updates are handled via Supabase Auth.' });
    }

    static async deleteAgent(req, res) {
        res.status(400).json({ error: 'User deletion must be done via Supabase Dashboard.' });
    }
}

module.exports = AgentController;
