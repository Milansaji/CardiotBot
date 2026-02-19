const supabase = require('../config/supabase');

class AgentController {
    static async getAllAgents(req, res) {
        try {
            // Fetch profiles instead of agents table
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select(`
                    id,
                    full_name,
                    email,
                    avatar_url,
                    role,
                    contacts:contacts(count)
                `)
                .order('full_name', { ascending: true });

            if (error) throw error;

            // Transform data to match frontend expectations (map full_name -> name)
            const agents = profiles.map(p => ({
                id: p.id,
                name: p.full_name || p.email, // Fallback to email if name missing
                email: p.email,
                avatar: p.avatar_url,
                role: p.role,
                active_chats: p.contacts?.[0]?.count || 0
            }));

            res.json(agents);
        } catch (error) {
            console.error('Error fetching agents:', error);
            res.status(500).json({ error: 'Failed to fetch agents' });
        }
    }

    static async getAgentStats(req, res) {
        try {
            const { id } = req.params;

            // Get stats for specific agent (profile)
            const { count, error } = await supabase
                .from('contacts')
                .select('*', { count: 'exact', head: true })
                .eq('assigned_agent_id', id);

            if (error) throw error;

            res.json({
                active_chats: count || 0,
                avg_response_time: '5m', // Placeholder
                resolution_rate: '95%'   // Placeholder
            });
        } catch (error) {
            console.error('Error fetching agent stats:', error);
            res.status(500).json({ error: 'Failed to fetch agent stats' });
        }
    }

    static async assignAgent(req, res) {
        try {
            const { phoneNumber } = req.params;
            const { agentId } = req.body; // This is now a UUID string

            const { error } = await supabase
                .from('contacts')
                .update({
                    assigned_agent_id: agentId,
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

    // create/update/delete are handled via Supabase Auth now
    static async createAgent(req, res) {
        res.status(400).json({ error: 'Please use Supabase Auth to sign up new agents.' });
    }

    static async updateAgent(req, res) {
        res.status(400).json({ error: 'Profile updates are handled via Supabase Auth.' });
    }

    static async deleteAgent(req, res) {
        res.status(400).json({ error: 'User deletion must be done via Supabase Dashboard.' });
    }
}

module.exports = AgentController;
