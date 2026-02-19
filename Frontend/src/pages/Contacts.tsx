import { useState, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  Download,
  Upload,
  MoreVertical,
  Phone,
  Mail,
  MapPin,
  Building,
  Tag,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Pencil,
  Trash2,
  Send,
  Users,
} from "lucide-react";
import { useContacts, useExportContacts, useImportContacts, useAddContact, useExportContactsFiltered, useUpdateContactName, useDeleteContact } from "../hooks/useWhatsApp";
import { formatDistanceToNow } from "date-fns";
import BulkSendDialog from "../components/BulkSendDialog";
import { useQuery } from "@tanstack/react-query";
import * as api from "../lib/api";

const Contacts = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkSendDialog, setShowBulkSendDialog] = useState(false);
  const [newContact, setNewContact] = useState({ phone_number: "", profile_name: "" });
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [tempFilter, setTempFilter] = useState<string | null>(null);
  const [segmentFilter, setSegmentFilter] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch real contacts from backend
  const { data: contactsData = [], isLoading } = useContacts();
  const { data: segments = [] } = useQuery({
    queryKey: ['segments'],
    queryFn: api.getSegments,
  });
  const exportMutation = useExportContacts();
  const importMutation = useImportContacts();
  const addMutation = useAddContact();
  const exportFilteredMutation = useExportContactsFiltered();
  const updateNameMutation = useUpdateContactName();
  const deleteMutation = useDeleteContact();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest('.dropdown-menu') && !target.closest('.dropdown-trigger')) {
          setActiveDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  // Filter contacts (including segment filter via contact_segments join - done client-side)
  const filtered = contactsData.filter((c: any) => {
    const matchesSearch = c.profile_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone_number.includes(searchTerm);
    const matchesStatus = !statusFilter || c.status === statusFilter;
    const matchesTemp = !tempFilter || c.lead_temperature === tempFilter;
    // Segment filter: if segmentFilter is set, only show contacts in that segment
    // We rely on backend export for CSV; for display we can't easily filter by segment client-side
    // without fetching segment contacts, so we skip local segment filter for display
    return matchesSearch && matchesStatus && matchesTemp;
  });

  // Handlers
  const handleExport = () => {
    // Build filters object from current filter state
    const filters: any = {};
    if (statusFilter) filters.status = statusFilter;
    if (tempFilter) filters.temperature = tempFilter;
    if (segmentFilter) filters.segment = segmentFilter;

    // Use filtered export if any filters are active, otherwise export all
    if (Object.keys(filters).length > 0) {
      exportFilteredMutation.mutate(filters);
    } else {
      exportMutation.mutate();
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

      if (contacts.length === 0) { alert("No valid contacts found."); return; }
      importMutation.mutate(contacts);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddContact = () => {
    if (!newContact.phone_number || !newContact.profile_name) {
      alert("Please fill in both name and phone number");
      return;
    }
    addMutation.mutate(newContact, {
      onSuccess: () => {
        setShowAddDialog(false);
        setNewContact({ phone_number: "", profile_name: "" });
      },
      onError: (error: any) => {
        alert(error.response?.status === 409 ? "Contact already exists!" : "Failed to add contact.");
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Contacts</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your customer database ({contactsData.length})</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleExport}
            disabled={exportMutation.isPending || exportFilteredMutation.isPending || contactsData.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
            title={segmentFilter || statusFilter || tempFilter ? `Export filtered (${[segmentFilter, statusFilter, tempFilter].filter(Boolean).join(', ')})` : 'Export all contacts'}
          >
            {(exportMutation.isPending || exportFilteredMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export{(segmentFilter || statusFilter || tempFilter) ? ' (Filtered)' : ''}
          </button>

          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import
          </button>

          <button
            onClick={() => setShowBulkSendDialog(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 shadow-sm transition-colors"
          >
            <Send className="w-4 h-4" />
            Bulk Send
          </button>

          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Contact
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400"
            />
          </div>
          {/* Segment dropdown */}
          <select
            value={segmentFilter || ''}
            onChange={(e) => setSegmentFilter(e.target.value || null)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700"
          >
            <option value="">All Segments</option>
            {segments.map((seg: any) => (
              <option key={seg.id} value={seg.name}>{seg.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-500">Status:</span>
          {['ongoing', 'converted', 'rejected', 'human_takeover', 'follow_up'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? null : status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${statusFilter === status
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
          <div className="w-px h-5 bg-slate-300 mx-1" />
          <span className="text-xs font-medium text-slate-500">Temp:</span>
          {['hot', 'warm', 'cold'].map(temp => (
            <button
              key={temp}
              onClick={() => setTempFilter(tempFilter === temp ? null : temp)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${temp === 'hot' && tempFilter === temp ? 'bg-orange-600 text-white border-orange-600' :
                temp === 'warm' && tempFilter === temp ? 'bg-yellow-500 text-white border-yellow-500' :
                  temp === 'cold' && tempFilter === temp ? 'bg-cyan-600 text-white border-cyan-600' :
                    'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
              {temp === 'hot' ? '🔥' : temp === 'warm' ? '🌡️' : '❄️'} {temp}
            </button>
          ))}
          {(statusFilter || tempFilter || segmentFilter) && (
            <button
              onClick={() => { setStatusFilter(null); setTempFilter(null); setSegmentFilter(null); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Temp</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Last Active</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">No contacts found matching your filters.</td></tr>
              ) : (
                filtered.map((contact) => {
                  const initials = contact.profile_name.slice(0, 2).toUpperCase();
                  return (
                    <tr key={contact.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200">
                            {initials}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-slate-900">{contact.profile_name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-mono">{contact.phone_number}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${contact.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                          contact.status === 'converted' ? 'bg-green-100 text-green-800' :
                            contact.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-purple-100 text-purple-800'
                          }`}>
                          {contact.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${contact.lead_temperature === 'hot' ? 'bg-orange-100 text-orange-800' :
                          contact.lead_temperature === 'warm' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-cyan-100 text-cyan-800'
                          }`}>
                          {contact.lead_temperature}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-500">
                        {formatDistanceToNow(new Date(contact.last_message_at * 1000), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() => setActiveDropdown(activeDropdown === contact.phone_number ? null : contact.phone_number)}
                            className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {activeDropdown === contact.phone_number && (
                            <div className="dropdown-menu absolute right-0 mt-2 w-36 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 py-1">
                              <button
                                onClick={() => {
                                  setEditingContact(contact.phone_number);
                                  setEditName(contact.profile_name);
                                  setActiveDropdown(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Edit Name
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Delete contact?")) deleteMutation.mutate(contact.phone_number);
                                  setActiveDropdown(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <p className="text-sm text-slate-500">Showing {filtered.length} entries</p>
        <div className="flex gap-1">
          <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-600 text-sm disabled:opacity-50" disabled>Previous</button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">1</button>
          <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-600 text-sm disabled:opacity-50" disabled>Next</button>
        </div>
      </div>

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setShowAddDialog(false)}>
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800">New Contact</h2>
              <button onClick={() => setShowAddDialog(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={newContact.profile_name}
                  onChange={(e) => setNewContact({ ...newContact, profile_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newContact.phone_number}
                  onChange={(e) => setNewContact({ ...newContact, phone_number: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. +1234567890"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowAddDialog(false)} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium">Cancel</button>
                <button onClick={handleAddContact} disabled={addMutation.isPending} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-sm">
                  {addMutation.isPending ? "Adding..." : "Save Contact"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Name Dialog */}
      {editingContact && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setEditingContact(null)}>
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800">Edit Contact Name</h2>
              <button onClick={() => setEditingContact(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editName.trim()) {
                      updateNameMutation.mutate({ phoneNumber: editingContact, name: editName.trim() }, {
                        onSuccess: () => setEditingContact(null)
                      });
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter new name..."
                  autoFocus
                />
                <p className="text-xs text-slate-400 mt-1">Phone: {editingContact}</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditingContact(null)} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium">Cancel</button>
                <button
                  onClick={() => {
                    if (editName.trim()) {
                      updateNameMutation.mutate({ phoneNumber: editingContact, name: editName.trim() }, {
                        onSuccess: () => setEditingContact(null)
                      });
                    }
                  }}
                  disabled={updateNameMutation.isPending || !editName.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-sm disabled:opacity-60"
                >
                  {updateNameMutation.isPending ? "Saving..." : "Save Name"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Send Dialog */}
      <BulkSendDialog
        isOpen={showBulkSendDialog}
        onClose={() => setShowBulkSendDialog(false)}
      />
    </div>
  );
};

export default Contacts;
