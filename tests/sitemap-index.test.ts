import { buildSitemapIndex, createSitemapsAndIndex } from '../index';
import { tmpdir } from 'os';
import { existsSync, unlinkSync } from 'fs';
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
  it('build sitemap index', () => {
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

    const result = buildSitemapIndex({
      urls: ['https://test.com/s1.xml', 'https://test.com/s2.xml'],
    });

    expect(result).toBe(expectedResult);
  });

  it('build sitemap index with custom xmlNS', () => {
    const expectedResult =
      xmlDef +
      '<sitemapindex xmlns="http://www.example.org/schemas/sitemap/0.9">' +
      '<sitemap>' +
      '<loc>https://test.com/s1.xml</loc>' +
      '</sitemap>' +
      '<sitemap>' +
      '<loc>https://test.com/s2.xml</loc>' +
      '</sitemap>' +
      '</sitemapindex>';

    const result = buildSitemapIndex({
      urls: ['https://test.com/s1.xml', 'https://test.com/s2.xml'],
      xmlNs: 'xmlns="http://www.example.org/schemas/sitemap/0.9"',
    });

    expect(result).toBe(expectedResult);
  });

  it('build sitemap index with lastmodISO', () => {
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
      '<lastmod>2019-07-01T00:00:00.000Z</lastmod>' +
      '</sitemap>' +
      '</sitemapindex>';

    const result = buildSitemapIndex({
      urls: [
        {
          url: 'https://test.com/s1.xml',
          lastmod: '2018-11-26',
        },
        {
          url: 'https://test.com/s2.xml',
          lastmod: '2018-11-27',
        },
        {
          url: 'https://test.com/s3.xml',
        },
      ],
      xmlNs: 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      lastmod: '2019-07-01',
    });

    expect(result).toBe(expectedResult);
  });

  it('build sitemap index with lastmod', () => {
    const expectedResult =
      xmlDef +
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      '<sitemap>' +
      '<loc>https://test.com/s1.xml</loc>' +
      '<lastmod>2018-11-26T00:00:00.000Z</lastmod>' +
      '</sitemap>' +
      '</sitemapindex>';

    const result = buildSitemapIndex({
      urls: [
        {
          url: 'https://test.com/s1.xml',
        },
      ],
      xmlNs: 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      lastmod: '2018-11-26',
    });

    expect(result).toBe(expectedResult);
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
