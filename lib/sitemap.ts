/* eslint-disable camelcase, semi */
/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
import { create, XMLElement } from 'xmlbuilder';
import { SitemapItem } from './sitemap-item';
import { ISitemapItemOptionsLoose, SitemapItemOptions, ISitemapImg, ILinkItem, EnumYesNo, IVideoItem } from './types';
import { gzip, gzipSync, CompressCallback } from 'zlib';
import { URL } from 'url'
import { statSync } from 'fs';

function boolToYESNO (bool?: boolean | EnumYesNo): EnumYesNo|undefined {
  if (bool === undefined) {
    return bool
  }
  if (typeof bool === 'boolean') {
    return bool ? EnumYesNo.yes : EnumYesNo.no
  }
  return bool
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
 * @return  {Sitemap}
 */
export function createSitemap({
  urls,
  hostname,
  cacheTime,
  xslUrl,
  xmlNs
}: {
  urls?: (ISitemapItemOptionsLoose|string)[];
  hostname?: string;
  cacheTime?: number;
  xslUrl?: string;
  xmlNs?: string;
}): Sitemap {
  // cleaner diff
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return new Sitemap({
    urls,
    hostname,
    cacheTime,
    xslUrl,
    xmlNs
  });
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
   * @param {Number}        cacheTime   optional in milliseconds; 0 - cache disabled
   * @param {String}        xslUrl            optional
   * @param {String}        xmlNs            optional
   */
  constructor ({
    urls = [],
    hostname,
    cacheTime = 0,
    xslUrl,
    xmlNs
  }: {
    urls?: (ISitemapItemOptionsLoose|string)[];
    hostname?: string;
    cacheTime?: number;
    xslUrl?: string;
    xmlNs?: string;
  }
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
      for (let attr of ns) {
        const [k, v] = attr.split('=')
        this.root.attribute(k, v.replace(/^['"]|['"]$/g, ''))
      }
    }

    this.urls = Sitemap.normalizeURLs(Array.from(urls), this.root, this.hostname)
  }

  /**
   *  Clear sitemap cache
   */
  clearCache (): void {
    this.cache = '';
  }

  /**
   *  Can cache be used
   */
  isCacheValid (): boolean {
    let currTimestamp = Date.now();
    return !!(this.cacheTime && this.cache &&
      (this.cacheSetTimestamp + this.cacheTime) >= currTimestamp);
  }

  /**
   *  Fill cache
   */
  setCache (newCache: string): string {
    this.cache = newCache;
    this.cacheSetTimestamp = Date.now();
    return this.cache;
  }

  private _normalizeURL(url: string | ISitemapItemOptionsLoose): SitemapItemOptions {
    return Sitemap.normalizeURL(url, this.root, this.hostname)
  }

  /**
   *  Add url to sitemap
   *  @param {String} url
   */
  add (url: string | ISitemapItemOptionsLoose): number {
    const smi = this._normalizeURL(url)
    return this.urls.set(smi.url, smi).size;
  }

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
   */
  toXML (): string {
    return this.toString();
  }

  static normalizeURL (elem: string | ISitemapItemOptionsLoose, root?: XMLElement, hostname?: string): SitemapItemOptions {
    // SitemapItem
    // create object with url property
    let smi: SitemapItemOptions = {
      img: [],
      video: [],
      links: [],
      url: '',
      root
    }
    let smiLoose: ISitemapItemOptionsLoose
    if (typeof elem === 'string') {
      smi.url = elem
      smiLoose = {url: elem, root}
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
        if (nv.rating !== undefined && (nv.rating < 0 || nv.rating > 5)) {
          console.warn(smi.url, nv.title, `rating ${nv.rating} must be between 0 and 5 inclusive`)
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

  static normalizeURLs (urls: (string | ISitemapItemOptionsLoose)[], root?: XMLElement, hostname?: string): Map<string, SitemapItemOptions> {
    const urlMap = new Map<string, SitemapItemOptions>()
    urls.forEach((elem): void => {
      const smio = Sitemap.normalizeURL(elem, root, hostname)
      urlMap.set(smio.url, smio)
    })
    return urlMap
  }

  /**
   *  Synchronous alias for toXML()
   *  @return {String}
   */
  toString (): string {
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

    for (let [, smi] of this.urls) {
      (new SitemapItem(smi)).buildXML()
    }

    return this.setCache(this.root.end())
  }

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
