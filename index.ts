/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
'use strict';

export * from './lib/sitemap'
import errors = require('./lib/errors');

export { errors }

/**
 * Framework version.
 */
export declare const version: string;

Object.defineProperty(exports, "version", { get(){ return "2.1.0" }});
