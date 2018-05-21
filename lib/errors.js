/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
'use strict';

/**
 * URL in SitemapItem does not exists
 */
exports.NoURLError = function (message) {
  this.name = 'NoURLError';
  this.message = message || 'URL is required';
};
exports.NoURLError.prototype = Error.prototype;

/**
 * Protocol in URL does not exists
 */
exports.NoURLProtocolError = function (message) {
  this.name = 'NoURLProtocolError';
  this.message = message || 'Protocol is required';
};
exports.NoURLProtocolError.prototype = Error.prototype;

/**
 * changefreq property in sitemap is invalid
 */
exports.ChangeFreqInvalidError = function (message) {
  this.name = 'ChangeFreqInvalidError';
  this.message = message || 'changefreq is invalid';
};
exports.ChangeFreqInvalidError.prototype = Error.prototype;

/**
 * priority property in sitemap is invalid
 */
exports.PriorityInvalidError = function (message) {
  this.name = 'PriorityInvalidError';
  this.message = message || 'priority is invalid';
};
exports.PriorityInvalidError.prototype = Error.prototype;

/**
 * SitemapIndex target Folder does not exists
 */
exports.UndefinedTargetFolder = function (message) {
  this.name = 'UndefinedTargetFolder';
  this.message = message || 'Target folder must exist';
};

exports.UndefinedTargetFolder.prototype = Error.prototype;

exports.InvalidVideoFormat = function (message) {
  this.name = 'InvalidVideoFormat';
  this.message = message || 'must include thumbnail_loc, title and description fields for videos ';
};

exports.InvalidVideoFormat.prototype = Error.prototype;

exports.InvalidVideoDuration = function (message) {
  this.name = 'InvalidVideoDuration';
  this.message = message || 'duration must be an integer of seconds between 0 and 28800';
};

exports.InvalidVideoDuration.prototype = Error.prototype;

exports.InvalidVideoDescription = function (message) {
  this.name = 'InvalidVideoDescription';
  this.message = message || 'description must be no longer than 2048 characters';
};

exports.InvalidVideoDescription.prototype = Error.prototype;

exports.InvalidAttrValue = function (key, val, validator) {
  this.name = 'InvalidAttrValue';
  this.message = '"' + val + '" tested against: ' + validator + ' is not a valid value for attr: "' + key + '"';
};

exports.InvalidAttrValue.prototype = Error.prototype;

exports.InvalidAttr = function (key) {
  this.name = 'InvalidAttr';
  this.message = '"' + key + '" is malformed';
};

exports.InvalidAttr.prototype = Error.prototype;
