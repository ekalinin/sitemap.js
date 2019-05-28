import builder = require('xmlbuilder');
import * as SitemapItem from './sitemap-item';
export type Callback<E, T> = (err: E, data: T) => void;
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
export declare function createSitemap(conf: {
    urls: string | Sitemap["urls"];
    hostname: string;
    cacheTime: number;
    xslUrl: string;
    xmlNs?: string;
}): Sitemap;
export declare class Sitemap {
    limit: number;
    hostname: string;
    urls: (string | SitemapItem.SitemapItemOptions)[];
    cacheResetPeriod: number;
    cache: string;
    xslUrl: string;
    xmlNs: string;
    root: builder.XMLElementOrXMLNode & {
        attributes?: [];
        children?: [];
        instructionBefore?(...argv: any[]): any;
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
    constructor(urls: string | Sitemap["urls"], hostname: string, cacheTime: number, xslUrl: string, xmlNs: string);
    /**
     *  Clear sitemap cache
     */
    clearCache(): void;
    /**
     *  Can cache be used
     */
    isCacheValid(): boolean;
    /**
     *  Fill cache
     */
    setCache(newCache: string): string;
    /**
     *  Add url to sitemap
     *  @param {String} url
     */
    add(url: string): number;
    /**
     *  Delete url from sitemap
     *  @param {String} url
     */
    del(url: any): number;
    /**
     *  Create sitemap xml
     *  @param {Function}     callback  Callback function with one argument — xml
     */
    toXML(callback: Callback<Error, string>): void
    toXML(): string;
    /**
     *  Synchronous alias for toXML()
     *  @return {String}
     */
    toString(): string;
  // returns Buffer | void - not sure how to import
    // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/node/v10/globals.d.ts#L229
    toGzip(callback?: (error: Error | null, result: Buffer) => void): any;
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
export declare function createSitemapIndex(conf: any): SitemapIndex;
/**
 * Builds a sitemap index from urls
 *
 * @param   {Object}    conf
 * @param   {Array}     conf.urls
 * @param   {String}    conf.xslUrl
 * @param   {String}    conf.xmlNs
 * @return  {String}    XML String of SitemapIndex
 */
export declare function buildSitemapIndex(conf: {
    urls: any[];
    xslUrl: string;
    xmlNs: string;
    lastmodISO?: Date;
    lastmodrealtime?: boolean;
    lastmod?: number | string;
}): string;
/**
 * Sitemap index (for several sitemaps)
 */
declare class SitemapIndex {
    hostname: string;
    sitemapName: string;
    sitemapSize: number;
    xslUrl: string;
    sitemapId: number;
    sitemaps: unknown[];
    targetFolder: string;
    urls: unknown[];
    chunks: any;
    callback: any;
    cacheTime: number;
    xmlNs: string;
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
    constructor(urls: string | string[], targetFolder: string, hostname?: string, cacheTime?: number, sitemapName?: string, sitemapSize?: number, xslUrl?: string, gzip?: boolean, callback?: any);
}
export { SitemapItem };
