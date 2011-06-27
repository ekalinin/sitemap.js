/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

var sm = require('../index'),
    assert = require('assert');

module.exports = {
  'sitemap item: deafult values': function () {
    var url = 'ya.ru'
      , smi = new sm.SitemapItem({'url': url});

    assert.eql(smi.toString(),
              '<url> '+
                  '<loc>ya.ru</loc> '+
                  '<changefreq>weekly</changefreq> '+
                  '<priority>0.5</priority> '+
              '</url>');
  },
  'sitemap item: error for url absence': function () {
    var url = 'ya.ru';
    assert.throws(
      function() {
        var smi = new sm.SitemapItem();
      },
      sm.NoSitemapURLError
    );
  },
  'sitemap item: full options': function () {
    var url = 'ya.ru'
      , smi = new sm.SitemapItem({
          'url': url,
          'lastmod': '2011-06-27',
          'changefreq': 'always',
          'priority': 0.9
        });

    assert.eql(smi.toString(),
              '<url> '+
                  '<loc>ya.ru</loc> '+
                  '<lastmod>2011-06-27</lastmod> '+
                  '<changefreq>always</changefreq> '+
                  '<priority>0.9</priority> '+
              '</url>');
  },
  'sitemap empty': function () {
    var sm_empty = new sm.Sitemap();

    assert.eql(sm_empty.urls, [])
  },
  'sitemap.urls is an array': function () {
    var url = 'ya.ru';
    var sm_one = new sm.Sitemap(url);

    assert.eql(sm_one.urls, [url]);
  },
  'simple sitemap': function() {
    var url = 'ya.ru';
    var ssp = new sm.Sitemap();
    ssp.urls.push(url);

    assert.eql(ssp.toString(),
              '<?xml version="1.0" encoding="UTF-8"?>\n'+
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
                '<url> '+
                    '<loc>ya.ru</loc> '+
                    '<changefreq>weekly</changefreq> '+
                    '<priority>0.5</priority> '+
                '</url>\n'+
              '</urlset>');
  },
}
