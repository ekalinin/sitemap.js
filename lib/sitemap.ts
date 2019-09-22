/* eslint-disable camelcase, semi */
/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
import { create, XMLElement } from 'xmlbuilder';
import { SitemapItem } from './sitemap-item';
import {
  ISitemapItemOptionsLoose,
  SitemapItemOptions,
  ISitemapImg,
  ILinkItem,
  EnumYesNo,
  IVideoItem,
  ErrorLevel
} from './types';
import { gzip, gzipSync, CompressCallback } from 'zlib';
import { URL } from 'url'
import { statSync } from 'fs';
import { validateSMIOptions } from './utils';
import { preamble, closetag } from './sitemap-stream';

function boolToYESNO (bool?: boolean | EnumYesNo): EnumYesNo|undefined {
  if (bool === undefined) {
    return bool
  }
  if (typeof bool === 'boolean') {
    return bool ? EnumYesNo.yes : EnumYesNo.no
  }
  return bool
}

export interface ISitemapOptions {
  urls?: (ISitemapItemOptionsLoose | string)[];
  hostname?: string;
  cacheTime?: number;
  xslUrl?: string;
  xmlNs?: string;
  level?: ErrorLevel;
}

export class Sitemap {
  // This limit is defined by Google. See:
  // https://sitemaps.org/protocol.php#index
  limit = 5000
  xmlNs = ''
  cacheSetTimestamp = 0;
  private urls: Map<string, SitemapItemOptions>

  cacheTime: number;
  cache: string;
  root: XMLElement;
  hostname?: string;
  xslUrl?: string;

