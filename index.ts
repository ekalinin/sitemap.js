/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
'use strict';

export * from './lib/sitemap'
import errors = require('./lib/sitemap');

export { errors }

export declare const version: string;

/**
 * Framework version.
 */
if (!exports.version) {
  exports.version = "2.1.0"
}
