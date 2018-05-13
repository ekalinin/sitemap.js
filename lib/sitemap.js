/* eslint-disable camelcase */
/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
'use strict'
const ut = require('./utils')
const err = require('./errors')
const fs = require('fs')
const urljoin = require('url-join')
const _ = require('underscore')
const builder = require('xmlbuilder')

exports.Sitemap = Sitemap
exports.SitemapItem = SitemapItem
exports.createSitemap = createSitemap
exports.createSitemapIndex = createSitemapIndex
exports.buildSitemapIndex = buildSitemapIndex

/**
 * Shortcut for `new Sitemap (...)`.
 *
 * @param   {Object}        conf
 * @param   {String}        conf.hostname
 * @param   {String|Array}  conf.urls
 * @param   {Number}        conf.cacheTime
 * @param   {String}        conf.xslUrl
 * @param   {String}        conf.xmlNs
 * @return  {Sitemap}
 */
function createSitemap (conf) {
  return new Sitemap(conf.urls, conf.hostname, conf.cacheTime, conf.xslUrl, conf.xmlNs)
}

function safeDuration (duration) {
  if (duration < 0 || duration > 28800) {
    throw new err.InvalidVideoDuration()
  }

  return duration
}

var allowDeny = /^allow|deny$/
var validators = {
  'price:currency': /^[A-Z]{3}$/,
  'price:type': /^rent|purchase|RENT|PURCHASE$/,
  'price:resolution': /^HD|hd|sd|SD$/,
  'platform:relationship': allowDeny,
  'restriction:relationship': allowDeny
}

function attrBuilder (conf, keys) {
  if (typeof keys === 'string') {
    keys = [keys]
  }

  var attrs = keys.reduce((attrs, key) => {
    if (conf[key] !== undefined) {
      var keyAr = key.split(':')
      if (keyAr.length !== 2) {
        throw new err.InvalidAttr(key)
      }

      if (validators[key] && !validators[key].test(conf[key])) {
        throw new err.InvalidAttrValue(key, conf[key], validators[key])
      }
      attrs[keyAr[1]] = conf[key]
    }

    return attrs
  }, {})

  return attrs
}

/**
 * Item in sitemap
 */
function SitemapItem (conf) {
  conf = conf || {}
  var is_safe_url = conf['safe']

  if (!conf['url']) {
    throw new err.NoURLError()
  }

  // URL of the page
  this.loc = conf.url

  let dt
  // If given a file to use for last modified date
  if (conf['lastmodfile']) {
    // console.log('should read stat from file: ' + conf['lastmodfile']);
    var file = conf['lastmodfile']

    var stat = fs.statSync(file)

    var mtime = stat.mtime

    dt = new Date(mtime)
    this.lastmod = ut.getTimestampFromDate(dt, conf['lastmodrealtime'])

    // The date of last modification (YYYY-MM-DD)
  } else if (conf['lastmod']) {
    // append the timezone offset so that dates are treated as local time.
    // Otherwise the Unit tests fail sometimes.
    var timezoneOffset = 'UTC-' + (new Date().getTimezoneOffset() / 60) + '00'
    timezoneOffset = timezoneOffset.replace('--', '-')
    dt = new Date(conf['lastmod'] + ' ' + timezoneOffset)
    this.lastmod = ut.getTimestampFromDate(dt, conf['lastmodrealtime'])
  } else if (conf['lastmodISO']) {
    this.lastmod = conf['lastmodISO']
  }

  // How frequently the page is likely to change
  // due to this field is optional no default value is set
  // please see: http://www.sitemaps.org/protocol.html
  this.changefreq = conf['changefreq']
  if (!is_safe_url && this.changefreq) {
    if (['always', 'hourly', 'daily', 'weekly', 'monthly',
      'yearly', 'never'].indexOf(this.changefreq) === -1) {
      throw new err.ChangeFreqInvalidError()
    }
  }

  // The priority of this URL relative to other URLs
  // due to this field is optional no default value is set
  // please see: http://www.sitemaps.org/protocol.html
  this.priority = conf['priority']
  if (!is_safe_url && this.priority) {
    if (!(this.priority >= 0.0 && this.priority <= 1.0) || typeof this.priority !== 'number') {
      throw new err.PriorityInvalidError()
    }
  }

  this.news = conf['news'] || null
  this.img = conf['img'] || null
  this.links = conf['links'] || null
  this.expires = conf['expires'] || null
  this.androidLink = conf['androidLink'] || null
  this.mobile = conf['mobile'] || null
  this.video = conf['video'] || null
  this.ampLink = conf['ampLink'] || null
  this.root = conf.root || builder.create('root')
  this.url = this.root.element('url')
}

