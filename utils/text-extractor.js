// Text Extraction Utilities
// Extracts phone numbers, email addresses, and URLs from OCR text

/**
 * Extract all phone numbers from text
 * Supports various formats: (555) 555-5555, 555-555-5555, 555.555.5555, +1 555 555 5555
 * @param {string} text - Input text
 * @returns {Array<string>} Array of phone numbers
 */
export function extractPhoneNumbers(text) {
  if (!text) return [];

  const phonePatterns = [
    // North American formats
    /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    // International format with country code
    /\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
    // Simple 10-digit
    /\b\d{10}\b/g
  ];

  const numbers = new Set();

  phonePatterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        // Clean up the number
        const cleaned = match.trim();
        // Only add if it looks like a valid phone number (has enough digits)
        const digitCount = cleaned.replace(/\D/g, '').length;
        if (digitCount >= 10 && digitCount <= 15) {
          numbers.add(cleaned);
        }
      });
    }
  });

  return Array.from(numbers);
}

/**
 * Extract all email addresses from text
 * @param {string} text - Input text
 * @returns {Array<string>} Array of email addresses
 */
export function extractEmails(text) {
  if (!text) return [];

  // Comprehensive email regex
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = text.match(emailPattern);

  if (!matches) return [];

  // Remove duplicates and return
  return Array.from(new Set(matches.map((email) => email.toLowerCase())));
}

/**
 * Extract all URLs from text
 * Supports http, https, www formats
 * @param {string} text - Input text
 * @returns {Array<string>} Array of URLs
 */
export function extractUrls(text) {
  if (!text) return [];

  const urlPatterns = [
    // Full URLs with protocol
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
    // www. URLs without protocol
    /www\.[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
    // Domain-like patterns (domain.com)
    /\b(?!www\.)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b/g
  ];

  const urls = new Set();

  urlPatterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        const cleaned = match.trim();
        // Ensure it has a valid TLD
        if (cleaned.includes('.')) {
          urls.add(cleaned);
        }
      });
    }
  });

  return Array.from(urls);
}

/**
 * Extract all structured data from text
 * Returns an object with phones, emails, and urls
 * @param {string} text - Input text
 * @returns {Object} Object containing extracted data
 */
export function extractAllData(text) {
  return {
    phoneNumbers: extractPhoneNumbers(text),
    emails: extractEmails(text),
    urls: extractUrls(text)
  };
}

/**
 * Format phone number to a standard format
 * @param {string} phone - Raw phone number
 * @returns {string} Formatted phone number
 */
export function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  return phone; // Return original if not standard format
}

/**
 * Validate if a string is a valid email
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
  return emailPattern.test(email);
}

/**
 * Validate if a string is a valid URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export function isValidUrl(url) {
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return true;
  } catch (e) {
    return false;
  }
}
