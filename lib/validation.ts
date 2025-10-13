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
 * @param path - The path to validate
 * @param paramName - The parameter name for error messages
 * @throws {InvalidPathError} If the path contains traversal sequences
 */
export function validatePath(path: string, paramName: string): void {
  if (!path || typeof path !== 'string') {
    throw new InvalidPathError(path, `${paramName} must be a non-empty string`);
  }

  // Check for path traversal sequences
  const normalizedPath = path.replace(/\\/g, '/');
  if (normalizedPath.includes('../')) {
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

  // Check for path traversal
  if (publicBasePath.includes('..')) {
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

  // Check for potentially dangerous content
  const lowerUrl = xslUrl.toLowerCase();
  if (lowerUrl.includes('<script') || lowerUrl.includes('javascript:')) {
    throw new InvalidXSLUrlError(
      xslUrl,
      'contains potentially malicious content'
    );
  }
}
