/**
 * Security Utilities
 * Common security functions for the application
 */

import { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS } from './constants';

/**
 * Validate file MIME type
 */
export function validateMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

/**
 * Validate file extension
 */
export function validateExtension(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return false;
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Validate file size
 */
export function validateFileSize(size: number, maxSize: number): boolean {
  return size <= maxSize && size > 0;
}

/**
 * Sanitize filename to prevent directory traversal
 */
export function sanitizeFilename(filename: string): string {
  const basename = filename.split('/').pop()?.split('\\').pop() || 'unnamed';
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return sanitized.slice(0, 255);
}

/**
 * Generate a random secure token
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  
  return result;
}

/**
 * Check if origin is trusted
 */
export function isTrustedOrigin(origin: string | null, trustedOrigins: string[]): boolean {
  if (!origin) return false;
  
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    
    return trustedOrigins.some(trusted => {
      if (trusted.startsWith('*.')) {
        const domain = trusted.slice(2);
        return hostname === domain || hostname.endsWith('.' + domain);
      }
      return hostname === trusted;
    });
  } catch {
    return false;
  }
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, char => htmlEntities[char]);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    const recentRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    return true;
  }

  clear(identifier: string): void {
    this.requests.delete(identifier);
  }

  clearAll(): void {
    this.requests.clear();
  }
}

export function createRateLimiter(windowMs: number = 60000, maxRequests: number = 100) {
  const limiter = new RateLimiter(windowMs, maxRequests);
  return function rateLimitHandler(identifier: string): boolean {
    return limiter.isAllowed(identifier);
  };
}
