import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Plus,
    Edit2,
    Trash2,
    FolderOpen,
    Search,
    X,
    Upload,
    Loader2
} from 'lucide-react';
import * as api from '../lib/api';

interface Segment {
    id: number;
    name: string;
    description: string;
    contact_count: number;
    created_at: number;
}

const Segments: React.FC = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [importingSegment, setImportingSegment] = useState<Segment | null>(null);
    const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({ name: '', description: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch segments
    const { data: segments = [], isLoading } = useQuery({
        queryKey: ['segments'],
        queryFn: api.getSegments,
    });

    // Create segment mutation
    const createMutation = useMutation({
        mutationFn: api.createSegment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['segments'] });
            setShowCreateDialog(false);
            setFormData({ name: '', description: '' });
        },
    });

    // Update segment mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => api.updateSegment(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['segments'] });
            setEditingSegment(null);
            setFormData({ name: '', description: '' });
        },
    });

    // Delete segment mutation
    const deleteMutation = useMutation({
        mutationFn: api.deleteSegment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['segments'] });
        },
    });

    // Import contacts mutation
    const importMutation = useMutation({
        mutationFn: api.importContactsWithSegment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['segments'] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            setShowImportDialog(false);
            setImportingSegment(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        },
    });

    const handleCreate = () => {
        if (formData.name.trim()) {
            createMutation.mutate(formData);
        }
    };

    const handleUpdate = () => {
        if (editingSegment && formData.name.trim()) {
            updateMutation.mutate({ id: editingSegment.id, data: formData });
        }
    };

    const handleEdit = (segment: Segment) => {
        setEditingSegment(segment);
        setFormData({ name: segment.name, description: segment.description || '' });
    };

    const handleDelete = (id: number, name: string) => {
        if (confirm(`Delete segment "${name}"? This will not delete the contacts.`)) {
            deleteMutation.mutate(id);
        }
    };

    const handleImportClick = (segment: Segment) => {
        setImportingSegment(segment);
        setShowImportDialog(true);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !importingSegment) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim());

            if (lines.length < 2) {
                alert("Invalid CSV file. Must have headers.");
                return;
            }

            const contacts = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.replace(/"/g, '').trim());
                return { profile_name: values[0], phone_number: values[1] };
            }).filter(c => c.phone_number && c.profile_name);

            if (contacts.length === 0) {
                alert("No valid contacts found.");
                return;
            }

            importMutation.mutate({
                contacts,
                segmentId: importingSegment.id
            });
        };
        reader.readAsText(file);
    };

    const filteredSegments = segments.filter((s: Segment) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Segments</h1>
                    <p className="page-subtitle">Organize contacts into targeted groups</p>
                </div>
                <button
                    onClick={() => setShowCreateDialog(true)}
                    className="btn-primary"
                >
                    <Plus className="w-4 h-4" />
                    Create Segment
                </button>
            </div>

            {/* Search */}
            <div className="card mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search segments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400"
                    />
                </div>
            </div>

            {/* Segments Grid */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-slate-500">Loading segments...</p>
                </div>
            ) : filteredSegments.length === 0 ? (
                <div className="card text-center py-12">
                    <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-700 mb-2">
                        {searchTerm ? 'No segments found' : 'No segments yet'}
                    </h3>
                    <p className="text-slate-500 mb-4">
                        {searchTerm ? 'Try a different search term' : 'Create your first segment to organize contacts'}
                    </p>
                    {!searchTerm && (
                        <button onClick={() => setShowCreateDialog(true)} className="btn-primary">
                            <Plus className="w-4 h-4" />
                            Create First Segment
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSegments.map((segment: Segment) => (
                        <div
                            key={segment.id}
                            className="card hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => navigate(`/segments/${segment.id}`)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800">{segment.name}</h3>
                                        <p className="text-sm text-slate-500">{segment.contact_count} contacts</p>
                                    </div>
                                </div>
                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => handleImportClick(segment)}
                                        className="p-1.5 hover:bg-green-50 rounded-md transition-colors"
                                        title="Import Contacts"
                                    >
                                        <Upload className="w-4 h-4 text-green-600" />
                                    </button>
                                    <button
                                        onClick={() => handleEdit(segment)}
                                        className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 className="w-4 h-4 text-slate-600" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(segment.id, segment.name)}
                                        className="p-1.5 hover:bg-red-50 rounded-md transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                </div>
                            </div>
                            {segment.description && (
                                <p className="text-sm text-slate-600 mb-3">{segment.description}</p>
                            )}
                            <div className="text-xs text-slate-400">
                                Created {new Date(segment.created_at * 1000).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            {(showCreateDialog || editingSegment) && (
                <div className="dialog-overlay">
                    <div className="dialog-content">
                        <div className="dialog-header">
                            <h2 className="dialog-title">
                                {editingSegment ? 'Edit Segment' : 'Create New Segment'}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowCreateDialog(false);
                                    setEditingSegment(null);
                                    setFormData({ name: '', description: '' });
                                }}
                                className="dialog-close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="dialog-body">
                            <div className="mb-4">
                                <label className="label">Segment Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., VIP Customers"
                                    className="input-field"
                                    autoFocus
                                />
                            </div>

                            <div className="mb-4">
                                <label className="label">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Optional description..."
                                    className="input-field"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="dialog-footer">
                            <button
                                onClick={() => {
                                    setShowCreateDialog(false);
                                    setEditingSegment(null);
                                    setFormData({ name: '', description: '' });
                                }}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={editingSegment ? handleUpdate : handleCreate}
                                disabled={!formData.name.trim() || createMutation.isPending || updateMutation.isPending}
                                className="btn-primary"
                            >
                                {editingSegment ? 'Update' : 'Create'} Segment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Dialog */}
            {showImportDialog && importingSegment && (
                <div className="dialog-overlay">
                    <div className="dialog-content">
                        <div className="dialog-header">
                            <h2 className="dialog-title">
                                Import Contacts to "{importingSegment.name}"
                            </h2>
                            <button
                                onClick={() => {
                                    setShowImportDialog(false);
                                    setImportingSegment(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="dialog-close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="dialog-body">
                            <div className="mb-4">
                                <label className="label">Select CSV File</label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileSelect}
                                    className="input-field"
                                    disabled={importMutation.isPending}
                                />
                            </div>

                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                                <h4 className="font-medium text-blue-800 mb-2">CSV Format:</h4>
                                <code className="text-xs text-blue-700 block mb-2">
                                    profile_name,phone_number<br />
                                    John Doe,+1234567890<br />
                                    Jane Smith,+0987654321
                                </code>
                                <p className="text-blue-600 text-xs">
                                    • First row must be headers<br />
                                    • Phone numbers should include country code<br />
                                    • Contacts will be automatically added to this segment
                                </p>
                            </div>

                            {importMutation.isPending && (
                                <div className="mt-4 flex items-center gap-2 text-blue-600">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-sm">Importing contacts...</span>
                                </div>
                            )}
                        </div>

                        <div className="dialog-footer">
                            <button
                                onClick={() => {
                                    setShowImportDialog(false);
                                    setImportingSegment(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="btn-secondary"
                                disabled={importMutation.isPending}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Segments;
