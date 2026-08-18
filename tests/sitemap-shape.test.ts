import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SitemapIndexStream,
  SitemapAndIndexStream,
  xmlLint,
  parseSitemap,
  InvalidNewsFormat,
  NoURLError,
  NoConfigError,
  ChangeFreqInvalidError,
  PriorityInvalidError,
  UndefinedTargetFolder,
  InvalidVideoFormat,
  InvalidVideoDuration,
  InvalidVideoDescription,
  InvalidAttrValue,
  normalizeURL,
  SitemapStream,
  SitemapItemStream,
  parseSitemapIndex,
  XMLToSitemapIndexStream,
  IndexObjectStreamToJSON,
} from '../dist/index.js';

describe('sitemap shape', () => {
  it('exports individually as well', () => {
    assert.notStrictEqual(NoURLError, undefined);
    assert.notStrictEqual(InvalidNewsFormat, undefined);
    assert.notStrictEqual(NoConfigError, undefined);
    assert.notStrictEqual(ChangeFreqInvalidError, undefined);
    assert.notStrictEqual(PriorityInvalidError, undefined);
    assert.notStrictEqual(UndefinedTargetFolder, undefined);
    assert.notStrictEqual(InvalidVideoFormat, undefined);
    assert.notStrictEqual(InvalidVideoDuration, undefined);
    assert.notStrictEqual(InvalidVideoDescription, undefined);
    assert.notStrictEqual(InvalidAttrValue, undefined);
    assert.notStrictEqual(SitemapIndexStream, undefined);
    assert.notStrictEqual(SitemapAndIndexStream, undefined);
    assert.notStrictEqual(parseSitemap, undefined);
    assert.notStrictEqual(xmlLint, undefined);
    assert.notStrictEqual(normalizeURL, undefined);
    assert.notStrictEqual(SitemapStream, undefined);
    assert.notStrictEqual(SitemapItemStream, undefined);
    assert.notStrictEqual(parseSitemapIndex, undefined);
    assert.notStrictEqual(XMLToSitemapIndexStream, undefined);
    assert.notStrictEqual(IndexObjectStreamToJSON, undefined);
  });
});
