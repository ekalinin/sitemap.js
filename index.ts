/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
export {
  SitemapItemStream,
  type SitemapItemStreamOptions,
} from './lib/sitemap-item-stream.js';
export {
  IndexTagNames,
  SitemapIndexStream,
  type SitemapIndexStreamOptions,
  SitemapAndIndexStream,
  type SitemapAndIndexStreamOptions,
} from './lib/sitemap-index-stream.js';
export {
  streamToPromise,
  SitemapStream,
  type SitemapStreamOptions,
} from './lib/sitemap-stream.js';
export * from './lib/errors.js';
export * from './lib/types.js';
export {
  lineSeparatedURLsToSitemapOptions,
  mergeStreams,
  validateSMIOptions,
  normalizeURL,
  ReadlineStream,
  type ReadlineStreamOptions,
} from './lib/utils.js';
export { xmlLint } from './lib/xmllint.js';
export {
  parseSitemap,
  XMLToSitemapItemStream,
  type XMLToSitemapItemStreamOptions,
  ObjectStreamToJSON,
  type ObjectStreamToJSONOptions,
} from './lib/sitemap-parser.js';
export {
  parseSitemapIndex,
  XMLToSitemapIndexStream,
  type XMLToSitemapIndexItemStreamOptions,
  IndexObjectStreamToJSON,
  type IndexObjectStreamToJSONOptions,
} from './lib/sitemap-index-parser.js';

export {
  simpleSitemapAndIndex,
  type SimpleSitemapAndIndexOptions,
} from './lib/sitemap-simple.js';

export {
  validateURL,
  validatePath,
  validateLimit,
  validatePublicBasePath,
  validateXSLUrl,
  validators,
  isPriceType,
  isResolution,
  isValidChangeFreq,
  isValidYesNo,
  isAllowDeny,
} from './lib/validation.js';

export { LIMITS, DEFAULT_SITEMAP_ITEM_LIMIT } from './lib/constants.js';
