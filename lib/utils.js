/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

/**
 * Exit with the given `str`.
 *
 * @param {String} str
 */
exports.abort = function (str) {
  console.error(str);
  process.exit(1);
}
