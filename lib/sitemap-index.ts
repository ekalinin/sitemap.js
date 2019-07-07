import { statSync, createWriteStream } from 'fs';
import { Sitemap, createSitemap } from './sitemap'
import { ICallback } from './types';
import { UndefinedTargetFolder } from './errors';
/* eslint-disable @typescript-eslint/no-var-requires */
const chunk = require('lodash.chunk');
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
export function createSitemapIndex (conf: {
  urls: SitemapIndex["urls"];
  targetFolder: SitemapIndex["targetFolder"];
  hostname?: SitemapIndex["hostname"];
  cacheTime?: SitemapIndex["cacheTime"];
  sitemapName?: SitemapIndex["sitemapName"];
  sitemapSize?: SitemapIndex["sitemapSize"];
  xslUrl?: SitemapIndex["xslUrl"];
  gzip?: boolean;
  callback?: SitemapIndex["callback"];
}): SitemapIndex {
  // cleaner diff
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
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
  urls: Sitemap["urls"];
  xslUrl?: string;
  xmlNs?: string;

  lastmodISO?: string;
  lastmodrealtime?: boolean;
  lastmod?: number | string;
}): string {
  let xml = [];
  let lastmod = '';

  xml.push('<?xml version="1.0" encoding="UTF-8"?>');
  if (conf.xslUrl) {
    xml.push('<?xml-stylesheet type="text/xsl" href="' + conf.xslUrl + '"?>');
  }
  if (!conf.xmlNs) {
    xml.push('<sitemapindex xmlns="https://www.sitemaps.org/schemas/sitemap/0.9" ' +
      'xmlns:mobile="https://www.google.com/schemas/sitemap-mobile/1.0" ' +
      'xmlns:image="https://www.google.com/schemas/sitemap-image/1.1" ' +
      'xmlns:video="https://www.google.com/schemas/sitemap-video/1.1">');
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


  conf.urls.forEach((url): void => {
    if (url instanceof Object && url.url) {
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

  hostname?: string;
  sitemapName: string;
  sitemapSize?: number
  xslUrl?: string
  sitemapId: number
  sitemaps: string[]
  targetFolder: string;
  urls: Sitemap["urls"]

  chunks: Sitemap["urls"][]
  callback?: ICallback<Error, boolean>
  cacheTime?: number

  xmlNs?: string


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
  constructor (
    urls: Sitemap["urls"],
    targetFolder: string,
    hostname?: string,
    cacheTime?: number,
    sitemapName?: string,
    sitemapSize?: number,
    xslUrl?: string,
    gzip?: boolean,
    callback?: ICallback<Error, boolean>
  ) {
    // Base domain
    this.hostname = hostname;

    if (sitemapName === undefined) {
      this.sitemapName = 'sitemap';
    } else {
      this.sitemapName = sitemapName;
    }

    // This limit is defined by Google. See:
    // https://sitemaps.org/protocol.php#index
    this.sitemapSize = sitemapSize;

    this.xslUrl = xslUrl;

    this.sitemapId = 0;

    this.sitemaps = [];

    this.targetFolder = '.';

    try {
      if (!statSync(targetFolder).isDirectory()) {
        throw new UndefinedTargetFolder();
      }
    } catch (err) {
      throw new UndefinedTargetFolder();
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

    this.chunks.forEach((chunk: Sitemap["urls"], index: number): void => {
      const extension = '.xml' + (gzip ? '.gz' : '');
      const filename = this.sitemapName + '-' + this.sitemapId++ + extension;

      this.sitemaps.push(filename);

      let sitemap = createSitemap({
        hostname: this.hostname,
        cacheTime: this.cacheTime, // 600 sec - cache purge period
        urls: chunk,
        xslUrl: this.xslUrl
      });

      let stream = createWriteStream(targetFolder + '/' + filename);
      stream.once('open', (fd): void => {
        stream.write(gzip ? sitemap.toGzip() : sitemap.toString());
        stream.end();
        processesCount--;
        if (processesCount === 0 && typeof this.callback === 'function') {
          this.callback(undefined, true);
        }
      });

    });

    let sitemapUrls = this.sitemaps.map((sitemap): string  => hostname + '/' + sitemap);
    let smConf = {urls: sitemapUrls, xslUrl: this.xslUrl, xmlNs: this.xmlNs};
    let xmlString = buildSitemapIndex(smConf);

    let stream = createWriteStream(targetFolder + '/' +
      this.sitemapName + '-index.xml');
    stream.once('open', (fd): void => {
      stream.write(xmlString);
      stream.end();
      processesCount--;
      if (processesCount === 0 && typeof this.callback === 'function') {
        this.callback(undefined, true);
      }
    });
  }
}