/**
 *  Create sitemap xml
 *  @return {String}
 */
SitemapItem.prototype.toXML = function () {
  return this.toString()
}

SitemapItem.prototype.buildVideoElement = function (video) {
  const videoxml = this.url.element('video:video')
  if (typeof (video) !== 'object' || !video.thumbnail_loc || !video.title || !video.description) {
    // has to be an object and include required categories https://developers.google.com/webmasters/videosearch/sitemaps
    throw new err.InvalidVideoFormat()
  }

  if (video.description.length > 2048) {
    throw new err.InvalidVideoDescription()
  }

  videoxml.element('video:thumbnail_loc', video.thumbnail_loc)
  videoxml.element('video:title').cdata(video.title)
  videoxml.element('video:description').cdata(video.description)
  if (video.content_loc) {
    videoxml.element('video:content_loc', video.content_loc)
  }
  if (video.player_loc) {
    videoxml.element('video:player_loc', attrBuilder(video, 'player_loc:autoplay'), video.player_loc)
  }
  if (video.duration) {
    videoxml.element('video:duration', safeDuration(video.duration))
  }
  if (video.expiration_date) {
    videoxml.element('video:expiration_date', video.expiration_date)
  }
  if (video.rating) {
    videoxml.element('video:rating', video.rating)
  }
  if (video.view_count) {
    videoxml.element('video:view_count', video.view_count)
  }
  if (video.publication_date) {
    videoxml.element('video:publication_date', video.publication_date)
  }
  if (video.family_friendly) {
    videoxml.element('video:family_friendly', video.family_friendly)
  }
  if (video.tag) {
    videoxml.element('video:tag', video.tag)
  }
  if (video.category) {
    videoxml.element('video:category', video.category)
  }
  if (video.restriction) {
    videoxml.element(
      'video:restriction',
      attrBuilder(video, 'restriction:relationship'),
      video.restriction
    )
  }
  if (video.gallery_loc) {
    videoxml.element(
      'video:gallery_loc',
      {title: video['gallery_loc:title']},
      video.gallery_loc
    )
  }
  if (video.price) {
    videoxml.element(
      'video:price',
      attrBuilder(video, ['price:resolution', 'price:currency', 'price:type']),
      video.price
    )
  }
  if (video.requires_subscription) {
    videoxml.element('video:requires_subscription', video.requires_subscription)
  }
  if (video.uploader) {
    videoxml.element('video:uploader', video.uploader)
  }
  if (video.platform) {
    videoxml.element(
      'video:platform',
      attrBuilder(video, 'platform:relationship'),
      video.platform
    )
  }
  if (video.live) {
    videoxml.element('video:live>', video.live)
  }
}

