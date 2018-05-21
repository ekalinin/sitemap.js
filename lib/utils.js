/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
'use strict';

var _ = require('underscore');

/**
 * Escapes special characters in text.
 *
 * @param {String} text
 */
exports.htmlEscape = function (text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};

/**
 *  Pads the left-side of a string with a specific
 *  set of characters.
 *
 *  @param {Object} n
 *  @param {Number} len
 *  @param {String} chr
 */
function lpad(n, len, chr) {
  var res = n.toString()
    , chr = chr || '0'
    , leading = (res.substr(0, 1) === '-');

  //If left side of string is a minus sign (negative number), we want to ignore that in the padding process
  if (leading) {
    res = res.substr(1); //cut-off the leading '-'
  }

  while (res.length < len) {
    res = chr + res;
  }

  if (leading) { //If we initially cutoff the leading '-', we add it again here
    res = '-' + res;
  }

  return res;
};

exports.chunkArray = function (arr, chunkSize) {
  var lists = _.groupBy(arr, function (element, index) {
    return Math.floor(index / chunkSize);
  });
  lists = _.toArray(lists);
  return lists;
};

exports.getTimestamp = function () {
  return (new Date()).getTime();
};

exports.getTimestampFromDate = function (dt, bRealtime) {
  var timestamp = [dt.getUTCFullYear(), lpad(dt.getUTCMonth() + 1, 2),
    lpad(dt.getUTCDate(), 2)].join('-');

  // Indicate that lastmod should include minutes and seconds (and timezone)
  if (bRealtime && bRealtime === true) {
    timestamp += 'T';
    timestamp += [lpad(dt.getUTCHours(), 2),
      lpad(dt.getUTCMinutes(), 2),
      lpad(dt.getUTCSeconds(), 2)
    ].join(':');
    timestamp += 'Z';
  }

  return timestamp;
};
