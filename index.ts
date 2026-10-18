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
// Listed explicitly, like the types below, so a new error class is public
// only once it is added here
export {
  NoURLError,
  NoConfigError,
  ChangeFreqInvalidError,
  PriorityInvalidError,
  InvalidVideoFormat,
  InvalidVideoDuration,
  InvalidVideoDescription,
  InvalidVideoRating,
  InvalidAttrValue,
  InvalidAttr,
  InvalidNewsFormat,
  InvalidNewsAccessValue,
  XMLLintUnavailable,
  InvalidVideoTitle,
  InvalidVideoViewCount,
  InvalidVideoTagCount,
  InvalidVideoCategory,
  InvalidVideoFamilyFriendly,
  InvalidVideoYesNo,
  InvalidLinkHreflang,
  InvalidVideoRestriction,
  InvalidVideoRestrictionRelationship,
  InvalidVideoPriceType,
  InvalidVideoResolution,
  InvalidVideoPriceCurrency,
  EmptyStream,
  EmptySitemap,
  InvalidPathError,
  InvalidHostnameError,
  InvalidURLError,
  InvalidLimitError,
  InvalidPublicBasePathError,
  InvalidXSLUrlError,
  InvalidXMLAttributeNameError,
} from './lib/errors.js';
// Listed explicitly rather than `export *`, so types.ts can hold internal types
// (such as SitemapFileOptions) without making them public API. IndexTagNames
// and the parser options are exported with their modules below.
export {
  EnumChangefreq,
  EnumYesNo,
  EnumAllowDeny,
  ErrorLevel,
  TagNames,
  type NewsItem,
  type Img,
  type PriceType,
  type Resolution,
  type VideoItem,
  type VideoItemLoose,
  type LinkItem,
  type IndexItem,
  type SitemapItem,
  type SitemapItemLoose,
  type ErrorHandler,
  type Logger,
  type StringObj,
  type SaxParserStreamOptions,
} from './lib/types.js';
export {
  lineSeparatedURLsToSitemapOptions,
  mergeStreams,
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
  validateSMIOptions,
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
