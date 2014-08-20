/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

var sm = require('../index'),
    assert = require('assert');

module.exports = {
  'sitemap item: deafult values && escape': function () {
    var url = 'http://ya.ru/view?widget=3&count>2'
      , smi = new sm.SitemapItem({'url': url});

    assert.eql(smi.toString(),
              '<url> '+
                  '<loc>http://ya.ru/view?widget=3&amp;count&gt;2</loc> '+
                  '<changefreq>weekly</changefreq> '+
                  '<priority>0.5</priority> '+
              '</url>');
  },
  'sitemap item: error for url absence': function () {
    assert.throws(
      function() { new sm.SitemapItem(); },
      /URL is required/
    );
  },
  'sitemap item: full options': function () {
    var url = 'http://ya.ru'
      , smi = new sm.SitemapItem({
          'url': url,
          'lastmod': '2011-06-27',
          'changefreq': 'always',
          'priority': 0.9
        });

    assert.eql(smi.toString(),
              '<url> '+
                  '<loc>http://ya.ru</loc> '+
                  '<lastmod>2011-06-27</lastmod> '+
                  '<changefreq>always</changefreq> '+
                  '<priority>0.9</priority> '+
              '</url>');
  },
  'sitemap item: lastmodISO': function () {
    var url = 'http://ya.ru'
      , smi = new sm.SitemapItem({
          'url': url,
          'lastmodISO': '2011-06-27T00:00:00.000Z',
          'changefreq': 'always',
          'priority': 0.9
        });

    assert.eql(smi.toString(),
              '<url> '+
                  '<loc>http://ya.ru</loc> '+
                  '<lastmod>2011-06-27T00:00:00.000Z</lastmod> '+
                  '<changefreq>always</changefreq> '+
                  '<priority>0.9</priority> '+
              '</url>');
  },
  'sitemap item: toXML': function () {
    var url = 'http://ya.ru'
      , smi = new sm.SitemapItem({
          'url': url,
          'lastmod': '2011-06-27',
          'changefreq': 'always',
          'priority': 0.9
        });

    assert.eql(smi.toString(),
              '<url> '+
                  '<loc>http://ya.ru</loc> '+
                  '<lastmod>2011-06-27</lastmod> '+
                  '<changefreq>always</changefreq> '+
                  '<priority>0.9</priority> '+
              '</url>');
  },
  'sitemap empty urls': function () {
    var sm_empty = new sm.Sitemap();

    assert.eql(sm_empty.urls, [])
  },
  'sitemap.urls is an array': function () {
    var url = 'ya.ru';
    var sm_one = new sm.Sitemap(url);

    assert.eql(sm_one.urls, [url]);
  },
  'simple sitemap': function() {
    var url = 'http://ya.ru';
    var ssp = new sm.Sitemap();
    ssp.add(url);

    assert.eql(ssp.toString(),
              '<?xml version="1.0" encoding="UTF-8"?>\n'+
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
                '<url> '+
                    '<loc>http://ya.ru</loc> '+
                    '<changefreq>weekly</changefreq> '+
                    '<priority>0.5</priority> '+
                '</url>\n'+
              '</urlset>');
  },
  'simple sitemap toXML async with one callback argument': function(beforeExit, assert) {
    var url = 'http://ya.ru';
    var ssp = new sm.Sitemap();
    ssp.add(url);

    ssp.toXML(function(xml) {
      assert.eql(xml,
                '<?xml version="1.0" encoding="UTF-8"?>\n'+
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
                  '<url> '+
                      '<loc>http://ya.ru</loc> '+
                      '<changefreq>weekly</changefreq> '+
                      '<priority>0.5</priority> '+
                  '</url>\n'+
                '</urlset>');
    });
  },
  'simple sitemap toXML async with two callback arguments': function(beforeExit, assert) {
    var url = 'http://ya.ru';
    var ssp = new sm.Sitemap();
    ssp.add(url);

    ssp.toXML(function(err, xml) {
      assert.isNull(err);
      assert.eql(xml,
                '<?xml version="1.0" encoding="UTF-8"?>\n'+
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
                  '<url> '+
                      '<loc>http://ya.ru</loc> '+
                      '<changefreq>weekly</changefreq> '+
                      '<priority>0.5</priority> '+
                  '</url>\n'+
                '</urlset>');
    });
  },
  'simple sitemap toXML sync': function() {
    var url = 'http://ya.ru';
    var ssp = new sm.Sitemap();
    ssp.add(url);

    assert.eql(ssp.toXML(),
              '<?xml version="1.0" encoding="UTF-8"?>\n'+
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
                '<url> '+
                    '<loc>http://ya.ru</loc> '+
                    '<changefreq>weekly</changefreq> '+
                    '<priority>0.5</priority> '+
                '</url>\n'+
              '</urlset>');
  },
  'simple sitemap index': function() {
    var url1 = 'http://ya.ru';
    var url2 = 'http://ya2.ru';

    assert.throws(
      function() {
        var ssp = new sm.createSitemapIndex({
          cacheTime: 600000,
          hostname: 'http://www.sitemap.org',
          sitemapName: 'sm-test',
          sitemapSize: 1,
          targetFolder: '/tmp2',
          urls: [url1, url2]
        });
      },
      /UndefinedTargetFolder/
    );

    var ssp = new sm.createSitemapIndex({
      cacheTime: 600000,
      hostname: 'http://www.sitemap.org',
      sitemapName: 'sm-test',
      sitemapSize: 1,
      targetFolder: '/tmp',
      urls: [url1, url2],
      callback: function(err, result) {
        assert.eql(err, null);
        assert.eql(result, true);
        assert.eql(require('fs').existsSync('/tmp/sm-test-0.xml'), true);
        assert.eql(require('fs').existsSync('/tmp/sm-test-1.xml'), true);
        assert.eql(require('fs').existsSync('/tmp/sm-test-index.xml'), true);
      }
    });
  },
  'lpad test': function() {
    assert.eql(sm.utils.lpad(5, 2), '05');
    assert.eql(sm.utils.lpad(6, 2, '-'), '-6');
  },
  'distinctValues test': function() {
    assert.eql(sm.utils.distinctArray([1, 2, 2, 5, 2]), [1, 2, 5]);
  },
  'sitemap: hostname, createSitemap': function() {
    var smap = sm.createSitemap({
          hostname: 'http://test.com',
          urls: [
            { url: '/',         changefreq: 'always', priority: 1 },
            { url: '/page-1/',  changefreq: 'weekly', priority: 0.3 },
            { url: '/page-2/',  changefreq: 'daily',  priority: 0.7 },
            { url: 'http://www.test.com/page-3/',  changefreq: 'monthly',  priority: 0.2 },
          ]
        });

    assert.eql(smap.toString(),
              '<?xml version="1.0" encoding="UTF-8"?>\n'+
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
                '<url> '+
                    '<loc>http://test.com/</loc> '+
                    '<changefreq>always</changefreq> '+
                    '<priority>1</priority> '+
                '</url>\n'+
                '<url> '+
                    '<loc>http://test.com/page-1/</loc> '+
                    '<changefreq>weekly</changefreq> '+
                    '<priority>0.3</priority> '+
                '</url>\n'+
                '<url> '+
                    '<loc>http://test.com/page-2/</loc> '+
                    '<changefreq>daily</changefreq> '+
                    '<priority>0.7</priority> '+
                '</url>\n'+
                '<url> '+
                    '<loc>http://www.test.com/page-3/</loc> '+
                    '<changefreq>monthly</changefreq> '+
                    '<priority>0.2</priority> '+
                '</url>\n'+
              '</urlset>');
  },
  'sitemap: invalid changefreq error': function() {
    assert.throws(
      function() {
        sm.createSitemap({
          hostname: 'http://test.com',
          urls: [{ url: '/', changefreq: 'allllways'}]
        }).toString();
      },
      /changefreq is invalid/
    );
  },
  'sitemap: invalid priority error': function() {
    assert.throws(
      function() {
        sm.createSitemap({
          hostname: 'http://test.com',
          urls: [{ url: '/', priority: 1.1}]
        }).toString();
      },
      /priority is invalid/
    );
  },
  'sitemap: test cache': function() {
    var smap = sm.createSitemap({
          hostname: 'http://test.com',
          cacheTime: 500,  // 0.5 sec
          urls: [
            { url: '/page-1/',  changefreq: 'weekly', priority: 0.3 }
          ]
        })
      , xml = '<?xml version="1.0" encoding="UTF-8"?>\n'+
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
                '<url> '+
                    '<loc>http://test.com/page-1/</loc> '+
                    '<changefreq>weekly</changefreq> '+
                    '<priority>0.3</priority> '+
                '</url>\n'+
              '</urlset>';

    // fill cache
    assert.eql(smap.toString(), xml);
    // change urls
    smap.add('http://test.com/new-page/');
    // check result from cache (not changed)
    assert.eql(smap.toString(), xml);

    // check new cache
    // after cacheTime expired
    setTimeout( function () {
      // check new sitemap
      assert.eql(smap.toString(),
                '<?xml version="1.0" encoding="UTF-8"?>\n'+
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
                  '<url> '+
                      '<loc>http://test.com/page-1/</loc> '+
                      '<changefreq>weekly</changefreq> '+
                      '<priority>0.3</priority> '+
                  '</url>\n'+
                  '<url> '+
                      '<loc>http://test.com/new-page/</loc> '+
                      '<changefreq>weekly</changefreq> '+
                      '<priority>0.5</priority> '+
                  '</url>\n'+
                '</urlset>');
    }, 1000);
  },
  'sitemap: test cache off': function() {
    var smap = sm.createSitemap({
          hostname: 'http://test.com',
          // cacheTime: 0,  // cache disabled
          urls: [
            { url: '/page-1/',  changefreq: 'weekly', priority: 0.3 }
          ]
        })
      , xml = '<?xml version="1.0" encoding="UTF-8"?>\n'+
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
                '<url> '+
                    '<loc>http://test.com/page-1/</loc> '+
                    '<changefreq>weekly</changefreq> '+
                    '<priority>0.3</priority> '+
                '</url>\n'+
              '</urlset>';

    assert.eql(smap.toString(), xml);
    // change urls
    smap.add('http://test.com/new-page/');
    // check result without cache (changed one)
    assert.eql(smap.toString(),
              '<?xml version="1.0" encoding="UTF-8"?>\n'+
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
                '<url> '+
                    '<loc>http://test.com/page-1/</loc> '+
                    '<changefreq>weekly</changefreq> '+
                    '<priority>0.3</priority> '+
                '</url>\n'+
                '<url> '+
                    '<loc>http://test.com/new-page/</loc> '+
                    '<changefreq>weekly</changefreq> '+
                    '<priority>0.5</priority> '+
                '</url>\n'+
              '</urlset>');
  },
  'sitemap: handle urls with "http" in the path': function() {
    var smap = sm.createSitemap({
          hostname: 'http://test.com',
          urls: [
            { url: '/page-that-mentions-http:-in-the-url/',  changefreq: 'weekly', priority: 0.3 }
          ]
        })
      , xml = '<?xml version="1.0" encoding="UTF-8"?>\n'+
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
                '<url> '+
                    '<loc>http://test.com/page-that-mentions-http:-in-the-url/</loc> '+
                    '<changefreq>weekly</changefreq> '+
                    '<priority>0.3</priority> '+
                '</url>\n'+
              '</urlset>';

    assert.eql(smap.toString(), xml);
  },
  'sitemap: keep urls that start with http:// or https://': function() {
    var smap = sm.createSitemap({
          hostname: 'http://test.com',
          urls: [
            { url: 'http://ya.ru/page-1/',  changefreq: 'weekly', priority: 0.3 },
            { url: 'https://ya.ru/page-2/',  changefreq: 'weekly', priority: 0.3 },
          ]
        })
      , xml = '<?xml version="1.0" encoding="UTF-8"?>\n'+
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
                '<url> '+
                    '<loc>http://ya.ru/page-1/</loc> '+
                    '<changefreq>weekly</changefreq> '+
                    '<priority>0.3</priority> '+
                '</url>\n'+
                '<url> '+
                    '<loc>https://ya.ru/page-2/</loc> '+
                    '<changefreq>weekly</changefreq> '+
                    '<priority>0.3</priority> '+
                '</url>\n'+
              '</urlset>';

    assert.eql(smap.toString(), xml);
  },
  'sitemap: del by string': function() {
    var smap = sm.createSitemap({
          hostname: 'http://test.com',
          urls: [
            { url: 'http://ya.ru/page-1/',  changefreq: 'weekly', priority: 0.3 },
            { url: 'https://ya.ru/page-2/',  changefreq: 'weekly', priority: 0.3 },
          ]
        })
      , xml = '<?xml version="1.0" encoding="UTF-8"?>\n'+
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
                '<url> '+
                    '<loc>https://ya.ru/page-2/</loc> '+
                    '<changefreq>weekly</changefreq> '+
                    '<priority>0.3</priority> '+
                '</url>\n'+
              '</urlset>';
    smap.del('http://ya.ru/page-1/');

    assert.eql(smap.toString(), xml);
  },
  'sitemap: del by object': function() {
    var smap = sm.createSitemap({
          hostname: 'http://test.com',
          urls: [
            { url: 'http://ya.ru/page-1/',  changefreq: 'weekly', priority: 0.3 },
            { url: 'https://ya.ru/page-2/',  changefreq: 'weekly', priority: 0.3 },
          ]
        })
      , xml = '<?xml version="1.0" encoding="UTF-8"?>\n'+
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
                '<url> '+
                    '<loc>https://ya.ru/page-2/</loc> '+
                    '<changefreq>weekly</changefreq> '+
                    '<priority>0.3</priority> '+
                '</url>\n'+
              '</urlset>';
    smap.del({url: 'http://ya.ru/page-1/'});

    assert.eql(smap.toString(), xml);
  }
}
