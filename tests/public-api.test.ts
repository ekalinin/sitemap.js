import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as sitemap from '../dist/index.js';
// Type-only checks, enforced by `npm run test:typecheck`: internal types in
// lib/types.ts must not leak into the public API.
// @ts-expect-error internal, not re-exported by index.ts
import type { SitemapFileOptions } from '../dist/index.js';
// @ts-expect-error internal, not re-exported by index.ts
import type { SaxParserStreamConfig } from '../dist/index.js';
// @ts-expect-error internal, not re-exported by index.ts
import type { CharDataBuffer, CharDataHandlers } from '../dist/index.js';
import type {
  Logger,
  SaxParserStreamOptions,
  SitemapItemLoose,
} from '../dist/index.js';

describe('public API', () => {
  it('exports the enums from lib/types.ts', () => {
    assert.strictEqual(sitemap.ErrorLevel.WARN, 'warn');
    assert.strictEqual(sitemap.EnumChangefreq.DAILY, 'daily');
    assert.strictEqual(sitemap.EnumYesNo.YES, 'YES');
    assert.strictEqual(sitemap.EnumAllowDeny.ALLOW, 'allow');
    assert.strictEqual(sitemap.TagNames.loc, 'loc');
    assert.strictEqual(sitemap.IndexTagNames.sitemap, 'sitemap');
  });

  // A runtime export added or removed here is a public API change: update
  // this list, and the CHANGELOG, on purpose
  it('exports exactly the public runtime API', () => {
    assert.deepStrictEqual(Object.keys(sitemap).sort(), [
      'ChangeFreqInvalidError',
      'DEFAULT_SITEMAP_ITEM_LIMIT',
      'EmptySitemap',
      'EmptyStream',
      'EnumAllowDeny',
      'EnumChangefreq',
      'EnumYesNo',
      'ErrorLevel',
      'IndexObjectStreamToJSON',
      'IndexTagNames',
      'InvalidAttr',
      'InvalidAttrValue',
      'InvalidHostnameError',
      'InvalidLimitError',
      'InvalidLinkHreflang',
      'InvalidNewsAccessValue',
      'InvalidNewsFormat',
      'InvalidPathError',
      'InvalidPublicBasePathError',
      'InvalidURLError',
      'InvalidVideoCategory',
      'InvalidVideoDescription',
      'InvalidVideoDuration',
      'InvalidVideoFamilyFriendly',
      'InvalidVideoFormat',
      'InvalidVideoPriceCurrency',
      'InvalidVideoPriceType',
      'InvalidVideoRating',
      'InvalidVideoResolution',
      'InvalidVideoRestriction',
      'InvalidVideoRestrictionRelationship',
      'InvalidVideoTagCount',
      'InvalidVideoTitle',
      'InvalidVideoViewCount',
      'InvalidVideoYesNo',
      'InvalidXMLAttributeNameError',
      'InvalidXSLUrlError',
      'LIMITS',
      'NoConfigError',
      'NoURLError',
      'ObjectStreamToJSON',
      'PriorityInvalidError',
      'ReadlineStream',
      'SitemapAndIndexStream',
      'SitemapIndexStream',
      'SitemapItemStream',
      'SitemapStream',
      'TagNames',
      'XMLLintUnavailable',
      'XMLToSitemapIndexStream',
      'XMLToSitemapItemStream',
      'isAllowDeny',
      'isPriceType',
      'isResolution',
      'isValidChangeFreq',
      'isValidYesNo',
      'lineSeparatedURLsToSitemapOptions',
      'mergeStreams',
      'normalizeURL',
      'parseSitemap',
      'parseSitemapIndex',
      'simpleSitemapAndIndex',
      'streamToPromise',
      'validateLimit',
      'validatePath',
      'validatePublicBasePath',
      'validateSMIOptions',
      'validateURL',
      'validateXSLUrl',
      'validators',
      'xmlLint',
    ]);
  });
});

// Keep the public type imports referenced so they are checked, not elided
export type PublicTypes = [Logger, SaxParserStreamOptions, SitemapItemLoose];
export type InternalTypes = [
  SitemapFileOptions,
  SaxParserStreamConfig,
  CharDataBuffer,
  CharDataHandlers,
];
