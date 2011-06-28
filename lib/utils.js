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

exports.htmlEscape = function (text) {
   return text.replace(/&/g,'&amp;').
     replace(/</g,'&lt;').
     replace(/>/g,'&gt;').
     replace(/"/g,'&quot;').
     replace(/'/g,'&#039;');
}

exports.lpad = function (n, len, chr) {
  var res = n.toString()
    , chr = chr || '0';
  while (res.length < len) {
    res = chr + res;
  }
  return res;
}
