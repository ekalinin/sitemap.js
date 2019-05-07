/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
'use strict';

module.exports = require('./lib/sitemap');
module.exports.errors = require('./lib/errors');

/**
 * Framework version.
 */
if (!module.exports.version) {
  module.exports.version = "2.2.0"
}
