/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

import {
  InvalidPathError,
  InvalidHostnameError,
  InvalidLimitError,
  InvalidPublicBasePathError,
  InvalidXSLUrlError,
} from './errors.js';

// Security limits matching those in sitemap-parser.ts
const LIMITS = {
  MAX_URL_LENGTH: 2048,
  MIN_SITEMAP_ITEM_LIMIT: 1,
  MAX_SITEMAP_ITEM_LIMIT: 50000,
  URL_PROTOCOL_REGEX: /^https?:\/\//i,
};

/**
 * Validates that a URL is well-formed and meets security requirements
 *
 * Security: This function enforces that URLs use safe protocols (http/https),
 * are within reasonable length limits (2048 chars per sitemaps.org spec),
 * and can be properly parsed. This prevents protocol injection attacks and
 * ensures compliance with sitemap specifications.
 *
 * @param url - The URL to validate
 * @param paramName - The parameter name for error messages
 * @throws {InvalidHostnameError} If the URL is invalid
 */
export function validateURL(url: string, paramName: string): void {
  if (!url || typeof url !== 'string') {
    throw new InvalidHostnameError(
      url,
      `${paramName} must be a non-empty string`
    );
  }

  if (url.length > LIMITS.MAX_URL_LENGTH) {
    throw new InvalidHostnameError(
      url,
      `${paramName} exceeds maximum length of ${LIMITS.MAX_URL_LENGTH} characters`
    );
  }

  if (!LIMITS.URL_PROTOCOL_REGEX.test(url)) {
    throw new InvalidHostnameError(
      url,
      `${paramName} must use http:// or https:// protocol`
    );
  }

  // Validate URL can be parsed
  try {
    new URL(url);
  } catch (err) {
    throw new InvalidHostnameError(
      url,
      `${paramName} is not a valid URL: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Validates that a path doesn't contain path traversal sequences
 *
 * Security: This function prevents path traversal attacks by detecting
 * any occurrence of '..' in the path, whether it appears as '../', '/..',
 * or standalone. This prevents attackers from accessing files outside
 * the intended directory structure.
 *
 * @param path - The path to validate
 * @param paramName - The parameter name for error messages
 * @throws {InvalidPathError} If the path contains traversal sequences
 */
export function validatePath(path: string, paramName: string): void {
  if (!path || typeof path !== 'string') {
    throw new InvalidPathError(path, `${paramName} must be a non-empty string`);
  }

  // Check for path traversal sequences - must check before and after normalization
  // to catch both Windows-style (\) and Unix-style (/) separators
  if (path.includes('..')) {
    throw new InvalidPathError(
      path,
      `${paramName} contains path traversal sequence (..)`
    );
  }

  // Additional check after normalization to catch encoded or obfuscated attempts
  const normalizedPath = path.replace(/\\/g, '/');
  const pathComponents = normalizedPath.split('/').filter((p) => p.length > 0);

  if (pathComponents.includes('..')) {
    throw new InvalidPathError(
      path,
      `${paramName} contains path traversal sequence (..)`
    );
  }

  // Check for null bytes (security issue in some contexts)
  if (path.includes('\0')) {
    throw new InvalidPathError(
      path,
      `${paramName} contains null byte character`
    );
  }
}

/**
 * Validates that a public base path is safe for URL construction
 *
 * Security: This function prevents path traversal attacks and validates
 * that the path is safe for use in URL construction within sitemap indexes.
 * It checks for '..' sequences, null bytes, and invalid whitespace that
 * could be used to manipulate URL structure or inject malicious content.
 *
 * @param publicBasePath - The public base path to validate
 * @throws {InvalidPublicBasePathError} If the path is invalid
 */
export function validatePublicBasePath(publicBasePath: string): void {
  if (!publicBasePath || typeof publicBasePath !== 'string') {
    throw new InvalidPublicBasePathError(
      publicBasePath,
      'must be a non-empty string'
    );
  }

  // Check for path traversal - check the raw string first
  if (publicBasePath.includes('..')) {
    throw new InvalidPublicBasePathError(
      publicBasePath,
      'contains path traversal sequence (..)'
    );
  }

  // Additional check for path components after normalization
  const normalizedPath = publicBasePath.replace(/\\/g, '/');
  const pathComponents = normalizedPath.split('/').filter((p) => p.length > 0);

  if (pathComponents.includes('..')) {
    throw new InvalidPublicBasePathError(
      publicBasePath,
      'contains path traversal sequence (..)'
    );
  }

  // Check for null bytes
  if (publicBasePath.includes('\0')) {
    throw new InvalidPublicBasePathError(
      publicBasePath,
      'contains null byte character'
    );
  }

  // Check for potentially dangerous characters that could break URL construction
  if (/[\r\n\t]/.test(publicBasePath)) {
    throw new InvalidPublicBasePathError(
      publicBasePath,
      'contains invalid whitespace characters'
    );
  }
}

/**
 * Validates that a limit is within acceptable range per sitemaps.org spec
 *
 * Security: This function enforces sitemap size limits (1-50,000 URLs per
 * sitemap) as specified by sitemaps.org. This prevents resource exhaustion
 * attacks and ensures compliance with search engine requirements.
 *
 * @param limit - The limit to validate
 * @throws {InvalidLimitError} If the limit is out of range
 */
export function validateLimit(limit: number): void {
  if (
    typeof limit !== 'number' ||
    !Number.isFinite(limit) ||
    Number.isNaN(limit)
  ) {
    throw new InvalidLimitError(limit);
  }

  if (
    limit < LIMITS.MIN_SITEMAP_ITEM_LIMIT ||
    limit > LIMITS.MAX_SITEMAP_ITEM_LIMIT
  ) {
    throw new InvalidLimitError(limit);
  }

  // Ensure it's an integer
  if (!Number.isInteger(limit)) {
    throw new InvalidLimitError(limit);
  }
}

/**
 * Validates that an XSL URL is safe and well-formed
 *
 * Security: This function validates XSL stylesheet URLs to prevent
 * injection attacks. It blocks dangerous protocols and content patterns
 * that could be used for XSS or other attacks. The validation uses
 * case-insensitive matching to catch obfuscated attacks.
 *
 * @param xslUrl - The XSL URL to validate
 * @throws {InvalidXSLUrlError} If the URL is invalid
 */
export function validateXSLUrl(xslUrl: string): void {
  if (!xslUrl || typeof xslUrl !== 'string') {
    throw new InvalidXSLUrlError(xslUrl, 'must be a non-empty string');
  }

  if (xslUrl.length > LIMITS.MAX_URL_LENGTH) {
    throw new InvalidXSLUrlError(
      xslUrl,
      `exceeds maximum length of ${LIMITS.MAX_URL_LENGTH} characters`
    );
  }

  if (!LIMITS.URL_PROTOCOL_REGEX.test(xslUrl)) {
    throw new InvalidXSLUrlError(
      xslUrl,
      'must use http:// or https:// protocol'
    );
  }

  // Validate URL can be parsed
  try {
    new URL(xslUrl);
  } catch (err) {
    throw new InvalidXSLUrlError(
      xslUrl,
      `is not a valid URL: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Check for potentially dangerous content (case-insensitive)
  const lowerUrl = xslUrl.toLowerCase();

  // Block dangerous HTML/script content
  if (lowerUrl.includes('<script')) {
    throw new InvalidXSLUrlError(
      xslUrl,
      'contains potentially malicious content (<script tag)'
    );
  }

  // Block dangerous protocols (already checked http/https above, but double-check for encoded variants)
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
  ];

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.includes(protocol)) {
      throw new InvalidXSLUrlError(
        xslUrl,
        `contains dangerous protocol: ${protocol}`
      );
    }
  }

  // Check for URL-encoded variants of dangerous patterns
  // %3C = '<', %3E = '>', %3A = ':'
  const encodedPatterns = [
    '%3cscript', // <script
    '%3c%73%63%72%69%70%74', // <script (fully encoded)
    'javascript%3a', // javascript:
    'data%3a', // data:
  ];

  for (const pattern of encodedPatterns) {
    if (lowerUrl.includes(pattern)) {
      throw new InvalidXSLUrlError(
        xslUrl,
        'contains URL-encoded malicious content'
      );
    }
  }
}