SitemapItem.prototype.buildXML = function () {
  this.url.children = []
  this.url.attributes = {}
  // xml property
  const props = ['loc', 'lastmod', 'changefreq', 'priority', 'img', 'video', 'links', 'expires', 'androidLink', 'mobile', 'news', 'ampLink']
  // property array size (for loop)
  let ps = 0
  // current property name (for loop)
  let p

  while (ps < props.length) {
    p = props[ps]
    ps++

    if (this[p] && p === 'img') {
      // Image handling
      if (typeof (this[p]) !== 'object' || this[p].length === undefined) {
        // make it an array
        this[p] = [this[p]]
      }
      this[p].forEach(image => {
        const xmlObj = {}
        if (typeof (image) !== 'object') {
          // it’s a string
          // make it an object
          xmlObj['image:loc'] = image
        } else if (image.url) {
          xmlObj['image:loc'] = image.url
        }
        if (image.caption) {
          xmlObj['image:caption'] = {'#cdata': image.caption}
        }
        if (image.geoLocation) {
          xmlObj['image:geo_location'] = image.geoLocation
        }
        if (image.title) {
          xmlObj['image:title'] = {'#cdata': image.title}
        }
        if (image.license) {
          xmlObj['image:license'] = image.license
        }

        this.url.element({'image:image': xmlObj})
      })
    } else if (this[p] && p === 'video') {
      // Image handling
      if (typeof (this[p]) !== 'object' || this[p].length === undefined) {
        // make it an array
        this[p] = [this[p]]
      }
      this[p].forEach(this.buildVideoElement, this)
    } else if (this[p] && p === 'links') {
      this[p].forEach(link => {
        this.url.element({'xhtml:link': {
          '@rel': 'alternate',
          '@hreflang': link.lang,
          '@href': link.url
        }})
      })
    } else if (this[p] && p === 'expires') {
      this.url.element('expires', new Date(this[p]).toISOString())
    } else if (this[p] && p === 'androidLink') {
      this.url.element('xhtml:link', {rel: 'alternate', href: this[p]})
    } else if (this[p] && p === 'mobile') {
      this.url.element('mobile:mobile')
    } else if (p === 'priority' && (this[p] >= 0.0 && this[p] <= 1.0)) {
      this.url.element(p, parseFloat(this[p]).toFixed(1))
    } else if (this[p] && p === 'ampLink') {
      this.url.element('xhtml:link', { rel: 'amphtml', href: this[p] })
    } else if (this[p] && p === 'news') {
      var newsitem = this.url.element('news:news')

      if (this[p].publication) {
        var publication = newsitem.element('news:publication')
        if (this[p].publication.name) {
          publication.element('news:name', this[p].publication.name)
        }
        if (this[p].publication.language) {
          publication.element('news:language', this[p].publication.language)
        }
      }

      if (this[p].access) {
        newsitem.element('news:access', this[p].access)
      }
      if (this[p].genres) {
        newsitem.element('news:genres', this[p].genres)
      }
      if (this[p].publication_date) {
        newsitem.element('news:publication_date', this[p].publication_date)
      }
      if (this[p].title) {
        newsitem.element('news:title', this[p].title)
      }
      if (this[p].keywords) {
        newsitem.element('news:keywords', this[p].keywords)
      }
      if (this[p].stock_tickers) {
        newsitem.element('news:stock_tickers', this[p].stock_tickers)
      }
    } else if (this[p]) {
      this.url.element(p, this[p])
    }
  }

  return this.url
}

/**
 *  Alias for toXML()
 *  @return {String}
 */
SitemapItem.prototype.toString = function () {
  return this.buildXML().toString()
}

/**
 * Sitemap constructor
 * @param {String|Array}  urls
 * @param {String}        hostname    optional
 * @param {Number}        cacheTime   optional in milliseconds; 0 - cache disabled
 * @param {String}        xslUrl            optional
 * @param {String}        xmlNs            optional
 */
function Sitemap (urls, hostname, cacheTime, xslUrl, xmlNs) {
  // This limit is defined by Google. See:
  // http://sitemaps.org/protocol.php#index
  this.limit = 50000

  // Base domain
  this.hostname = hostname

  // URL list for sitemap
  this.urls = []

  // Make copy of object
  if (urls) _.extend(this.urls, (urls instanceof Array) ? urls : [urls])

  // sitemap cache
  this.cacheResetPeriod = cacheTime || 0
  this.cache = ''

  this.xslUrl = xslUrl
  this.xmlNs = xmlNs
  this.root = builder.create('urlset', {encoding: 'UTF-8'})
}

/**
 *  Clear sitemap cache
 */
Sitemap.prototype.clearCache = function () {
  this.cache = ''
}

/**
 *  Can cache be used
 */
Sitemap.prototype.isCacheValid = function () {
  var currTimestamp = ut.getTimestamp()
  return this.cacheResetPeriod && this.cache &&
    (this.cacheSetTimestamp + this.cacheResetPeriod) >= currTimestamp
}

/**
 *  Fill cache
 */
Sitemap.prototype.setCache = function (newCache) {
  this.cache = newCache
  this.cacheSetTimestamp = ut.getTimestamp()
  return this.cache
}

/**
 *  Add url to sitemap
 *  @param {String} url
 */
Sitemap.prototype.add = function (url) {
  return this.urls.push(url)
}

/**
 *  Delete url from sitemap
 *  @param {String} url
 */
