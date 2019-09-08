import 'babel-polyfill'
import { buildSitemapIndex, createSitemapIndex } from '../index'
import { tmpdir } from 'os'
import { existsSync, unlinkSync } from 'fs'
/* eslint-env jest, jasmine */
function removeFilesArray(files): void {
  if (files && files.length) {
    files.forEach(function(file) {
      if (existsSync(file)) {
        unlinkSync(file)
      }
    })
  }
}

const xmlDef = '<?xml version="1.0" encoding="UTF-8"?>'
describe('sitemapIndex', () => {
  it('build sitemap index', () => {
    const expectedResult =
      xmlDef +
      '<?xml-stylesheet type="text/xsl" href="https://test.com/style.xsl"?>' +
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      '<sitemap>' +
      '<loc>https://test.com/s1.xml</loc>' +
      '</sitemap>' +
      '<sitemap>' +
      '<loc>https://test.com/s2.xml</loc>' +
      '</sitemap>' +
      '</sitemapindex>'

    const result = buildSitemapIndex({
      urls: ['https://test.com/s1.xml', 'https://test.com/s2.xml'],
      xslUrl: 'https://test.com/style.xsl'
    })

    expect(result).toBe(expectedResult)
  })

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
      '</sitemapindex>'

    const result = buildSitemapIndex({
      urls: ['https://test.com/s1.xml', 'https://test.com/s2.xml'],
      xmlNs: 'xmlns="http://www.example.org/schemas/sitemap/0.9"'
    })

    expect(result).toBe(expectedResult)
  })

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
      '</sitemapindex>'

    const result = buildSitemapIndex({
      urls: [
        {
          url: 'https://test.com/s1.xml',
          lastmod: '2018-11-26'
        },
        {
          url: 'https://test.com/s2.xml',
          lastmod: '2018-11-27'
        },
        {
          url: 'https://test.com/s3.xml'
        }
      ],
      xmlNs: 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      lastmod: '2019-07-01'
    })

    expect(result).toBe(expectedResult)
  })

  it('build sitemap index with lastmod', () => {
    const expectedResult =
      xmlDef +
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      '<sitemap>' +
      '<loc>https://test.com/s1.xml</loc>' +
      '<lastmod>2018-11-26T00:00:00.000Z</lastmod>' +
      '</sitemap>' +
      '</sitemapindex>'

    const result = buildSitemapIndex({
      urls: [
        {
          url: 'https://test.com/s1.xml'
        }
      ],
      xmlNs: 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      lastmod: '2018-11-26'
    })

    expect(result).toBe(expectedResult)
  })

  it('simple sitemap index', async () => {
    const tmp = tmpdir()
    const url1 = 'http://ya.ru'
    const url2 = 'http://ya2.ru'
    const expectedFiles = [
      tmp + '/sm-test-0.xml',
      tmp + '/sm-test-1.xml',
      tmp + '/sm-test-index.xml'
    ]

    expect(function() {
      createSitemapIndex({
        cacheTime: 600000,
        hostname: 'https://www.sitemap.org',
        sitemapName: 'sm-test',
        sitemapSize: 1,
        targetFolder: '/tmp2',
        urls: [url1, url2]
      })
    }).toThrowError(/Target folder must exist/)

    // Cleanup before run test
    removeFilesArray(expectedFiles)

    const [err, result] = await new Promise((resolve): void => {
      createSitemapIndex({
        cacheTime: 600000,
        hostname: 'https://www.sitemap.org',
        sitemapName: 'sm-test',
        sitemapSize: 1,
        targetFolder: tmp,
        urls: [url1, url2],
        callback: (error, result) => {
          resolve([error, result])
        }
      })
    })

    expect(err).toBeFalsy()
    expect(result).toBe(true)
    expectedFiles.forEach(function(expectedFile) {
      expect(existsSync(expectedFile)).toBe(true)
    })
  })

  it('sitemap without callback', () => {
    createSitemapIndex({
      cacheTime: 600000,
      hostname: 'http://www.sitemap.org',
      sitemapName: 'sm-test',
      sitemapSize: 1,
      targetFolder: tmpdir(),
      urls: ['http://ya.ru', 'http://ya2.ru']
    })
  })

  it('sitemap with gzip files', async () => {
    const tmp = tmpdir()
    const url1 = 'http://ya.ru'
    const url2 = 'http://ya2.ru'
    const expectedFiles = [
      tmp + '/sm-test-0.xml.gz',
      tmp + '/sm-test-1.xml.gz',
      tmp + '/sm-test-index.xml'
    ]

    // Cleanup before run test
    removeFilesArray(expectedFiles)

    const [err, result] = await new Promise((resolve): void => {
      createSitemapIndex({
        cacheTime: 600000,
        hostname: 'http://www.sitemap.org',
        sitemapName: 'sm-test',
        sitemapSize: 1,
        targetFolder: tmp,
        gzip: true,
        urls: [url1, url2],
        callback: (error, result) => {
          resolve([error, result])
        }
      })
    })
    expect(err).toBeFalsy()
    expect(result).toBe(true)
    expectedFiles.forEach(function(expectedFile) {
      expect(existsSync(expectedFile)).toBe(true)
    })
  })
})
