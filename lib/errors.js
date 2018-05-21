/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
'use strict';

/**
 * URL in SitemapItem does not exists
 */
class NoURLError extends Error {
  constructor(message) {
    super(message || 'URL is required');
    this.name = 'NoURLError';
    Error.captureStackTrace(this, NoURLError);
  }
}

/**
 * Protocol in URL does not exists
 */
class NoURLProtocolError extends Error {
 constructor(message) {
   super(message || 'Protocol is required');
   this.name = 'NoURLProtocolError';
   Error.captureStackTrace(this, NoURLProtocolError);
 }
}

/**
 * changefreq property in sitemap is invalid
 */
class ChangeFreqInvalidError extends Error {
  constructor(message) {
    super(message || 'changefreq is invalid');
    this.name = 'ChangeFreqInvalidError';
    Error.captureStackTrace(this, ChangeFreqInvalidError);
  }
}

/**
 * priority property in sitemap is invalid
 */
class PriorityInvalidError extends Error {
 constructor(message) {
   super(message || 'priority is invalid');
   this.name = 'PriorityInvalidError';
   Error.captureStackTrace(this, PriorityInvalidError);
 }
}

/**
 * SitemapIndex target Folder does not exists
 */
class UndefinedTargetFolder extends Error {
  constructor(message) {
    super(message || 'Target folder must exist');
    this.name = 'UndefinedTargetFolder';
    Error.captureStackTrace(this, UndefinedTargetFolder);
  }
}

class InvalidVideoFormat extends Error {
  constructor(message) {
    super(message || 'must include thumbnail_loc, title and description fields for videos');
    this.name = 'InvalidVideoFormat';
    Error.captureStackTrace(this, InvalidVideoFormat);
  }
}

class InvalidVideoDuration extends Error {
  constructor(message) {
    super(message || 'duration must be an integer of seconds between 0 and 28800');
    this.name = 'InvalidVideoDuration';
    Error.captureStackTrace(this, InvalidVideoDuration);
  }
}

class InvalidVideoDescription extends Error {
  constructor(message) {
    super(message || 'description must be no longer than 2048 characters');
    this.name = 'InvalidVideoDescription';
    Error.captureStackTrace(this, InvalidVideoDescription);
  }
}

class InvalidAttrValue extends Error {
  constructor(key, val, validator) {
    super('"' + val + '" tested against: ' + validator + ' is not a valid value for attr: "' + key + '"');
    this.name = 'InvalidAttrValue';
    Error.captureStackTrace(this, InvalidAttrValue);
  }
}

class InvalidAttr extends Error {
  constructor(key) {
    super('"' + key + '" is malformed');
    this.name = 'InvalidAttr';
    Error.captureStackTrace(this, InvalidAttr);
  }
}

class InvalidNewsFormat extends Error {
  constructor(message) {
    super(message || 'must include publication, publication name, publication language, title, and publication_date for news');
    this.name = 'InvalidNewsFormat';
    Error.captureStackTrace(this, InvalidNewsFormat);
  }
}

class InvalidNewsAccessValue extends Error {
  constructor(message) {
    super(message || 'News access must be either Registration, Subscription or not be present');
    this.name = 'InvalidNewsAccessValue';
    Error.captureStackTrace(this, InvalidNewsAccessValue);
  }
}

module.exports = {
  NoURLError,
  NoURLProtocolError,
  ChangeFreqInvalidError,
  PriorityInvalidError,
  UndefinedTargetFolder,
  InvalidVideoFormat,
  InvalidVideoDuration,
  InvalidVideoDescription,
  InvalidAttrValue,
  InvalidAttr,
  InvalidNewsFormat,
  InvalidNewsAccessValue
};
