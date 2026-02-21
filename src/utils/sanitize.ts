/**
 * Sanitization utilities for XSS prevention
 * Uses DOMPurify to sanitize user-generated content
 */
import DOMPurify from 'dompurify';

/**
 * Sanitize text content - strips all HTML tags
 * Use for plain text fields like titles, descriptions, ingredient names
 */
export const sanitize = (dirty: string | undefined | null): string => {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // Strip all HTML for plain text fields
    ALLOWED_ATTR: []
  });
};

/**
 * Sanitize HTML content - allows basic formatting tags
 * Use for fields that may contain simple formatting
 */
export const sanitizeHtml = (dirty: string | undefined | null): string => {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
    ALLOWED_ATTR: []
  });
};

/**
 * Sanitize URL - validates and sanitizes URLs
 * Returns empty string for invalid or potentially dangerous URLs
 */
export const sanitizeUrl = (url: string | undefined | null): string => {
  if (!url) return '';

  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.href;
  } catch {
    return '';
  }
};
