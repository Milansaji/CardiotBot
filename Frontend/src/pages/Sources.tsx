import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
    Instagram,
    BarChart3,
    QrCode,
    Globe,
    Share2,
    Link,
    Users,
    UserCheck,
    Loader2,
    ChevronRight,
    Tag,
    TrendingUp,
} from 'lucide-react';
import * as api from '../lib/api';

const SOURCE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string; dot: string }> = {
    instagram: {
        label: 'Instagram',
        icon: Instagram,
        color: 'text-pink-600',
        bg: 'bg-gradient-to-br from-pink-50 to-purple-50',
        border: 'border-pink-200',
        dot: 'bg-pink-500',
    },
    meta_ads: {
        label: 'Meta Ads',
        icon: BarChart3,
        color: 'text-blue-600',
        bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
        border: 'border-blue-200',
        dot: 'bg-blue-500',
    },
    qr_code: {
        label: 'QR Code',
        icon: QrCode,
        color: 'text-emerald-600',
        bg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
    },
    facebook: {
        label: 'Facebook',
        icon: Share2,
        color: 'text-blue-700',
        bg: 'bg-gradient-to-br from-blue-50 to-sky-50',
        border: 'border-blue-300',
        dot: 'bg-blue-700',
    },
    whatsapp_link: {
        label: 'WhatsApp Link',
        icon: Link,
        color: 'text-green-600',
        bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
        border: 'border-green-200',
        dot: 'bg-green-500',
    },
    referral: {
        label: 'Referral',
        icon: UserCheck,
        color: 'text-purple-600',
        bg: 'bg-gradient-to-br from-purple-50 to-violet-50',
        border: 'border-purple-200',
        dot: 'bg-purple-500',
    },
    website: {
        label: 'Website',
        icon: Globe,
        color: 'text-slate-600',
        bg: 'bg-gradient-to-br from-slate-50 to-gray-50',
        border: 'border-slate-200',
        dot: 'bg-slate-500',
    },
    other: {
        label: 'Other',
        icon: Tag,
        color: 'text-orange-600',
        bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
        border: 'border-orange-200',
        dot: 'bg-orange-500',
    },
    unknown: {
        label: 'Not Set',
        icon: Users,
        color: 'text-slate-400',
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        dot: 'bg-slate-300',
    },
};

const ALL_SOURCES = ['instagram', 'meta_ads', 'qr_code', 'facebook', 'whatsapp_link', 'referral', 'website', 'other'];

