import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  Search,
  Phone,
  MoreVertical,
  Paperclip,
  Send,
  Smile,
  Image,
  Mic,
  MicOff,
  CheckCheck,
  Check,
  Loader2,
  X,
  FileText,
  MessageSquare,
  StopCircle,
  ChevronLeft,
  UserCheck,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useContacts, useMessages, useSendMessage, useResetUnreadCount, useUpdateContactStatus, useUpdateContactTemperature, useSendMediaMessage } from "../hooks/useWhatsApp";
import { useAudioRecorder } from 'react-audio-voice-recorder';
import type { WhatsAppContact, WhatsAppMessage, DashboardConversation, DashboardMessage } from "../types/whatsapp";
import { formatDistanceToNow } from "date-fns";
import * as api from '../lib/api';

const statusColors: Record<string, string> = {
  ongoing: "bg-blue-100 text-blue-700",
  human_takeover: "bg-purple-100 text-purple-700",
  converted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  follow_up: "bg-orange-100 text-orange-700",
};

const statusLabels: Record<string, string> = {
  ongoing: "Ongoing",
  human_takeover: "Human Takeover",
  converted: "Converted",
  rejected: "Rejected",
  follow_up: "Follow Up",
};

const tempColors: Record<string, string> = {
  hot: "text-orange-600",
  warm: "text-yellow-600",
  cold: "text-cyan-600",
};

// Map WhatsApp contact to dashboard conversation format
const mapContactToConversation = (contact: WhatsAppContact): DashboardConversation => {
  const initials = contact.profile_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || "??";

  const timeAgo = contact.last_message_at
    ? formatDistanceToNow(new Date(contact.last_message_at * 1000), { addSuffix: false })
    : "";

  return {
    id: contact.phone_number,
    name: contact.profile_name,
    lastMessage: "",
    time: timeAgo,
    unread: contact.unread_count,
    status: contact.status,
    lead_temperature: contact.lead_temperature,
    phone: contact.phone_number,
    avatar: initials,
  };
};

