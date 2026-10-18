import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getLinkHreflang,
  validateSMIOptions,
  isValidPriority,
  isValidVideoDuration,
  isValidVideoRating,
  isValidVideoViewCount,
  isValidISODate,
  isValidYesNo,
} from '../dist/lib/validation.js';
import { ErrorLevel, type LinkItem, type SitemapItem } from '../dist/index.js';

// Bounds come from the sitemaps.org protocol (priority) and Google's video
// sitemap spec (duration 0–28800 s, rating 0–5).
const nonFinite = [NaN, Infinity, -Infinity];

describe('value guards', () => {
  it('isValidPriority accepts 0 through 1 inclusive', () => {
    for (const ok of [0, 0.5, 1])
      assert.equal(isValidPriority(ok), true, `${ok}`);
    for (const bad of [-0.1, 1.1, ...nonFinite])
      assert.equal(isValidPriority(bad), false, `${bad}`);
  });

  it('isValidPriority rejects non-numbers instead of coercing them', () => {
    for (const bad of ['0.5', '', null, undefined, true])
      assert.equal(isValidPriority(bad), false, String(bad));
  });
});

describe('getLinkHreflang', () => {
  it('returns lang, else hreflang, when it is a non-empty string', () => {
    assert.equal(getLinkHreflang({ url: 'u', lang: 'en' }), 'en');
    assert.equal(
      getLinkHreflang({ url: 'u', lang: '', hreflang: 'en-us' }),
      'en-us'
    );
  });

  it('returns undefined for a missing, empty or non-string value', () => {
    for (const lang of [undefined, '', 5, false, null])
      assert.equal(
        getLinkHreflang({ url: 'u', lang } as unknown as LinkItem),
        undefined,
        String(lang)
      );
  });
});

describe('validateSMIOptions', () => {
  const item = (extra: Partial<SitemapItem>): SitemapItem => ({
    url: 'https://example.com/',
    img: [],
    video: [],
    links: [],
    ...extra,
  });
  const reported = (conf: SitemapItem): string[] => {
    const names: string[] = [];
    validateSMIOptions(conf, ErrorLevel.WARN, (err) => names.push(err.name));
    return names;
  };

  it('reports a NaN or non-numeric priority, and accepts 0', () => {
    for (const priority of [NaN, 'high', ''])
      assert.deepEqual(
        reported(item({ priority: priority as number })),
        ['PriorityInvalidError'],
        String(priority)
      );
    assert.deepEqual(reported(item({ priority: 0 })), []);
  });

  it('reports an alternate link with no lang or hreflang', () => {
    assert.deepEqual(
      reported(item({ links: [{ url: 'u' } as unknown as LinkItem] })),
      ['InvalidLinkHreflang']
    );
    assert.deepEqual(reported(item({ links: [{ url: 'u', lang: 'en' }] })), []);
  });

  it('ignores links that are not an array', () => {
    assert.deepEqual(
      reported(
        item({ links: { url: 'u', lang: 'en' } as unknown as LinkItem[] })
      ),
      []
    );
  });
});

describe('remaining value guards', () => {
  it('isValidVideoDuration accepts 0 through 28800 seconds', () => {
    for (const ok of [0, 600, 28800])
      assert.equal(isValidVideoDuration(ok), true, `${ok}`);
    for (const bad of [-1, 28801, ...nonFinite])
      assert.equal(isValidVideoDuration(bad), false, `${bad}`);
  });

  it('isValidVideoRating accepts 0 through 5 inclusive', () => {
    for (const ok of [0, 4.2, 5])
      assert.equal(isValidVideoRating(ok), true, `${ok}`);
    for (const bad of [-0.1, 5.1, ...nonFinite])
      assert.equal(isValidVideoRating(bad), false, `${bad}`);
  });

  it('isValidYesNo accepts only a whole yes or no', () => {
    for (const ok of ['yes', 'Yes', 'YES', 'no', 'No', 'NO'])
      assert.equal(isValidYesNo(ok), true, ok);
    for (const bad of ['NOPE', 'maybe-yes', 'yesno', 'YESterday', 'piano', ''])
      assert.equal(isValidYesNo(bad), false, bad);
  });

  it('isValidVideoViewCount accepts finite non-negative counts', () => {
    for (const ok of [0, 1, 10_000_000_000])
      assert.equal(isValidVideoViewCount(ok), true, `${ok}`);
    for (const bad of [-1, ...nonFinite])
      assert.equal(isValidVideoViewCount(bad), false, `${bad}`);
  });

  it('isValidISODate accepts W3C date and datetime forms', () => {
    for (const ok of [
      '2024-01-15',
      '2024-01-15T10:30:00Z',
      '2024-01-15T10:30:00.123+02:00',
    ])
      assert.equal(isValidISODate(ok), true, ok);
    for (const bad of ['', '15/01/2024', '2024-01-15 10:30:00', 'not-a-date'])
      assert.equal(isValidISODate(bad), false, bad);
  });
});
