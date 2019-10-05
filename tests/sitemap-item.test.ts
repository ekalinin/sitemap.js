/* eslint-env jest */
import {
  SitemapItem,
  EnumChangefreq,
  EnumYesNo,
  EnumAllowDeny,
  SitemapItemOptions,
  ErrorLevel
} from '../index'

const urlset = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
             'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" ' +
             'xmlns:xhtml="http://www.w3.org/1999/xhtml" ' +
             'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" ' +
             'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">'
const xmlDef = '<?xml version="1.0" encoding="UTF-8"?>'

describe('sitemapItem', () => {
  let xmlLoc: string
  let xmlPriority: string
  let itemTemplate: SitemapItemOptions
  beforeEach(() => {
    itemTemplate = { 'url': '', video: [], img: [], links: [] }
    xmlLoc = '<loc>http://ya.ru/</loc>'
    xmlPriority = '<priority>0.9</priority>'
  })

  it('default values && escape', () => {
    const url = 'http://ya.ru/view?widget=3&count>2'
    const smi = new SitemapItem({ ...itemTemplate, url })

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
      'lastmod': '2011-06-27T00:00:00.000Z',
      'changefreq': EnumChangefreq.ALWAYS,
      'priority': 0.9
    })

    expect(smi.toString()).toBe(
      '<url>' +
        xmlLoc +
        '<lastmod>2011-06-27T00:00:00.000Z</lastmod>' +
        '<changefreq>always</changefreq>' +
        xmlPriority +
        '<image:image>' +
        '<image:loc>' +
        'http://urlTest.com' +
        '</image:loc>' +
        '</image:image>' +
      '</url>')
  })

  it('lastmodISO', () => {
    const url = 'http://ya.ru/'
    const smi = new SitemapItem({
      ...itemTemplate,
      'url': url,
      'lastmod': '2011-06-27T00:00:00.000Z',
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

  it('toXML', () => {
    const url = 'http://ya.ru/'
    const smi = new SitemapItem({
      ...itemTemplate,
      'url': url,
      'img': [{url: 'http://urlTest.com'}],
      'lastmod': '2011-06-27T00:00:00.000Z',
      'changefreq': EnumChangefreq.ALWAYS,
      'priority': 0.9
    })

    expect(smi.toString()).toBe(
      '<url>' +
        xmlLoc +
        '<lastmod>2011-06-27T00:00:00.000Z</lastmod>' +
        '<changefreq>always</changefreq>' +
        xmlPriority +
        '<image:image>' +
          '<image:loc>' +
            'http://urlTest.com' +
          '</image:loc>' +
        '</image:image>' +
      '</url>')
  })


  describe("buildVideoElement", () => {
    it("creates a <video:video /> element", () => {
      const smap = new SitemapItem({
        ...itemTemplate,
        url: "https://example.com"
      });
      smap.buildVideoElement({
        id: "http://example.com/url",
        title: "2018:E6 - GoldenEye: Source",
        description:
          "We play gun game in GoldenEye: Source with a good friend of ours. His name is Gruchy. Dan Gruchy.",
        player_loc:
          "https://roosterteeth.com/embed/rouletsplay-2018-goldeneye-source",
        "player_loc:autoplay": "ap=1",
        thumbnail_loc:
          "https://rtv3-img-roosterteeth.akamaized.net/store/0e841100-289b-4184-ae30-b6a16736960a.jpg/sm/thumb3.jpg",
        duration: 1208,
        publication_date: "2018-04-27T17:00:00.000Z",
        requires_subscription: EnumYesNo.yes,
        tag: ["fruit", "flies"]
      });
      smap.buildVideoElement({
        "title": "2018:E90 - Minecraft - Episode 310 - Chomping List",
        "description": "Now that the gang's a bit more settled into Achievement Cove, it's time for a competition. Whoever collects the most unique food items by the end of the episode wins. The winner may even receive a certain golden tower.",
        "player_loc": "https://roosterteeth.com/embed/let-s-play-2018-minecraft-episode-310",
        "thumbnail_loc": "https://rtv3-img-roosterteeth.akamaized.net/store/f255cd83-3d69-4ee8-959a-ac01817fa204.jpg/sm/thumblpchompinglistv2.jpg",
        "duration": 3070,
        "publication_date": "2018-04-27T14:00:00.000Z",
        "requires_subscription": EnumYesNo.no,
        "price": "1.99",
        "price:type": "rent",
        "price:currency": "USD",
        "price:resolution": "HD",
        "platform": "tv",
        "platform:relationship": EnumAllowDeny.ALLOW,
        "restriction": "IE GB US CA",
        "restriction:relationship": "deny",
        "uploader": "GrillyMcGrillerson",
        "category": "Baking",
        "live": EnumYesNo.no,
        "expiration_date": "2012-07-16T19:20:30+08:00",
        "rating": 2.5,
        "view_count": 1000,
        "family_friendly": EnumYesNo.no,
        "tag": ["steak"],
        "gallery_loc": "https://roosterteeth.com/series/awhu",
        "gallery_loc:title": "awhu series page"
      })
      expect(smap.url.toString()).toBe(
        "<url><" +
          "video:video><video:thumbnail_loc>https://rtv3-img-roosterteeth.akamaized.net/store/0e841100-289b-4184-ae30-b6a16736960a.jpg/sm/thumb3.jpg</video:thumbnail_loc>" +
          "<video:title><![CDATA[2018:E6 - GoldenEye: Source]]></video:title>" +
          "<video:description><![CDATA[We play gun game in GoldenEye: Source with a good friend of ours. His name is Gruchy. Dan Gruchy.]]></video:description>" +
          '<video:player_loc autoplay="ap=1">https://roosterteeth.com/embed/rouletsplay-2018-goldeneye-source</video:player_loc>' +
          "<video:duration>1208</video:duration>" +
          "<video:publication_date>2018-04-27T17:00:00.000Z</video:publication_date>" +
          "<video:tag>fruit</video:tag><video:tag>flies</video:tag>" +
          "<video:requires_subscription>yes</video:requires_subscription>" +
          '<video:id type="url">http://example.com/url</video:id>' +
          "</video:video>" +
          '<video:video><video:thumbnail_loc>https://rtv3-img-roosterteeth.akamaized.net/store/f255cd83-3d69-4ee8-959a-ac01817fa204.jpg/sm/thumblpchompinglistv2.jpg</video:thumbnail_loc>' +
          '<video:title><![CDATA[2018:E90 - Minecraft - Episode 310 - Chomping List]]></video:title>' +
          "<video:description><![CDATA[Now that the gang's a bit more settled into Achievement Cove, it's time for a competition. Whoever collects the most unique food items by the end of the episode wins. The winner may even receive a certain golden tower.]]></video:description>" +
          '<video:player_loc>https://roosterteeth.com/embed/let-s-play-2018-minecraft-episode-310</video:player_loc>' +
          '<video:duration>3070</video:duration>' +
          '<video:expiration_date>2012-07-16T19:20:30+08:00</video:expiration_date>' +
          '<video:rating>2.5</video:rating>' +
          '<video:view_count>1000</video:view_count>' +
          '<video:publication_date>2018-04-27T14:00:00.000Z</video:publication_date>' +
          '<video:tag>steak</video:tag>' +
          '<video:category>Baking</video:category>' +
          '<video:family_friendly>no</video:family_friendly>' +
          '<video:restriction relationship="deny">IE GB US CA</video:restriction>' +
          '<video:gallery_loc title="awhu series page">https://roosterteeth.com/series/awhu</video:gallery_loc>' +
          '<video:price resolution="HD" currency="USD" type="rent">1.99</video:price>' +
          '<video:requires_subscription>no</video:requires_subscription>' +
          '<video:uploader>GrillyMcGrillerson</video:uploader>' +
          '<video:platform relationship="allow">tv</video:platform>' +
          '<video:live>no</video:live>' +
          '</video:video>' +
          "</url>"
      );
    });
  });

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

  it('sitemap: android app linking', () => {
    const smi = new SitemapItem({
      ...itemTemplate,
        url: 'http://test.com/page-1/',
          changefreq: EnumChangefreq.WEEKLY,
          priority: 0.3,
          androidLink: 'android-app://com.company.test/page-1/'
    })

    expect(smi.toString()).toBe(
                '<url>' +
                  '<loc>http://test.com/page-1/</loc>' +
                  '<changefreq>weekly</changefreq>' +
                  '<priority>0.3</priority>' +
                  '<xhtml:link rel="alternate" href="android-app://com.company.test/page-1/"/>' +
                '</url>')
  })

    it('sitemap: AMP', () => {
      const smi = new SitemapItem({
        ...itemTemplate,
        url: "http://test.com/page-1/",
        changefreq: EnumChangefreq.WEEKLY,
        priority: 0.3,
        ampLink: "http://ampproject.org/article.amp.html"
      });
      expect(smi.toString()).toBe(
          '<url>' +
            '<loc>http://test.com/page-1/</loc>' +
            '<changefreq>weekly</changefreq>' +
            '<priority>0.3</priority>' +
            '<xhtml:link rel="amphtml" href="http://ampproject.org/article.amp.html"/>' +
          '</url>')
    })

    it('sitemap: expires', () => {
      const smi = new SitemapItem({
        ...itemTemplate,
        url: "http://test.com/page-1/",
        changefreq: EnumChangefreq.WEEKLY,
        priority: 0.3,
        expires: new Date("2016-09-13").toString()
      });
      expect(smi.toString()).toBe(
          '<url>' +
            '<loc>http://test.com/page-1/</loc>' +
            '<changefreq>weekly</changefreq>' +
            '<priority>0.3</priority>' +
            '<expires>2016-09-13T00:00:00.000Z</expires>' +
          '</url>')
    })


  describe('image', () => {
    it('sitemap: image with caption', () => {
      const smap = new SitemapItem({
        ...itemTemplate,
          url: 'http://test.com/a',
          img: [{
            url: 'http://test.com/image.jpg?param&otherparam',
            caption: 'Test Caption'
          }]
      })

      expect(smap.toString()).toBe(
          '<url>' +
              '<loc>http://test.com/a</loc>' +
              '<image:image>' +
                  '<image:loc>http://test.com/image.jpg?param&amp;otherparam</image:loc>' +
                  '<image:caption><![CDATA[Test Caption]]></image:caption>' +
              '</image:image>' +
          '</url>')
    })

    it('sitemap: image with caption, title, geo_location, license', () => {
      const smap = new SitemapItem({
          ...itemTemplate,
          url: 'http://test.com',
          img: [{
            url: 'http://test.com/image.jpg',
            caption: 'Test Caption',
            title: 'Test title',
            geoLocation: 'Test Geo Location',
            license: 'http://test.com/license.txt'
          }]
      })

      expect(smap.toString()).toBe(
          '<url>' +
              '<loc>http://test.com</loc>' +
              '<image:image>' +
                  '<image:loc>http://test.com/image.jpg</image:loc>' +
                  '<image:caption><![CDATA[Test Caption]]></image:caption>' +
                  '<image:geo_location>Test Geo Location</image:geo_location>' +
                  '<image:title><![CDATA[Test title]]></image:title>' +
                  '<image:license>http://test.com/license.txt</image:license>' +
              '</image:image>' +
          '</url>')
    })

    it('sitemap: images with captions', () => {
      const smap = new SitemapItem({
        ...itemTemplate,
        url: "http://test.com",
        img: [{ url: "http://test.com/image.jpg", caption: "Test Caption" }]
      });

      expect(smap.toString()).toBe(
          '<url>' +
              '<loc>http://test.com</loc>' +
              '<image:image>' +
                  '<image:loc>http://test.com/image.jpg</image:loc>' +
                  '<image:caption><![CDATA[Test Caption]]></image:caption>' +
              '</image:image>' +
          '</url>')
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
    let id
    beforeEach(() => {
      testvideo = {
        ...itemTemplate,
        url: 'https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club',
        video: [{
          id: "http://example.com/url",
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
      id = '<video:id type="url">http://example.com/url</video:id>'
    })

    it('accepts an object', () => {
      const smap = new SitemapItem(testvideo)

      const result = smap.toString()
      const expectedResult = '<url>' +
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
          id +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('supports content_loc', () => {
      testvideo.video[0].content_loc = 'https://a.b.c'
      delete testvideo.video[0].player_loc
      const smap = new SitemapItem(testvideo)

      const result = smap.toString()
      const expectedResult = '<url>' +
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
          id +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('supports expiration_date', () => {
      testvideo.video[0].expiration_date = '2012-07-16T19:20:30+08:00'
      const smap = new SitemapItem(testvideo)

      const result = smap.toString()
      const expectedResult = '<url>' +
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
          id +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('supports rating', () => {
      testvideo.video[0].rating = 2.5
      const smap = new SitemapItem(testvideo)

      const result = smap.toString()
      const expectedResult = '<url>' +
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
          id +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('supports view_count', () => {
      testvideo.video[0].view_count = 1234
      const smap = new SitemapItem(testvideo)

      const result = smap.toString()
      const expectedResult = '<url>' +
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
          id +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('supports family_friendly', () => {
      testvideo.video[0].family_friendly = EnumYesNo.yes
      const smap = new SitemapItem(testvideo)

      const result = smap.toString()
      const expectedResult = '<url>' +
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
          id +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('supports tag', () => {
      testvideo.video[0].tag = ['steak']
      const smap = new SitemapItem(testvideo)

      const result = smap.toString()
      const expectedResult = '<url>' +
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
          id +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('supports array of tags', () => {
      testvideo.video[0].tag = ['steak', 'fries']
      const smap = new SitemapItem(testvideo)

      const result = smap.toString()
      const expectedResult = '<url>' +
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
          id +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('supports category', () => {
      testvideo.video[0].category = 'Baking'
      const smap = new SitemapItem(testvideo)

      const result = smap.toString()
      const expectedResult = '<url>' +
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
          id +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('supports uploader', () => {
      testvideo.video[0].uploader = 'GrillyMcGrillerson'
      const smap = new SitemapItem(testvideo)

      const result = smap.toString()
      const expectedResult = '<url>' +
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
          id +
        '</video:video>' +
      '</url>'
      expect(result).toBe(expectedResult)
    })

    it('supports live', () => {
      testvideo.video[0].live = EnumYesNo.yes
      const smap = new SitemapItem(testvideo)

      const result = smap.toString()
      const expectedResult = '<url>' +
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
          id +
        '</video:video>' +
      '</url>'
      expect(result.slice(1000)).toBe(expectedResult.slice(1000))
    })
  })

  describe('news', () => {
    let news: SitemapItemOptions
    beforeEach(() => {
      news = {
        ...itemTemplate,
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
      const smi = new SitemapItem(news)

      expect(smi.toString()).toBe(`<url><loc>${news.url}</loc><news:news><news:publication><news:name><![CDATA[${news.news.publication.name}]]></news:name><news:language>${news.news.publication.language}</news:language></news:publication><news:genres>${news.news.genres}</news:genres><news:publication_date>${news.news.publication_date}</news:publication_date><news:title><![CDATA[${news.news.title}]]></news:title><news:keywords>${news.news.keywords}</news:keywords><news:stock_tickers>${news.news.stock_tickers}</news:stock_tickers></news:news></url>`)
    })

    it('can render with only the required params', () => {
      delete news.news.genres
      delete news.news.keywords
      delete news.news.stock_tickers
      const smi = new SitemapItem(news)

      expect(smi.toString()).toBe(`<url><loc>${news.url}</loc><news:news><news:publication><news:name><![CDATA[${news.news.publication.name}]]></news:name><news:language>${news.news.publication.language}</news:language></news:publication><news:publication_date>${news.news.publication_date}</news:publication_date><news:title><![CDATA[${news.news.title}]]></news:title></news:news></url>`)
    })

    it('supports access', () => {
      news.news.access = 'Registration'
      let smi = new SitemapItem(news)

      expect(smi.toString()).toBe(`<url><loc>${news.url}</loc><news:news><news:publication><news:name><![CDATA[${news.news.publication.name}]]></news:name><news:language>${news.news.publication.language}</news:language></news:publication><news:access>${news.news.access}</news:access><news:genres>${news.news.genres}</news:genres><news:publication_date>${news.news.publication_date}</news:publication_date><news:title><![CDATA[${news.news.title}]]></news:title><news:keywords>${news.news.keywords}</news:keywords><news:stock_tickers>${news.news.stock_tickers}</news:stock_tickers></news:news></url>`)
      news.news.access = 'Subscription'
      smi = new SitemapItem(news)
      expect(smi.toString()).toBe(`<url><loc>${news.url}</loc><news:news><news:publication><news:name><![CDATA[${news.news.publication.name}]]></news:name><news:language>${news.news.publication.language}</news:language></news:publication><news:access>${news.news.access}</news:access><news:genres>${news.news.genres}</news:genres><news:publication_date>${news.news.publication_date}</news:publication_date><news:title><![CDATA[${news.news.title}]]></news:title><news:keywords>${news.news.keywords}</news:keywords><news:stock_tickers>${news.news.stock_tickers}</news:stock_tickers></news:news></url>`)
    })
  })
})
