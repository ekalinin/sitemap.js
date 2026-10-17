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
});

// Keep the public type imports referenced so they are checked, not elided
export type PublicTypes = [Logger, SaxParserStreamOptions, SitemapItemLoose];
export type InternalTypes = [
  SitemapFileOptions,
  SaxParserStreamConfig,
  CharDataBuffer,
  CharDataHandlers,
];
