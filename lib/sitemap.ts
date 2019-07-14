/* eslint-disable camelcase, semi */
/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
import { create, XMLElement } from 'xmlbuilder';
import { SitemapItem } from './sitemap-item';
import { SitemapItemOptions, ISitemapImg, ILinkItem } from './types';
import { gzip, gzipSync, CompressCallback } from 'zlib';
import { URL } from 'url'

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
  urls?: (SitemapItemOptions|string)[];
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
    urls?: (SitemapItemOptions|string)[];
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

  private _normalizeURL(url: string | SitemapItemOptions): SitemapItemOptions {
    return Sitemap.normalizeURL(url, this.root, this.hostname)
  }

  /**
   *  Add url to sitemap
   *  @param {String} url
   */
  add (url: string | SitemapItemOptions): number {
    const smi = this._normalizeURL(url)
    return this.urls.set(smi.url, smi).size;
  }

  contains (url: string | SitemapItemOptions): boolean {
    return this.urls.has(this._normalizeURL(url).url)
  }

  /**
   *  Delete url from sitemap
   *  @param {String | SitemapItemOptions} url
   *  @returns boolean whether the item was removed
   */
  del (url: string | SitemapItemOptions): boolean {

    return this.urls.delete(this._normalizeURL(url).url)
  }

  /**
   *  Alias for toString
   */
  toXML (): string {
    return this.toString();
  }

  static normalizeURL (elem: string | SitemapItemOptions, root: XMLElement, hostname?: string): SitemapItemOptions {
    // SitemapItem
    // create object with url property
    const smi: SitemapItemOptions = (typeof elem === 'string') ? {'url': elem, root} : {root, ...elem}
    let img: ISitemapImg[] = []
    if (smi.img) {
      if (typeof smi.img === 'string') {
        // string -> array of objects
        smi.img = [{ url: smi.img }];
      } else if (!Array.isArray(smi.img)) {
        // object -> array of objects
        smi.img = [smi.img];
      }

      img = smi.img.map((el): ISitemapImg => typeof el === 'string' ? {url: el} : el);
    }
    smi.url = (new URL(smi.url, hostname)).toString();
    // prepend hostname to all image urls
    smi.img = img.map((el: ISitemapImg): ISitemapImg => (
      {...el, url: (new URL(el.url, hostname)).toString()}
    ));

    let links: ILinkItem[] = []
    if (smi.links) {
      links = smi.links
    }
    smi.links = links.map((link): ILinkItem => {
      return {...link, url: (new URL(link.url, hostname)).toString()};
    });
    return smi
  }

  static normalizeURLs (urls: (string | SitemapItemOptions)[], root: XMLElement, hostname?: string): Map<string, SitemapItemOptions> {
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
