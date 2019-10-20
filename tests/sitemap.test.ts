/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
/* eslint-env jest */
import 'babel-polyfill'
jest.mock('../lib/sitemap-item')

describe.skip('sitemap', () => {
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
