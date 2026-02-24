// ==================== STATE MANAGEMENT ====================
let currentContact = null;
let contacts = [];
let messages = [];
let autoRefreshInterval = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    startAutoRefresh();
});

async function initializeApp() {
    await loadStatistics();
    await loadContacts();
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Send message
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageTextInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', async () => {
        showToast('Refreshing data...');
        await loadStatistics();
        await loadContacts();
        if (currentContact) {
            await loadMessages(currentContact.phone_number);
        }
        showToast('Data refreshed!');
    });

    // Search functionality
    document.getElementById('searchInput').addEventListener('input', (e) => {
        filterConversations(e.target.value);
    });
}

// ==================== AUTO REFRESH ====================
function startAutoRefresh() {
    // Refresh every 5 seconds
    autoRefreshInterval = setInterval(async () => {
        await loadStatistics();
        await loadContacts();
        if (currentContact) {
            await loadMessages(currentContact.phone_number, true);
        }
    }, 5000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
}

// ==================== API CALLS ====================
async function loadStatistics() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();

        document.getElementById('totalMessages').textContent = stats.totalMessages || 0;
        document.getElementById('totalContacts').textContent = stats.totalContacts || 0;
        document.getElementById('unreadMessages').textContent = stats.unreadMessages || 0;
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

async function loadContacts() {
    try {
        const response = await fetch('/api/contacts');
        contacts = await response.json();

        renderConversations(contacts);
    } catch (error) {
        console.error('Error loading contacts:', error);
        showToast('Failed to load contacts');
    }
}

async function loadMessages(phoneNumber, silent = false) {
    try {
        const response = await fetch(`/api/messages/${phoneNumber}`);
        const newMessages = await response.json();

        // Only update if there are new messages or initial load
        if (!silent || newMessages.length !== messages.length) {
            messages = newMessages;
            renderMessages(messages);
        }

        // Update unread count in contacts list
        await loadContacts();
    } catch (error) {
        console.error('Error loading messages:', error);
        if (!silent) {
            showToast('Failed to load messages');
        }
    }
}

async function sendMessage() {
    const input = document.getElementById('messageTextInput');
    const messageText = input.value.trim();

    if (!messageText || !currentContact) {
        return;
    }

    try {
        const response = await fetch('/api/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: currentContact.phone_number,
                message: messageText
            })
        });

        if (response.ok) {
            input.value = '';
            showToast('Message sent!');

            // Reload messages after a short delay
            setTimeout(() => {
                loadMessages(currentContact.phone_number);
            }, 500);
        } else {
            const error = await response.json();
            showToast('Failed to send message: ' + (error.details || error.error));
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Failed to send message');
    }
}

