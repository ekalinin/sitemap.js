/* eslint-disable camelcase, semi, space-before-function-paren, padded-blocks */
/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
'use strict';

import { UndefinedTargetFolder } from './errors';
import urljoin = require('url-join');
import fs = require('fs');
import builder = require('xmlbuilder');
import SitemapItem, { ICallback, ISitemapImg, SitemapItemOptions } from './sitemap-item';
import chunk = require('lodash/chunk');
import { Profiler } from 'inspector';

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
export function createSitemap(conf: {
  urls: string | Sitemap["urls"],
  hostname: string,
  cacheTime: number,
  xslUrl: string,
  xmlNs?: string,
}) {
  return new Sitemap(conf.urls, conf.hostname, conf.cacheTime, conf.xslUrl, conf.xmlNs);
}

const reProto = /^https?:\/\//i;

export class Sitemap {

  limit: number;
  hostname: string
  urls: (string | SitemapItemOptions)[]

  cacheResetPeriod: number;
  cache: string
  xslUrl: string
  xmlNs: string
  root: builder.XMLElementOrXMLNode & {
    attributes?: [],
    children?: [],

    instructionBefore?(...argv)
  };
  cacheSetTimestamp: number;


  /**
   * Sitemap constructor
   * @param {String|Array}  urls
   * @param {String}        hostname    optional
   * @param {Number}        cacheTime   optional in milliseconds; 0 - cache disabled
   * @param {String}        xslUrl            optional
   * @param {String}        xmlNs            optional
   */
  constructor(urls: string | Sitemap["urls"], hostname: string, cacheTime: number, xslUrl: string, xmlNs: string) {
    // This limit is defined by Google. See:
    // http://sitemaps.org/protocol.php#index
    this.limit = 50000

    // Base domain
    this.hostname = hostname;

    // URL list for sitemap
    this.urls = [];

    // Make copy of object
    if (urls) this.urls = Array.isArray(urls) ? Array.from(urls) : [urls];

    // sitemap cache
    this.cacheResetPeriod = cacheTime || 0;
    this.cache = '';

    this.xslUrl = xslUrl;
    this.xmlNs = xmlNs;
    this.root = builder.create('urlset', {encoding: 'UTF-8'})
    if (this.xmlNs) {
      const ns = this.xmlNs.split(' ')
      for (let attr of ns) {
        const [k, v] = attr.split('=')
        this.root.attribute(k, v.replace(/^['"]|['"]$/g, ''))
      }
    }
  }

  /**
   *  Clear sitemap cache
   */
  clearCache() {
    this.cache = '';
  }

  /**
   *  Can cache be used
   */
  isCacheValid() {
    let currTimestamp = Date.now();
    return this.cacheResetPeriod && this.cache &&
      (this.cacheSetTimestamp + this.cacheResetPeriod) >= currTimestamp;
  }

  /**
   *  Fill cache
   */
  setCache(newCache: string) {
    this.cache = newCache;
    this.cacheSetTimestamp = Date.now();
    return this.cache;
  }

  /**
   *  Add url to sitemap
   *  @param {String} url
   */
  add(url: string) {
    return this.urls.push(url);
  }

  /**
   *  Delete url from sitemap
   *  @param {String} url
   */
  del(url: string | {
    url: string
  }) {
    const index_to_remove = []
    let key = ''

    if (typeof url === 'string') {
      key = url;
    } else {
      // @ts-ignore
      key = url.url;
    }

    // find
    this.urls.forEach((elem, index) => {
      if (typeof elem === 'string') {
        if (elem === key) {
          index_to_remove.push(index);
        }
      } else {
        if (elem.url === key) {
          index_to_remove.push(index);
        }
      }
    });

    // delete
    index_to_remove.forEach((elem) => this.urls.splice(elem, 1));

    return index_to_remove.length;
  }

  /**
   *  Create sitemap xml
   *  @param {Function}     callback  Callback function with one argument — xml
   */
  toXML(callback: ICallback<Error, string>) {
    if (typeof callback === 'undefined') {
      return this.toString();
    }

    process.nextTick(() => {
      try {
        return callback(null, this.toString());
      } catch (err) {
        return callback(err);
      }
    });
  }

  /**
   *  Synchronous alias for toXML()
   *  @return {String}
   */
  toString() {
    if (this.root.attributes.length) {
      this.root.attributes = []
    }
    if (this.root.children.length) {
      this.root.children = []
    }
    if (!this.xmlNs) {
      this.root.att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
      this.root.att('xmlns:news', 'http://www.google.com/schemas/sitemap-news/0.9')
      this.root.att('xmlns:xhtml', 'http://www.w3.org/1999/xhtml')
      this.root.att('xmlns:mobile', 'http://www.google.com/schemas/sitemap-mobile/1.0')
      this.root.att('xmlns:image', 'http://www.google.com/schemas/sitemap-image/1.1')
      this.root.att('xmlns:video', 'http://www.google.com/schemas/sitemap-video/1.1')
    }

    if (this.xslUrl) {
      this.root.instructionBefore('xml-stylesheet', `type="text/xsl" href="${this.xslUrl}"`)
    }

    if (this.isCacheValid()) {
      return this.cache;
    }

    // TODO: if size > limit: create sitemapindex

    this.urls.forEach((elem, index) => {
      // SitemapItem
      // create object with url property
      let smi: SitemapItemOptions = (typeof elem === 'string') ? {'url': elem, root: this.root} : Object.assign({root: this.root}, elem)

      // insert domain name
      if (this.hostname) {
        if (!reProto.test(smi.url)) {
          smi.url = urljoin(this.hostname, smi.url);
        }
        if (smi.img) {
          if (typeof smi.img === 'string') {
            // string -> array of objects
            smi.img = [{url: smi.img as string}];
          }
          if (typeof smi.img === 'object' && smi.img.length === undefined) {
            // object -> array of objects
            smi.img = [smi.img as ISitemapImg];
          }
          // prepend hostname to all image urls
          (smi.img as ISitemapImg[]).forEach(img => {
            if (!reProto.test(img.url)) {
              img.url = urljoin(this.hostname, img.url);
            }
          });
        }
        if (smi.links) {
          smi.links.forEach(link => {
            if (!reProto.test(link.url)) {
              link.url = urljoin(this.hostname, link.url);
            }
          });
        }
      }
      const sitemapItem = new SitemapItem(smi)
      sitemapItem.buildXML()
    });

    return this.setCache(this.root.end())
  }

  toGzip(callback: ICallback<Error, Buffer>): void
  toGzip(): Buffer
  toGzip(callback?: ICallback<Error, Buffer>) {
    const zlib: typeof import('zlib') = require('zlib');

    if (typeof callback === 'function') {
      zlib.gzip(this.toString(), callback);
    } else {
      return zlib.gzipSync(this.toString());
    }
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
export function createSitemapIndex (conf) {
  return new SitemapIndex(conf.urls,
    conf.targetFolder,
    conf.hostname,
    conf.cacheTime,
    conf.sitemapName,
    conf.sitemapSize,
    conf.xslUrl,
    conf.gzip,
    conf.callback);
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
export function buildSitemapIndex (conf: {
  urls: any[],
  xslUrl: string,
  xmlNs: string,

  lastmodISO?: Date
  lastmodrealtime?: boolean,
  lastmod?: number | string
}) {
  let xml = [];
  let lastmod;

  xml.push('<?xml version="1.0" encoding="UTF-8"?>');
  if (conf.xslUrl) {
    xml.push('<?xml-stylesheet type="text/xsl" href="' + conf.xslUrl + '"?>');
  }
  if (!conf.xmlNs) {
    xml.push('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
      'xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" ' +
      'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" ' +
      'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">');
  } else {
    xml.push('<sitemapindex ' + conf.xmlNs + '>')
  }

  if (conf.lastmodISO) {
    lastmod = conf.lastmodISO;
  } else if (conf.lastmodrealtime) {
    lastmod = new Date().toISOString();
  } else if (conf.lastmod) {
    lastmod = new Date(conf.lastmod).toISOString();
  }


  conf.urls.forEach(url => {
    if (url instanceof Object) {
      lastmod = url.lastmod ? url.lastmod : lastmod;

      url = url.url;
    }
    xml.push('<sitemap>');
    xml.push('<loc>' + url + '</loc>');
    if (lastmod) {
      xml.push('<lastmod>' + lastmod + '</lastmod>');
    }
    xml.push('</sitemap>');
  });

  xml.push('</sitemapindex>');

  return xml.join('\n');
}

/**
 * Sitemap index (for several sitemaps)
 */
class SitemapIndex {

  hostname: string;
  sitemapName: string;
  sitemapSize: number
  xslUrl: string
  sitemapId: number
  sitemaps: unknown[]
  targetFolder: string;
  urls: unknown[]

  chunks
  callback?: ICallback<Error, boolean>
  cacheTime: number

  xmlNs: string


  /**
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
  constructor (urls: string | string[], targetFolder: string, hostname?: string, cacheTime?: number, sitemapName?: string, sitemapSize?: number, xslUrl?: string, gzip?: boolean, callback?: ICallback<Error, boolean>) {
    // Base domain
    this.hostname = hostname;

    if (sitemapName === undefined) {
      this.sitemapName = 'sitemap';
    } else {
      this.sitemapName = sitemapName;
    }

    // This limit is defined by Google. See:
    // http://sitemaps.org/protocol.php#index
    this.sitemapSize = sitemapSize;

    this.xslUrl = xslUrl;

    this.sitemapId = 0;

    this.sitemaps = [];

    this.targetFolder = '.';

    try {
      if (!fs.statSync(targetFolder).isDirectory()) {
        throw new UndefinedTargetFolder();
      }
    } catch (err) {
      throw new err.UndefinedTargetFolder();
    }

    this.targetFolder = targetFolder;

    // URL list for sitemap
    // @ts-ignore
    this.urls = urls || [];
    if (!Array.isArray(this.urls)) {
      // @ts-ignore
      this.urls = [this.urls]
    }

    this.chunks = chunk(this.urls, this.sitemapSize);

    this.callback = callback;

    let processesCount = this.chunks.length + 1;

    this.chunks.forEach((chunk, index) => {
      const extension = '.xml' + (gzip ? '.gz' : '');
      const filename = this.sitemapName + '-' + this.sitemapId++ + extension;

      this.sitemaps.push(filename);

      let sitemap = createSitemap({
        hostname: this.hostname,
        cacheTime: this.cacheTime, // 600 sec - cache purge period
        urls: chunk,
        xslUrl: this.xslUrl
      });

      let stream = fs.createWriteStream(targetFolder + '/' + filename);
      stream.once('open', fd => {
        stream.write(gzip ? sitemap.toGzip() : sitemap.toString());
        stream.end();
        processesCount--;
        if (processesCount === 0 && typeof this.callback === 'function') {
          this.callback(null, true);
        }
      });

    });

    let sitemapUrls = this.sitemaps.map(sitemap => hostname + '/' + sitemap);
    let smConf = {urls: sitemapUrls, xslUrl: this.xslUrl, xmlNs: this.xmlNs};
    let xmlString = buildSitemapIndex(smConf);

    let stream = fs.createWriteStream(targetFolder + '/' +
      this.sitemapName + '-index.xml');
    stream.once('open', (fd) => {
      stream.write(xmlString);
      stream.end();
      processesCount--;
      if (processesCount === 0 && typeof this.callback === 'function') {
        this.callback(null, true);
      }
    });
  }
}

export { SitemapItem }
