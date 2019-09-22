/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
/* eslint-env jest */
import 'babel-polyfill'

import {
  Sitemap,
  createSitemap,
  EnumChangefreq,
  EnumYesNo,
  EnumAllowDeny,
  ISitemapItemOptionsLoose,
} from '../index'
import { SitemapItem } from '../lib/sitemap-item'
import { gzipSync, gunzipSync } from 'zlib'
import { create } from 'xmlbuilder'
import * as testUtil from './util'
jest.mock('../lib/sitemap-item')

const urlset = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
             'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" ' +
             'xmlns:xhtml="http://www.w3.org/1999/xhtml" ' +
             'xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" ' +
             'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" ' +
             'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">'

const dynamicUrlSet = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" />'
const xmlDef = '<?xml version="1.0" encoding="UTF-8"?>'
// const xmlPriority = '<priority>0.9</priority>'
const xmlLoc = '<loc>http://ya.ru/</loc>'
// const itemTemplate = { 'url': '', video: [], img: [], links: [] }

describe('sitemap', () => {
  let sm
  beforeEach(() => {
    sm = createSitemap({ urls: ["https://example.com"]})
  })
  it('can be instantiated without options', () => {
    expect(() => (new Sitemap())).not.toThrow()
  })

  it('handles custom xmlNS', () => {
    const customNS = 'http://example.com/foo'
    const sm = createSitemap({
      urls: ["https://example.com"],
      xmlNs: `xmlns="${customNS}"`
    });
    // @ts-ignore
    expect(sm.root.attribs.xmlns.value).toBe(customNS)
  })

  describe('clear cache', () => {
    it('empties the cache', () => {
      sm.cache = 'foo'
      expect(sm.cache).toBe('foo')
      sm.clearCache()
      expect(sm.cache).toBe('')
    })
  })

  describe('setCache', () => {
    it('sets caches value to what was passed in', () => {
      sm.setCache('foo')
      expect(sm.cache).toBe('foo')
    })

    it('returns what was passed in', () => {
      expect(sm.setCache('bar')).toBe('bar')
    })

    it('sets a timestamp indicating how long the cache will be valid for', () => {
      sm.setCache('bizz')
      expect(sm.cacheSetTimestamp).toBeGreaterThan(Date.now() - 10)
      expect(sm.cacheSetTimestamp).toBeLessThan(Date.now() + 1)
    })
  })

  describe('isCacheValid', () => {
    it('returns true if its been less than cacheTime since cache was set', () => {
      sm.cacheTime = 60
      sm.setCache('foo')
      expect(sm.isCacheValid()).toBe(true)
    })

    it('returns false if its been greater than cacheTime since cache was set', async () => {
      sm.cacheTime = 1
      sm.setCache('foo')
      await new Promise((resolve) => setTimeout(resolve, 3))
      expect(sm.isCacheValid()).toBe(false)
    })

    it('returns false if cache has not been set', () => {
      sm.cacheTime = 1
      expect(sm.isCacheValid()).toBe(false)
    })

    it('returns false if cache is empty', () => {
      sm.cacheTime = 1
      sm.setCache('')
      expect(sm.isCacheValid()).toBe(false)
    })
  })

  describe('normalizeURL', () => {
    it('turns strings into full urls', () => {
      expect(Sitemap.normalizeURL('http://example.com')).toHaveProperty('url', 'http://example.com/')
    })

    it('prepends paths with the provided hostname', () => {
      expect(Sitemap.normalizeURL('/', 'http://example.com')).toHaveProperty('url', 'http://example.com/')
    })

    it('turns img prop provided as string into array of object', () => {
      const url = {
        url: 'http://example.com',
        img: 'http://example.com/img'
      }
      expect(Sitemap.normalizeURL(url).img[0]).toHaveProperty('url', 'http://example.com/img')
    })

    it('turns img prop provided as object into array of object', () => {
      const url = {
        url: 'http://example.com',
        img: {url: 'http://example.com/img', title: 'some thing'}
      }
      expect(Sitemap.normalizeURL(url).img[0]).toHaveProperty('url', 'http://example.com/img')
      expect(Sitemap.normalizeURL(url).img[0]).toHaveProperty('title', 'some thing')
    })

    it('turns img prop provided as array of strings into array of object', () => {
      const url = {
        url: 'http://example.com',
        img: ['http://example.com/img', '/img2']
      }
      expect(Sitemap.normalizeURL(url, 'http://example.com/').img[0]).toHaveProperty('url', 'http://example.com/img')
      expect(Sitemap.normalizeURL(url, 'http://example.com/').img[1]).toHaveProperty('url', 'http://example.com/img2')
    })

    it('handles a valid img prop without transformation', () => {
      const url = {
        url: "http://example.com",
        img: [
          {
            url: "http://test.com/img2.jpg",
            caption: "Another image",
            title: "The Title of Image Two",
            geoLocation: "London, United Kingdom",
            license: "https://creativecommons.org/licenses/by/4.0/"
          }
        ]
      };
      const normal = Sitemap.normalizeURL(url, 'http://example.com/').img[0]
      expect(normal).toHaveProperty('url', 'http://test.com/img2.jpg')
      expect(normal).toHaveProperty('caption', "Another image")
      expect(normal).toHaveProperty('title', "The Title of Image Two")
      expect(normal).toHaveProperty('geoLocation', "London, United Kingdom")
      expect(normal).toHaveProperty('license', "https://creativecommons.org/licenses/by/4.0/")
    })

    it('ensures img is always an array', () => {
      const url = {
        url: 'http://example.com'
      }
      expect(Array.isArray(Sitemap.normalizeURL(url).img)).toBeTruthy()
    })

    it('ensures links is always an array', () => {
      expect(Array.isArray(Sitemap.normalizeURL('http://example.com').links)).toBeTruthy()
    })

    it('prepends provided hostname to links', () => {
      const url = {
        url: 'http://example.com',
        links: [ {url: '/lang', lang: 'en-us'} ]
      }
      expect(Sitemap.normalizeURL(url, 'http://example.com').links[0]).toHaveProperty('url', 'http://example.com/lang')
    })

    describe('video', () => {
      it('is ensured to be an array', () => {
        expect(Array.isArray(Sitemap.normalizeURL('http://example.com').video)).toBeTruthy()
        const url = {
          url: 'http://example.com',
          video: {thumbnail_loc: 'foo', title: '', description: ''}
        }
        expect(Sitemap.normalizeURL(url).video[0]).toHaveProperty('thumbnail_loc', 'foo')
      })

      it('turns boolean-like props into yes/no', () => {
        const url = {
          url: 'http://example.com',
          video: [
            {
              thumbnail_loc: 'foo',
              title: '',
              description: '',
              family_friendly: false,
              live: false,
              requires_subscription: false
            },
            {
              thumbnail_loc: 'foo',
              title: '',
              description: '',
              family_friendly: true,
              live: true,
              requires_subscription: true
            },
            {
              thumbnail_loc: 'foo',
              title: '',
              description: '',
              family_friendly: EnumYesNo.yes,
              live: EnumYesNo.yes,
              requires_subscription: EnumYesNo.yes
            },
            {
              thumbnail_loc: 'foo',
              title: '',
              description: '',
              family_friendly: EnumYesNo.no,
              live: EnumYesNo.no,
              requires_subscription: EnumYesNo.no
            }
          ]
        }
        const smv = Sitemap.normalizeURL(url).video
        expect(smv[0]).toHaveProperty('family_friendly', 'no')
        expect(smv[0]).toHaveProperty('live', 'no')
        expect(smv[0]).toHaveProperty('requires_subscription', 'no')
        expect(smv[1]).toHaveProperty('family_friendly', 'yes')
        expect(smv[1]).toHaveProperty('live', 'yes')
        expect(smv[1]).toHaveProperty('requires_subscription', 'yes')
        expect(smv[2]).toHaveProperty('family_friendly', 'yes')
        expect(smv[2]).toHaveProperty('live', 'yes')
        expect(smv[2]).toHaveProperty('requires_subscription', 'yes')
        expect(smv[3]).toHaveProperty('family_friendly', 'no')
        expect(smv[3]).toHaveProperty('live', 'no')
        expect(smv[3]).toHaveProperty('requires_subscription', 'no')
      })

      it('ensures tag is always an array', () => {
        let url: ISitemapItemOptionsLoose = {
          url: 'http://example.com',
          video: {thumbnail_loc: 'foo', title: '', description: ''}
        }
        expect(Sitemap.normalizeURL(url).video[0]).toHaveProperty('tag', [])
        url = {
          url: 'http://example.com',
          video: [
            {
              thumbnail_loc: 'foo',
              title: '',
              description: '',
              tag: 'fizz'
            },
            {
              thumbnail_loc: 'foo',
              title: '',
              description: '',
              tag: ['bazz']
            }
          ]
        }
        expect(Sitemap.normalizeURL(url).video[0]).toHaveProperty('tag', ['fizz'])
        expect(Sitemap.normalizeURL(url).video[1]).toHaveProperty('tag', ['bazz'])
      })

      it('ensures rating is always a number', () => {
        const url = {
          url: 'http://example.com',
          video: [
            {
              thumbnail_loc: 'foo',
              title: '',
              description: '',
              rating: '5'
            },
            {
              thumbnail_loc: 'foo',
              title: '',
              description: '',
              rating: 4
            }
          ]
        }
        expect(Sitemap.normalizeURL(url).video[0]).toHaveProperty('rating', 5)
        expect(Sitemap.normalizeURL(url).video[1]).toHaveProperty('rating', 4)
      })
    })

    describe('lastmod', () => {
      it('treats legacy ISO option like lastmod', () => {
        expect(Sitemap.normalizeURL({'url': 'http://example.com', lastmodISO: '2019-01-01'})).toHaveProperty('lastmod', '2019-01-01T00:00:00.000Z')
      })

      it('turns all last mod strings into ISO timestamps', () => {
        expect(Sitemap.normalizeURL({'url': 'http://example.com', lastmod: '2019-01-01'})).toHaveProperty('lastmod', '2019-01-01T00:00:00.000Z')
        expect(Sitemap.normalizeURL({'url': 'http://example.com', lastmod: '2019-01-01T00:00:00.000Z'})).toHaveProperty('lastmod', '2019-01-01T00:00:00.000Z')
      })

      it('supports reading off file mtime', () => {
        const { cacheFile, stat } = testUtil.createCache()

        const dt = new Date(stat.mtime)
        const lastmod = dt.toISOString()

        const smcfg = Sitemap.normalizeURL({
          url: 'http://example.com',
          'lastmodfile': cacheFile,
          'changefreq': EnumChangefreq.ALWAYS,
          'priority': 0.9
        })

        testUtil.unlinkCache()

        expect(smcfg).toHaveProperty('lastmod', lastmod)
      })
    })
  })

  describe('add', () => {
    it('accepts url strings', () => {
      const url = '/some_page'
      const hostname = 'http://ya.ru'
      const ssp = new Sitemap({hostname})
      ssp.add(url)

      expect(ssp.contains('http://ya.ru/some_page')).toBeTruthy()
    })

    it('prevents duplicate entries', () => {
      const url = '/some_page'
      const hostname = 'http://ya.ru'
      const ssp = new Sitemap({hostname})
      ssp.add(url)

      expect(ssp.add(url)).toBe(1)
    })

    it('returns the number of urls in the map', () => {
      const url = '/some_page'
      const hostname = 'http://ya.ru'
      const ssp = new Sitemap({hostname})
      ssp.add(url)
      ssp.add(url + '2')
      ssp.add(url + '3')

      expect(ssp.add(url)).toBe(3)
    })
  })

  describe('del', () => {
    it('removes entries from the sitemap', () => {
      expect(sm.del('https://example.com')).toBe(true)
      expect(sm.contains('https://example.com')).toBe(false)
    })

    it('normalizes passed urls', () => {
      sm.hostname = 'http://example.com/'
      sm.add('/foo')
      sm.add({url: '/bar', priority: 0.1})
      expect(sm.contains('https://example.com')).toBe(true)
      expect(sm.contains('http://example.com/foo')).toBe(true)
      expect(sm.contains('http://example.com/bar')).toBe(true)
      expect(sm.del('https://example.com/')).toBe(true)
      expect(sm.del('http://example.com/foo')).toBe(true)
      expect(sm.del('http://example.com/bar')).toBe(true)
      expect(sm.contains('https://example.com')).toBe(false)
      expect(sm.contains('http://example.com/foo')).toBe(false)
      expect(sm.contains('http://example.com/bar')).toBe(false)
    })
  })

  describe('toXML', () => {
    it('is an alias for toString', () => {
      spyOn(sm, 'toString')
      sm.toXML()
      expect(sm.toString).toHaveBeenCalled()
    })
  })

  it('test for #27', () => {
    const staticUrls = ['/', '/terms', '/login']
    const sitemap = createSitemap({ urls: staticUrls, hostname: 'http://example.com' })
    sitemap.add({ url: '/details/' + 'url1' })

    const sitemap2 = createSitemap({ urls: staticUrls, hostname: 'http://example.com'})

    expect(sitemap.contains({url: 'http://example.com/'})).toBeTruthy()
    expect(sitemap.contains({url: 'http://example.com/terms'})).toBeTruthy()
    expect(sitemap.contains({url: 'http://example.com/login'})).toBeTruthy()
    expect(sitemap.contains({url: 'http://example.com/details/url1'})).toBeTruthy()
    expect(sitemap2.contains({url: 'http://example.com/'})).toBeTruthy()
    expect(sitemap2.contains({url: 'http://example.com/terms'})).toBeTruthy()
    expect(sitemap2.contains({url: 'http://example.com/login'})).toBeTruthy()
    expect(sitemap2.contains({url: 'http://example.com/details/url1'})).toBeFalsy()
  })

})