// ==================== RENDERING ====================
function renderConversations(contactsList) {
    const container = document.getElementById('conversationsList');

    if (contactsList.length === 0) {
        container.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>No conversations yet</p>
        <p style="font-size: 13px; margin-top: 8px;">Messages will appear here when someone contacts your WhatsApp number</p>
      </div>
    `;
        return;
    }

    container.innerHTML = contactsList.map(contact => {
        const initials = getInitials(contact.profile_name || contact.phone_number);
        const timeAgo = formatTimeAgo(contact.last_message_at);
        const isActive = currentContact && currentContact.phone_number === contact.phone_number;

        return `
      <div class="conversation-item ${isActive ? 'active' : ''}" data-phone="${contact.phone_number}">
        <div class="conversation-avatar">${initials}</div>
        <div class="conversation-details">
          <div class="conversation-header">
            <div class="conversation-name">${contact.profile_name || formatPhoneNumber(contact.phone_number)}</div>
            <div class="conversation-time">${timeAgo}</div>
          </div>
          <div class="conversation-preview">${formatPhoneNumber(contact.phone_number)}</div>
        </div>
        ${contact.unread_count > 0 ? `<div class="unread-badge">${contact.unread_count}</div>` : ''}
      </div>
    `;
    }).join('');

    // Add click listeners
    container.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', () => {
            const phoneNumber = item.dataset.phone;
            const contact = contactsList.find(c => c.phone_number === phoneNumber);
            selectConversation(contact);
        });
    });
}

function renderMessages(messagesList) {
    const container = document.getElementById('messagesArea');

    if (messagesList.length === 0) {
        container.innerHTML = `
      <div class="loading">
        <p>No messages yet</p>
        <p style="font-size: 13px; margin-top: 8px; color: var(--text-tertiary);">Start the conversation by sending a message</p>
      </div>
    `;
        return;
    }

    let lastDate = null;
    let html = '';

    messagesList.forEach(message => {
        const messageDate = new Date(message.timestamp * 1000);
        const dateStr = formatDate(messageDate);

        // Add date divider
        if (dateStr !== lastDate) {
            html += `
        <div class="date-divider">
          <span>${dateStr}</span>
        </div>
      `;
            lastDate = dateStr;
        }

        const direction = message.direction || 'incoming';
        const time = formatTime(messageDate);

        let mediaHtml = '';
        if (message.media_url) {
            if (message.media_mime_type?.startsWith('image')) {
                mediaHtml = `
                    <div class="message-media">
                        <img src="${message.media_url}" alt="Image" loading="lazy" 
                             style="max-width: 300px; max-height: 400px; border-radius: 8px; cursor: pointer;" 
                             onclick="window.open('${message.media_url}', '_blank')" />
                    </div>`;
            } else if (message.media_mime_type?.startsWith('video')) {
                mediaHtml = `
                    <div class="message-media">
                        <video src="${message.media_url}" controls 
                               style="max-width: 300px; max-height: 400px; border-radius: 8px;">
                            Your browser does not support video playback.
                        </video>
                    </div>`;
            } else if (message.media_mime_type?.startsWith('audio')) {
                mediaHtml = `
                    <div class="message-media">
                        <audio src="${message.media_url}" controls style="width: 250px;">
                            Your browser does not support audio playback.
                        </audio>
                    </div>`;
            } else {
                // Document or other file type
                const fileName = message.message_text || 'Document';
                const fileIcon = getFileIcon(message.media_mime_type);
                mediaHtml = `
                    <div class="message-media document">
                        <a href="${message.media_url}" download target="_blank" 
                           style="display: flex; align-items: center; gap: 12px; padding: 12px; 
                                  background: rgba(255,255,255,0.1); border-radius: 8px; 
                                  text-decoration: none; color: inherit;">
                            <div style="font-size: 32px;">${fileIcon}</div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${escapeHtml(fileName)}
                                </div>
                                <div style="font-size: 12px; opacity: 0.7; margin-top: 2px;">
                                    ${message.media_mime_type || 'File'}
                                </div>
                            </div>
                            <div style="font-size: 20px;">📥</div>
                        </a>
                    </div>`;
            }
        }

        const statusIcon = getStatusIcon(message.status);

        html += `
      <div class="message ${direction}">
        <div class="message-bubble">
          ${mediaHtml}
          ${message.message_text ? `<div class="message-text">${escapeHtml(message.message_text)}</div>` : ''}
          <div class="message-time">
            ${time}
            ${direction === 'outgoing' ? `<span class="message-status">${statusIcon}</span>` : ''}
          </div>
        </div>
      </div>
    `;
    });

    container.innerHTML = html;

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function selectConversation(contact) {
    currentContact = contact;

    // Update UI
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('chatHeader').style.display = 'flex';
    document.getElementById('messagesArea').style.display = 'flex';
    document.getElementById('messageInput').style.display = 'block';

    // Update header
    document.getElementById('chatName').textContent = contact.profile_name || 'Unknown';
    document.getElementById('chatNumber').textContent = formatPhoneNumber(contact.phone_number);

    // Update active conversation
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-phone="${contact.phone_number}"]`)?.classList.add('active');

    // Load messages
    loadMessages(contact.phone_number);
}

// ==================== SEARCH/FILTER ====================
function filterConversations(query) {
    const filtered = contacts.filter(contact => {
        const name = (contact.profile_name || '').toLowerCase();
        const phone = (contact.phone_number || '').toLowerCase();
        const searchQuery = query.toLowerCase();
        return name.includes(searchQuery) || phone.includes(searchQuery);
    });

    renderConversations(filtered);
}

// ==================== UTILITY FUNCTIONS ====================
function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function formatPhoneNumber(phone) {
    if (!phone) return '';
    // Format as: +1 (234) 567-8900
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
    }
    if (cleaned.length === 11) {
        return `+${cleaned[0]} (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7)}`;
    }
    return '+' + cleaned;
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function formatDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
    }
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return '';

    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getStatusIcon(status) {
    switch (status) {
        case 'sent':
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6 12L2 8l1.4-1.4L6 9.2 12.6 2.6 14 4z"/></svg>`;
        case 'delivered':
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 12L0 8l1.4-1.4L4 9.2 10.6 2.6 12 4zM8 12l-4-4 1.4-1.4L8 9.2 14.6 2.6 16 4z"/></svg>`;
        case 'read':
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="#25D366"><path d="M4 12L0 8l1.4-1.4L4 9.2 10.6 2.6 12 4zM8 12l-4-4 1.4-1.4L8 9.2 14.6 2.6 16 4z"/></svg>`;
        default:
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="6" opacity="0.3"/></svg>`;
    }
}

function getFileIcon(mimeType) {
    if (!mimeType) return '📄';

    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📘';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📙';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return '📦';
    if (mimeType.includes('text')) return '📝';

    return '📄';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    toastMessage.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==================== CLEANUP ====================
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});
