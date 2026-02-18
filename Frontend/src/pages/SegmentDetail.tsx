import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft,
    Users,
    Search,
    Phone,
    Mail,
    Calendar,
    Thermometer,
    Tag,
    Loader2
} from 'lucide-react';
import * as api from '../lib/api';

interface Contact {
    id: number;
    phone_number: string;
    profile_name: string;
    last_message_at: number;
    status: string;
    lead_temperature: string;
    unread_count: number;
}

const SegmentDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch segment details
    const { data: segment, isLoading: segmentLoading } = useQuery({
        queryKey: ['segment', id],
        queryFn: () => api.getSegment(parseInt(id!)),
        enabled: !!id,
    });

    // Fetch contacts in this segment
    const { data: contacts = [], isLoading: contactsLoading } = useQuery({
        queryKey: ['segment-contacts', id],
        queryFn: () => api.getSegmentContacts(parseInt(id!)),
        enabled: !!id,
    });

    const filteredContacts = contacts.filter((contact: Contact) =>
        contact.profile_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone_number.includes(searchTerm)
    );

    const tempColors: Record<string, string> = {
        hot: 'bg-orange-100 text-orange-700 border-orange-200',
        warm: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        cold: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    };

    const statusColors: Record<string, string> = {
        ongoing: 'bg-blue-100 text-blue-700',
        converted: 'bg-emerald-100 text-emerald-700',
        rejected: 'bg-red-100 text-red-700',
        human_takeover: 'bg-purple-100 text-purple-700',
        follow_up: 'bg-orange-100 text-orange-700',
    };

    if (segmentLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!segment) {
        return (
            <div className="page-container">
                <div className="text-center py-12">
                    <h2 className="text-xl font-semibold text-slate-700">Segment not found</h2>
                    <button onClick={() => navigate('/segments')} className="btn-primary mt-4">
                        Back to Segments
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/segments')}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="page-title">{segment.name}</h1>
                        <p className="page-subtitle">
                            {segment.description || 'No description'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">
                            {contacts.length} contacts
                        </span>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="card mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search contacts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field pl-10"
                    />
                </div>
            </div>

            {/* Contacts List */}
            {contactsLoading ? (
                <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                    <p className="mt-2 text-slate-500">Loading contacts...</p>
                </div>
            ) : filteredContacts.length === 0 ? (
                <div className="card text-center py-12">
                    <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-700 mb-2">
                        {searchTerm ? 'No contacts found' : 'No contacts in this segment'}
                    </h3>
                    <p className="text-slate-500">
                        {searchTerm ? 'Try a different search term' : 'Import contacts to get started'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredContacts.map((contact: Contact) => (
                        <div
                            key={contact.id}
                            className="card hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => navigate('/conversations')}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-800 mb-1">
                                        {contact.profile_name}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <Phone className="w-3.5 h-3.5" />
                                        <span>{contact.phone_number}</span>
                                    </div>
                                </div>
                                {contact.unread_count > 0 && (
                                    <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                                        {contact.unread_count}
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                                <span className={`px-2 py-1 text-xs font-medium rounded-md ${statusColors[contact.status] || 'bg-slate-100 text-slate-700'}`}>
                                    {contact.status}
                                </span>
                                <span className={`px-2 py-1 text-xs font-medium rounded-md border ${tempColors[contact.lead_temperature] || 'bg-slate-100 text-slate-700'}`}>
                                    <Thermometer className="w-3 h-3 inline mr-1" />
                                    {contact.lead_temperature}
                                </span>
                            </div>

                            {contact.last_message_at && (
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>
                                        Last message: {new Date(contact.last_message_at * 1000).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SegmentDetail;
