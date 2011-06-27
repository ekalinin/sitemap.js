/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

exports.Sitemap = Sitemap;
exports.SitemapItem = SitemapItem;

/**
 * Item in sitemap
 */
function SitemapItem(conf) {

  if ( !conf['url'] ) {
    throw new Error('URL is required');
  }

  // URL of the page
  this.loc = conf['url'];

  // The date of last modification (YYYY-MM-DD)
  this.lastmod = conf['lastmod'] || '';

  // How frequently the page is likely to change
  this.changefreq = conf['changefreq'] || 'weekly';

  // The priority of this URL relative to other URLs
  this.priority = conf['priority'] || 0.5;

}

SitemapItem.prototype.toString = function () {
      // result xml
  var xml = '<url> {loc} {lastmod>} {changefreq} {priority} </url> '
      // xml property
    , props = ['loc', 'lastmod', 'changefreq', 'priority']
      // property array size (for loop)
    , ps = props.length
      // current property name (for loop)
    , p;

  while ( ps-- ) {
    p = props[p];

    if (this[p]) {
      xml = xml.replace('{'+p+'}',
                  '<'+p+'>'+this[p]+'</'+p+'>');
    } else {
      xml = xml.replace('{'+p+'}', '');
    }
  }

  return xml;
}

/**
 * Sitemap
 */
function Sitemap(urls) {

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
    , xml = '<?xml version="1.0" encoding="UTF-8"?>\n'+
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
            '{url}\n'+
            '</urlset>'
    , item;

  // TODO: if size > limit: create sitemapindex

  while( size-- ) {
    item = new SitemapItem({'url': this.urls[size]});
    xml = xml.replace('{url}', item.toString() + '{url}');
  }
  xml = xml.replace('{url}', '');

  return xml;
}

/**
 * Sitemap index (for several sitemaps)
 */
function SitemapIndex() {

}
