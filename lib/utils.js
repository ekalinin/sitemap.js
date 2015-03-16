/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

var _ = require('underscore');

/**
 * Exit with the given `str`.
 *
 * @param {String} str
 */
exports.abort = function (str) {
  console.error(str);
  process.exit(1);
};

/**
 * Escapes special characters in text.
 *
 * @param {String} text
 */
exports.htmlEscape = function (text) {
   return text.replace(/&/g,'&amp;').
     replace(/</g,'&lt;').
     replace(/>/g,'&gt;').
     replace(/"/g,'&quot;').
     replace(/'/g,'&#039;');
};

/**
 *  Pads the left-side of a string with a specific
 *  set of characters.
 *
 *  @param {Object} n
 *  @param {Number} len
 *  @param {String} chr
 */
exports.lpad = function (n, len, chr) {
  var res = n.toString()
    , chr = chr || '0';
  while (res.length < len) {
    res = chr + res;
  }
  return res;
};

/**
 *
 * @param {Array} arr
 */
exports.distinctArray = function (arr) {
    var hash = {}
      , res = []
      , arr_length = arr.length;
    while (arr_length-- ) {
        hash[arr[arr_length]] = true;
    }
    for (key in hash) {
        res.push(key);
    }
    return res;
};

exports.chunkArray = function(arr, chunkSize) {
  var lists = _.groupBy(arr, function(element, index) {
    return Math.floor(index/chunkSize);
  });
  lists = _.toArray(lists);
  return lists;
};

exports.getTimestamp = function() {
  return (new Date()).getTime();
};