/* eslint-env jest, jasmine */
import { getTimestampFromDate } from '../lib/utils'
import * as testUtil from './util'
import { SitemapItem, EnumChangefreq, EnumYesNo, EnumAllowDeny, SitemapItemOptions } from '../index'
describe('sitemapItem', () => {
  let xmlLoc
  let xmlPriority
  let itemTemplate
  beforeEach(() => {
    itemTemplate = { 'url': '', video: [], img: [], links: [] }
    xmlLoc = '<loc>http://ya.ru/</loc>'
    xmlPriority = '<priority>0.9</priority>'
  })
  it('default values && escape', () => {
    const url = 'http://ya.ru/view?widget=3&count>2'
    const smi = new SitemapItem({ ...itemTemplate, 'url': url })

    expect(smi.toString()).toBe(
      '<url>' +
        '<loc>http://ya.ru/view?widget=3&amp;count&gt;2</loc>' +
      '</url>')
  })
  it('properly handles url fragments', () => {
    const url = 'http://ya.ru/#!/home'
    const smi = new SitemapItem({ ...itemTemplate, 'url': url })

    expect(smi.toString()).toBe(
      '<url>' +
        '<loc>http://ya.ru/#!/home</loc>' +
      '</url>')
  })

  it('throws when no config is passed', () => {
    /* eslint-disable no-new */
    expect(
      function () { new SitemapItem() }
    ).toThrowError(/SitemapItem requires a configuration/)
  })
  it('throws an error for url absence', () => {
    /* eslint-disable no-new */
    expect(
      function () { new SitemapItem({}) }
    ).toThrowError(/URL is required/)
  })

  it('allows for full precision priority', () => {
    const url = 'http://ya.ru/'
    const smi = new SitemapItem({
       ...itemTemplate,
      'url': url,
      'changefreq': EnumChangefreq.ALWAYS,
      'priority': 0.99934,
      'fullPrecisionPriority': true
    })

    expect(smi.toString()).toBe(
      '<url>' +
        xmlLoc +
        '<changefreq>always</changefreq>' +
        '<priority>0.99934</priority>' +
      '</url>')
  })

  it('full options', () => {
    const url = 'http://ya.ru/'
    const smi = new SitemapItem({
      ...itemTemplate,
      'url': url,
      'img': [{url: 'http://urlTest.com'}],
      'lastmod': '2011-06-27',
      'changefreq': EnumChangefreq.ALWAYS,
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
    const url = 'http://ya.ru/'
    const smi = new SitemapItem({
      ...itemTemplate,
      'url': url,
      'mobile': 'pc,mobile'
    })

    expect(smi.toString()).toBe(
      '<url>' +
        xmlLoc +
        '<mobile:mobile type="pc,mobile"/>' +
      '</url>')
  })

  it('lastmodISO', () => {
    const url = 'http://ya.ru/'
    const smi = new SitemapItem({
      ...itemTemplate,
      'url': url,
      'lastmodISO': '2011-06-27T00:00:00.000Z',
      'changefreq': EnumChangefreq.ALWAYS,
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
    const { cacheFile, stat } = testUtil.createCache()

    var dt = new Date(stat.mtime)
    var lastmod = getTimestampFromDate(dt)

    const url = 'http://ya.ru/'
    const smi = new SitemapItem({
      ...itemTemplate,
      'url': url,
      'img': [{url: 'http://urlTest.com'}],
      'lastmodfile': cacheFile,
      'changefreq': EnumChangefreq.ALWAYS,
      'priority': 0.9
    })

    testUtil.unlinkCache()

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
    const { cacheFile, stat } = testUtil.createCache()

    var dt = new Date(stat.mtime)
    var lastmod = getTimestampFromDate(dt, true)

    const url = 'http://ya.ru/'
    const smi = new SitemapItem({
      ...itemTemplate,
      'url': url,
      'img': [{url: 'http://urlTest.com'}],
      'lastmodfile': cacheFile,
      'lastmodrealtime': true,
      'changefreq': EnumChangefreq.ALWAYS,
      'priority': 0.9
    })

    testUtil.unlinkCache()

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
    const url = 'http://ya.ru/'
    const smi = new SitemapItem({
      ...itemTemplate,
      'url': url,
      'img': [{url: 'http://urlTest.com'}],
      'lastmod': '2011-06-27',
      'changefreq': EnumChangefreq.ALWAYS,
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
      var smap = new SitemapItem({
        ...itemTemplate,
        'url': 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
        'video': [{
          'title': "2008:E2 - Burnout Paradise: Millionaire's Club",
          'description': 'Lorem ipsum',
          'player_loc': 'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
          'thumbnail_loc': 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
          'price': '1.99',
          'price:type': 'subscription',
          tag: []
        }]
      })
      smap.toString()
    }).toThrowError(/is not a valid value for attr: "price:type"/)
  })

  it('video price currency', () => {
    expect(function () {
      var smap = new SitemapItem({
        ...itemTemplate,
        'url': 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
        'video': [{
          'title': "2008:E2 - Burnout Paradise: Millionaire's Club",
          'description': 'Lorem ipsum',
          'player_loc': 'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
          'thumbnail_loc': 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
          'price': '1.99',
          // @ts-ignore
          'price:currency': 'dollar',
          tag: []
        }]
      })
      smap.toString()
    }).toThrowError(/is not a valid value for attr: "price:currency"/)
  })

  it('video price resolution', () => {
    expect(function () {
      var smap = new SitemapItem({
        ...itemTemplate,
        'url': 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
        'video': [{
          'title': "2008:E2 - Burnout Paradise: Millionaire's Club",
          'description': 'Lorem ipsum',
          'player_loc': 'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
          'thumbnail_loc': 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
          'price': '1.99',
          // @ts-ignore
          'price:resolution': '1920x1080',
          tag: []
        }]
      })
      smap.toString()
    }).toThrowError(/is not a valid value for attr: "price:resolution"/)
  })

  it('video platform relationship', () => {
    expect(function () {
      var smap = new SitemapItem({
        ...itemTemplate,
        'url': 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
        // @ts-ignore
        'video': [{
          'title': "2008:E2 - Burnout Paradise: Millionaire's Club",
          'description': 'Lorem ipsum',
          'player_loc': 'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
          'thumbnail_loc': 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
          'platform': 'tv',
          // @ts-ignore
          'platform:relationship': 'mother',
          tag: []
        }]
      })
      smap.toString()
    }).toThrowError(/is not a valid value for attr: "platform:relationship"/)
  })

  it('video restriction', () => {
    expect(function () {
      var smap = new SitemapItem({
        ...itemTemplate,
        'url': 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
        'video': [{
          'title': "2008:E2 - Burnout Paradise: Millionaire's Club",
          'description': 'Lorem ipsum',
          'player_loc': 'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
          'thumbnail_loc': 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
          'restriction': 'IE GB US CA',
          'restriction:relationship': 'father',
          tag: []
        }]
      })
      smap.toString()
    }).toThrowError(/is not a valid value for attr: "restriction:relationship"/)
  })

  it('video duration', () => {
    expect(function () {
      var smap = new SitemapItem({
        'url': 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
        'video': [{
          'title': "2008:E2 - Burnout Paradise: Millionaire's Club",
          'description': "Jack gives us a walkthrough on getting the Millionaire's Club Achievement in Burnout Paradise.",
          'player_loc': 'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
          'thumbnail_loc': 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
          'duration': -1,
          'publication_date': '2008-07-29T14:58:04.000Z',
          'requires_subscription': EnumYesNo.yes
        }]
      })
      smap.toString()
    }).toThrowError(/duration must be an integer/)
  })

  it('video description limit', () => {
    expect(function () {
      var smap = new SitemapItem({
        'url': 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
        'video': [{
          'title': "2008:E2 - Burnout Paradise: Millionaire's Club",
          // @ts-ignore
          'description': 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius laoreet. Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas nec odio et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus. Nullam quis ante. Etiam sit amet orci eget eros faucibus tincidunt. Duis leo. Sed fringilla mauris sit amet nibh. Donec sodales sagittis magna. Sed consequat, leo eget bibendum sodales, augue velit cursus nunc, quis gravida magna mi a libero. Fusce vulputate eleifend sapien. Vestibulum purus quam, scelerisque ut, mollis sed, nonummy id, metus. Nullam accumsan lorem in dui. Cras ultricies mi eu turpis hendrerit fringilla. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; In ac dui quis mi consectetuer lacinia. Nam pretium turpis et arcu. Duis arcu tortor, suscipit eget, imperdiet nec, imperdiet iaculis, ipsum. Sed aliquam ultrices mauris. Integer ante arcu, accumsan a, consectetuer eget, posuere ut, mauris. Praesent adipiscing. Phasellus ullamcorper ipsum rutrum nunc. Nunc nonummy metus. Vestibulum volutpat pretium libero. Cras id dui. Aenean ut eros et nisl sagittis vestibulum. Nullam nulla.',
          'player_loc': 'https://roosterteeth.com/embed/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
          'thumbnail_loc': 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
          'duration': -1,
          'publication_date': '2008-07-29T14:58:04.000Z',
          'requires_subscription': EnumYesNo.NO
        }]
      })
      smap.toString()
    }).toThrowError(/2048 characters/)
  })

  it('accepts a url without escaping it if a cdata flag is passed', () => {
    const mockUri = 'https://a.b/?a&b'
    const smi = new SitemapItem({
      ...itemTemplate,
      cdata: true,
      url: mockUri
    })

    expect(smi.toString()).toBe(`<url><loc>${mockUri}</loc></url>`)
  })

  describe('toXML', () => {
    it('is equivilant to toString', () => {
      const smi = new SitemapItem({ ...itemTemplate, url: 'https://a.b/?a&b' })
      expect(smi.toString()).toBe(smi.toXML())
    })
  })

  describe('video', () => {
    let testvideo: SitemapItemOptions
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
        ...itemTemplate,
        url: 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
        video: [{
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
          'platform:relationship': EnumAllowDeny.ALLOW,
          thumbnail_loc: 'https://rtv3-img-roosterteeth.akamaized.net/uploads/images/e82e1925-89dd-4493-9bcf-cdef9665d726/sm/ep298.jpg',
          duration: 174,
          publication_date: '2008-07-29T14:58:04.000Z',
          requires_subscription: EnumYesNo.yes,
          tag: []
        }]
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
      var smap = new SitemapItem(testvideo)

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
        delete test.video[0].title
        var smap = new SitemapItem(test)

        smap.toString()
      }).toThrowError(/must include thumbnail_loc, title and description fields for videos/)

      expect(() => {
        let test = Object.assign({}, testvideo)
        test.video[0] = 'a'
        var smap = new SitemapItem(test)

        smap.toString()
      }).toThrowError(/must include thumbnail_loc, title and description fields for videos/)

      expect(() => {
        let test = Object.assign({}, testvideo)
        delete test.video[0].thumbnail_loc
        var smap = new SitemapItem(test)

        smap.toString()
      }).toThrowError(/must include thumbnail_loc, title and description fields for videos/)

      expect(() => {
        let test = Object.assign({}, testvideo)
        delete test.video[0].description
        var smap = new SitemapItem(test)

        smap.toString()
      }).toThrowError(/must include thumbnail_loc, title and description fields for videos/)
    })

    it('supports content_loc', () => {
      testvideo.video[0].content_loc = 'https://a.b.c'
      delete testvideo.video[0].player_loc
      var smap = new SitemapItem(testvideo)

      var result = smap.toString()
      var expectedResult = '<url>' +
        '<loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc>' +
        '<video:video>' +
          thumbnailLoc +
          title +
          description +
          `<video:content_loc>${testvideo.video[0].content_loc}</video:content_loc>` +
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
      testvideo.video[0].expiration_date = '2012-07-16T19:20:30+08:00'
      var smap = new SitemapItem(testvideo)

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
      testvideo.video[0].rating = 2.5
      var smap = new SitemapItem(testvideo)

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
      testvideo.video[0].view_count = 1234
      var smap = new SitemapItem(testvideo)

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
      testvideo.video[0].family_friendly = EnumYesNo.yes
      var smap = new SitemapItem(testvideo)

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
      testvideo.video[0].tag = ['steak']
      var smap = new SitemapItem(testvideo)

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
      testvideo.video[0].tag = ['steak', 'fries']
      var smap = new SitemapItem(testvideo)

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
      testvideo.video[0].category = 'Baking'
      var smap = new SitemapItem(testvideo)

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
      testvideo.video[0].uploader = 'GrillyMcGrillerson'
      var smap = new SitemapItem(testvideo)

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
      testvideo.video[0].live = EnumYesNo.yes
      var smap = new SitemapItem(testvideo)

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
      var smi = new SitemapItem(news)

      expect(smi.toString()).toBe(`<url><loc>${news.url}</loc><news:news><news:publication><news:name><![CDATA[${news.news.publication.name}]]></news:name><news:language>${news.news.publication.language}</news:language></news:publication><news:genres>${news.news.genres}</news:genres><news:publication_date>${news.news.publication_date}</news:publication_date><news:title><![CDATA[${news.news.title}]]></news:title><news:keywords>${news.news.keywords}</news:keywords><news:stock_tickers>${news.news.stock_tickers}</news:stock_tickers></news:news></url>`)
    })

    it('can render with only the required params', () => {
      delete news.news.genres
      delete news.news.keywords
      delete news.news.stock_tickers
      var smi = new SitemapItem(news)

      expect(smi.toString()).toBe(`<url><loc>${news.url}</loc><news:news><news:publication><news:name><![CDATA[${news.news.publication.name}]]></news:name><news:language>${news.news.publication.language}</news:language></news:publication><news:publication_date>${news.news.publication_date}</news:publication_date><news:title><![CDATA[${news.news.title}]]></news:title></news:news></url>`)
    })

    it('will throw if you dont provide required attr publication', () => {
      delete news.news.publication
      var smi = new SitemapItem(news)

      expect(() => {
        smi.toString()
      }).toThrowError(/must include publication, publication name, publication language, title, and publication_date for news/)
    })

    it('will throw if you dont provide required attr publication name', () => {
      delete news.news.publication.name
      var smi = new SitemapItem(news)

      expect(() => {
        smi.toString()
      }).toThrowError(/must include publication, publication name, publication language, title, and publication_date for news/)
    })

    it('will throw if you dont provide required attr publication language', () => {
      delete news.news.publication.language
      var smi = new SitemapItem(news)

      expect(() => {
        smi.toString()
      }).toThrowError(/must include publication, publication name, publication language, title, and publication_date for news/)
    })

    it('will throw if you dont provide required attr title', () => {
      delete news.news.title
      var smi = new SitemapItem(news)

      expect(() => {
        smi.toString()
      }).toThrowError(/must include publication, publication name, publication language, title, and publication_date for news/)
    })

    it('will throw if you dont provide required attr publication_date', () => {
      delete news.news.publication_date
      var smi = new SitemapItem(news)

      expect(() => {
        smi.toString()
      }).toThrowError(/must include publication, publication name, publication language, title, and publication_date for news/)
    })

    it('will throw if you provide an invalid value for access', () => {
      news.news.access = 'a'
      var smi = new SitemapItem(news)

      expect(() => {
        smi.toString()
      }).toThrowError(/News access must be either Registration, Subscription or not be present/)
    })

    it('supports access', () => {
      news.news.access = 'Registration'
      var smi = new SitemapItem(news)

      expect(smi.toString()).toBe(`<url><loc>${news.url}</loc><news:news><news:publication><news:name><![CDATA[${news.news.publication.name}]]></news:name><news:language>${news.news.publication.language}</news:language></news:publication><news:access>${news.news.access}</news:access><news:genres>${news.news.genres}</news:genres><news:publication_date>${news.news.publication_date}</news:publication_date><news:title><![CDATA[${news.news.title}]]></news:title><news:keywords>${news.news.keywords}</news:keywords><news:stock_tickers>${news.news.stock_tickers}</news:stock_tickers></news:news></url>`)
      news.news.access = 'Subscription'
      smi = new SitemapItem(news)
      expect(smi.toString()).toBe(`<url><loc>${news.url}</loc><news:news><news:publication><news:name><![CDATA[${news.news.publication.name}]]></news:name><news:language>${news.news.publication.language}</news:language></news:publication><news:access>${news.news.access}</news:access><news:genres>${news.news.genres}</news:genres><news:publication_date>${news.news.publication_date}</news:publication_date><news:title><![CDATA[${news.news.title}]]></news:title><news:keywords>${news.news.keywords}</news:keywords><news:stock_tickers>${news.news.stock_tickers}</news:stock_tickers></news:news></url>`)
    })
  })
})