  /**
   * Sitemap constructor
   * @param {String|Array}  urls
   * @param {String}        hostname    optional
   * @param {Number} [cacheTime=0]       cacheTime   optional in milliseconds; 0 - cache disabled
   * @param {String=}        xslUrl            optional
   * @param {String=}        xmlNs            optional
   * @param {ErrorLevel} [level=ErrorLevel.WARN]    level            optional
   */
  constructor ({
    urls = [],
    hostname,
    cacheTime = 0,
    xslUrl,
    xmlNs,
    level = ErrorLevel.WARN
  }: ISitemapOptions
  = {}) {

    // Base domain
    this.hostname = hostname;

    // sitemap cache
    this.cacheTime = cacheTime;
    this.cache = '';

    this.xslUrl = xslUrl;

    this.root = create('urlset', {encoding: 'UTF-8'})
    if (xmlNs) {
      this.xmlNs = xmlNs;
      const ns = this.xmlNs.split(' ')
      for (const attr of ns) {
        const [k, v] = attr.split('=')
        this.root.attribute(k, v.replace(/^['"]|['"]$/g, ''))
      }
    }

    urls = Array.from(urls)
    this.urls = Sitemap.normalizeURLs(urls, this.hostname)
    for (const [, url] of this.urls) {
      validateSMIOptions(url, level)
    }
  }

  /**
   *  Empty cache and bipass it until set again
   */
  clearCache (): void {
    this.cache = '';
  }

  /**
   * has it been less than cacheTime since cache was set
   *  @returns true if it has been less than cacheTime ms since cache was set
   */
  isCacheValid (): boolean {
    const currTimestamp = Date.now();
    return !!(this.cacheTime && this.cache &&
      (this.cacheSetTimestamp + this.cacheTime) >= currTimestamp);
  }

  /**
   *  stores the passed in string on the instance to be used when toString is
   *  called within the configured cacheTime
   *  @param {string} newCache what you want cached
   *  @returns the passed in string unaltered
   */
  setCache (newCache: string): string {
    this.cache = newCache;
    this.cacheSetTimestamp = Date.now();
    return this.cache;
  }

  private _normalizeURL(url: string | ISitemapItemOptionsLoose): SitemapItemOptions {
    return Sitemap.normalizeURL(url, this.hostname)
  }

  /**
   *  Add url to sitemap
   *  @param {String | ISitemapItemOptionsLoose} url
   *  @param {ErrorLevel} [level=ErrorLevel.WARN] level
   */
  add (url: string | ISitemapItemOptionsLoose, level?: ErrorLevel): number {
    const smi = this._normalizeURL(url)
    validateSMIOptions(smi, level)
    return this.urls.set(smi.url, smi).size;
  }

  /**
   * For checking whether the url has been added or not
   * @param {string | ISitemapItemOptionsLoose} url The url you wish to check
   * @returns true if the sitemap has the passed in url
   */
  contains (url: string | ISitemapItemOptionsLoose): boolean {
    return this.urls.has(this._normalizeURL(url).url)
  }

  /**
   *  Delete url from sitemap
   *  @param {String | SitemapItemOptions} url
   *  @returns boolean whether the item was removed
   */
  del (url: string | ISitemapItemOptionsLoose): boolean {

    return this.urls.delete(this._normalizeURL(url).url)
  }

  /**
   *  Alias for toString
   * @param {boolean} [pretty=false] whether xml should include whitespace
   */
  toXML (pretty?: boolean): string {
    return this.toString(pretty);
  }

  /**
   * Converts the passed in sitemap entry into one capable of being consumed by SitemapItem
   * @param {string | ISitemapItemOptionsLoose} elem the string or object to be converted
   * @param {string} hostname
   * @returns SitemapItemOptions a strict sitemap item option
   */
  static normalizeURL (elem: string | ISitemapItemOptionsLoose, hostname?: string): SitemapItemOptions {
    // SitemapItem
    // create object with url property
    let smi: SitemapItemOptions = {
      img: [],
      video: [],
      links: [],
      url: ''
    }
    let smiLoose: ISitemapItemOptionsLoose
    if (typeof elem === 'string') {
      smi.url = elem
      smiLoose = {url: elem}
    } else {
      smiLoose = elem
    }

    smi.url = (new URL(smiLoose.url, hostname)).toString();

    let img: ISitemapImg[] = []
    if (smiLoose.img) {
      if (typeof smiLoose.img === 'string') {
        // string -> array of objects
        smiLoose.img = [{ url: smiLoose.img }];
      } else if (!Array.isArray(smiLoose.img)) {
        // object -> array of objects
        smiLoose.img = [smiLoose.img];
      }

      img = smiLoose.img.map((el): ISitemapImg => typeof el === 'string' ? {url: el} : el);
    }
    // prepend hostname to all image urls
    smi.img = img.map((el: ISitemapImg): ISitemapImg => (
      {...el, url: (new URL(el.url, hostname)).toString()}
    ));

    let links: ILinkItem[] = []
    if (smiLoose.links) {
      links = smiLoose.links
    }
    smi.links = links.map((link): ILinkItem => {
      return {...link, url: (new URL(link.url, hostname)).toString()};
    });

    if (smiLoose.video) {
      if (!Array.isArray(smiLoose.video)) {
        // make it an array
        smiLoose.video = [smiLoose.video]
      }
      smi.video = smiLoose.video.map((video): IVideoItem => {
        const nv: IVideoItem = {
          ...video,
          /* eslint-disable-next-line @typescript-eslint/camelcase */
          family_friendly: boolToYESNO(video.family_friendly),
          live: boolToYESNO(video.live),
          /* eslint-disable-next-line @typescript-eslint/camelcase */
          requires_subscription: boolToYESNO(video.requires_subscription),
          tag: [],
          rating: undefined
        }

        if (video.tag !== undefined) {
          nv.tag = !Array.isArray(video.tag) ? [video.tag] : video.tag
        }

        if (video.rating !== undefined) {
          if (typeof video.rating === 'string') {
            nv.rating = parseFloat(video.rating)
          } else {
            nv.rating = video.rating
          }
        }

        if (video.view_count !== undefined) {
          /* eslint-disable-next-line @typescript-eslint/camelcase */
          nv.view_count = '' + video.view_count
        }
        return nv
      })
    }

    // If given a file to use for last modified date
    if (smiLoose.lastmodfile) {
      const { mtime } = statSync(smiLoose.lastmodfile)

      smi.lastmod = (new Date(mtime)).toISOString()

      // The date of last modification (YYYY-MM-DD)
    } else if (smiLoose.lastmodISO) {
      smi.lastmod = (new Date(smiLoose.lastmodISO)).toISOString()
    } else if (smiLoose.lastmod) {
      smi.lastmod = (new Date(smiLoose.lastmod)).toISOString()
    }

    smi = {...smiLoose, ...smi}
    return smi
  }

  /**
   * Normalize multiple urls
   * @param {(string | ISitemapItemOptionsLoose)[]} urls array of urls to be normalized
   * @param {string=} hostname
   * @returns a Map of url to SitemapItemOption
   */
  static normalizeURLs (urls: (string | ISitemapItemOptionsLoose)[], hostname?: string): Map<string, SitemapItemOptions> {
    const urlMap = new Map<string, SitemapItemOptions>()
    urls.forEach((elem): void => {
      const smio = Sitemap.normalizeURL(elem, hostname)
      urlMap.set(smio.url, smio)
    })
    return urlMap
  }

  /**
   *  Converts the urls stored in an instance of Sitemap to a valid sitemap xml document
   *  as a string. Accepts a boolean as its first argument to designate on whether to
   *  pretty print. Defaults to false.
   *  @return {String}
   */
  toString (pretty = false): string {
    if (this.isCacheValid()) {
      return this.cache;
    }

    if (this.urls && !this.xslUrl && !this.xmlNs && !pretty) {
      let xml = preamble
      this.urls.forEach((url): void => {
        xml += SitemapItem.justItem(url)
      });
      xml += closetag
      return this.setCache(xml)
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

    // TODO: if size > limit: create sitemapindex
    for (const [, smi] of this.urls) {
      (new SitemapItem(smi, this.root)).buildXML()
    }
    let opts
    if (pretty) {
      opts = {pretty}
    }
    return this.setCache(this.root.end(opts))
  }

  /**
   * like toString, it builds the xmlDocument, then it runs gzip on the
   * resulting string and returns it as a Buffer via callback or direct
   * invokation
   * @param {CompressCallback=} callback executes callback on completion with a buffer parameter
   * @returns a Buffer if no callback is provided
   */
  toGzip (callback: CompressCallback): void;
  toGzip (): Buffer;
  toGzip (callback?: CompressCallback): Buffer|void {
    if (typeof callback === 'function') {
      gzip(this.toString(), callback);
    } else {
      return gzipSync(this.toString());
    }
  }
}

/**
 * Shortcut for `new Sitemap (...)`.
 *
 * @param   {Object}        conf
 * @param   {String}        conf.hostname
 * @param   {String|Array}  conf.urls
 * @param   {Number}        conf.cacheTime
 * @param   {String}        conf.xslUrl
 * @param   {String}        conf.xmlNs
 * @param   {ErrorLevel} [level=ErrorLevel.WARN]    level            optional
 * @return  {Sitemap}
 */
export function createSitemap({
  urls,
  hostname,
  cacheTime,
  xslUrl,
  xmlNs,
  level
}: ISitemapOptions): Sitemap {
  return new Sitemap({
    urls,
    hostname,
    cacheTime,
    xslUrl,
    xmlNs,
    level
  });
}
