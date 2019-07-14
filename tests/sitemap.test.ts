/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
/* eslint-env jest, jasmine */
import 'babel-polyfill'

import { Sitemap, createSitemap, EnumChangefreq, EnumYesNo, EnumAllowDeny } from '../index'
import { gzipSync, gunzipSync } from 'zlib'

const urlset = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
             'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" ' +
             'xmlns:xhtml="http://www.w3.org/1999/xhtml" ' +
             'xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" ' +
             'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" ' +
             'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">'

const dynamicUrlSet = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
const xmlDef = '<?xml version="1.0" encoding="UTF-8"?>'
const xmlPriority = '<priority>0.9</priority>'
const xmlLoc = '<loc>http://ya.ru/</loc>'

describe('createSitemap', () => {
  it('returns an instance of a Sitemap', () => {
    expect(createSitemap()).toBeInstanceOf(Sitemap)
  })
})

describe('Sitemap', () => {
  it('can be instantiated without options', () => {
    expect(() => (new Sitemap())).not.toThrow()
  })

  it('simple sitemap', () => {
    var url = 'http://ya.ru'
    var ssp = new Sitemap()
    ssp.add(url)

    expect(ssp.toString()).toBe(
      xmlDef +
                urlset +
                '<url>' +
                    xmlLoc +
                '</url>' +
              '</urlset>')
  })

  describe('add', () => {
    it('accepts url strings', () => {
      var url = '/some_page'
      let hostname = 'http://ya.ru'
      var ssp = new Sitemap({hostname})
      ssp.add(url)

      expect(ssp.toString()).toBe(
        xmlDef +
                  urlset +
                  '<url>' +
                      `<loc>${hostname}${url}</loc>` +
                  '</url>' +
                '</urlset>')
    })
    it('accepts config url objects', () => {
      var url = 'http://ya.ru'
      var ssp = new Sitemap()
      ssp.add({ url, changefreq: EnumChangefreq.DAILY })

      expect(ssp.toString()).toBe(
        xmlDef +
                  urlset +
                  '<url>' +
                      xmlLoc +
                    '<changefreq>daily</changefreq>' +
                  '</url>' +
                '</urlset>')
    })
  })

  describe('del', () => {
    it('sitemap: del by string', () => {
      const smap = new Sitemap({
        hostname: 'http://test.com',
        urls: [
          { url: '/page-1/', changefreq: EnumChangefreq.WEEKLY, priority: 0.3 },
          { url: 'https://ya.ru/page-2/', changefreq: EnumChangefreq.WEEKLY, priority: 0.3 }
        ]
      })
      const xml = xmlDef +
                urlset +
                  '<url>' +
                      '<loc>https://ya.ru/page-2/</loc>' +
                      '<changefreq>weekly</changefreq>' +
                      '<priority>0.3</priority>' +
                  '</url>' +
                '</urlset>'
      smap.del('/page-1/')

      expect(smap.toString()).toBe(xml)
    })

    it('sitemap: del by object', () => {
      const smap = new Sitemap({
        hostname: 'http://test.com',
        urls: [
          { url: 'http://ya.ru/page-1/', changefreq: EnumChangefreq.WEEKLY, priority: 0.3 },
          { url: 'https://ya.ru/page-2/', changefreq: EnumChangefreq.WEEKLY, priority: 0.3 }
        ]
      })
      const xml = xmlDef +
                urlset +
                  '<url>' +
                      '<loc>https://ya.ru/page-2/</loc>' +
                      '<changefreq>weekly</changefreq>' +
                      '<priority>0.3</priority>' +
                  '</url>' +
                '</urlset>'
      smap.del({ url: 'http://ya.ru/page-1/' })

      expect(smap.toString()).toBe(xml)
    })
  })

  it('encodes URLs', () => {
    var url = 'http://ya.ru/?foo=bar baz'
    var ssp = new Sitemap()
    ssp.add(url)

    expect(ssp.toString()).toBe(
      xmlDef +
                urlset +
                '<url>' +
                    '<loc>http://ya.ru/?foo=bar%20baz</loc>' +
                '</url>' +
              '</urlset>')
  })

  it('accepts custom xmlNs', () => {
    var url = 'http://ya.ru'
    var ssp = new Sitemap({
      xmlNs: 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
    })
    ssp.add(url)

    expect(ssp.toString()).toBe(xmlDef +
      dynamicUrlSet +
      '<url>' +
        xmlLoc +
      '</url>' +
    '</urlset>')
  })

  describe('toXML', () => {
    it('spits out a string', () => {
      var url = 'http://ya.ru'
      var ssp = new Sitemap()
      ssp.add(url)

      expect(ssp.toXML()).toBe(
        xmlDef +
                urlset +
                  '<url>' +
                      xmlLoc +
                  '</url>' +
                '</urlset>')
    })
  })

  describe('toGzip', () => {
    it('spits out a gzipped string sync', () => {
      var ssp = new Sitemap()
      ssp.add('http://ya.ru')

      expect(ssp.toGzip()).toEqual(gzipSync(
        xmlDef +
                urlset +
                  '<url>' +
                      xmlLoc +
                  '</url>' +
                '</urlset>'
      ))
    })

    it('spits out a gzipped string async', () => {
      var ssp = new Sitemap()
      ssp.add('http://ya.ru')

      ssp.toGzip(function (error, result) {
        expect(error).toBe(null)
        expect(gunzipSync(result).toString()).toBe(
          xmlDef +
              urlset +
              '<url>' +
              xmlLoc +
              '</url>' +
              '</urlset>'
        )
      })
    })
  })


  it('video attributes', () => {
    var smap = new Sitemap({
      urls: [
        {
          'url': 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
          'video': [{
            'title': "2008:E2 - Burnout Paradise: Millionaire's Club",
            'description': "Jack gives us a walkthrough on getting the Millionaire's Club Achievement in Burnout Paradise.",
            'player_loc': 'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
            'player_loc:autoplay': 'ap=1',
            'restriction': 'IE GB US CA',
            'restriction:relationship': 'allow',
            'gallery_loc': 'https://roosterteeth.com/series/awhu',
            'gallery_loc:title': 'awhu series page',
            'price': '1.99',
            'price:currency': 'EUR',
            'price:type': 'rent',
            'price:resolution': 'HD',
            'platform': 'WEB',
            'platform:relationship': EnumAllowDeny.ALLOW,
            'thumbnail_loc': 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
            'duration': 174,
            'publication_date': '2008-07-29T14:58:04.000Z',
            'requires_subscription': EnumYesNo.yes
          }]
        }
      ]
    })

    var result = smap.toString()
    var expectedResult = xmlDef +
      urlset +
        '<url>' +
            '<loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc>' +
            '<video:video>' +
                '<video:thumbnail_loc>https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg</video:thumbnail_loc>' +
                '<video:title><![CDATA[2008:E2 - Burnout Paradise: Millionaire\'s Club]]></video:title>' +
                '<video:description><![CDATA[Jack gives us a walkthrough on getting the Millionaire\'s Club Achievement in Burnout Paradise.]]></video:description>' +
                '<video:player_loc autoplay="ap=1">https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</video:player_loc>' +
                '<video:duration>174</video:duration>' +
                '<video:publication_date>2008-07-29T14:58:04.000Z</video:publication_date>' +
                '<video:restriction relationship="allow">IE GB US CA</video:restriction>' +
                '<video:gallery_loc title="awhu series page">https://roosterteeth.com/series/awhu</video:gallery_loc>' +
                '<video:price resolution="HD" currency="EUR" type="rent">1.99</video:price>' +
                '<video:requires_subscription>yes</video:requires_subscription>' +
                '<video:platform relationship="allow">WEB</video:platform>' +
            '</video:video>' +
        '</url>' +
      '</urlset>'
    expect(result).toBe(expectedResult)
  })

  it('sitemap: hostname', () => {
    var smap = new Sitemap({
      hostname: 'http://test.com',
      urls: [
        { url: '/', changefreq: EnumChangefreq.ALWAYS, priority: 1 },
        { url: '/page-1/', changefreq: EnumChangefreq.WEEKLY, priority: 0.3 },
        { url: '/page-2/', changefreq: EnumChangefreq.DAILY, priority: 0.7 },
        { url: '/page-3/', changefreq: EnumChangefreq.MONTHLY, priority: 0.2, img: '/image.jpg' },
        { url: 'http://www.test.com/page-4/', changefreq: EnumChangefreq.NEVER, priority: 0.8 }
      ]
    })

    expect(smap.toString()).toBe(
      xmlDef +
              urlset +
                '<url>' +
                    '<loc>http://test.com/</loc>' +
                    '<changefreq>always</changefreq>' +
                    '<priority>1.0</priority>' +
                '</url>' +
                '<url>' +
                    '<loc>http://test.com/page-1/</loc>' +
                    '<changefreq>weekly</changefreq>' +
                    '<priority>0.3</priority>' +
                '</url>' +
                '<url>' +
                    '<loc>http://test.com/page-2/</loc>' +
                    '<changefreq>daily</changefreq>' +
                    '<priority>0.7</priority>' +
                '</url>' +
                '<url>' +
                    '<loc>http://test.com/page-3/</loc>' +
                    '<changefreq>monthly</changefreq>' +
                    '<priority>0.2</priority>' +
                    '<image:image>' +
                        '<image:loc>http://test.com/image.jpg</image:loc>' +
                    '</image:image>' +
                '</url>' +
                '<url>' +
                    '<loc>http://www.test.com/page-4/</loc>' +
                    '<changefreq>never</changefreq>' +
                    '<priority>0.8</priority>' +
                '</url>' +
              '</urlset>')
  })

  it('custom xslUrl', () => {
    var smap = new Sitemap({
      urls: [
        { url: 'http://test.com/', changefreq: EnumChangefreq.ALWAYS, priority: 1 }
      ],
      xslUrl: 'sitemap.xsl'
    })

    expect(smap.toString()).toBe(
      xmlDef +
      '<?xml-stylesheet type="text/xsl" href="sitemap.xsl"?>' +
              urlset +
                '<url>' +
                    '<loc>http://test.com/</loc>' +
                    '<changefreq>always</changefreq>' +
                    '<priority>1.0</priority>' +
                '</url>' +
              '</urlset>')
  })

  it('sitemap: invalid changefreq error', () => {
    expect(
      function () {
        new Sitemap({
          hostname: 'http://test.com',
          // @ts-ignore
          urls: [{ url: '/', changefreq: 'allllways' }]
        }).toString()
      }
    ).toThrowError(/changefreq is invalid/)
  })
  it('sitemap: invalid priority error', () => {
    expect(
      function () {
        new Sitemap({
          hostname: 'http://test.com',
          urls: [{ url: '/', priority: 1.1 }]
        }).toString()
      }
    ).toThrowError(/priority is invalid/)
  })
  it('sitemap: test cache', () => {
    const smap = new Sitemap({
      hostname: 'http://test.com',
      cacheTime: 500, // 0.5 sec
      urls: [
        { url: '/page-1/', changefreq: EnumChangefreq.WEEKLY, priority: 0.3 }
      ]
    })
    const xml = xmlDef +
              urlset +
                '<url>' +
                    '<loc>http://test.com/page-1/</loc>' +
                    '<changefreq>weekly</changefreq>' +
                    '<priority>0.3</priority>' +
                '</url>' +
              '</urlset>'

    // fill cache
    expect(smap.toString()).toBe(xml)
    // change urls
    smap.add('http://test.com/new-page/')
    // check result from cache (not changed)
    expect(smap.toString()).toBe(xml)

    // check new cache
    // after cacheTime expired
    setTimeout(function () {
      // check new sitemap
      expect(smap.toString()).toBe(
        xmlDef +
                urlset +
                  '<url>' +
                      '<loc>http://test.com/page-1/</loc>' +
                      '<changefreq>weekly</changefreq>' +
                      '<priority>0.3</priority>' +
                  '</url>' +
                  '<url>' +
                      '<loc>http://test.com/new-page/</loc>' +
                  '</url>' +
                '</urlset>')
    }, 1000)
  })
  it('sitemap: test cache off', () => {
    const smap = new Sitemap({
      hostname: 'http://test.com',
      // cacheTime: 0,  // cache disabled
      urls: [
        { url: '/page-1/', changefreq: EnumChangefreq.WEEKLY, priority: 0.3 }
      ]
    })
    const xml = xmlDef +
              urlset +
                '<url>' +
                    '<loc>http://test.com/page-1/</loc>' +
                    '<changefreq>weekly</changefreq>' +
                    '<priority>0.3</priority>' +
                '</url>' +
              '</urlset>'

    expect(smap.toString()).toBe(xml)
    // change urls
    smap.add('http://test.com/new-page/')
    // check result without cache (changed one)
    expect(smap.toString()).toBe(
      xmlDef +
              urlset +
                '<url>' +
                    '<loc>http://test.com/page-1/</loc>' +
                    '<changefreq>weekly</changefreq>' +
                    '<priority>0.3</priority>' +
                '</url>' +
                '<url>' +
                    '<loc>http://test.com/new-page/</loc>' +
                '</url>' +
              '</urlset>')
  })
  it('sitemap: handle urls with "http" in the path', () => {
    var smap = new Sitemap({
      hostname: 'http://test.com',
      urls: [
        { url: '/page-that-mentions-http:-in-the-url/', changefreq: EnumChangefreq.WEEKLY, priority: 0.3 }
      ]
    })
    const xml = xmlDef +
              urlset +
                '<url>' +
                    '<loc>http://test.com/page-that-mentions-http:-in-the-url/</loc>' +
                    '<changefreq>weekly</changefreq>' +
                    '<priority>0.3</priority>' +
                '</url>' +
              '</urlset>'

    expect(smap.toString()).toBe(xml)
  })
  it('sitemap: handle urls with "&" in the path', () => {
    var smap = new Sitemap({
      hostname: 'http://test.com',
      urls: [
        { url: '/page-that-mentions-&-in-the-url/', changefreq: EnumChangefreq.WEEKLY, priority: 0.3 }
      ]
    })
    const xml = xmlDef +
              urlset +
                '<url>' +
                    '<loc>http://test.com/page-that-mentions-&amp;-in-the-url/</loc>' +
                    '<changefreq>weekly</changefreq>' +
                    '<priority>0.3</priority>' +
                '</url>' +
              '</urlset>'

    expect(smap.toString()).toBe(xml)
  })
  it('sitemap: keep urls that start with http:// or https://', () => {
    const smap = new Sitemap({
      hostname: 'http://test.com',
      urls: [
        { url: 'http://ya.ru/page-1/', changefreq: EnumChangefreq.WEEKLY, priority: 0.3 },
        { url: 'https://ya.ru/page-2/', changefreq: EnumChangefreq.WEEKLY, priority: 0.3 }
      ]
    })
    const xml = xmlDef +
                urlset +
                '<url>' +
                    '<loc>http://ya.ru/page-1/</loc>' +
                    '<changefreq>weekly</changefreq>' +
                    '<priority>0.3</priority>' +
                '</url>' +
                '<url>' +
                    '<loc>https://ya.ru/page-2/</loc>' +
                    '<changefreq>weekly</changefreq>' +
                    '<priority>0.3</priority>' +
                '</url>' +
              '</urlset>'

    expect(smap.toString()).toBe(xml)
  })
  it('test for #27', () => {
    var staticUrls = ['/', '/terms', '/login']
    var sitemap = new Sitemap({ urls: staticUrls, hostname: 'http://example.com' })
    sitemap.add({ url: '/details/' + 'url1' })

    var sitemap2 = new Sitemap({ urls: staticUrls, hostname: 'http://example.com'})

    expect(sitemap.contains({url: 'http://example.com/'})).toBeTruthy()
    expect(sitemap.contains({url: 'http://example.com/terms'})).toBeTruthy()
    expect(sitemap.contains({url: 'http://example.com/login'})).toBeTruthy()
    expect(sitemap.contains({url: 'http://example.com/details/url1'})).toBeTruthy()
    expect(sitemap2.contains({url: 'http://example.com/'})).toBeTruthy()
    expect(sitemap2.contains({url: 'http://example.com/terms'})).toBeTruthy()
    expect(sitemap2.contains({url: 'http://example.com/login'})).toBeTruthy()
    expect(sitemap2.contains({url: 'http://example.com/details/url1'})).toBeFalsy()
  })
  it('sitemap: langs', () => {
    var smap = new Sitemap({
      urls: [
        { url: 'http://test.com/page-1/',
          changefreq: EnumChangefreq.WEEKLY,
          priority: 0.3,
          links: [
            { lang: 'en', url: 'http://test.com/page-1/' },
            { lang: 'ja', url: 'http://test.com/page-1/ja/' }
          ] }
      ]
    })
    expect(smap.toString()).toBe(
      xmlDef +
              urlset +
                '<url>' +
                    '<loc>http://test.com/page-1/</loc>' +
                    '<changefreq>weekly</changefreq>' +
                    '<priority>0.3</priority>' +
                    '<xhtml:link rel="alternate" hreflang="en" href="http://test.com/page-1/"/>' +
                    '<xhtml:link rel="alternate" hreflang="ja" href="http://test.com/page-1/ja/"/>' +
                '</url>' +
              '</urlset>')
  })
  it('sitemap: normalize urls, see #39', async () => {
    const [xml1, xml2] = ['http://ya.ru', 'http://ya.ru/'].map(function (hostname) {
      var ssp = new Sitemap({hostname})
      ssp.add('page1')
      ssp.add('/page2')

      return ssp.toXML()
    })
    expect(xml1).toBe(xml2)
    expect(xml1).toBe(
      xmlDef +
      urlset +
        '<url>' +
            '<loc>http://ya.ru/page1</loc>' +
        '</url>' +
        '<url>' +
            '<loc>http://ya.ru/page2</loc>' +
        '</url>' +
      '</urlset>')
  })
  it('sitemap: langs with hostname', () => {
    var smap = new Sitemap({
      hostname: 'http://test.com',
      urls: [
        { url: '/page-1/',
          changefreq: EnumChangefreq.WEEKLY,
          priority: 0.3,
          links: [
            { lang: 'en', url: '/page-1/' },
            { lang: 'ja', url: '/page-1/ja/' }
          ] }
      ]
    })
    expect(smap.toString()).toBe(
      xmlDef +
              urlset +
                '<url>' +
                    '<loc>http://test.com/page-1/</loc>' +
                    '<changefreq>weekly</changefreq>' +
                    '<priority>0.3</priority>' +
                    '<xhtml:link rel="alternate" hreflang="en" href="http://test.com/page-1/"/>' +
                    '<xhtml:link rel="alternate" hreflang="ja" href="http://test.com/page-1/ja/"/>' +
                '</url>' +
              '</urlset>')
  })
  it('sitemap: android app linking', () => {
    var smap = new Sitemap({
      urls: [
        { url: 'http://test.com/page-1/',
          changefreq: EnumChangefreq.WEEKLY,
          priority: 0.3,
          androidLink: 'android-app://com.company.test/page-1/' }
      ]
    })
    expect(smap.toString()).toBe(
      xmlDef +
              urlset +
                '<url>' +
                  '<loc>http://test.com/page-1/</loc>' +
                  '<changefreq>weekly</changefreq>' +
                  '<priority>0.3</priority>' +
                  '<xhtml:link rel="alternate" href="android-app://com.company.test/page-1/"/>' +
                '</url>' +
              '</urlset>')
  })
  it('sitemap: AMP', () => {
    var smap = new Sitemap({
      urls: [
        { url: 'http://test.com/page-1/',
          changefreq: EnumChangefreq.WEEKLY,
          priority: 0.3,
          ampLink: 'http://ampproject.org/article.amp.html' }
      ]
    })
    expect(smap.toString()).toBe(
      xmlDef + urlset +
        '<url>' +
          '<loc>http://test.com/page-1/</loc>' +
          '<changefreq>weekly</changefreq>' +
          '<priority>0.3</priority>' +
          '<xhtml:link rel="amphtml" href="http://ampproject.org/article.amp.html"/>' +
        '</url>' +
      '</urlset>')
  })
  it('sitemap: expires', () => {
    var smap = new Sitemap({
      urls: [
        { url: 'http://test.com/page-1/',
          changefreq: EnumChangefreq.WEEKLY,
          priority: 0.3,
          expires: new Date('2016-09-13').toString() }
      ]
    })
    expect(smap.toString()).toBe(
      xmlDef + urlset +
        '<url>' +
          '<loc>http://test.com/page-1/</loc>' +
          '<changefreq>weekly</changefreq>' +
          '<priority>0.3</priority>' +
          '<expires>2016-09-13T00:00:00.000Z</expires>' +
        '</url>' +
      '</urlset>')
  })
  it('sitemap: image with caption', () => {
    var smap = new Sitemap({
      hostname: 'http://test.com',
      urls: [
        { url: '/a', img: { url: '/image.jpg?param&otherparam', caption: 'Test Caption' } }
      ]
    })

    expect(smap.toString()).toBe(
      xmlDef +
      urlset +
        '<url>' +
            '<loc>http://test.com/a</loc>' +
            '<image:image>' +
                '<image:loc>http://test.com/image.jpg?param&amp;otherparam</image:loc>' +
                '<image:caption><![CDATA[Test Caption]]></image:caption>' +
            '</image:image>' +
        '</url>' +
      '</urlset>')
  })
  it('sitemap: image with caption, title, geo_location, license', () => {
    var smap = new Sitemap({
      urls: [
        { url: 'http://test.com',
          img: {
            url: 'http://test.com/image.jpg',
            caption: 'Test Caption',
            title: 'Test title',
            geoLocation: 'Test Geo Location',
            license: 'http://test.com/license.txt'
          }
        }
      ]
    })

    expect(smap.toString()).toBe(
      xmlDef +
      urlset +
        '<url>' +
            '<loc>http://test.com/</loc>' +
            '<image:image>' +
                '<image:loc>http://test.com/image.jpg</image:loc>' +
                '<image:caption><![CDATA[Test Caption]]></image:caption>' +
                '<image:geo_location>Test Geo Location</image:geo_location>' +
                '<image:title><![CDATA[Test title]]></image:title>' +
                '<image:license>http://test.com/license.txt</image:license>' +
            '</image:image>' +
        '</url>' +
      '</urlset>')
  })
  it('sitemap: images with captions', () => {
    var smap = new Sitemap({
      urls: [
        { url: 'http://test.com', img: { url: 'http://test.com/image.jpg', caption: 'Test Caption' } },
        { url: 'http://test.com/page2/', img: { url: 'http://test.com/image2.jpg', caption: 'Test Caption 2' } }
      ]
    })

    expect(smap.toString()).toBe(
      xmlDef +
      urlset +
        '<url>' +
            '<loc>http://test.com/</loc>' +
            '<image:image>' +
                '<image:loc>http://test.com/image.jpg</image:loc>' +
                '<image:caption><![CDATA[Test Caption]]></image:caption>' +
            '</image:image>' +
        '</url>' +
        '<url>' +
            '<loc>http://test.com/page2/</loc>' +
            '<image:image>' +
                '<image:loc>http://test.com/image2.jpg</image:loc>' +
                '<image:caption><![CDATA[Test Caption 2]]></image:caption>' +
            '</image:image>' +
        '</url>' +
      '</urlset>')
  })
  it('sitemap: images with captions add', () => {
    var smap = new Sitemap({
      hostname: 'http://test.com',
      urls: [
        {
          url: '/index.html',
          img: [
            { url: 'http://test.com/image.jpg', caption: 'Test Caption' },
            { url: 'http://test.com/image2.jpg', caption: 'Test Caption 2' }
          ]
        }
      ]
    })

    smap.add({ url: '/index2.html', img: [{ url: '/image3.jpg', caption: 'Test Caption 3' }] })

    expect(smap.toString()).toBe(
      xmlDef +
      urlset +
        '<url>' +
            '<loc>http://test.com/index.html</loc>' +
            '<image:image>' +
                '<image:loc>http://test.com/image.jpg</image:loc>' +
                '<image:caption><![CDATA[Test Caption]]></image:caption>' +
            '</image:image>' +
            '<image:image>' +
                '<image:loc>http://test.com/image2.jpg</image:loc>' +
                '<image:caption><![CDATA[Test Caption 2]]></image:caption>' +
            '</image:image>' +
        '</url>' +
        '<url>' +
            '<loc>http://test.com/index2.html</loc>' +
            '<image:image>' +
                '<image:loc>http://test.com/image3.jpg</image:loc>' +
                '<image:caption><![CDATA[Test Caption 3]]></image:caption>' +
            '</image:image>' +
        '</url>' +
      '</urlset>')
  })
  it('sitemap: video', () => {
    var smap = new Sitemap({
      urls: [
        {
          'url': 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
          'video': [{
            'title': "2008:E2 - Burnout Paradise: Millionaire's Club",
            'description': "Jack gives us a walkthrough on getting the Millionaire's Club Achievement in Burnout Paradise.",
            'player_loc': 'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club?a&b',
            'thumbnail_loc': 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg?a&b',
            'duration': 174,
            'publication_date': '2008-07-29T14:58:04.000Z',
            'requires_subscription': EnumYesNo.no
          }]
        }
      ]
    })

    expect(smap.toString()).toBe(
      xmlDef +
      urlset +
        '<url>' +
            '<loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc>' +
            '<video:video>' +
                '<video:thumbnail_loc>https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg?a&amp;b</video:thumbnail_loc>' +
                '<video:title><![CDATA[2008:E2 - Burnout Paradise: Millionaire\'s Club]]></video:title>' +
                '<video:description><![CDATA[Jack gives us a walkthrough on getting the Millionaire\'s Club Achievement in Burnout Paradise.]]></video:description>' +
                '<video:player_loc>https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club?a&amp;b</video:player_loc>' +
                '<video:duration>174</video:duration>' +
                '<video:publication_date>2008-07-29T14:58:04.000Z</video:publication_date>' +
                '<video:requires_subscription>no</video:requires_subscription>' +
            '</video:video>' +
        '</url>' +
      '</urlset>')
  })
})
