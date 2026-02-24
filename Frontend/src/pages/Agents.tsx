import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    UserCheck,
    Loader2,
    Mail,
    MessageSquare,
    Phone,
    ChevronRight,
    X,
    ExternalLink,
} from 'lucide-react';
import * as api from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Agent {
    id: string; // UUID
    name: string;
    email: string | null;
    active_chats: number;
    avatar?: string;
    role?: string;
}

const statusColors: Record<string, string> = {
    ongoing: 'bg-blue-100 text-blue-700',
    converted: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    human_takeover: 'bg-purple-100 text-purple-700',
    follow_up: 'bg-orange-100 text-orange-700',
};

const Agents: React.FC = () => {
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const navigate = useNavigate();

    const { data: agents = [], isLoading } = useQuery({
        queryKey: ['agents'],
        queryFn: api.getAgents,
    });

    const { data: agentContacts = [], isLoading: contactsLoading } = useQuery({
        queryKey: ['agent-contacts', selectedAgent?.id],
        queryFn: () => selectedAgent ? api.getAgentContacts(selectedAgent.id) : Promise.resolve([]),
        enabled: !!selectedAgent,
    });

    const handleOpenChat = (phoneNumber: string) => {
        navigate('/conversations', { state: { phoneNumber } });
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">Agents</h1>
                    <p className="text-sm text-slate-500 mt-1">Directory of authenticated users who can handle chats</p>
                </div>
            </div>

            <div className="flex gap-6 flex-col lg:flex-row">
                {/* Agent List */}
                <div className={`${selectedAgent ? 'lg:w-80' : 'w-full'} space-y-3 flex-shrink-0 transition-all duration-300`}>
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                    ) : agents.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-sm">
                            <UserCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-700 mb-2">No agents found</h3>
                            <p className="text-slate-500 mb-4">New users can join by signing up on the login page.</p>
                        </div>
                    ) : (
                        agents.map((agent: Agent) => (
                            <div
                                key={agent.id}
                                onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
                                className={`bg-white border rounded-lg p-4 shadow-sm cursor-pointer transition-all hover:shadow-md ${selectedAgent?.id === agent.id
                                    ? 'border-blue-400 ring-2 ring-blue-100'
                                    : 'border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden">
                                            {agent.avatar ? (
                                                <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                                            ) : (
                                                agent.name?.slice(0, 2).toUpperCase() || "??"
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-800">{agent.name}</h3>
                                            {agent.email && (
                                                <div className="flex items-center gap-1 text-xs text-slate-500 truncate max-w-[150px]">
                                                    <Mail className="w-3 h-3" />
                                                    {agent.email}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium" title="Active Chats">
                                            <MessageSquare className="w-3 h-3" />
                                            {agent.active_chats}
                                        </span>
                                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${selectedAgent?.id === agent.id ? 'rotate-90' : ''}`} />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Agent Contacts Panel */}
                {selectedAgent && (
                    <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-300">
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                    {selectedAgent.name?.slice(0, 2).toUpperCase() || "??"}
                                </div>
                                <div>
                                    <h2 className="font-semibold text-slate-800">{selectedAgent.name || 'Agent'}'s Active Chats</h2>
                                    <p className="text-xs text-slate-500">{agentContacts.length} assigned contacts · click any to open chat</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedAgent(null)} className="p-1.5 hover:bg-slate-200 rounded-md transition-colors">
                                <X className="w-4 h-4 text-slate-500" />
                            </button>
                        </div>

                        {contactsLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                            </div>
                        ) : agentContacts.length === 0 ? (
                            <div className="p-12 text-center h-64 flex flex-col items-center justify-center">
                                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">No clients assigned yet</p>
                                <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">Assign this agent from the Conversations page when a contact is in human takeover</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
                                {agentContacts.map((contact: any) => (
                                    <div
                                        key={contact.id}
                                        className="flex items-center gap-3 p-4 hover:bg-blue-50 transition-colors group cursor-pointer"
                                        onClick={() => handleOpenChat(contact.phone_number)}
                                        title={`Open chat with ${contact.profile_name}`}
                                    >
                                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-200 group-hover:bg-blue-100 group-hover:border-blue-200 group-hover:text-blue-700 transition-colors">
                                            {contact.profile_name?.slice(0, 2).toUpperCase() || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-medium text-slate-800 text-sm truncate group-hover:text-blue-700 transition-colors">{contact.profile_name}</h4>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${statusColors[contact.status] || 'bg-slate-100 text-slate-600'}`}>
                                                    {contact.status?.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                <Phone className="w-3 h-3" />
                                                {contact.phone_number}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-xs text-slate-400 whitespace-nowrap group-hover:text-blue-500 transition-colors">
                                                {contact.last_message_at
                                                    ? formatDistanceToNow(new Date(contact.last_message_at * 1000), { addSuffix: true })
                                                    : ''}
                                            </span>
                                            <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Agents;