Sitemap.prototype.del = function (url) {
  const index_to_remove = []
  let key = ''
  const self = this

  if (typeof url === 'string') {
    key = url
  } else {
    key = url['url']
  }

  // find
  this.urls.forEach(function (elem, index) {
    if (typeof elem === 'string') {
      if (elem === key) {
        index_to_remove.push(index)
      }
    } else {
      if (elem['url'] === key) {
        index_to_remove.push(index)
      }
    }
  })

  // delete
  index_to_remove.forEach(function (elem) {
    self.urls.splice(elem, 1)
  })

  return index_to_remove.length
}

/**
 *  Create sitemap xml
 *  @param {Function}     callback  Callback function with one argument — xml
 */
Sitemap.prototype.toXML = function (callback) {
  if (typeof callback === 'undefined') {
    return this.toString()
  }
  var self = this
  process.nextTick(function () {
    try {
      return callback(null, self.toString())
    } catch (err) {
      return callback(err)
    }
  })
}

var reProto = /^https?:\/\//i

/**
 *  Synchronous alias for toXML()
 *  @return {String}
 */
Sitemap.prototype.toString = function () {
  const self = this
  let xml
  if (this.root.attributes.length) {
    this.root.attributes = []
  }
  if (this.root.children.length) {
    this.root.children = []
  }
  if (!self.xmlNs) {
    this.root.att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
    this.root.att('xmlns:news', 'http://www.google.com/schemas/sitemap-news/0.9')
    this.root.att('xmlns:xhtml', 'http://www.w3.org/1999/xhtml')
    this.root.att('xmlns:mobile', 'http://www.google.com/schemas/sitemap-mobile/1.0')
    this.root.att('xmlns:image', 'http://www.google.com/schemas/sitemap-image/1.1')
    this.root.att('xmlns:video', 'http://www.google.com/schemas/sitemap-video/1.1')
  } else {
    xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset ' + this.xmlNs + '>']
  }

  if (self.xslUrl) {
    xml.splice(1, 0,
      '<?xml-stylesheet type="text/xsl" href="' + self.xslUrl + '"?>')
  }

  if (self.isCacheValid()) {
    return self.cache
  }

  // TODO: if size > limit: create sitemapindex

  self.urls.forEach((elem, index) => {
    // SitemapItem
    // create object with url property
    var smi = (typeof elem === 'string') ? {'url': elem, root: this.root} : Object.assign({root: this.root}, elem)

    // insert domain name
    if (self.hostname) {
      if (!reProto.test(smi.url)) {
        smi.url = urljoin(self.hostname, smi.url)
      }
      if (smi.img) {
        if (typeof smi.img === 'string') {
          // string -> array of objects
          smi.img = [{url: smi.img}]
        }
        if (typeof smi.img === 'object' && smi.img.length === undefined) {
          // object -> array of objects
          smi.img = [smi.img]
        }
        // prepend hostname to all image urls
        smi.img.forEach(function (img) {
          if (!reProto.test(img.url)) {
            img.url = urljoin(self.hostname, img.url)
          }
        })
      }
      if (smi.links) {
        smi.links.forEach(function (link) {
          if (!reProto.test(link.url)) {
            link.url = urljoin(self.hostname, link.url)
          }
        })
      }
    }
    const sitemapItem = new SitemapItem(smi)
    sitemapItem.buildXML()
  })

  return self.setCache(this.root.end())
}

Sitemap.prototype.toGzip = function (callback) {
  var zlib = require('zlib')

  if (typeof callback === 'function') {
    zlib.gzip(this.toString(), callback)
  } else {
    return zlib.gzipSync(this.toString())
  }
}

/**
 * Shortcut for `new SitemapIndex (...)`.
 *
 * @param   {Object}        conf
 * @param   {String|Array}  conf.urls
 * @param   {String}        conf.targetFolder
 * @param   {String}        conf.hostname
 * @param   {Number}        conf.cacheTime
 * @param   {String}        conf.sitemapName
 * @param   {Number}        conf.sitemapSize
 * @param   {String}        conf.xslUrl
 * @return  {SitemapIndex}
 */
function createSitemapIndex (conf) {
  return new SitemapIndex(conf.urls,
    conf.targetFolder,
    conf.hostname,
    conf.cacheTime,
    conf.sitemapName,
    conf.sitemapSize,
    conf.xslUrl,
    conf.gzip,
    conf.callback)
}

