/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

module.exports = require('./lib/sitemap');
module.exports.utils = require('./lib/utils');
module.exports.errors = require('./lib/errors');

/**
 * Framework version.
 */
var fs = require('fs');

if (!module.exports.version) {
  module.exports.version = JSON.parse(
    fs.readFileSync(__dirname + "/package.json", 'utf8')).version;
}
