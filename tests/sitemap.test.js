/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
'use strict'

const sm = require('../index')
const {getTimestampFromDate} = require('../lib/utils.js')
const fs = require('fs')
const zlib = require('zlib')

const urlset = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
             'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" ' +
             'xmlns:xhtml="http://www.w3.org/1999/xhtml" ' +
             'xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" ' +
             'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" ' +
             'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">'

const dynamicUrlSet = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
const xmlDef = '<?xml version="1.0" encoding="UTF-8"?>'
const xmlPriority = '<priority>0.9</priority>'
const xmlLoc = '<loc>http://ya.ru</loc>'

var removeFilesArray = function (files) {
  if (files && files.length) {
    files.forEach(function (file) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file)
      }
    })
  }
}

describe('sitemapItem', () => {
  beforeEach(() => {
    jasmine.addMatchers(require('jasmine-diff')(jasmine, {
      colors: true,
      inline: true
    }))
  })

  it('default values && escape', () => {
    const url = 'http://ya.ru/view?widget=3&count>2'
    const smi = new sm.SitemapItem({'url': url})

    expect(smi.toString()).toBe(
      '<url>' +
        '<loc>http://ya.ru/view?widget=3&amp;count&gt;2</loc>' +
      '</url>')
  })
  it('throws an error for url absence', () => {
    /* eslint-disable no-new */
    expect(
      function () { new sm.SitemapItem() }
    ).toThrowError(/URL is required/)
  })
  it('full options', () => {
    const url = 'http://ya.ru'
    const smi = new sm.SitemapItem({
      'url': url,
      'img': 'http://urlTest.com',
      'lastmod': '2011-06-27',
      'changefreq': 'always',
      'priority': 0.9,
      'mobile': true
    })

    expect(smi.toString()).toBe(
      '<url>' +
        xmlLoc +
        '<lastmod>2011-06-27</lastmod>' +
        '<changefreq>always</changefreq>' +
        xmlPriority +
        '<image:image>' +
        '<image:loc>' +
        'http://urlTest.com' +
        '</image:loc>' +
        '</image:image>' +
        '<mobile:mobile/>' +
      '</url>')
  })

  it('mobile with type', () => {
    const url = 'http://ya.ru'
    const smi = new sm.SitemapItem({
      'url': url,
      'mobile': 'pc,mobile'
    })

    expect(smi.toString()).toBe(
      '<url>' +
        xmlLoc +
        '<mobile:mobile type="pc,mobile"/>' +
      '</url>')
  });

  it('lastmodISO', () => {
    const url = 'http://ya.ru'
    const smi = new sm.SitemapItem({
      'url': url,
      'lastmodISO': '2011-06-27T00:00:00.000Z',
      'changefreq': 'always',
      'priority': 0.9
    })

    expect(smi.toString()).toBe(
      '<url>' +
        xmlLoc +
        '<lastmod>2011-06-27T00:00:00.000Z</lastmod>' +
        '<changefreq>always</changefreq>' +
        xmlPriority +
      '</url>')
  })

  it('lastmod from file', () => {
    var tempFile = require('fs').openSync('/tmp/tempFile.tmp', 'w')
    require('fs').closeSync(tempFile)

    var stat = require('fs').statSync('/tmp/tempFile.tmp')

    var dt = new Date(stat.mtime)
    var lastmod = getTimestampFromDate(dt)

    const url = 'http://ya.ru'
    const smi = new sm.SitemapItem({
      'url': url,
      'img': 'http://urlTest.com',
      'lastmodfile': '/tmp/tempFile.tmp',
      'changefreq': 'always',
      'priority': 0.9
    })

    require('fs').unlinkSync('/tmp/tempFile.tmp')

    expect(smi.toString()).toBe(
      '<url>' +
        xmlLoc +
        '<lastmod>' + lastmod + '</lastmod>' +
        '<changefreq>always</changefreq>' +
        xmlPriority +
        '<image:image>' +
        '<image:loc>' +
        'http://urlTest.com' +
        '</image:loc>' +
        '</image:image>' +
      '</url>')
  })

  it('lastmod from file with lastmodrealtime', () => {
    var tempFile = require('fs').openSync('/tmp/tempFile.tmp', 'w')
    require('fs').closeSync(tempFile)

    var stat = require('fs').statSync('/tmp/tempFile.tmp')

    var dt = new Date(stat.mtime)
    var lastmod = getTimestampFromDate(dt, true)

    const url = 'http://ya.ru'
    const smi = new sm.SitemapItem({
      'url': url,
      'img': 'http://urlTest.com',
      'lastmodfile': '/tmp/tempFile.tmp',
      'lastmodrealtime': true,
      'changefreq': 'always',
      'priority': 0.9
    })

    require('fs').unlinkSync('/tmp/tempFile.tmp')

    expect(smi.toString()).toBe(
      '<url>' +
        xmlLoc +
        '<lastmod>' + lastmod + '</lastmod>' +
        '<changefreq>always</changefreq>' +
        xmlPriority +
        '<image:image>' +
        '<image:loc>' +
        'http://urlTest.com' +
        '</image:loc>' +
        '</image:image>' +
      '</url>')
  })

  it('toXML', () => {
    const url = 'http://ya.ru'
    const smi = new sm.SitemapItem({
      'url': url,
      'img': 'http://urlTest.com',
      'lastmod': '2011-06-27',
      'changefreq': 'always',
      'priority': 0.9
    })

    expect(smi.toString()).toBe(
      '<url>' +
        xmlLoc +
        '<lastmod>2011-06-27</lastmod>' +
        '<changefreq>always</changefreq>' +
        xmlPriority +
        '<image:image>' +
          '<image:loc>' +
            'http://urlTest.com' +
          '</image:loc>' +
        '</image:image>' +
      '</url>')
  })

  it('video price type', () => {
    expect(function () {
      var smap = new sm.SitemapItem({
        'url': 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
        'video': [{
          'title': "2008:E2 - Burnout Paradise: Millionaire's Club",
          'description': 'Lorem ipsum',
          'player_loc': 'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
          'thumbnail_loc': 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
          'price': '1.99',
          'price:type': 'subscription'
        }]
      })
      smap.toString()
    }).toThrowError(/is not a valid value for attr: "price:type"/)
  })

  it('video price currency', () => {
    expect(function () {
      var smap = new sm.SitemapItem({
        'url': 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
        'video': [{
          'title': "2008:E2 - Burnout Paradise: Millionaire's Club",
          'description': 'Lorem ipsum',
          'player_loc': 'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
          'thumbnail_loc': 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
          'price': '1.99',
          'price:currency': 'dollar'
        }]
      })
      smap.toString()
    }).toThrowError(/is not a valid value for attr: "price:currency"/)
  })

  it('video price resolution', () => {
    expect(function () {
      var smap = new sm.SitemapItem({
        'url': 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
        'video': [{
          'title': "2008:E2 - Burnout Paradise: Millionaire's Club",
          'description': 'Lorem ipsum',
          'player_loc': 'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
          'thumbnail_loc': 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
          'price': '1.99',
          'price:resolution': '1920x1080'
        }]
      })
      smap.toString()
    }).toThrowError(/is not a valid value for attr: "price:resolution"/)
  })

  it('video platform relationship', () => {
    expect(function () {
      var smap = new sm.SitemapItem({
        'url': 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
        'video': [{
          'title': "2008:E2 - Burnout Paradise: Millionaire's Club",
          'description': 'Lorem ipsum',
          'player_loc': 'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
          'thumbnail_loc': 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
          'platform': 'tv',
          'platform:relationship': 'mother'
        }]
      })
      smap.toString()
    }).toThrowError(/is not a valid value for attr: "platform:relationship"/)
  })

  it('video restriction', () => {
    expect(function () {
      var smap = new sm.SitemapItem({
        'url': 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
        'video': [{
          'title': "2008:E2 - Burnout Paradise: Millionaire's Club",
          'description': 'Lorem ipsum',
          'player_loc': 'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
          'thumbnail_loc': 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
          'restriction': 'IE GB US CA',
          'restriction:relationship': 'father'
        }]
      })
      smap.toString()
    }).toThrowError(/is not a valid value for attr: "restriction:relationship"/)
  })

  it('video duration', () => {
    expect(function () {
      var smap = new sm.SitemapItem({
        'url': 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
        'video': [{
          'title': "2008:E2 - Burnout Paradise: Millionaire's Club",
          'description': "Jack gives us a walkthrough on getting the Millionaire's Club Achievement in Burnout Paradise.",
          'player_loc': 'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
          'thumbnail_loc': 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
          'duration': -1,
          'publication_date': '2008-07-29T14:58:04.000Z',
          'requires_subscription': false
        }]
      })
      smap.toString()
    }).toThrowError(/duration must be an integer/)
  })

  it('video description limit', () => {
    expect(function () {
      var smap = new sm.SitemapItem({
        'url': 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
        'video': [{
          'title': "2008:E2 - Burnout Paradise: Millionaire's Club",
          'description': 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius laoreet. Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas nec odio et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus. Nullam quis ante. Etiam sit amet orci eget eros faucibus tincidunt. Duis leo. Sed fringilla mauris sit amet nibh. Donec sodales sagittis magna. Sed consequat, leo eget bibendum sodales, augue velit cursus nunc, quis gravida magna mi a libero. Fusce vulputate eleifend sapien. Vestibulum purus quam, scelerisque ut, mollis sed, nonummy id, metus. Nullam accumsan lorem in dui. Cras ultricies mi eu turpis hendrerit fringilla. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; In ac dui quis mi consectetuer lacinia. Nam pretium turpis et arcu. Duis arcu tortor, suscipit eget, imperdiet nec, imperdiet iaculis, ipsum. Sed aliquam ultrices mauris. Integer ante arcu, accumsan a, consectetuer eget, posuere ut, mauris. Praesent adipiscing. Phasellus ullamcorper ipsum rutrum nunc. Nunc nonummy metus. Vestibulum volutpat pretium libero. Cras id dui. Aenean ut eros et nisl sagittis vestibulum. Nullam nulla.',
          'player_loc': 'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
          'thumbnail_loc': 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
          'duration': -1,
          'publication_date': '2008-07-29T14:58:04.000Z',
          'requires_subscription': false
        }]
      })
      smap.toString()
    }).toThrowError(/2048 characters/)
  })

  it('accepts a url without escaping it if a cdata flag is passed', () => {
    const mockUri = 'https://a.b/?a&b'
    const smi = new sm.SitemapItem({
      cdata: true,
      url: mockUri
    })

    expect(smi.toString()).toBe(`<url><loc>${mockUri}</loc></url>`)
  })

  describe('toXML', () => {
    it('is equivilant to toString', () => {
      const smi = new sm.SitemapItem({ url: 'https://a.b/?a&b' })
      expect(smi.toString()).toBe(smi.toXML())
    })
  })

  describe('video', () => {
    let testvideo
    let thumbnailLoc
    let title
    let description
    let playerLoc
    let duration
    let publicationDate
    let restriction
    let galleryLoc
    let price
    let requiresSubscription
    let platform
    beforeEach(() => {
      testvideo = {
        url: 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
        video: {
          title: "2008:E2 - Burnout Paradise: Millionaire's Club",
          description: "Jack gives us a walkthrough on getting the Millionaire's Club Achievement in Burnout Paradise.",
          player_loc: 'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
          'player_loc:autoplay': 'ap=1',
          restriction: 'IE GB US CA',
          'restriction:relationship': 'allow',
          gallery_loc: 'https://roosterteeth.com/series/awhu',
          'gallery_loc:title': 'awhu series page',
          price: '1.99',
          'price:currency': 'EUR',
          'price:type': 'rent',
          'price:resolution': 'HD',
          platform: 'WEB',
          'platform:relationship': 'allow',
          thumbnail_loc: 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
          duration: 174,
          publication_date: '2008-07-29T14:58:04.000Z',
          requires_subscription: 'yes'
        }
      }
      thumbnailLoc = '<video:thumbnail_loc>https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg</video:thumbnail_loc>'
      title = '<video:title><![CDATA[2008:E2 - Burnout Paradise: Millionaire\'s Club]]></video:title>'
      description = '<video:description><![CDATA[Jack gives us a walkthrough on getting the Millionaire\'s Club Achievement in Burnout Paradise.]]></video:description>'
      playerLoc = '<video:player_loc autoplay="ap=1">https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</video:player_loc>'
      duration = '<video:duration>174</video:duration>'
      publicationDate = '<video:publication_date>2008-07-29T14:58:04.000Z</video:publication_date>'
      restriction = '<video:restriction relationship="allow">IE GB US CA</video:restriction>'
      galleryLoc = '<video:gallery_loc title="awhu series page">https://roosterteeth.com/series/awhu</video:gallery_loc>'
      price = '<video:price resolution="HD" currency="EUR" type="rent">1.99</video:price>'
      requiresSubscription = '<video:requires_subscription>yes</video:requires_subscription>'
      platform = '<video:platform relationship="allow">WEB</video:platform>'
    })

    it('accepts an object', () => {
      var smap = new sm.SitemapItem(testvideo)

      var result = smap.toString()
      var expectedResult = '<url>' +
        '<loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc>' +
        '<video:video>' +
          thumbnailLoc +
          title +
          description +
          playerLoc +
          duration +
          publicationDate +
          restriction +
          galleryLoc +
          price +
          requiresSubscription +
          platform +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('throws if a required attr is not provided', () => {
      expect(() => {
        let test = Object.assign({}, testvideo)
        delete test.video.title
        var smap = new sm.SitemapItem(test)

        smap.toString()
      }).toThrowError(/must include thumbnail_loc, title and description fields for videos/)

      expect(() => {
        let test = Object.assign({}, testvideo)
        test.video = 'a'
        var smap = new sm.SitemapItem(test)

        smap.toString()
      }).toThrowError(/must include thumbnail_loc, title and description fields for videos/)

      expect(() => {
        let test = Object.assign({}, testvideo)
        delete test.video.thumbnail_loc
        var smap = new sm.SitemapItem(test)

        smap.toString()
      }).toThrowError(/must include thumbnail_loc, title and description fields for videos/)

      expect(() => {
        let test = Object.assign({}, testvideo)
        delete test.video.description
        var smap = new sm.SitemapItem(test)

        smap.toString()
      }).toThrowError(/must include thumbnail_loc, title and description fields for videos/)
    })

    it('supports content_loc', () => {
      testvideo.video.content_loc = 'https://a.b.c'
      delete testvideo.video.player_loc
      var smap = new sm.SitemapItem(testvideo)

      var result = smap.toString()
      var expectedResult = '<url>' +
        '<loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc>' +
        '<video:video>' +
          thumbnailLoc +
          title +
          description +
          `<video:content_loc>${testvideo.video.content_loc}</video:content_loc>` +
          duration +
          publicationDate +
          restriction +
          galleryLoc +
          price +
          requiresSubscription +
          platform +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('supports expiration_date', () => {
      testvideo.video.expiration_date = '2012-07-16T19:20:30+08:00'
      var smap = new sm.SitemapItem(testvideo)

      var result = smap.toString()
      var expectedResult = '<url>' +
        '<loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc>' +
        '<video:video>' +
          thumbnailLoc +
          title +
          description +
          playerLoc +
          duration +
          '<video:expiration_date>2012-07-16T19:20:30+08:00</video:expiration_date>' +
          publicationDate +
          restriction +
          galleryLoc +
          price +
          requiresSubscription +
          platform +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('supports rating', () => {
      testvideo.video.rating = 2.5
      var smap = new sm.SitemapItem(testvideo)

      var result = smap.toString()
      var expectedResult = '<url>' +
        '<loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc>' +
        '<video:video>' +
          thumbnailLoc +
          title +
          description +
          playerLoc +
          duration +
          '<video:rating>2.5</video:rating>' +
          publicationDate +
          restriction +
          galleryLoc +
          price +
          requiresSubscription +
          platform +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('supports view_count', () => {
      testvideo.video.view_count = 1234
      var smap = new sm.SitemapItem(testvideo)

      var result = smap.toString()
      var expectedResult = '<url>' +
        '<loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc>' +
        '<video:video>' +
          thumbnailLoc +
          title +
          description +
          playerLoc +
          duration +
          '<video:view_count>1234</video:view_count>' +
          publicationDate +
          restriction +
          galleryLoc +
          price +
          requiresSubscription +
          platform +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('supports family_friendly', () => {
      testvideo.video.family_friendly = 'yes'
      var smap = new sm.SitemapItem(testvideo)

      var result = smap.toString()
      var expectedResult = '<url>' +
        '<loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc>' +
        '<video:video>' +
          thumbnailLoc +
          title +
          description +
          playerLoc +
          duration +
          publicationDate +
          '<video:family_friendly>yes</video:family_friendly>' +
          restriction +
          galleryLoc +
          price +
          requiresSubscription +
          platform +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('supports tag', () => {
      testvideo.video.tag = 'steak'
      var smap = new sm.SitemapItem(testvideo)

      var result = smap.toString()
      var expectedResult = '<url>' +
        '<loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc>' +
        '<video:video>' +
          thumbnailLoc +
          title +
          description +
          playerLoc +
          duration +
          publicationDate +
          '<video:tag>steak</video:tag>' +
          restriction +
          galleryLoc +
          price +
          requiresSubscription +
          platform +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('supports array of tags', () => {
      testvideo.video.tag = ['steak', 'fries']
      var smap = new sm.SitemapItem(testvideo)

      var result = smap.toString()
      var expectedResult = '<url>' +
        '<loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc>' +
        '<video:video>' +
          thumbnailLoc +
          title +
          description +
          playerLoc +
          duration +
          publicationDate +
          '<video:tag>steak</video:tag><video:tag>fries</video:tag>' +
          restriction +
          galleryLoc +
          price +
          requiresSubscription +
          platform +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('supports category', () => {
      testvideo.video.category = 'Baking'
      var smap = new sm.SitemapItem(testvideo)

      var result = smap.toString()
      var expectedResult = '<url>' +
        '<loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc>' +
        '<video:video>' +
          thumbnailLoc +
          title +
          description +
          playerLoc +
          duration +
          publicationDate +
          '<video:category>Baking</video:category>' +
          restriction +
          galleryLoc +
          price +
          requiresSubscription +
          platform +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('supports uploader', () => {
      testvideo.video.uploader = 'GrillyMcGrillerson'
      var smap = new sm.SitemapItem(testvideo)

      var result = smap.toString()
      var expectedResult = '<url>' +
        '<loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc>' +
        '<video:video>' +
          thumbnailLoc +
          title +
          description +
          playerLoc +
          duration +
          publicationDate +
          restriction +
          galleryLoc +
          price +
          requiresSubscription +
          '<video:uploader>GrillyMcGrillerson</video:uploader>' +
          platform +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('supports live', () => {
      testvideo.video.live = 'yes'
      var smap = new sm.SitemapItem(testvideo)

      var result = smap.toString()
      var expectedResult = '<url>' +
        '<loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc>' +
        '<video:video>' +
          thumbnailLoc +
          title +
          description +
          playerLoc +
          duration +
          publicationDate +
          restriction +
          galleryLoc +
          price +
          requiresSubscription +
          platform +
          '<video:live>yes</video:live>' +
        '</video:video>' +
      '</url>'
      expect(result.slice(1000)).toBe(expectedResult.slice(1000))
    })
  })

  describe('news', () => {
    let news
    beforeEach(() => {
      news = {
        url: 'http://www.example.org/business/article55.html',
        news: {
          publication: {
            name: 'The Example Times',
            language: 'en'
          },
          genres: 'PressRelease, Blog',
          publication_date: '2008-12-23',
          title: 'Companies A, B in Merger Talks',
          keywords: 'business, merger, acquisition, A, B',
          stock_tickers: 'NASDAQ:A, NASDAQ:B'
        }
      }
    })

    it('matches the example from google', () => {
      var smi = new sm.SitemapItem(news)

      expect(smi.toString()).toBe(`<url><loc>${news.url}</loc><news:news><news:publication><news:name><![CDATA[${news.news.publication.name}]]></news:name><news:language>${news.news.publication.language}</news:language></news:publication><news:genres>${news.news.genres}</news:genres><news:publication_date>${news.news.publication_date}</news:publication_date><news:title><![CDATA[${news.news.title}]]></news:title><news:keywords>${news.news.keywords}</news:keywords><news:stock_tickers>${news.news.stock_tickers}</news:stock_tickers></news:news></url>`)
    })

    it('can render with only the required params', () => {
      delete news.news.genres
      delete news.news.keywords
      delete news.news.stock_tickers
      var smi = new sm.SitemapItem(news)

      expect(smi.toString()).toBe(`<url><loc>${news.url}</loc><news:news><news:publication><news:name><![CDATA[${news.news.publication.name}]]></news:name><news:language>${news.news.publication.language}</news:language></news:publication><news:publication_date>${news.news.publication_date}</news:publication_date><news:title><![CDATA[${news.news.title}]]></news:title></news:news></url>`)
    })

    it('will throw if you dont provide required attr publication', () => {
      delete news.news.publication
      var smi = new sm.SitemapItem(news)

      expect(() => {
        smi.toString()
      }).toThrowError(/must include publication, publication name, publication language, title, and publication_date for news/)
    })

    it('will throw if you dont provide required attr publication name', () => {
      delete news.news.publication.name
      var smi = new sm.SitemapItem(news)

      expect(() => {
        smi.toString()
      }).toThrowError(/must include publication, publication name, publication language, title, and publication_date for news/)
    })

    it('will throw if you dont provide required attr publication language', () => {
      delete news.news.publication.language
      var smi = new sm.SitemapItem(news)

      expect(() => {
        smi.toString()
      }).toThrowError(/must include publication, publication name, publication language, title, and publication_date for news/)
    })

    it('will throw if you dont provide required attr title', () => {
      delete news.news.title
      var smi = new sm.SitemapItem(news)

      expect(() => {
        smi.toString()
      }).toThrowError(/must include publication, publication name, publication language, title, and publication_date for news/)
    })

    it('will throw if you dont provide required attr publication_date', () => {
      delete news.news.publication_date
      var smi = new sm.SitemapItem(news)

      expect(() => {
        smi.toString()
      }).toThrowError(/must include publication, publication name, publication language, title, and publication_date for news/)
    })

    it('will throw if you provide an invalid value for access', () => {
      news.news.access = 'a'
      var smi = new sm.SitemapItem(news)

      expect(() => {
        smi.toString()
      }).toThrowError(/News access must be either Registration, Subscription or not be present/)
    })

    it('supports access', () => {
      news.news.access = 'Registration'
      var smi = new sm.SitemapItem(news)

      expect(smi.toString()).toBe(`<url><loc>${news.url}</loc><news:news><news:publication><news:name><![CDATA[${news.news.publication.name}]]></news:name><news:language>${news.news.publication.language}</news:language></news:publication><news:access>${news.news.access}</news:access><news:genres>${news.news.genres}</news:genres><news:publication_date>${news.news.publication_date}</news:publication_date><news:title><![CDATA[${news.news.title}]]></news:title><news:keywords>${news.news.keywords}</news:keywords><news:stock_tickers>${news.news.stock_tickers}</news:stock_tickers></news:news></url>`)
      news.news.access = 'Subscription'
      smi = new sm.SitemapItem(news)
      expect(smi.toString()).toBe(`<url><loc>${news.url}</loc><news:news><news:publication><news:name><![CDATA[${news.news.publication.name}]]></news:name><news:language>${news.news.publication.language}</news:language></news:publication><news:access>${news.news.access}</news:access><news:genres>${news.news.genres}</news:genres><news:publication_date>${news.news.publication_date}</news:publication_date><news:title><![CDATA[${news.news.title}]]></news:title><news:keywords>${news.news.keywords}</news:keywords><news:stock_tickers>${news.news.stock_tickers}</news:stock_tickers></news:news></url>`)
    })
  })
})

describe('sitemap', () => {
  beforeEach(() => {
    jasmine.addMatchers(require('jasmine-diff')(jasmine, {
      colors: true,
      inline: true
    }))
  })

  it('sitemap empty urls', () => {
    const smEmpty = new sm.Sitemap()

    expect(smEmpty.urls).toEqual([])
  })

  it('sitemap.urls is an array', () => {
    const url = 'ya.ru'
    const smOne = new sm.Sitemap(url)

    expect(smOne.urls).toEqual([url])
  })

  it('simple sitemap', () => {
    var url = 'http://ya.ru'
    var ssp = new sm.Sitemap()
    ssp.add(url)

    expect(ssp.toString()).toBe(
      xmlDef +
                urlset +
                '<url>' +
                    xmlLoc +
                '</url>' +
              '</urlset>')
  })

  it('simple sitemap with dynamic xmlNs', () => {
    var url = 'http://ya.ru'
    var ssp = sm.createSitemap({
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

  it('simple sitemap toXML async with two callback arguments', done => {
    var url = 'http://ya.ru'
    var ssp = new sm.Sitemap()
    ssp.add(url)

    ssp.toXML(function (err, xml) {
      expect(err).toBe(null)
      expect(xml).toBe(
        xmlDef +
                urlset +
                  '<url>' +
                      xmlLoc +
                  '</url>' +
                '</urlset>')
      done()
    })
  })

  it('simple sitemap toXML sync', () => {
    var url = 'http://ya.ru'
    var ssp = new sm.Sitemap()
    ssp.add(url)

    expect(ssp.toXML()).toBe(
      xmlDef +
              urlset +
                '<url>' +
                    xmlLoc +
                '</url>' +
              '</urlset>')
  })

  it('simple sitemap toGzip sync', () => {
    var ssp = new sm.Sitemap()
    ssp.add('http://ya.ru')

    expect(ssp.toGzip()).toEqual(zlib.gzipSync(
      xmlDef +
              urlset +
                '<url>' +
                    xmlLoc +
                '</url>' +
              '</urlset>'
    ))
  })

  it('simple sitemap toGzip async', () => {
    var ssp = new sm.Sitemap()
    ssp.add('http://ya.ru')

    ssp.toGzip(function (error, result) {
      expect(error).toBe(null)
      expect(zlib.gunzipSync(result).toString()).toBe(
        xmlDef +
            urlset +
            '<url>' +
            xmlLoc +
            '</url>' +
            '</urlset>'
      )
    })
  })

  it('video attributes', () => {
    var smap = sm.createSitemap({
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
            'platform:relationship': 'allow',
            'thumbnail_loc': 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
            'duration': 174,
            'publication_date': '2008-07-29T14:58:04.000Z',
            'requires_subscription': 'yes'
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

  it('sitemap: hostname, createSitemap', () => {
    var smap = sm.createSitemap({
      hostname: 'http://test.com',
      urls: [
        { url: '/', changefreq: 'always', priority: 1 },
        { url: '/page-1/', changefreq: 'weekly', priority: 0.3 },
        { url: '/page-2/', changefreq: 'daily', priority: 0.7 },
        { url: '/page-3/', changefreq: 'monthly', priority: 0.2, img: '/image.jpg' },
        { url: 'http://www.test.com/page-4/', changefreq: 'never', priority: 0.8 }
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
    var smap = sm.createSitemap({
      urls: [
        { url: 'http://test.com/', changefreq: 'always', priority: 1 }
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
        sm.createSitemap({
          hostname: 'http://test.com',
          urls: [{ url: '/', changefreq: 'allllways' }]
        }).toString()
      }
    ).toThrowError(/changefreq is invalid/)
  })
  it('sitemap: invalid priority error', () => {
    expect(
      function () {
        sm.createSitemap({
          hostname: 'http://test.com',
          urls: [{ url: '/', priority: 1.1 }]
        }).toString()
      }
    ).toThrowError(/priority is invalid/)
  })
  it('sitemap: test cache', () => {
    const smap = sm.createSitemap({
      hostname: 'http://test.com',
      cacheTime: 500, // 0.5 sec
      urls: [
        { url: '/page-1/', changefreq: 'weekly', priority: 0.3 }
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
    const smap = sm.createSitemap({
      hostname: 'http://test.com',
      // cacheTime: 0,  // cache disabled
      urls: [
        { url: '/page-1/', changefreq: 'weekly', priority: 0.3 }
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
    var smap = sm.createSitemap({
      hostname: 'http://test.com',
      urls: [
        { url: '/page-that-mentions-http:-in-the-url/', changefreq: 'weekly', priority: 0.3 }
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
    var smap = sm.createSitemap({
      hostname: 'http://test.com',
      urls: [
        { url: '/page-that-mentions-&-in-the-url/', changefreq: 'weekly', priority: 0.3 }
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
    const smap = sm.createSitemap({
      hostname: 'http://test.com',
      urls: [
        { url: 'http://ya.ru/page-1/', changefreq: 'weekly', priority: 0.3 },
        { url: 'https://ya.ru/page-2/', changefreq: 'weekly', priority: 0.3 }
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
  it('sitemap: del by string', () => {
    const smap = sm.createSitemap({
      hostname: 'http://test.com',
      urls: [
        { url: 'http://ya.ru/page-1/', changefreq: 'weekly', priority: 0.3 },
        { url: 'https://ya.ru/page-2/', changefreq: 'weekly', priority: 0.3 }
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
    smap.del('http://ya.ru/page-1/')

    expect(smap.toString()).toBe(xml)
  })
  it('sitemap: del by object', () => {
    const smap = sm.createSitemap({
      hostname: 'http://test.com',
      urls: [
        { url: 'http://ya.ru/page-1/', changefreq: 'weekly', priority: 0.3 },
        { url: 'https://ya.ru/page-2/', changefreq: 'weekly', priority: 0.3 }
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
    smap.del({url: 'http://ya.ru/page-1/'})

    expect(smap.toString()).toBe(xml)
  })
  it('test for #27', () => {
    var staticUrls = ['/', '/terms', '/login']
    var sitemap = sm.createSitemap({urls: staticUrls})
    sitemap.add({url: '/details/' + 'url1'})

    var sitemap2 = sm.createSitemap({urls: staticUrls})

    expect(sitemap.urls).toEqual(['/', '/terms', '/login', {url: '/details/url1'}])
    expect(sitemap2.urls).toEqual(['/', '/terms', '/login'])
  })
  it('sitemap: langs', () => {
    var smap = sm.createSitemap({
      urls: [
        { url: 'http://test.com/page-1/',
          changefreq: 'weekly',
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
  it('sitemap: normalize urls, see #39', () => {
    ['http://ya.ru', 'http://ya.ru/'].forEach(function (hostname) {
      var ssp = new sm.Sitemap(null, hostname)
      ssp.add('page1')
      ssp.add('/page2')

      ssp.toXML(function (err, xml) {
        if (err) {
          console.error(err)
        }
        expect(xml).toBe(
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
    })
  })
  it('sitemap: langs with hostname', () => {
    var smap = sm.createSitemap({
      hostname: 'http://test.com',
      urls: [
        { url: '/page-1/',
          changefreq: 'weekly',
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
  it('sitemap: error thrown in async-style .toXML()', () => {
    var smap = sm.createSitemap({
      hostname: 'http://test.com',
      urls: [
        { url: '/page-1/', changefreq: 'weekly', priority: 0.3 }
      ]
    })
    var error = new Error('Some error happens')
    smap.toString = () => { throw error }
    smap.toXML(function (err, xml) {
      expect(err).toBe(error)
    })
  })
  it('sitemap: android app linking', () => {
    var smap = sm.createSitemap({
      urls: [
        { url: 'http://test.com/page-1/',
          changefreq: 'weekly',
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
    var smap = sm.createSitemap({
      urls: [
        { url: 'http://test.com/page-1/',
          changefreq: 'weekly',
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
    var smap = sm.createSitemap({
      urls: [
        { url: 'http://test.com/page-1/',
          changefreq: 'weekly',
          priority: 0.3,
          expires: new Date('2016-09-13') }
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
    var smap = sm.createSitemap({
      hostname: 'http://test.com',
      urls: [
        { url: '/a', img: {url: '/image.jpg?param&otherparam', caption: 'Test Caption'} }
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
    var smap = sm.createSitemap({
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
            '<loc>http://test.com</loc>' +
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
    var smap = sm.createSitemap({
      urls: [
        { url: 'http://test.com', img: {url: 'http://test.com/image.jpg', caption: 'Test Caption'} },
        { url: 'http://test.com/page2/', img: {url: 'http://test.com/image2.jpg', caption: 'Test Caption 2'} }
      ]
    })

    expect(smap.toString()).toBe(
      xmlDef +
      urlset +
        '<url>' +
            '<loc>http://test.com</loc>' +
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
    var smap = sm.createSitemap({
      hostname: 'http://test.com',
      urls: [
        {
          url: '/index.html',
          img: [
            {url: 'http://test.com/image.jpg', caption: 'Test Caption'},
            {url: 'http://test.com/image2.jpg', caption: 'Test Caption 2'}
          ]
        }
      ]
    })

    smap.urls.push({url: '/index2.html', img: [{url: '/image3.jpg', caption: 'Test Caption 3'}]})

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
    var smap = sm.createSitemap({
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
            'requires_subscription': false
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
            '</video:video>' +
        '</url>' +
      '</urlset>')
  })
})
describe('sitemapIndex', () => {
  it('build sitemap index', () => {
    var expectedResult = xmlDef + '\n' +
    '<?xml-stylesheet type="text/xsl" href="https://test.com/style.xsl"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n' +
    '<sitemap>\n' +
    '<loc>https://test.com/s1.xml</loc>\n' +
    '</sitemap>\n' +
    '<sitemap>\n' +
    '<loc>https://test.com/s2.xml</loc>\n' +
    '</sitemap>\n' +
    '</sitemapindex>'

    var result = sm.buildSitemapIndex({
      urls: ['https://test.com/s1.xml', 'https://test.com/s2.xml'],
      xslUrl: 'https://test.com/style.xsl'
    })

    expect(result).toBe(expectedResult)
  })
  it('build sitemap index with custom xmlNS', () => {
    var expectedResult = xmlDef + '\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        '<sitemap>\n' +
            '<loc>https://test.com/s1.xml</loc>\n' +
        '</sitemap>\n' +
        '<sitemap>\n' +
            '<loc>https://test.com/s2.xml</loc>\n' +
        '</sitemap>\n' +
    '</sitemapindex>'

    var result = sm.buildSitemapIndex({
      urls: ['https://test.com/s1.xml', 'https://test.com/s2.xml'],
      xmlNs: 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
    })

    expect(result).toBe(expectedResult)
  })
  it('build sitemap index with lastmod', () => {
    var expectedResult = xmlDef + '\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        '<sitemap>\n' +
            '<loc>https://test.com/s1.xml</loc>\n' +
            '<lastmod>2018-11-26</lastmod>\n' +
        '</sitemap>\n' +
        '<sitemap>\n' +
            '<loc>https://test.com/s2.xml</loc>\n' +
            '<lastmod>2018-11-27</lastmod>\n' +
        '</sitemap>\n' +
    '</sitemapindex>';

    var result = sm.buildSitemapIndex({
      urls: [
      {
        url: "https://test.com/s1.xml",
        lastmod: "2018-11-26"
      },
       {
        url: "https://test.com/s2.xml",
        lastmod: "2018-11-27"
      },
      ],
      xmlNs: 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
    });

    expect(result).toBe(expectedResult);
  })
  it('simple sitemap index', () => {
    const tmp = require('os').tmpdir()
    const url1 = 'http://ya.ru'
    const url2 = 'http://ya2.ru'
    const expectedFiles = [
      tmp + '/sm-test-0.xml',
      tmp + '/sm-test-1.xml',
      tmp + '/sm-test-index.xml'
    ]

    expect(
      function () {
        sm.createSitemapIndex({
          cacheTime: 600000,
          hostname: 'http://www.sitemap.org',
          sitemapName: 'sm-test',
          sitemapSize: 1,
          targetFolder: '/tmp2',
          urls: [url1, url2]
        })
      }
    ).toThrowError(/UndefinedTargetFolder/)

    // Cleanup before run test
    removeFilesArray(expectedFiles)

    sm.createSitemapIndex({
      cacheTime: 600000,
      hostname: 'http://www.sitemap.org',
      sitemapName: 'sm-test',
      sitemapSize: 1,
      targetFolder: tmp,
      urls: [url1, url2],
      callback: function (err, result) {
        expect(err).toBe(null)
        expect(result).toBe(true)
        expectedFiles.forEach(function (expectedFile) {
          expect(fs.existsSync(expectedFile)).toBe(true)
        })
      }
    })
  })
  it('sitemap without callback', () => {
    sm.createSitemapIndex({
      cacheTime: 600000,
      hostname: 'http://www.sitemap.org',
      sitemapName: 'sm-test',
      sitemapSize: 1,
      targetFolder: require('os').tmpdir(),
      urls: ['http://ya.ru', 'http://ya2.ru']
    })
  })
  it('sitemap with gzip files', () => {
    const tmp = require('os').tmpdir()
    const url1 = 'http://ya.ru'
    const url2 = 'http://ya2.ru'
    const expectedFiles = [
      tmp + '/sm-test-0.xml.gz',
      tmp + '/sm-test-1.xml.gz',
      tmp + '/sm-test-index.xml'
    ]

    // Cleanup before run test
    removeFilesArray(expectedFiles)

    sm.createSitemapIndex({
      cacheTime: 600000,
      hostname: 'http://www.sitemap.org',
      sitemapName: 'sm-test',
      sitemapSize: 1,
      targetFolder: tmp,
      gzip: true,
      urls: [url1, url2],
      callback: function (err, result) {
        expect(err).toBe(null)
        expect(result).toBe(true)
        expectedFiles.forEach(function (expectedFile) {
          expect(fs.existsSync(expectedFile)).toBe(true)
        })
      }
    })
  })
})