/**
 * Builds a sitemap index from urls
 *
 * @param   {Object}    conf
 * @param   {Array}     conf.urls
 * @param   {String}    conf.xslUrl
 * @param   {String}    conf.xmlNs
 * @return  {String}    XML String of SitemapIndex
 */
function buildSitemapIndex (conf) {
  var xml = []
  var lastmod

  xml.push('<?xml version="1.0" encoding="UTF-8"?>')
  if (conf.xslUrl) {
    xml.push('<?xml-stylesheet type="text/xsl" href="' + conf.xslUrl + '"?>')
  }
  if (!conf.xmlNs) {
    xml.push('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
      'xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" ' +
      'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" ' +
      'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">')
  } else {
    xml.push('<sitemapindex ' + conf.xmlNs + '>')
  }

  if (conf.lastmodISO) {
    lastmod = conf.lastmodISO
  } else if (conf.lastmodrealtime) {
    lastmod = new Date().toISOString()
  } else if (conf.lastmod) {
    lastmod = new Date(conf.lastmod).toISOString()
  }

  conf.urls.forEach(function (url) {
    xml.push('<sitemap>')
    xml.push('<loc>' + url + '</loc>')
    if (lastmod) {
      xml.push('<lastmod>' + lastmod + '</lastmod>')
    }
    xml.push('</sitemap>')
  })

  xml.push('</sitemapindex>')

  return xml.join('\n')
}

/**
 * Sitemap index (for several sitemaps)
 * @param {String|Array}  urls
 * @param {String}        targetFolder
 * @param {String}        hostname      optional
 * @param {Number}        cacheTime     optional in milliseconds
 * @param {String}        sitemapName   optional
 * @param {Number}        sitemapSize   optional
 * @param {Number}        xslUrl                optional
 * @param {Boolean}       gzip          optional
 * @param {Function}      callback      optional
 */
function SitemapIndex (urls, targetFolder, hostname, cacheTime, sitemapName, sitemapSize, xslUrl, gzip, callback) {
  var self = this

  self.fs = require('fs')

  // Base domain
  self.hostname = hostname

  if (sitemapName === undefined) {
    self.sitemapName = 'sitemap'
  } else {
    self.sitemapName = sitemapName
  }

  // This limit is defined by Google. See:
  // http://sitemaps.org/protocol.php#index
  self.sitemapSize = sitemapSize

  self.xslUrl = xslUrl

  self.sitemapId = 0

  self.sitemaps = []

  self.targetFolder = '.'

  try {
    if (!self.fs.statSync(targetFolder).isDirectory()) {
      throw new err.UndefinedTargetFolder()
    }
  } catch (err) {
    throw new err.UndefinedTargetFolder()
  }

  self.targetFolder = targetFolder

  // URL list for sitemap
  self.urls = urls || []
  if (!(self.urls instanceof Array)) {
    self.urls = [self.urls]
  }

  self.chunks = ut.chunkArray(self.urls, self.sitemapSize)

  self.callback = callback

  var processesCount = self.chunks.length + 1

  self.chunks.forEach(function (chunk, index) {
    const extension = '.xml' + (gzip ? '.gz' : '')
    const filename = self.sitemapName + '-' + self.sitemapId++ + extension

    self.sitemaps.push(filename)

    var sitemap = createSitemap({
      hostname: self.hostname,
      cacheTime: self.cacheTime, // 600 sec - cache purge period
      urls: chunk,
      xslUrl: self.xslUrl
    })

    var stream = self.fs.createWriteStream(targetFolder + '/' + filename)
    stream.once('open', function (fd) {
      stream.write(gzip ? sitemap.toGzip() : sitemap.toString())
      stream.end()
      processesCount--
      if (processesCount === 0 && typeof self.callback === 'function') {
        self.callback(null, true)
      }
    })
  })

  var sitemapUrls = self.sitemaps.map(function (sitemap, index) {
    return hostname + '/' + sitemap
  })
  var smConf = {urls: sitemapUrls, xslUrl: self.xslUrl, xmlNs: self.xmlNs}
  var xmlString = buildSitemapIndex(smConf)

  var stream = self.fs.createWriteStream(targetFolder + '/' +
    self.sitemapName + '-index.xml')
  stream.once('open', function (fd) {
    stream.write(xmlString)
    stream.end()
    processesCount--
    if (processesCount === 0 && typeof self.callback === 'function') {
      self.callback(null, true)
    }
  })
}
