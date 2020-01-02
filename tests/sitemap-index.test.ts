import { createSitemapsAndIndex } from '../index';
import { tmpdir } from 'os';
import { existsSync, unlinkSync } from 'fs';
import { SitemapIndexStream } from '../lib/sitemap-index-stream';
import { streamToPromise } from '../dist';
/* eslint-env jest, jasmine */
function removeFilesArray(files): void {
  if (files && files.length) {
    files.forEach(function(file) {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    });
  }
}

const xmlDef = '<?xml version="1.0" encoding="UTF-8"?>';
describe('sitemapIndex', () => {
  it('build sitemap index', async () => {
    const expectedResult =
      xmlDef +
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      '<sitemap>' +
      '<loc>https://test.com/s1.xml</loc>' +
      '</sitemap>' +
      '<sitemap>' +
      '<loc>https://test.com/s2.xml</loc>' +
      '</sitemap>' +
      '</sitemapindex>';
    const smis = new SitemapIndexStream();
    smis.write('https://test.com/s1.xml');
    smis.write('https://test.com/s2.xml');
    smis.end();
    const result = await streamToPromise(smis);

    expect(result.toString()).toBe(expectedResult);
  });

  it('build sitemap index with lastmodISO', async () => {
    const expectedResult =
      xmlDef +
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      '<sitemap>' +
      '<loc>https://test.com/s1.xml</loc>' +
      '<lastmod>2018-11-26T00:00:00.000Z</lastmod>' +
      '</sitemap>' +
      '<sitemap>' +
      '<loc>https://test.com/s2.xml</loc>' +
      '<lastmod>2018-11-27T00:00:00.000Z</lastmod>' +
      '</sitemap>' +
      '<sitemap>' +
      '<loc>https://test.com/s3.xml</loc>' +
      '</sitemap>' +
      '</sitemapindex>';
    const smis = new SitemapIndexStream();
    smis.write({
      url: 'https://test.com/s1.xml',
      lastmod: '2018-11-26',
    });

    smis.write({
      url: 'https://test.com/s2.xml',
      lastmod: '2018-11-27',
    });

    smis.write({
      url: 'https://test.com/s3.xml',
    });
    smis.end();
    const result = await streamToPromise(smis);

    expect(result.toString()).toBe(expectedResult);
  });

  it('simple sitemap index', async () => {
    const targetFolder = tmpdir();
    const url1 = 'http://ya.ru';
    const url2 = 'http://ya2.ru';
    const expectedFiles = [
      targetFolder + '/sm-test-0.xml',
      targetFolder + '/sm-test-1.xml',
      targetFolder + '/sm-test-index.xml',
    ];

    try {
      await createSitemapsAndIndex({
        hostname: 'https://www.sitemap.org',
        sitemapName: 'sm-test',
        sitemapSize: 1,
        targetFolder: '/tmp2',
        urls: [url1, url2],
        gzip: false,
      });
    } catch (e) {
      expect(e.message).toMatch(/Target folder must exist/);
    }

    // Cleanup before run test
    removeFilesArray(expectedFiles);

    const succeeded = await createSitemapsAndIndex({
      hostname: 'https://www.sitemap.org',
      sitemapName: 'sm-test',
      sitemapSize: 1,
      targetFolder,
      urls: [url1, url2],
      gzip: false,
    });

    expect(succeeded).toBe(true);
    expectedFiles.forEach(function(expectedFile) {
      expect(existsSync(expectedFile)).toBe(true);
    });
  });

  it('sitemap with gzip files', async () => {
    const targetFolder = tmpdir();
    const url1 = 'http://ya.ru';
    const url2 = 'http://ya2.ru';
    const expectedFiles = [
      targetFolder + '/sm-test-0.xml.gz',
      targetFolder + '/sm-test-1.xml.gz',
      targetFolder + '/sm-test-index.xml',
    ];

    // Cleanup before run test
    removeFilesArray(expectedFiles);

    const succeeded = await createSitemapsAndIndex({
      hostname: 'http://www.sitemap.org',
      sitemapName: 'sm-test',
      sitemapSize: 1,
      targetFolder,
      gzip: true,
      urls: [url1, url2],
    });
    expect(succeeded).toBe(true);
    expectedFiles.forEach(function(expectedFile) {
      expect(existsSync(expectedFile)).toBe(true);
    });
  });
});
