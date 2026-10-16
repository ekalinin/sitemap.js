import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidPriority,
  isValidVideoDuration,
  isValidVideoRating,
  isValidVideoViewCount,
  isValidISODate,
} from '../dist/lib/validation.js';

// Bounds come from the sitemaps.org protocol (priority) and Google's video
// sitemap spec (duration 0–28800 s, rating 0–5).
describe('value guards', () => {
  const nonFinite = [NaN, Infinity, -Infinity];

  it('isValidPriority accepts 0 through 1 inclusive', () => {
    for (const ok of [0, 0.5, 1])
      assert.equal(isValidPriority(ok), true, `${ok}`);
    for (const bad of [-0.1, 1.1, ...nonFinite])
      assert.equal(isValidPriority(bad), false, `${bad}`);
  });

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
