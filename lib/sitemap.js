/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

var ut = require('./utils')
  , err = require('./errors')
  , url = require('url');

exports.Sitemap = Sitemap;
exports.SitemapItem = SitemapItem;


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
    var url_parts = url.parse(conf['url']);
    if ( !url_parts['protocol'] ) {
      throw new err.NoURLProtocolError('Protocol is required')
    }

    this.loc = ut.htmlEscape(conf['url']);
  }

  // TODO: check type: date or string.
  //        date --> strign in correct format;
  //        strign --> check format
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
 * Sitemap
 */
function Sitemap(urls) {

  // TODO: support base domain + list urls
  // TODO: added cache (save to file?)

  // This limit is defined by Google. See:
  // http://sitemaps.org/protocol.php#index
  this.limit = 50000

  // URL list for sitemap
  this.urls = urls || [];
  if ( !(this.urls instanceof Array) ) {
    this.urls = [ this.urls ]
  }

}

Sitemap.prototype.toString = function () {
  var size = this.urls.length
    , xml = [ '<?xml version="1.0" encoding="UTF-8"?>\n',
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n']
    , u     // current url (for loop)
    , smi;  // SitemapItem (for loop)

  // TODO: if size > limit: create sitemapindex

  while( size-- ) {
    u = this.urls[size];
    if ( typeof u != 'string' ) {
      smi = u;
    }
    else {
      smi = {'url': u};
    }
    xml.push( ( new SitemapItem(smi) ).toString() + '\n' );
  }
  xml.push('</urlset>');

  return xml.join('');
}

/**
 * Sitemap index (for several sitemaps)
 */
function SitemapIndex() {

}
