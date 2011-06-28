/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

exports.NoURLError = NoURLError;
exports.NoURLProtocolError = NoURLProtocolError;

/**
 * URL in SitemapItem does not exists
 */
function NoURLError (message) {
  this.name = 'NoURLError';
  this.message = message || '';
}
NoURLError.prototype = Error.prototype;

/**
 * Protocol in URL does not exists
 */
function NoURLProtocolError (message) {
  this.name = 'NoURLProtocolError';
  this.message = message || '';
}
NoURLProtocolError.prototype = Error.prototype;
