/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

var ut = require('./utils')
  , err = require('./errors')
  , urlparser = require('url');

exports.Sitemap = Sitemap;
exports.SitemapItem = SitemapItem;
exports.createSitemap = createSitemap;

/**
 * Shortcut for `new Sitemap (...)`.
 *
 * @param   {Object}        conf
 * @param   {String}        conf.hostname
 * @param   {String|Array}  conf.urls
 * @return  {Sitemap}
 */
function createSitemap(conf) {
  return new Sitemap(conf.urls, conf.hostname);
}

/**
 * Item in sitemap
 */
function SitemapItem(conf) {
  var conf = conf || {};

  if ( !conf['url'] ) {
    throw new err.NoURLError('URL is required');
  }

  // URL of the page
  this.loc = conf['url'];
  if ( ! conf['safe'] ) {
    var url_parts = urlparser.parse(conf['url']);
    if ( !url_parts['protocol'] ) {
      throw new err.NoURLProtocolError('Protocol is required')
    }

    this.loc = ut.htmlEscape(conf['url']);
  }

  // The date of last modification (YYYY-MM-DD)
  if ( conf['lastmod'] ) {
    var dt = new Date( Date.parse(conf['lastmod']) );
    this.lastmod = [ dt.getFullYear(), ut.lpad(dt.getMonth()+1, 2),
                      ut.lpad(dt.getDate(), 2) ].join('-');
  }

  // TODO: check valid value
  // How frequently the page is likely to change
  this.changefreq = conf['changefreq'] || 'weekly';

  // TODO: check period
  // The priority of this URL relative to other URLs
  this.priority = conf['priority'] || 0.5;

}

/**
 *  Create sitemap xml
 *  @return {String}
 */
SitemapItem.prototype.toXML = function () {
  return this.toString();
}

/**
 *  Alias for toXML()
 *  @return {String}
 */
SitemapItem.prototype.toString = function () {
      // result xml
  var xml = '<url> {loc} {lastmod} {changefreq} {priority} </url>'
      // xml property
    , props = ['loc', 'lastmod', 'changefreq', 'priority']
      // property array size (for loop)
    , ps = props.length
      // current property name (for loop)
    , p;

  while ( ps-- ) {
    p = props[ps];

    if (this[p]) {
      xml = xml.replace('{'+p+'}',
                  '<'+p+'>'+this[p]+'</'+p+'>');
    } else {
      xml = xml.replace('{'+p+'}', '');
    }
  }

  return xml.replace('  ', ' ');
}

/**
 * Sitemap constructor
 * @param {String|Array}  urls
 * @param {String}        hostname    optional
 */
function Sitemap(urls, hostname) {

  // TODO: support base domain + list urls
  // TODO: added cache (save to file?)

  // This limit is defined by Google. See:
  // http://sitemaps.org/protocol.php#index
  this.limit = 50000

  // Base domain
  this.hostname = hostname;

  // URL list for sitemap
  this.urls = urls || [];
  if ( !(this.urls instanceof Array) ) {
    this.urls = [ this.urls ]
  }
}

/**
 *  Add url to sitemap
 *  @param {String} url
 */
Sitemap.prototype.add = function (url) {
  return this.urls.push(url);
}

/**
 *  Create sitemap xml
 *  @return {String}
 */
Sitemap.prototype.toXML = function () {
  return this.toString();
}

/**
 *  Alias for toXML()
 *  @return {String}
 */
Sitemap.prototype.toString = function () {
  var self = this
    , xml = [ '<?xml version="1.0" encoding="UTF-8"?>\n',
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'];

  // TODO: if size > limit: create sitemapindex

  this.urls.forEach( function (elem, index) {
    // SitemapItem
    var smi = elem;

    // create object with url property
    if ( typeof elem == 'string' ) {
      smi = {'url': elem};
    }
    // insert domain name
    if ( self.hostname && smi.url.indexOf('http') === -1 ) {
      smi.url = self.hostname + smi.url;
    }
    xml.push( ( new SitemapItem(smi) ).toString() + '\n' );
  })
  // close xml
  xml.push('</urlset>');

  return xml.join('');
}

/**
 * Sitemap index (for several sitemaps)
 */
function SitemapIndex() {

}
