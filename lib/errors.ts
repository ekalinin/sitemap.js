/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

/**
 * URL in SitemapItem does not exists
 */
export class NoURLError extends Error {
  constructor(message?: string) {
    super(message || 'URL is required');
    this.name = 'NoURLError';
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
    Error.captureStackTrace(this, UndefinedTargetFolder);
  }
}

export class InvalidVideoFormat extends Error {
  constructor(message?: string) {
    super(
      message ||
        'must include thumbnail_loc, title and description fields for videos'
    );
    this.name = 'InvalidVideoFormat';
    Error.captureStackTrace(this, InvalidVideoFormat);
  }
}

export class InvalidVideoDuration extends Error {
  constructor(message?: string) {
    super(
      message || 'duration must be an integer of seconds between 0 and 28800'
    );
    this.name = 'InvalidVideoDuration';
    Error.captureStackTrace(this, InvalidVideoDuration);
  }
}

export class InvalidVideoDescription extends Error {
  constructor(message?: string) {
    super(message || 'description must be no longer than 2048 characters');
    this.name = 'InvalidVideoDescription';
    Error.captureStackTrace(this, InvalidVideoDescription);
  }
}

export class InvalidVideoRating extends Error {
  constructor(message?: string) {
    super(message || 'rating must be between 0 and 5');
    this.name = 'InvalidVideoRating';
    Error.captureStackTrace(this, InvalidVideoRating);
  }
}

export class InvalidAttrValue extends Error {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(key: string, val: any, validator: RegExp) {
    super(
      '"' +
        val +
        '" tested against: ' +
        validator +
        ' is not a valid value for attr: "' +
        key +
        '"'
    );
    this.name = 'InvalidAttrValue';
    Error.captureStackTrace(this, InvalidAttrValue);
  }
}

// InvalidAttr is only thrown when attrbuilder is called incorrectly internally
/* istanbul ignore next */
export class InvalidAttr extends Error {
  constructor(key: string) {
    super('"' + key + '" is malformed');
    this.name = 'InvalidAttr';
    Error.captureStackTrace(this, InvalidAttr);
  }
}

export class InvalidNewsFormat extends Error {
  constructor(message?: string) {
    super(
      message ||
        'must include publication, publication name, publication language, title, and publication_date for news'
    );
    this.name = 'InvalidNewsFormat';
    Error.captureStackTrace(this, InvalidNewsFormat);
  }
}

export class InvalidNewsAccessValue extends Error {
  constructor(message?: string) {
    super(
      message ||
        'News access must be either Registration, Subscription or not be present'
    );
    this.name = 'InvalidNewsAccessValue';
    Error.captureStackTrace(this, InvalidNewsAccessValue);
  }
}

export class XMLLintUnavailable extends Error {
  constructor(message?: string) {
    super(
      message || 'xmlLint is not installed. XMLLint is required to validate'
    );
    this.name = 'XMLLintUnavailable';
    Error.captureStackTrace(this, XMLLintUnavailable);
  }
}
