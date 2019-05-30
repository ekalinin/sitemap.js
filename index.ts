/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
'use strict';

import * as sm from './lib/sitemap'
import * as errors from './lib/errors';

export { errors }

/**
 * Framework version.
 */
export declare const version: string;

//@ts-ignore
sm.errors = errors
//@ts-ignore
sm.version = "2.2.0"
export default sm
