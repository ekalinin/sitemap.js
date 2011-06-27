/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

var sm = require('../index'),
    assert = require('assert');

module.exports = {
  'empty Sitemap': function () {
    var sm_empty = new sm.Sitemap();

    assert.eql(sm_empty.urls, [])
  },
  'urls is array allways': function () {
    var url = 'http://ya.ru';
    var sm_one = new sm.Sitemap(url);

    assert.eql(sm_one.urls, [url])
  },
  'simple sitemap': function() {
    var url = 'http://ya.ru';
    var ssp = new sm.Sitemap();
    ssp.urls.push(url);
  },
}