const Sources = () => {
    const queryClient = useQueryClient();
    const [selectedSource, setSelectedSource] = useState<string | null>(null);
    const [editingContact, setEditingContact] = useState<string | null>(null);
    const [newSource, setNewSource] = useState('');

    const { data: breakdown = [], isLoading: breakdownLoading } = useQuery({
        queryKey: ['source-breakdown'],
        queryFn: api.getSourceBreakdown,
        refetchInterval: 15000,
    });

    const { data: sourceContacts = [], isLoading: contactsLoading } = useQuery({
        queryKey: ['source-contacts', selectedSource],
        queryFn: () => api.getContactsBySource(selectedSource!),
        enabled: !!selectedSource,
    });

    const updateSourceMutation = useMutation({
        mutationFn: ({ phoneNumber, source }: { phoneNumber: string; source: string | null }) =>
            api.updateContactSource(phoneNumber, source),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['source-breakdown'] });
            queryClient.invalidateQueries({ queryKey: ['source-contacts'] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            setEditingContact(null);
        },
    });

    const totalTracked = breakdown.filter(b => b.source !== 'unknown').reduce((s, b) => s + b.count, 0);
    const totalUnknown = breakdown.find(b => b.source === 'unknown')?.count || 0;
    const totalAll = totalTracked + totalUnknown;

    const getConfig = (src: string) => SOURCE_CONFIG[src] || SOURCE_CONFIG.unknown;
    const getCount = (src: string) => breakdown.find(b => b.source === src)?.count || 0;

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">Source Tracking</h1>
                    <p className="text-sm text-slate-500 mt-1">Track where your contacts and leads come from</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-600">
                        <span className="font-semibold text-slate-800">{totalTracked}</span> tracked · <span className="font-semibold text-slate-400">{totalUnknown}</span> unknown
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['instagram', 'meta_ads', 'qr_code', 'referral'].map((src) => {
                    const cfg = getConfig(src);
                    const count = getCount(src);
                    const pct = totalAll > 0 ? Math.round((count / totalAll) * 100) : 0;
                    const Icon = cfg.icon;
                    return (
                        <button
                            key={src}
                            onClick={() => setSelectedSource(src === selectedSource ? null : src)}
                            className={`${cfg.bg} border ${cfg.border} rounded-xl p-4 text-left transition-all hover:shadow-md ${selectedSource === src ? 'ring-2 ring-offset-1 ring-blue-400 shadow-md' : ''}`}
                        >
                            <div className={`w-10 h-10 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center mb-3`}>
                                <Icon className={`w-5 h-5 ${cfg.color}`} />
                            </div>
                            <div className="text-2xl font-bold text-slate-800 mb-0.5">{count}</div>
                            <div className="text-xs font-medium text-slate-500">{cfg.label}</div>
                            <div className="mt-2 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-slate-400" />
                                <span className="text-xs text-slate-400">{pct}% of total</span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Full Breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-700">All Sources</h2>
                    <span className="text-xs text-slate-400">{totalAll} total contacts</span>
                </div>
                {breakdownLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {[...ALL_SOURCES, 'unknown'].map((src) => {
                            const cfg = getConfig(src);
                            const count = getCount(src);
                            const pct = totalAll > 0 ? Math.round((count / totalAll) * 100) : 0;
                            const Icon = cfg.icon;
                            return (
                                <button
                                    key={src}
                                    onClick={() => setSelectedSource(src === selectedSource ? null : src)}
                                    className={`w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-slate-50 transition-colors group ${selectedSource === src ? 'bg-blue-50/60' : ''}`}
                                >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${cfg.border} ${cfg.bg}`}>
                                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-sm font-medium text-slate-700">{cfg.label}</span>
                                            <span className="text-sm font-bold text-slate-800 ml-2">{count}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-1.5 rounded-full transition-all ${cfg.dot}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400 w-10 text-right shrink-0">{pct}%</span>
                                    <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-colors ${selectedSource === src ? 'text-blue-500' : 'text-slate-300 group-hover:text-slate-400'}`} />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Contacts for Selected Source */}
            {selectedSource && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {(() => { const Icon = getConfig(selectedSource).icon; return <Icon className={`w-4 h-4 ${getConfig(selectedSource).color}`} />; })()}
                            <h2 className="text-sm font-semibold text-slate-700">Contacts from {getConfig(selectedSource).label}</h2>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">{sourceContacts.length}</span>
                        </div>
                        <button onClick={() => setSelectedSource(null)} className="text-xs text-slate-400 hover:text-slate-600">Close</button>
                    </div>

                    {contactsLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                    ) : sourceContacts.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-sm">No contacts from this source yet.</div>
                    ) : (
                        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                            {sourceContacts.map((contact: any) => (
                                <div key={contact.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200 shrink-0">
                                        {contact.profile_name?.slice(0, 2).toUpperCase() || '??'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">{contact.profile_name}</p>
                                        <p className="text-xs text-slate-400 font-mono">{contact.phone_number}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${contact.status === 'converted' ? 'bg-emerald-100 text-emerald-700' :
                                                contact.status === 'human_takeover' ? 'bg-purple-100 text-purple-700' :
                                                    contact.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-blue-100 text-blue-700'
                                            }`}>{contact.status?.replace('_', ' ')}</span>
                                        {contact.last_message_at && (
                                            <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(contact.last_message_at * 1000), { addSuffix: true })}</span>
                                        )}
                                        {/* Edit source */}
                                        {editingContact === contact.phone_number ? (
                                            <div className="flex items-center gap-1">
                                                <select
                                                    value={newSource}
                                                    onChange={e => setNewSource(e.target.value)}
                                                    className="text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400"
                                                    autoFocus
                                                >
                                                    <option value="">-- Select --</option>
                                                    {ALL_SOURCES.map(s => (
                                                        <option key={s} value={s}>{SOURCE_CONFIG[s].label}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => updateSourceMutation.mutate({ phoneNumber: contact.phone_number, source: newSource || null })}
                                                    disabled={updateSourceMutation.isPending}
                                                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                                >Save</button>
                                                <button onClick={() => setEditingContact(null)} className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => { setEditingContact(contact.phone_number); setNewSource(contact.source || ''); }}
                                                className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                                            >Edit</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Assign Source to Untracked Contacts */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <Tag className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-amber-800 mb-1">Tip: Track Sources Automatically</h3>
                        <p className="text-xs text-amber-700 leading-relaxed">
                            Add a <code className="bg-amber-100 px-1 rounded font-mono">?source=instagram</code> parameter to your WhatsApp links (e.g. wa.me links).
                            Your Python bot can then read this from the contact's first message and set the source automatically.
                            Use QR codes per campaign — each QR points to a different link with a unique source tag.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {ALL_SOURCES.map(src => {
                                const cfg = SOURCE_CONFIG[src];
                                return (
                                    <span key={src} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                        {cfg.label}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sources;
