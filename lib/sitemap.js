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
 * @param   {Number}        conf.cacheTime
 * @return  {Sitemap}
 */
function createSitemap(conf) {
  return new Sitemap(conf.urls, conf.hostname, conf.cacheTime);
}

/**
 * Item in sitemap
 */
function SitemapItem(conf) {
  var conf = conf || {}
    , is_safe_url = conf['safe'];

  if ( !conf['url'] ) {
    throw new err.NoURLError();
  }

  // URL of the page
  this.loc = conf['url'];
  if ( !is_safe_url ) {
    var url_parts = urlparser.parse(conf['url']);
    if ( !url_parts['protocol'] ) {
      throw new err.NoURLProtocolError();
    }

    this.loc = ut.htmlEscape(conf['url']);
  }

  // The date of last modification (YYYY-MM-DD)
  if ( conf['lastmod'] ) {
    var dt = new Date( Date.parse(conf['lastmod']) );
    this.lastmod = [ dt.getFullYear(), ut.lpad(dt.getMonth()+1, 2),
                      ut.lpad(dt.getDate(), 2) ].join('-');
  }

  // How frequently the page is likely to change
  this.changefreq = conf['changefreq'] || 'weekly';
  if ( !is_safe_url ) {
    if ( [ 'always',  'hourly', 'daily', 'weekly', 'monthly',
           'yearly', 'never' ].indexOf(this.changefreq) === -1 ) {
      throw new err.ChangeFreqInvalidError();
    }
  }

  // The priority of this URL relative to other URLs
  this.priority = conf['priority'] || 0.5;
  if ( !is_safe_url ) {
    if ( !(this.priority >= 0.0 && this.priority <= 1.0) ) {
      throw new err.PriorityInvalidError();
    }
  }
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
 * @param {Number}        cacheTime   optional in milliseconds
 */
function Sitemap(urls, hostname, cacheTime) {

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

  // sitemap cache
  this.cacheEnable = false;
  this.cache = '';
  if (cacheTime > 0) {
    this.cacheEnable = true;
    this.cacheCleanerId = setInterval(function (self) {
      self.clearCache();
    }, cacheTime, this);
  }
}

/**
 *  Clear sitemap cache
 */
Sitemap.prototype.clearCache = function () {
  this.cache = '';
}

/**
 *  Stop clear sitemap cache job
 */
Sitemap.prototype.clearCacheStop = function () {
  if (this.cacheCleanerId) {
    clearInterval(this.cacheCleanerId);
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
 *  @param {Function}     callback  Callback function with one argument — xml
 */
Sitemap.prototype.toXML = function (callback) {
  var self = this;
  process.nextTick( function () {
    callback( self.toString() );
  });
}

/**
 *  Synchronous alias for toXML()
 *  @return {String}
 */
Sitemap.prototype.toString = function () {
  var self = this
    , xml = [ '<?xml version="1.0" encoding="UTF-8"?>',
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];

  if (this.cacheEnable && this.cache) {
    return this.cache;
  }

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
    xml.push( new SitemapItem(smi) );
  })
  // close xml
  xml.push('</urlset>');

  this.cache = xml.join('\n');
  return this.cache;
}

/**
 * Sitemap index (for several sitemaps)
 */
function SitemapIndex() {

}
