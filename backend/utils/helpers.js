/**
 * Helper utility functions
 */

function formatTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toISOString();
}

function sanitizePhoneNumber(phone) {
    // Remove any non-digit characters
    return phone.replace(/\D/g, '');
}

function isValidPhoneNumber(phone) {
    const sanitized = sanitizePhoneNumber(phone);
    return sanitized.length >= 10 && sanitized.length <= 15;
}

module.exports = {
    formatTimestamp,
    sanitizePhoneNumber,
    isValidPhoneNumber
};
