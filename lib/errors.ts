/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
'use strict';

/**
 * URL in SitemapItem does not exists
 */
export class NoURLError extends Error {
  constructor(message?: string) {
    super(message || 'URL is required');
    this.name = 'NoURLError';
    // @ts-ignore
    Error.captureStackTrace(this, NoURLError);
  }
}

/**
 * Config was not passed to SitemapItem constructor
 */
export class NoConfigError extends Error {
  constructor(message?: string) {
    super(message || 'SitemapItem requires a configuration');
    this.name = 'NoConfigError';
    // @ts-ignore
    Error.captureStackTrace(this, NoConfigError);
  }
}

/**
 * changefreq property in sitemap is invalid
 */
export class ChangeFreqInvalidError extends Error {
  constructor(message?: string) {
    super(message || 'changefreq is invalid');
    this.name = 'ChangeFreqInvalidError';
    // @ts-ignore
    Error.captureStackTrace(this, ChangeFreqInvalidError);
  }
}

/**
 * priority property in sitemap is invalid
 */
export class PriorityInvalidError extends Error {
  constructor(message?: string) {
    super(message || 'priority is invalid');
    this.name = 'PriorityInvalidError';
    // @ts-ignore
    Error.captureStackTrace(this, PriorityInvalidError);
  }
}

/**
 * SitemapIndex target Folder does not exists
 */
export class UndefinedTargetFolder extends Error {
  constructor(message?: string) {
    super(message || 'Target folder must exist');
    this.name = 'UndefinedTargetFolder';
    // @ts-ignore
    Error.captureStackTrace(this, UndefinedTargetFolder);
  }
}

export class InvalidVideoFormat extends Error {
  constructor(message?: string) {
    super(message || 'must include thumbnail_loc, title and description fields for videos');
    this.name = 'InvalidVideoFormat';
    // @ts-ignore
    Error.captureStackTrace(this, InvalidVideoFormat);
  }
}

export class InvalidVideoDuration extends Error {
  constructor(message?: string) {
    super(message || 'duration must be an integer of seconds between 0 and 28800');
    this.name = 'InvalidVideoDuration';
    // @ts-ignore
    Error.captureStackTrace(this, InvalidVideoDuration);
  }
}

export class InvalidVideoDescription extends Error {
  constructor(message?: string) {
    super(message || 'description must be no longer than 2048 characters');
    this.name = 'InvalidVideoDescription';
    // @ts-ignore
    Error.captureStackTrace(this, InvalidVideoDescription);
  }
}

export class InvalidAttrValue extends Error {
  constructor(key: string, val: any, validator: RegExp) {
    super('"' + val + '" tested against: ' + validator + ' is not a valid value for attr: "' + key + '"');
    this.name = 'InvalidAttrValue';
    // @ts-ignore
    Error.captureStackTrace(this, InvalidAttrValue);
  }
}

// InvalidAttr is only thrown when attrbuilder is called incorrectly internally
/* istanbul ignore next */
export class InvalidAttr extends Error {
  constructor(key: string) {
    super('"' + key + '" is malformed');
    this.name = 'InvalidAttr';
    // @ts-ignore
    Error.captureStackTrace(this, InvalidAttr);
  }
}

export class InvalidNewsFormat extends Error {
  constructor(message?: string) {
    super(message || 'must include publication, publication name, publication language, title, and publication_date for news');
    this.name = 'InvalidNewsFormat';
    // @ts-ignore
    Error.captureStackTrace(this, InvalidNewsFormat);
  }
}

export class InvalidNewsAccessValue extends Error {
  constructor(message?: string) {
    super(message || 'News access must be either Registration, Subscription or not be present');
    this.name = 'InvalidNewsAccessValue';
    // @ts-ignore
    Error.captureStackTrace(this, InvalidNewsAccessValue);
  }
}

module.exports = {
  NoURLError,
  NoConfigError,
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
