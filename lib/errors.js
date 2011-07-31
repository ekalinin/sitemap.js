/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

/**
 * URL in SitemapItem does not exists
 */
exports.NoURLError = function (message) {
  this.name = 'NoURLError';
  this.message = message || '';
}
exports.NoURLError.prototype = Error.prototype;

/**
 * Protocol in URL does not exists
 */
exports.NoURLProtocolError = function (message) {
  this.name = 'NoURLProtocolError';
  this.message = message || '';
}
exports.NoURLProtocolError.prototype = Error.prototype;

/**
 * changefreq property in sitemap is invalid
 */
exports.ChangeFreqInvalidError = function (message) {
  this.name = 'ChangeFreqInvalidError';
  this.message = message || 'changefreq is invalid';
}
exports.ChangeFreqInvalidError.prototype = Error.prototype;