// Map WhatsApp message to dashboard message format
const mapMessageToDashboard = (msg: WhatsAppMessage): DashboardMessage => {
  const time = new Date(msg.timestamp * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return {
    id: msg.whatsapp_message_id,
    text: msg.message_text,
    time,
    sender: msg.direction === 'outgoing' ? 'agent' : 'customer',
    status: msg.status as any,
    mediaUrl: msg.media_url || undefined,
    mediaType: msg.message_type === 'text' || msg.message_type === 'interactive' || msg.message_type === 'button' ? undefined : msg.message_type as any,
  };
};

const Conversations = () => {
  const location = useLocation();
  const [selectedPhone, setSelectedPhone] = useState<string>("");
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"All" | "Unread" | "Active" | "Closed">("All");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Stats & Mutations
  const queryClient = useQueryClient();
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: messages = [], isLoading: messagesLoading } = useMessages(selectedPhone);
  const sendMessageMutation = useSendMessage();
  const resetUnreadMutation = useResetUnreadCount();
  const updateStatusMutation = useUpdateContactStatus();
  const updateTempMutation = useUpdateContactTemperature();
  const sendMediaMutation = useSendMediaMessage();

  // Agents
  const { data: agents = [] } = useQuery({ queryKey: ['agents'], queryFn: api.getAgents });
  const assignAgentMutation = useMutation({
    mutationFn: ({ phoneNumber, agentId }: { phoneNumber: string; agentId: string | null }) =>
      api.assignAgentToContact(phoneNumber, agentId),
    onMutate: async ({ phoneNumber, agentId }) => {
      // Cancel any in-flight refetches so they don't overwrite the optimistic update
      await queryClient.cancelQueries({ queryKey: ['contacts'] });
      const previousContacts = queryClient.getQueryData(['contacts']);
      // Apply change to cache immediately so UI updates without waiting for the API call
      queryClient.setQueryData(['contacts'], (old: any) =>
        Array.isArray(old)
          ? old.map((c: any) =>
            c.phone_number === phoneNumber
              ? { ...c, assigned_agent_id: agentId || null }
              : c
          )
          : old
      );
      return { previousContacts };
    },
    onError: (err, _vars, context) => {
      // Roll back optimistic update on error
      console.error('❌ Agent assignment failed:', err);
      if (context?.previousContacts) {
        queryClient.setQueryData(['contacts'], context.previousContacts);
      }
    },
    onSettled: () => {
      // Always sync with DB after the mutation settles (success or error)
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Media & Keyboard State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Audio Recorder - use ogg/opus which WhatsApp supports
  // Prefer audio/ogg;codecs=opus, fallback to audio/mp4
  const preferredMimeType = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
    ? 'audio/ogg;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : 'audio/webm'; // last resort (may fail on WhatsApp)

  const {
    startRecording,
    stopRecording,
    recordingBlob,
    isRecording,
    recordingTime,
  } = useAudioRecorder(
    undefined,  // audioTrackConstraints
    undefined,  // onNotAllowedOrFound
    { mimeType: preferredMimeType }  // mediaRecorderOptions
  );

  // Handlers
  const handleEmojiClick = (emojiData: any) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setFilePreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleSendMedia = async () => {
    if (!selectedFile || !selectedPhone || isSendingMedia) return;
    setIsSendingMedia(true);
    try {
      await sendMediaMutation.mutateAsync({
        file: selectedFile,
        to: selectedPhone,
        caption: message.trim()
      });
      handleRemoveFile();
      setMessage("");
    } catch (error: any) {
      console.error('Failed to send media:', error);
      alert(`Failed to send media: ${error?.response?.data?.details?.error?.message || error?.message || 'Unknown error'}`);
    } finally {
      setIsSendingMedia(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedPhone) return;
    const text = message.trim();
    setMessage("");
    try {
      await sendMessageMutation.mutateAsync({
        to: selectedPhone,
        message: text
      });
    } catch (error: any) {
      console.error('Failed to send message:', error);
      setMessage(text); // restore on failure
      alert(`Failed to send message: ${error?.response?.data?.details || error?.message || 'Unknown error'}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (selectedFile) {
        handleSendMedia();
      } else {
        handleSendMessage();
      }
    }
  };

  // When recording stops, send the audio blob automatically
  useEffect(() => {
    if (!recordingBlob || !selectedPhone) return;
    const sendAudio = async () => {
      setIsSendingMedia(true);
      try {
        // Get the actual MIME type from the blob
        const rawMime = recordingBlob.type || preferredMimeType;
        // Strip codec info for file extension determination
        const baseMime = rawMime.split(';')[0];
        // Map to WhatsApp-supported extension
        let ext = '.ogg';
        let finalMime = 'audio/ogg';
        if (baseMime === 'audio/mp4') { ext = '.mp4'; finalMime = 'audio/mp4'; }
        else if (baseMime === 'audio/mpeg') { ext = '.mp3'; finalMime = 'audio/mpeg'; }
        else if (baseMime === 'audio/ogg') { ext = '.ogg'; finalMime = 'audio/ogg'; }
        else if (baseMime === 'audio/webm') {
          // WebM is NOT supported by WhatsApp - try to re-wrap as ogg
          // We can't truly transcode in browser, but we can try ogg container
          ext = '.ogg';
          finalMime = 'audio/ogg';
        }

        const file = new File([recordingBlob], `voice-message${ext}`, { type: finalMime });
        await sendMediaMutation.mutateAsync({
          file,
          to: selectedPhone,
          caption: ''
        });
      } catch (error: any) {
        console.error('Failed to send audio:', error);
        const errMsg = error?.response?.data?.details?.error?.message || error?.message || 'Unknown error';
        alert(`Failed to send voice message: ${errMsg}\n\nTip: Your browser may not support ogg recording. Try Chrome or Firefox.`);
      } finally {
        setIsSendingMedia(false);
      }
    };
    sendAudio();
  }, [recordingBlob]);

  // Derived Data
  const conversations = contacts.map(contact => mapContactToConversation(contact));
  const dashboardMessages = messages.map(msg => mapMessageToDashboard(msg));
  const selected = conversations.find(c => c.id === selectedPhone);

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterType === "All") return true;
    if (filterType === "Unread") return c.unread > 0;
    if (filterType === "Active") return c.status === "ongoing";
    if (filterType === "Closed") return c.status !== "ongoing";
    return true;
  });

  // Effects

  // Handle navigation from SegmentDetail - if router state has a phoneNumber, select it immediately
  useEffect(() => {
    const state = location.state as { phoneNumber?: string } | null;
    if (state?.phoneNumber) {
      setSelectedPhone(state.phoneNumber);
      // Clear the navigation state so that back-navigation doesn't re-trigger this
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Auto-select first conversation on desktop (only if nothing is already selected)
  useEffect(() => {
    const state = location.state as { phoneNumber?: string } | null;
    // Skip auto-select if we navigated here with a specific phone
    if (state?.phoneNumber) return;
    if (!selectedPhone && conversations.length > 0 && window.innerWidth >= 768) {
      setSelectedPhone(conversations[0].id);
    }
  }, [contactsLoading, conversations.length]);

  useEffect(() => {
    if (selectedPhone) {
      resetUnreadMutation.mutate(selectedPhone);
    }
  }, [selectedPhone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dashboardMessages, selectedPhone]);

  const isSending = sendMessageMutation.isPending || sendMediaMutation.isPending || isSendingMedia;

  return (
    <div className="flex bg-white h-[calc(100vh-2rem)] border border-slate-200 rounded-lg shadow-sm overflow-hidden animate-fade-in">

      {/* LEFT SIDEBAR: Conversation List */}
      <div className={`border-r border-slate-200 flex flex-col bg-slate-50/50 w-full md:w-80 ${selectedPhone ? 'hidden md:flex' : 'flex'}`}>

        {/* Search & Header */}
        <div className="p-4 border-b border-slate-200 bg-white z-10">
          <h2 className="text-base font-bold text-slate-800 mb-3">Chats</h2>
          <div className="relative group">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
            {["All", "Unread", "Active", "Closed"].map((ft) => (
              <button
                key={ft}
                onClick={() => setFilterType(ft as any)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterType === ft
                  ? "bg-slate-800 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
              >
                {ft}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {contactsLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : (
            filteredConversations.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedPhone(chat.id)}
                className={`flex gap-3 p-3 cursor-pointer border-b border-slate-100 hover:bg-white transition-all ${selectedPhone === chat.id ? "bg-white border-l-4 border-l-blue-500 shadow-sm" : "border-l-4 border-l-transparent"
                  }`}
              >
                <div className="relative flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${selectedPhone === chat.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                    {chat.avatar}
                  </div>
                  {chat.unread > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold border-2 border-white shadow-sm">
                      {chat.unread}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`text-sm truncate ${selectedPhone === chat.id ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                      {chat.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{chat.time} ago</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${chat.status === 'ongoing' ? 'bg-emerald-500' :
                      chat.status === 'human_takeover' ? 'bg-purple-500' : 'bg-slate-300'
                      }`} />
                    <p className="text-xs text-slate-500 truncate font-medium">{chat.phone}</p>
                    {chat.lead_temperature && (
                      <span className={`text-[10px] font-bold uppercase ${tempColors[chat.lead_temperature] || 'text-slate-400'}`}>
                        {chat.lead_temperature === 'hot' ? '🔥' : chat.lead_temperature === 'warm' ? '🌡️' : '❄️'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {filteredConversations.length === 0 && !contactsLoading && (
            <div className="p-8 text-center text-slate-400 text-sm">No conversations found</div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: Chat Area */}
      {selected ? (
        <div className={`flex-1 flex flex-col bg-white overflow-hidden relative ${!selectedPhone ? 'hidden md:flex' : 'flex'}`}>

          {/* Header */}
          <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between bg-white z-20 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedPhone("")}
                className="md:hidden p-1.5 -ml-2 text-slate-500 hover:bg-slate-50 rounded-full"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm border border-slate-200">
                {selected.avatar}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  {selected.name}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${statusColors[selected.status] || 'bg-slate-100 text-slate-500'}`}>
                    {statusLabels[selected.status] || selected.status}
                  </span>
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  {selected.phone}
                  {selected.lead_temperature && (
                    <span className={`font-bold ${tempColors[selected.lead_temperature]}`}>
                      • {selected.lead_temperature === 'hot' ? '🔥 Hot' : selected.lead_temperature === 'warm' ? '🌡️ Warm' : '❄️ Cold'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Show assigned agent badge in header */}
              {(() => {
                const assignedId = contacts.find((c: any) => c.phone_number === selectedPhone)?.assigned_agent_id;
                const assignedAgent = agents.find((a: any) => a.id === assignedId);
                return assignedAgent ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-full">
                    <div className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center text-[10px] font-bold text-purple-700">
                      {assignedAgent.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-purple-700">{assignedAgent.name}</span>
                  </div>
                ) : null;
              })()}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 space-y-4 scroll-smooth">
            {messagesLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : (
              <>
                <div className="text-center py-4">
                  <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-500 font-medium shadow-sm">Today</span>
                </div>
                {dashboardMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === "agent" ? "justify-end" : "justify-start"} group`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm relative ${msg.sender === "agent"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                      }`}>
                      {/* Media rendering */}
                      {msg.mediaType && (
                        <div className="mb-2 rounded-lg overflow-hidden">
                          {msg.mediaType === 'image' && msg.mediaUrl ? (
                            <img src={msg.mediaUrl} alt="media" className="max-w-full max-h-64 object-contain rounded-lg" />
                          ) : msg.mediaType === 'audio' && msg.mediaUrl ? (
                            <audio controls src={msg.mediaUrl} className="w-48 h-8" />
                          ) : msg.mediaType === 'video' && msg.mediaUrl ? (
                            <video controls src={msg.mediaUrl} className="max-w-full max-h-48 rounded-lg" />
                          ) : msg.mediaUrl ? (
                            <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline text-xs p-2 bg-black/10 rounded-lg">
                              <FileText className="w-4 h-4" /> Download File
                            </a>
                          ) : (
                            // No URL yet (just sent, waiting for webhook)
                            <div className="flex items-center gap-2 text-xs p-2 bg-black/10 rounded-lg opacity-70">
                              <FileText className="w-4 h-4" />
                              <span>{msg.mediaType === 'audio' ? '🎤 Voice message' : msg.mediaType === 'image' ? '📷 Image' : msg.mediaType === 'video' ? '🎥 Video' : '📎 Document'} (sending...)</span>
                            </div>
                          )}
                        </div>
                      )}
                      {msg.text && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                      <div className={`flex items-center gap-1 mt-1 justify-end ${msg.sender === "agent" ? "text-blue-100/80" : "text-slate-400"}`}>
                        <span className="text-[10px] font-medium">{msg.time}</span>
                        {msg.sender === "agent" && (
                          msg.status === "read" ? <CheckCheck className="w-3 h-3 text-blue-200" /> : <Check className="w-3 h-3 text-blue-200" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-200 relative z-30">
            {/* File Preview */}
            {selectedFile && (
              <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {filePreview
                    ? <img src={filePreview} className="w-12 h-12 rounded-lg object-cover border border-slate-200" alt="preview" />
                    : <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-500" />
                    </div>
                  }
                  <div>
                    <span className="text-sm font-medium text-slate-700 truncate max-w-xs block">{selectedFile.name}</span>
                    <span className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type.split('/')[0]}</span>
                  </div>
                </div>
                <button onClick={handleRemoveFile} className="p-1.5 hover:bg-red-50 rounded-full hover:text-red-500 transition-colors text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium text-red-700">Recording voice message... {recordingTime}s</span>
                <span className="text-xs text-red-500 ml-auto">Click 🛑 to stop & send</span>
              </div>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full left-4 mb-2 z-50 shadow-2xl border border-slate-200 rounded-xl overflow-hidden">
                <EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={400} />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect}
                accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,video/mp4,video/quicktime,audio/mpeg,audio/ogg,audio/aac,audio/webm" />
              <input type="file" ref={imageInputRef} accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileSelect} />

              <div className="flex gap-1">
                <button
                  onClick={() => { setShowEmojiPicker(!showEmojiPicker); }}
                  className="p-2.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Attach file (PDF, Word, Excel, Video)"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="p-2.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Send image"
                >
                  <Image className="w-5 h-5" />
                </button>
              </div>

              <input
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isRecording ? "Recording... click stop to send" : selectedFile ? "Add a caption (optional)..." : "Type a message..."}
                className={`flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all text-slate-800 placeholder:text-slate-400 ${isRecording ? 'border-red-300 bg-red-50' : ''}`}
                disabled={isRecording || !selectedPhone}
              />

              {/* Send / Record button */}
              {(message.trim() || selectedFile) ? (
                <button
                  onClick={selectedFile ? handleSendMedia : handleSendMessage}
                  disabled={isSending}
                  className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Send"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              ) : (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!selectedPhone || isSendingMedia}
                  className={`p-3 rounded-lg transition-all shadow-sm disabled:opacity-60 ${isRecording
                    ? "bg-red-500 text-white hover:bg-red-600 shadow-red-200"
                    : "bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200"}`}
                  title={isRecording ? "Stop recording & send" : "Record voice message"}
                >
                  {isSendingMedia ? <Loader2 className="w-5 h-5 animate-spin" /> :
                    isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-slate-50 text-slate-400">
          <div className="w-20 h-20 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-6 shadow-sm">
            <MessageSquare className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">Welcome to Cardiot CRM</h3>
          <p className="text-sm text-slate-400 max-w-xs text-center">Select a conversation from the left sidebar to start chatting with your customers.</p>
        </div>
      )}

      {/* RIGHT SIDEBAR: Contact Details */}
      {selected && (
        <div className="w-72 bg-white border-l border-slate-200 hidden xl:flex flex-col overflow-y-auto">
          <div className="p-6 text-center border-b border-slate-100 bg-slate-50/30">
            <div className="w-20 h-20 rounded-full bg-white text-slate-700 flex items-center justify-center text-2xl font-bold mx-auto mb-3 border border-slate-200 shadow-sm">
              {selected.avatar}
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-0.5">{selected.name}</h3>
            <p className="text-sm text-slate-500 font-medium">{selected.phone}</p>
            {selected.lead_temperature && (
              <div className={`mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${selected.lead_temperature === 'hot' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                selected.lead_temperature === 'warm' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                  'bg-cyan-50 border-cyan-200 text-cyan-700'
                }`}>
                {selected.lead_temperature === 'hot' ? '🔥' : selected.lead_temperature === 'warm' ? '🌡️' : '❄️'}
                {selected.lead_temperature.charAt(0).toUpperCase() + selected.lead_temperature.slice(1)} Lead
              </div>
            )}
          </div>

          <div className="p-5 space-y-6">
            {/* Assigned Agent Section */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Assigned Agent</label>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                {(() => {
                  const assignedId = contacts.find((c: any) => c.phone_number === selectedPhone)?.assigned_agent_id;
                  const assignedAgent = agents.find((a: any) => a.id === assignedId);
                  return assignedAgent ? (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                        {assignedAgent.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-blue-700">{assignedAgent.name}</span>
                      <span className="text-xs text-slate-400 ml-auto">assigned</span>
                    </div>
                  ) : null;
                })()}
                <select
                  value={contacts.find((c: any) => c.phone_number === selectedPhone)?.assigned_agent_id || ''}
                  onChange={(e) => {
                    const newAgentId = e.target.value || null;
                    assignAgentMutation.mutate({
                      phoneNumber: selectedPhone,
                      agentId: newAgentId
                    });
                  }}
                  disabled={assignAgentMutation.isPending}
                  className={`w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium transition-opacity ${assignAgentMutation.isPending ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <option value="">No Agent Assigned</option>
                  {agents.map((agent: any) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
                {assignAgentMutation.isPending && (
                  <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Assigning agent...
                  </p>
                )}
                {assignAgentMutation.isError && (
                  <p className="text-xs text-red-500 mt-1">Failed to assign agent. Please try again.</p>
                )}
              </div>
            </div>

            {/* Source Section */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Lead Source</label>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <select
                  value={contacts.find((c: any) => c.phone_number === selectedPhone)?.source || ''}
                  onChange={(e) => {
                    const sourceVal = e.target.value || null;
                    api.updateContactSource(selectedPhone, sourceVal).then(() => {
                      queryClient.invalidateQueries({ queryKey: ['contacts'] });
                      queryClient.invalidateQueries({ queryKey: ['source-breakdown'] });
                    });
                  }}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value="">Unknown / Not Set</option>
                  <option value="instagram">📸 Instagram</option>
                  <option value="meta_ads">📊 Meta Ads</option>
                  <option value="qr_code">🔲 QR Code</option>
                  <option value="facebook">📘 Facebook</option>
                  <option value="whatsapp_link">💬 WhatsApp Link</option>
                  <option value="referral">🤝 Referral</option>
                  <option value="website">🌐 Website</option>
                  <option value="other">🏷️ Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Deal Status</label>
              <div className="space-y-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-xs font-medium text-slate-500 mb-2 block">Current Stage</span>
                  <select
                    value={selected.status}
                    onChange={(e) => updateStatusMutation.mutate({ phoneNumber: selected.id, status: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>

                <div>
                  <span className="text-xs font-medium text-slate-500 mb-2 block">Lead Temperature</span>
                  <p className="text-xs text-slate-400 mb-2">Auto-set by button clicks: &lt;5 = cold, ≥5 = hot</p>
                  <div className="flex gap-2">
                    {['hot', 'warm', 'cold'].map((temp) => (
                      <button
                        key={temp}
                        onClick={() => updateTempMutation.mutate({ phoneNumber: selected.id, temperature: temp })}
                        className={`flex-1 py-2 text-xs font-bold rounded-md border transition-all ${selected.lead_temperature === temp
                          ? (temp === 'hot' ? 'bg-orange-50 border-orange-300 text-orange-700' :
                            temp === 'warm' ? 'bg-yellow-50 border-yellow-300 text-yellow-700' :
                              'bg-cyan-50 border-cyan-300 text-cyan-700')
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                      >
                        {temp === 'hot' ? '🔥' : temp === 'warm' ? '🌡️' : '❄️'} {temp.charAt(0).toUpperCase() + temp.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Conversations;