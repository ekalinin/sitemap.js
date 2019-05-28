/* eslint-disable camelcase, semi, space-before-function-paren, padded-blocks */
/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = require("./errors");
const urljoin = require("url-join");
const fs = require("fs");
const builder = require("xmlbuilder");
const sitemap_item_1 = require("./sitemap-item");
exports.SitemapItem = sitemap_item_1.default;
const chunk = require("lodash/chunk");
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
function createSitemap(conf) {
    return new Sitemap(conf.urls, conf.hostname, conf.cacheTime, conf.xslUrl, conf.xmlNs);
}
exports.createSitemap = createSitemap;
const reProto = /^https?:\/\//i;
class Sitemap {
    /**
     * Sitemap constructor
     * @param {String|Array}  urls
     * @param {String}        hostname    optional
     * @param {Number}        cacheTime   optional in milliseconds; 0 - cache disabled
     * @param {String}        xslUrl            optional
     * @param {String}        xmlNs            optional
     */
    constructor(urls, hostname, cacheTime, xslUrl, xmlNs) {
        // This limit is defined by Google. See:
        // http://sitemaps.org/protocol.php#index
        this.limit = 50000;
        // Base domain
        this.hostname = hostname;
        // URL list for sitemap
        this.urls = [];
        // Make copy of object
        if (urls)
            this.urls = Array.isArray(urls) ? Array.from(urls) : [urls];
        // sitemap cache
        this.cacheResetPeriod = cacheTime || 0;
        this.cache = '';
        this.xslUrl = xslUrl;
        this.xmlNs = xmlNs;
        this.root = builder.create('urlset', { encoding: 'UTF-8' });
        if (this.xmlNs) {
            const ns = this.xmlNs.split(' ');
            for (let attr of ns) {
                const [k, v] = attr.split('=');
                this.root.attribute(k, v.replace(/^['"]|['"]$/g, ''));
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
    setCache(newCache) {
        this.cache = newCache;
        this.cacheSetTimestamp = Date.now();
        return this.cache;
    }
    /**
     *  Add url to sitemap
     *  @param {String} url
     */
    add(url) {
        return this.urls.push(url);
    }
    /**
     *  Delete url from sitemap
     *  @param {String} url
     */
    del(url) {
        const index_to_remove = [];
        let key = '';
        if (typeof url === 'string') {
            key = url;
        }
        else {
            // @ts-ignore
            key = url.url;
        }
        // find
        this.urls.forEach((elem, index) => {
            if (typeof elem === 'string') {
                if (elem === key) {
                    index_to_remove.push(index);
                }
            }
            else {
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
    toXML(callback) {
        if (typeof callback === 'undefined') {
            return this.toString();
        }
        process.nextTick(() => {
            try {
                return callback(null, this.toString());
            }
            catch (err) {
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
            this.root.attributes = [];
        }
        if (this.root.children.length) {
            this.root.children = [];
        }
        if (!this.xmlNs) {
            this.root.att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');
            this.root.att('xmlns:news', 'http://www.google.com/schemas/sitemap-news/0.9');
            this.root.att('xmlns:xhtml', 'http://www.w3.org/1999/xhtml');
            this.root.att('xmlns:mobile', 'http://www.google.com/schemas/sitemap-mobile/1.0');
            this.root.att('xmlns:image', 'http://www.google.com/schemas/sitemap-image/1.1');
            this.root.att('xmlns:video', 'http://www.google.com/schemas/sitemap-video/1.1');
        }
        if (this.xslUrl) {
            this.root.instructionBefore('xml-stylesheet', `type="text/xsl" href="${this.xslUrl}"`);
        }
        if (this.isCacheValid()) {
            return this.cache;
        }
        // TODO: if size > limit: create sitemapindex
        this.urls.forEach((elem, index) => {
            // SitemapItem
            // create object with url property
            let smi = (typeof elem === 'string') ? { 'url': elem, root: this.root } : Object.assign({ root: this.root }, elem);
            // insert domain name
            if (this.hostname) {
                if (!reProto.test(smi.url)) {
                    smi.url = urljoin(this.hostname, smi.url);
                }
                if (smi.img) {
                    if (typeof smi.img === 'string') {
                        // string -> array of objects
                        smi.img = [{ url: smi.img }];
                    }
                    if (typeof smi.img === 'object' && smi.img.length === undefined) {
                        // object -> array of objects
                        smi.img = [smi.img];
                    }
                    // prepend hostname to all image urls
                    smi.img.forEach(img => {
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
            const sitemapItem = new sitemap_item_1.default(smi);
            sitemapItem.buildXML();
        });
        return this.setCache(this.root.end());
    }
    toGzip(callback) {
        const zlib = require('zlib');
        if (typeof callback === 'function') {
            zlib.gzip(this.toString(), callback);
        }
        else {
            return zlib.gzipSync(this.toString());
        }
    }
}
exports.Sitemap = Sitemap;
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
function createSitemapIndex(conf) {
    return new SitemapIndex(conf.urls, conf.targetFolder, conf.hostname, conf.cacheTime, conf.sitemapName, conf.sitemapSize, conf.xslUrl, conf.gzip, conf.callback);
}
exports.createSitemapIndex = createSitemapIndex;
/**
 * Builds a sitemap index from urls
 *
 * @param   {Object}    conf
 * @param   {Array}     conf.urls
 * @param   {String}    conf.xslUrl
 * @param   {String}    conf.xmlNs
 * @return  {String}    XML String of SitemapIndex
 */
function buildSitemapIndex(conf) {
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
    }
    else {
        xml.push('<sitemapindex ' + conf.xmlNs + '>');
    }
    if (conf.lastmodISO) {
        lastmod = conf.lastmodISO;
    }
    else if (conf.lastmodrealtime) {
        lastmod = new Date().toISOString();
    }
    else if (conf.lastmod) {
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
exports.buildSitemapIndex = buildSitemapIndex;
/**
 * Sitemap index (for several sitemaps)
 */
class SitemapIndex {
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
    constructor(urls, targetFolder, hostname, cacheTime, sitemapName, sitemapSize, xslUrl, gzip, callback) {
        // Base domain
        this.hostname = hostname;
        if (sitemapName === undefined) {
            this.sitemapName = 'sitemap';
        }
        else {
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
                throw new errors_1.UndefinedTargetFolder();
            }
        }
        catch (err) {
            throw new err.UndefinedTargetFolder();
        }
        this.targetFolder = targetFolder;
        // URL list for sitemap
        // @ts-ignore
        this.urls = urls || [];
        if (!Array.isArray(this.urls)) {
            // @ts-ignore
            this.urls = [this.urls];
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
                cacheTime: this.cacheTime,
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
        let smConf = { urls: sitemapUrls, xslUrl: this.xslUrl, xmlNs: this.xmlNs };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2l0ZW1hcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNpdGVtYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsZ0ZBQWdGO0FBQ2hGOzs7O0dBSUc7QUFDSCxZQUFZLENBQUM7O0FBRWIscUNBQWlEO0FBQ2pELG9DQUFxQztBQUNyQyx5QkFBMEI7QUFDMUIsc0NBQXVDO0FBQ3ZDLGlEQUF5RjtBQThjaEYsc0JBOWNGLHNCQUFXLENBOGNFO0FBN2NwQixzQ0FBdUM7QUFHdkM7Ozs7Ozs7Ozs7R0FVRztBQUNILFNBQWdCLGFBQWEsQ0FBQyxJQU03QjtJQUNDLE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDeEYsQ0FBQztBQVJELHNDQVFDO0FBRUQsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDO0FBRWhDLE1BQWEsT0FBTztJQW1CbEI7Ozs7Ozs7T0FPRztJQUNILFlBQVksSUFBOEIsRUFBRSxRQUFnQixFQUFFLFNBQWlCLEVBQUUsTUFBYyxFQUFFLEtBQWE7UUFDNUcsd0NBQXdDO1FBQ3hDLHlDQUF5QztRQUN6QyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUVsQixjQUFjO1FBQ2QsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFFekIsdUJBQXVCO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBRWYsc0JBQXNCO1FBQ3RCLElBQUksSUFBSTtZQUFFLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV0RSxnQkFBZ0I7UUFD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QUMzQjtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgY2FtZWxjYXNlLCBzZW1pLCBzcGFjZS1iZWZvcmUtZnVuY3Rpb24tcGFyZW4sIHBhZGRlZC1ibG9ja3MgKi9cbi8qIVxuICogU2l0ZW1hcFxuICogQ29weXJpZ2h0KGMpIDIwMTEgRXVnZW5lIEthbGluaW5cbiAqIE1JVCBMaWNlbnNlZFxuICovXG4ndXNlIHN0cmljdCc7XG5cbmltcG9ydCB7IFVuZGVmaW5lZFRhcmdldEZvbGRlciB9IGZyb20gJy4vZXJyb3JzJztcbmltcG9ydCB1cmxqb2luID0gcmVxdWlyZSgndXJsLWpvaW4nKTtcbmltcG9ydCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5pbXBvcnQgYnVpbGRlciA9IHJlcXVpcmUoJ3htbGJ1aWxkZXInKTtcbmltcG9ydCBTaXRlbWFwSXRlbSwgeyBJQ2FsbGJhY2ssIElTaXRlbWFwSW1nLCBTaXRlbWFwSXRlbU9wdGlvbnMgfSBmcm9tICcuL3NpdGVtYXAtaXRlbSc7XG5pbXBvcnQgY2h1bmsgPSByZXF1aXJlKCdsb2Rhc2gvY2h1bmsnKTtcbmltcG9ydCB7IFByb2ZpbGVyIH0gZnJvbSAnaW5zcGVjdG9yJztcblxuLyoqXG4gKiBTaG9ydGN1dCBmb3IgYG5ldyBTaXRlbWFwICguLi4pYC5cbiAqXG4gKiBAcGFyYW0gICB7T2JqZWN0fSAgICAgICAgY29uZlxuICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIGNvbmYuaG9zdG5hbWVcbiAqIEBwYXJhbSAgIHtTdHJpbmd8QXJyYXl9ICBjb25mLnVybHNcbiAqIEBwYXJhbSAgIHtOdW1iZXJ9ICAgICAgICBjb25mLmNhY2hlVGltZVxuICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIGNvbmYueHNsVXJsXG4gKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgICAgY29uZi54bWxOc1xuICogQHJldHVybiAge1NpdGVtYXB9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTaXRlbWFwKGNvbmY6IHtcbiAgdXJsczogc3RyaW5nIHwgU2l0ZW1hcFtcInVybHNcIl0sXG4gIGhvc3RuYW1lOiBzdHJpbmcsXG4gIGNhY2hlVGltZTogbnVtYmVyLFxuICB4c2xVcmw6IHN0cmluZyxcbiAgeG1sTnM/OiBzdHJpbmcsXG59KSB7XG4gIHJldHVybiBuZXcgU2l0ZW1hcChjb25mLnVybHMsIGNvbmYuaG9zdG5hbWUsIGNvbmYuY2FjaGVUaW1lLCBjb25mLnhzbFVybCwgY29uZi54bWxOcyk7XG59XG5cbmNvbnN0IHJlUHJvdG8gPSAvXmh0dHBzPzpcXC9cXC8vaTtcblxuZXhwb3J0IGNsYXNzIFNpdGVtYXAge1xuXG4gIGxpbWl0OiBudW1iZXI7XG4gIGhvc3RuYW1lOiBzdHJpbmdcbiAgdXJsczogKHN0cmluZyB8IFNpdGVtYXBJdGVtT3B0aW9ucylbXVxuXG4gIGNhY2hlUmVzZXRQZXJpb2Q6IG51bWJlcjtcbiAgY2FjaGU6IHN0cmluZ1xuICB4c2xVcmw6IHN0cmluZ1xuICB4bWxOczogc3RyaW5nXG4gIHJvb3Q6IGJ1aWxkZXIuWE1MRWxlbWVudE9yWE1MTm9kZSAmIHtcbiAgICBhdHRyaWJ1dGVzPzogW10sXG4gICAgY2hpbGRyZW4/OiBbXSxcblxuICAgIGluc3RydWN0aW9uQmVmb3JlPyguLi5hcmd2KVxuICB9O1xuICBjYWNoZVNldFRpbWVzdGFtcDogbnVtYmVyO1xuXG5cbiAgLyoqXG4gICAqIFNpdGVtYXAgY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9ICB1cmxzXG4gICAqIEBwYXJhbSB7U3RyaW5nfSAgICAgICAgaG9zdG5hbWUgICAgb3B0aW9uYWxcbiAgICogQHBhcmFtIHtOdW1iZXJ9ICAgICAgICBjYWNoZVRpbWUgICBvcHRpb25hbCBpbiBtaWxsaXNlY29uZHM7IDAgLSBjYWNoZSBkaXNhYmxlZFxuICAgKiBAcGFyYW0ge1N0cmluZ30gICAgICAgIHhzbFVybCAgICAgICAgICAgIG9wdGlvbmFsXG4gICAqIEBwYXJhbSB7U3RyaW5nfSAgICAgICAgeG1sTnMgICAgICAgICAgICBvcHRpb25hbFxuICAgKi9cbiAgY29uc3RydWN0b3IodXJsczogc3RyaW5nIHwgU2l0ZW1hcFtcInVybHNcIl0sIGhvc3RuYW1lOiBzdHJpbmcsIGNhY2hlVGltZTogbnVtYmVyLCB4c2xVcmw6IHN0cmluZywgeG1sTnM6IHN0cmluZykge1xuICAgIC8vIFRoaXMgbGltaXQgaXMgZGVmaW5lZCBieSBHb29nbGUuIFNlZTpcbiAgICAvLyBodHRwOi8vc2l0ZW1hcHMub3JnL3Byb3RvY29sLnBocCNpbmRleFxuICAgIHRoaXMubGltaXQgPSA1MDAwMFxuXG4gICAgLy8gQmFzZSBkb21haW5cbiAgICB0aGlzLmhvc3RuYW1lID0gaG9zdG5hbWU7XG5cbiAgICAvLyBVUkwgbGlzdCBmb3Igc2l0ZW1hcFxuICAgIHRoaXMudXJscyA9IFtdO1xuXG4gICAgLy8gTWFrZSBjb3B5IG9mIG9iamVjdFxuICAgIGlmICh1cmxzKSB0aGlzLnVybHMgPSBBcnJheS5pc0FycmF5KHVybHMpID8gQXJyYXkuZnJvbSh1cmxzKSA6IFt1cmxzXTtcblxuICAgIC8vIHNpdGVtYXAgY2FjaGVcbiAgICB0aGlzLmNhY2hlUmVzZXRQZXJpb2QgPSBjYWNoZVRpbWUgfHwgMDtcbiAgICB0aGlzLmNhY2hlID0gJyc7XG5cbiAgICB0aGlzLnhzbFVybCA9IHhzbFVybDtcbiAgICB0aGlzLnhtbE5zID0geG1sTnM7XG4gICAgdGhpcy5yb290ID0gYnVpbGRlci5jcmVhdGUoJ3VybHNldCcsIHtlbmNvZGluZzogJ1VURi04J30pXG4gICAgaWYgKHRoaXMueG1sTnMpIHtcbiAgICAgIGNvbnN0IG5zID0gdGhpcy54bWxOcy5zcGxpdCgnICcpXG4gICAgICBmb3IgKGxldCBhdHRyIG9mIG5zKSB7XG4gICAgICAgIGNvbnN0IFtrLCB2XSA9IGF0dHIuc3BsaXQoJz0nKVxuICAgICAgICB0aGlzLnJvb3QuYXR0cmlidXRlKGssIHYucmVwbGFjZSgvXlsnXCJdfFsnXCJdJC9nLCAnJykpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqICBDbGVhciBzaXRlbWFwIGNhY2hlXG4gICAqL1xuICBjbGVhckNhY2hlKCkge1xuICAgIHRoaXMuY2FjaGUgPSAnJztcbiAgfVxuXG4gIC8qKlxuICAgKiAgQ2FuIGNhY2hlIGJlIHVzZWRcbiAgICovXG4gIGlzQ2FjaGVWYWxpZCgpIHtcbiAgICBsZXQgY3VyclRpbWVzdGFtcCA9IERhdGUubm93KCk7XG4gICAgcmV0dXJuIHRoaXMuY2FjaGVSZXNldFBlcmlvZCAmJiB0aGlzLmNhY2hlICYmXG4gICAgICAodGhpcy5jYWNoZVNldFRpbWVzdGFtcCArIHRoaXMuY2FjaGVSZXNldFBlcmlvZCkgPj0gY3VyclRpbWVzdGFtcDtcbiAgfVxuXG4gIC8qKlxuICAgKiAgRmlsbCBjYWNoZVxuICAgKi9cbiAgc2V0Q2FjaGUobmV3Q2FjaGU6IHN0cmluZykge1xuICAgIHRoaXMuY2FjaGUgPSBuZXdDYWNoZTtcbiAgICB0aGlzLmNhY2hlU2V0VGltZXN0YW1wID0gRGF0ZS5ub3coKTtcbiAgICByZXR1cm4gdGhpcy5jYWNoZTtcbiAgfVxuXG4gIC8qKlxuICAgKiAgQWRkIHVybCB0byBzaXRlbWFwXG4gICAqICBAcGFyYW0ge1N0cmluZ30gdXJsXG4gICAqL1xuICBhZGQodXJsOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy51cmxzLnB1c2godXJsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiAgRGVsZXRlIHVybCBmcm9tIHNpdGVtYXBcbiAgICogIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAgICovXG4gIGRlbCh1cmw6IHN0cmluZyB8IHtcbiAgICB1cmw6IHN0cmluZ1xuICB9KSB7XG4gICAgY29uc3QgaW5kZXhfdG9fcmVtb3ZlID0gW11cbiAgICBsZXQga2V5ID0gJydcblxuICAgIGlmICh0eXBlb2YgdXJsID09PSAnc3RyaW5nJykge1xuICAgICAga2V5ID0gdXJsO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBrZXkgPSB1cmwudXJsO1xuICAgIH1cblxuICAgIC8vIGZpbmRcbiAgICB0aGlzLnVybHMuZm9yRWFjaCgoZWxlbSwgaW5kZXgpID0+IHtcbiAgICAgIGlmICh0eXBlb2YgZWxlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgaWYgKGVsZW0gPT09IGtleSkge1xuICAgICAgICAgIGluZGV4X3RvX3JlbW92ZS5wdXNoKGluZGV4KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGVsZW0udXJsID09PSBrZXkpIHtcbiAgICAgICAgICBpbmRleF90b19yZW1vdmUucHVzaChpbmRleCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGRlbGV0ZVxuICAgIGluZGV4X3RvX3JlbW92ZS5mb3JFYWNoKChlbGVtKSA9PiB0aGlzLnVybHMuc3BsaWNlKGVsZW0sIDEpKTtcblxuICAgIHJldHVybiBpbmRleF90b19yZW1vdmUubGVuZ3RoO1xuICB9XG5cbiAgLyoqXG4gICAqICBDcmVhdGUgc2l0ZW1hcCB4bWxcbiAgICogIEBwYXJhbSB7RnVuY3Rpb259ICAgICBjYWxsYmFjayAgQ2FsbGJhY2sgZnVuY3Rpb24gd2l0aCBvbmUgYXJndW1lbnQg4oCUIHhtbFxuICAgKi9cbiAgdG9YTUwoY2FsbGJhY2s6IElDYWxsYmFjazxFcnJvciwgc3RyaW5nPikge1xuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gdGhpcy50b1N0cmluZygpO1xuICAgIH1cblxuICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHRoaXMudG9TdHJpbmcoKSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogIFN5bmNocm9ub3VzIGFsaWFzIGZvciB0b1hNTCgpXG4gICAqICBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICB0b1N0cmluZygpIHtcbiAgICBpZiAodGhpcy5yb290LmF0dHJpYnV0ZXMubGVuZ3RoKSB7XG4gICAgICB0aGlzLnJvb3QuYXR0cmlidXRlcyA9IFtdXG4gICAgfVxuICAgIGlmICh0aGlzLnJvb3QuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICB0aGlzLnJvb3QuY2hpbGRyZW4gPSBbXVxuICAgIH1cbiAgICBpZiAoIXRoaXMueG1sTnMpIHtcbiAgICAgIHRoaXMucm9vdC5hdHQoJ3htbG5zJywgJ2h0dHA6Ly93d3cuc2l0ZW1hcHMub3JnL3NjaGVtYXMvc2l0ZW1hcC8wLjknKVxuICAgICAgdGhpcy5yb290LmF0dCgneG1sbnM6bmV3cycsICdodHRwOi8vd3d3Lmdvb2dsZS5jb20vc2NoZW1hcy9zaXRlbWFwLW5ld3MvMC45JylcbiAgICAgIHRoaXMucm9vdC5hdHQoJ3htbG5zOnhodG1sJywgJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwnKVxuICAgICAgdGhpcy5yb290LmF0dCgneG1sbnM6bW9iaWxlJywgJ2h0dHA6Ly93d3cuZ29vZ2xlLmNvbS9zY2hlbWFzL3NpdGVtYXAtbW9iaWxlLzEuMCcpXG4gICAgICB0aGlzLnJvb3QuYXR0KCd4bWxuczppbWFnZScsICdodHRwOi8vd3d3Lmdvb2dsZS5jb20vc2NoZW1hcy9zaXRlbWFwLWltYWdlLzEuMScpXG4gICAgICB0aGlzLnJvb3QuYXR0KCd4bWxuczp2aWRlbycsICdodHRwOi8vd3d3Lmdvb2dsZS5jb20vc2NoZW1hcy9zaXRlbWFwLXZpZGVvLzEuMScpXG4gICAgfVxuXG4gICAgaWYgKHRoaXMueHNsVXJsKSB7XG4gICAgICB0aGlzLnJvb3QuaW5zdHJ1Y3Rpb25CZWZvcmUoJ3htbC1zdHlsZXNoZWV0JywgYHR5cGU9XCJ0ZXh0L3hzbFwiIGhyZWY9XCIke3RoaXMueHNsVXJsfVwiYClcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pc0NhY2hlVmFsaWQoKSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGU7XG4gICAgfVxuXG4gICAgLy8gVE9ETzogaWYgc2l6ZSA+IGxpbWl0OiBjcmVhdGUgc2l0ZW1hcGluZGV4XG5cbiAgICB0aGlzLnVybHMuZm9yRWFjaCgoZWxlbSwgaW5kZXgpID0+IHtcbiAgICAgIC8vIFNpdGVtYXBJdGVtXG4gICAgICAvLyBjcmVhdGUgb2JqZWN0IHdpdGggdXJsIHByb3BlcnR5XG4gICAgICBsZXQgc21pOiBTaXRlbWFwSXRlbU9wdGlvbnMgPSAodHlwZW9mIGVsZW0gPT09ICdzdHJpbmcnKSA/IHsndXJsJzogZWxlbSwgcm9vdDogdGhpcy5yb290fSA6IE9iamVjdC5hc3NpZ24oe3Jvb3Q6IHRoaXMucm9vdH0sIGVsZW0pXG5cbiAgICAgIC8vIGluc2VydCBkb21haW4gbmFtZVxuICAgICAgaWYgKHRoaXMuaG9zdG5hbWUpIHtcbiAgICAgICAgaWYgKCFyZVByb3RvLnRlc3Qoc21pLnVybCkpIHtcbiAgICAgICAgICBzbWkudXJsID0gdXJsam9pbih0aGlzLmhvc3RuYW1lLCBzbWkudXJsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc21pLmltZykge1xuICAgICAgICAgIGlmICh0eXBlb2Ygc21pLmltZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIC8vIHN0cmluZyAtPiBhcnJheSBvZiBvYmplY3RzXG4gICAgICAgICAgICBzbWkuaW1nID0gW3t1cmw6IHNtaS5pbWcgYXMgc3RyaW5nfV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2Ygc21pLmltZyA9PT0gJ29iamVjdCcgJiYgc21pLmltZy5sZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gb2JqZWN0IC0+IGFycmF5IG9mIG9iamVjdHNcbiAgICAgICAgICAgIHNtaS5pbWcgPSBbc21pLmltZyBhcyBJU2l0ZW1hcEltZ107XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHByZXBlbmQgaG9zdG5hbWUgdG8gYWxsIGltYWdlIHVybHNcbiAgICAgICAgICAoc21pLmltZyBhcyBJU2l0ZW1hcEltZ1tdKS5mb3JFYWNoKGltZyA9PiB7XG4gICAgICAgICAgICBpZiAoIXJlUHJvdG8udGVzdChpbWcudXJsKSkge1xuICAgICAgICAgICAgICBpbWcudXJsID0gdXJsam9pbih0aGlzLmhvc3RuYW1lLCBpbWcudXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc21pLmxpbmtzKSB7XG4gICAgICAgICAgc21pLmxpbmtzLmZvckVhY2gobGluayA9PiB7XG4gICAgICAgICAgICBpZiAoIXJlUHJvdG8udGVzdChsaW5rLnVybCkpIHtcbiAgICAgICAgICAgICAgbGluay51cmwgPSB1cmxqb2luKHRoaXMuaG9zdG5hbWUsIGxpbmsudXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3Qgc2l0ZW1hcEl0ZW0gPSBuZXcgU2l0ZW1hcEl0ZW0oc21pKVxuICAgICAgc2l0ZW1hcEl0ZW0uYnVpbGRYTUwoKVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRoaXMuc2V0Q2FjaGUodGhpcy5yb290LmVuZCgpKVxuICB9XG5cbiAgdG9HemlwKGNhbGxiYWNrOiBJQ2FsbGJhY2s8RXJyb3IsIEJ1ZmZlcj4pOiB2b2lkXG4gIHRvR3ppcCgpOiBCdWZmZXJcbiAgdG9HemlwKGNhbGxiYWNrPzogSUNhbGxiYWNrPEVycm9yLCBCdWZmZXI+KSB7XG4gICAgY29uc3QgemxpYjogdHlwZW9mIGltcG9ydCgnemxpYicpID0gcmVxdWlyZSgnemxpYicpO1xuXG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgemxpYi5nemlwKHRoaXMudG9TdHJpbmcoKSwgY2FsbGJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gemxpYi5nemlwU3luYyh0aGlzLnRvU3RyaW5nKCkpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFNob3J0Y3V0IGZvciBgbmV3IFNpdGVtYXBJbmRleCAoLi4uKWAuXG4gKlxuICogQHBhcmFtICAge09iamVjdH0gICAgICAgIGNvbmZcbiAqIEBwYXJhbSAgIHtTdHJpbmd8QXJyYXl9ICBjb25mLnVybHNcbiAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgICBjb25mLnRhcmdldEZvbGRlclxuICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIGNvbmYuaG9zdG5hbWVcbiAqIEBwYXJhbSAgIHtOdW1iZXJ9ICAgICAgICBjb25mLmNhY2hlVGltZVxuICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIGNvbmYuc2l0ZW1hcE5hbWVcbiAqIEBwYXJhbSAgIHtOdW1iZXJ9ICAgICAgICBjb25mLnNpdGVtYXBTaXplXG4gKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgICAgY29uZi54c2xVcmxcbiAqIEByZXR1cm4gIHtTaXRlbWFwSW5kZXh9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTaXRlbWFwSW5kZXggKGNvbmYpIHtcbiAgcmV0dXJuIG5ldyBTaXRlbWFwSW5kZXgoY29uZi51cmxzLFxuICAgIGNvbmYudGFyZ2V0Rm9sZGVyLFxuICAgIGNvbmYuaG9zdG5hbWUsXG4gICAgY29uZi5jYWNoZVRpbWUsXG4gICAgY29uZi5zaXRlbWFwTmFtZSxcbiAgICBjb25mLnNpdGVtYXBTaXplLFxuICAgIGNvbmYueHNsVXJsLFxuICAgIGNvbmYuZ3ppcCxcbiAgICBjb25mLmNhbGxiYWNrKTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgYSBzaXRlbWFwIGluZGV4IGZyb20gdXJsc1xuICpcbiAqIEBwYXJhbSAgIHtPYmplY3R9ICAgIGNvbmZcbiAqIEBwYXJhbSAgIHtBcnJheX0gICAgIGNvbmYudXJsc1xuICogQHBhcmFtICAge1N0cmluZ30gICAgY29uZi54c2xVcmxcbiAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgIGNvbmYueG1sTnNcbiAqIEByZXR1cm4gIHtTdHJpbmd9ICAgIFhNTCBTdHJpbmcgb2YgU2l0ZW1hcEluZGV4XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFNpdGVtYXBJbmRleCAoY29uZjoge1xuICB1cmxzOiBhbnlbXSxcbiAgeHNsVXJsOiBzdHJpbmcsXG4gIHhtbE5zOiBzdHJpbmcsXG5cbiAgbGFzdG1vZElTTz86IERhdGVcbiAgbGFzdG1vZHJlYWx0aW1lPzogYm9vbGVhbixcbiAgbGFzdG1vZD86IG51bWJlciB8IHN0cmluZ1xufSkge1xuICBsZXQgeG1sID0gW107XG4gIGxldCBsYXN0bW9kO1xuXG4gIHhtbC5wdXNoKCc8P3htbCB2ZXJzaW9uPVwiMS4wXCIgZW5jb2Rpbmc9XCJVVEYtOFwiPz4nKTtcbiAgaWYgKGNvbmYueHNsVXJsKSB7XG4gICAgeG1sLnB1c2goJzw/eG1sLXN0eWxlc2hlZXQgdHlwZT1cInRleHQveHNsXCIgaHJlZj1cIicgKyBjb25mLnhzbFVybCArICdcIj8+Jyk7XG4gIH1cbiAgaWYgKCFjb25mLnhtbE5zKSB7XG4gICAgeG1sLnB1c2goJzxzaXRlbWFwaW5kZXggeG1sbnM9XCJodHRwOi8vd3d3LnNpdGVtYXBzLm9yZy9zY2hlbWFzL3NpdGVtYXAvMC45XCIgJyArXG4gICAgICAneG1sbnM6bW9iaWxlPVwiaHR0cDovL3d3dy5nb29nbGUuY29tL3NjaGVtYXMvc2l0ZW1hcC1tb2JpbGUvMS4wXCIgJyArXG4gICAgICAneG1sbnM6aW1hZ2U9XCJodHRwOi8vd3d3Lmdvb2dsZS5jb20vc2NoZW1hcy9zaXRlbWFwLWltYWdlLzEuMVwiICcgK1xuICAgICAgJ3htbG5zOnZpZGVvPVwiaHR0cDovL3d3dy5nb29nbGUuY29tL3NjaGVtYXMvc2l0ZW1hcC12aWRlby8xLjFcIj4nKTtcbiAgfSBlbHNlIHtcbiAgICB4bWwucHVzaCgnPHNpdGVtYXBpbmRleCAnICsgY29uZi54bWxOcyArICc+JylcbiAgfVxuXG4gIGlmIChjb25mLmxhc3Rtb2RJU08pIHtcbiAgICBsYXN0bW9kID0gY29uZi5sYXN0bW9kSVNPO1xuICB9IGVsc2UgaWYgKGNvbmYubGFzdG1vZHJlYWx0aW1lKSB7XG4gICAgbGFzdG1vZCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgfSBlbHNlIGlmIChjb25mLmxhc3Rtb2QpIHtcbiAgICBsYXN0bW9kID0gbmV3IERhdGUoY29uZi5sYXN0bW9kKS50b0lTT1N0cmluZygpO1xuICB9XG5cblxuICBjb25mLnVybHMuZm9yRWFjaCh1cmwgPT4ge1xuICAgIGlmICh1cmwgaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgIGxhc3Rtb2QgPSB1cmwubGFzdG1vZCA/IHVybC5sYXN0bW9kIDogbGFzdG1vZDtcblxuICAgICAgdXJsID0gdXJsLnVybDtcbiAgICB9XG4gICAgeG1sLnB1c2goJzxzaXRlbWFwPicpO1xuICAgIHhtbC5wdXNoKCc8bG9jPicgKyB1cmwgKyAnPC9sb2M+Jyk7XG4gICAgaWYgKGxhc3Rtb2QpIHtcbiAgICAgIHhtbC5wdXNoKCc8bGFzdG1vZD4nICsgbGFzdG1vZCArICc8L2xhc3Rtb2Q+Jyk7XG4gICAgfVxuICAgIHhtbC5wdXNoKCc8L3NpdGVtYXA+Jyk7XG4gIH0pO1xuXG4gIHhtbC5wdXNoKCc8L3NpdGVtYXBpbmRleD4nKTtcblxuICByZXR1cm4geG1sLmpvaW4oJ1xcbicpO1xufVxuXG4vKipcbiAqIFNpdGVtYXAgaW5kZXggKGZvciBzZXZlcmFsIHNpdGVtYXBzKVxuICovXG5jbGFzcyBTaXRlbWFwSW5kZXgge1xuXG4gIGhvc3RuYW1lOiBzdHJpbmc7XG4gIHNpdGVtYXBOYW1lOiBzdHJpbmc7XG4gIHNpdGVtYXBTaXplOiBudW1iZXJcbiAgeHNsVXJsOiBzdHJpbmdcbiAgc2l0ZW1hcElkOiBudW1iZXJcbiAgc2l0ZW1hcHM6IHVua25vd25bXVxuICB0YXJnZXRGb2xkZXI6IHN0cmluZztcbiAgdXJsczogdW5rbm93bltdXG5cbiAgY2h1bmtzXG4gIGNhbGxiYWNrPzogSUNhbGxiYWNrPEVycm9yLCBib29sZWFuPlxuICBjYWNoZVRpbWU6IG51bWJlclxuXG4gIHhtbE5zOiBzdHJpbmdcblxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gIHVybHNcbiAgICogQHBhcmFtIHtTdHJpbmd9ICAgICAgICB0YXJnZXRGb2xkZXJcbiAgICogQHBhcmFtIHtTdHJpbmd9ICAgICAgICBob3N0bmFtZSAgICAgIG9wdGlvbmFsXG4gICAqIEBwYXJhbSB7TnVtYmVyfSAgICAgICAgY2FjaGVUaW1lICAgICBvcHRpb25hbCBpbiBtaWxsaXNlY29uZHNcbiAgICogQHBhcmFtIHtTdHJpbmd9ICAgICAgICBzaXRlbWFwTmFtZSAgIG9wdGlvbmFsXG4gICAqIEBwYXJhbSB7TnVtYmVyfSAgICAgICAgc2l0ZW1hcFNpemUgICBvcHRpb25hbFxuICAgKiBAcGFyYW0ge051bWJlcn0gICAgICAgIHhzbFVybCAgICAgICAgICAgICAgICBvcHRpb25hbFxuICAgKiBAcGFyYW0ge0Jvb2xlYW59ICAgICAgIGd6aXAgICAgICAgICAgb3B0aW9uYWxcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gICAgICBjYWxsYmFjayAgICAgIG9wdGlvbmFsXG4gICAqL1xuICBjb25zdHJ1Y3RvciAodXJsczogc3RyaW5nIHwgc3RyaW5nW10sIHRhcmdldEZvbGRlcjogc3RyaW5nLCBob3N0bmFtZT86IHN0cmluZywgY2FjaGVUaW1lPzogbnVtYmVyLCBzaXRlbWFwTmFtZT86IHN0cmluZywgc2l0ZW1hcFNpemU/OiBudW1iZXIsIHhzbFVybD86IHN0cmluZywgZ3ppcD86IGJvb2xlYW4sIGNhbGxiYWNrPzogSUNhbGxiYWNrPEVycm9yLCBib29sZWFuPikge1xuICAgIC8vIEJhc2UgZG9tYWluXG4gICAgdGhpcy5ob3N0bmFtZSA9IGhvc3RuYW1lO1xuXG4gICAgaWYgKHNpdGVtYXBOYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuc2l0ZW1hcE5hbWUgPSAnc2l0ZW1hcCc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2l0ZW1hcE5hbWUgPSBzaXRlbWFwTmFtZTtcbiAgICB9XG5cbiAgICAvLyBUaGlzIGxpbWl0IGlzIGRlZmluZWQgYnkgR29vZ2xlLiBTZWU6XG4gICAgLy8gaHR0cDovL3NpdGVtYXBzLm9yZy9wcm90b2NvbC5waHAjaW5kZXhcbiAgICB0aGlzLnNpdGVtYXBTaXplID0gc2l0ZW1hcFNpemU7XG5cbiAgICB0aGlzLnhzbFVybCA9IHhzbFVybDtcblxuICAgIHRoaXMuc2l0ZW1hcElkID0gMDtcblxuICAgIHRoaXMuc2l0ZW1hcHMgPSBbXTtcblxuICAgIHRoaXMudGFyZ2V0Rm9sZGVyID0gJy4nO1xuXG4gICAgdHJ5IHtcbiAgICAgIGlmICghZnMuc3RhdFN5bmModGFyZ2V0Rm9sZGVyKS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIHRocm93IG5ldyBVbmRlZmluZWRUYXJnZXRGb2xkZXIoKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRocm93IG5ldyBlcnIuVW5kZWZpbmVkVGFyZ2V0Rm9sZGVyKCk7XG4gICAgfVxuXG4gICAgdGhpcy50YXJnZXRGb2xkZXIgPSB0YXJnZXRGb2xkZXI7XG5cbiAgICAvLyBVUkwgbGlzdCBmb3Igc2l0ZW1hcFxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICB0aGlzLnVybHMgPSB1cmxzIHx8IFtdO1xuICAgIGlmICghQXJyYXkuaXNBcnJheSh0aGlzLnVybHMpKSB7XG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICB0aGlzLnVybHMgPSBbdGhpcy51cmxzXVxuICAgIH1cblxuICAgIHRoaXMuY2h1bmtzID0gY2h1bmsodGhpcy51cmxzLCB0aGlzLnNpdGVtYXBTaXplKTtcblxuICAgIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcblxuICAgIGxldCBwcm9jZXNzZXNDb3VudCA9IHRoaXMuY2h1bmtzLmxlbmd0aCArIDE7XG5cbiAgICB0aGlzLmNodW5rcy5mb3JFYWNoKChjaHVuaywgaW5kZXgpID0+IHtcbiAgICAgIGNvbnN0IGV4dGVuc2lvbiA9ICcueG1sJyArIChnemlwID8gJy5neicgOiAnJyk7XG4gICAgICBjb25zdCBmaWxlbmFtZSA9IHRoaXMuc2l0ZW1hcE5hbWUgKyAnLScgKyB0aGlzLnNpdGVtYXBJZCsrICsgZXh0ZW5zaW9uO1xuXG4gICAgICB0aGlzLnNpdGVtYXBzLnB1c2goZmlsZW5hbWUpO1xuXG4gICAgICBsZXQgc2l0ZW1hcCA9IGNyZWF0ZVNpdGVtYXAoe1xuICAgICAgICBob3N0bmFtZTogdGhpcy5ob3N0bmFtZSxcbiAgICAgICAgY2FjaGVUaW1lOiB0aGlzLmNhY2hlVGltZSwgLy8gNjAwIHNlYyAtIGNhY2hlIHB1cmdlIHBlcmlvZFxuICAgICAgICB1cmxzOiBjaHVuayxcbiAgICAgICAgeHNsVXJsOiB0aGlzLnhzbFVybFxuICAgICAgfSk7XG5cbiAgICAgIGxldCBzdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbSh0YXJnZXRGb2xkZXIgKyAnLycgKyBmaWxlbmFtZSk7XG4gICAgICBzdHJlYW0ub25jZSgnb3BlbicsIGZkID0+IHtcbiAgICAgICAgc3RyZWFtLndyaXRlKGd6aXAgPyBzaXRlbWFwLnRvR3ppcCgpIDogc2l0ZW1hcC50b1N0cmluZygpKTtcbiAgICAgICAgc3RyZWFtLmVuZCgpO1xuICAgICAgICBwcm9jZXNzZXNDb3VudC0tO1xuICAgICAgICBpZiAocHJvY2Vzc2VzQ291bnQgPT09IDAgJiYgdHlwZW9mIHRoaXMuY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICB0aGlzLmNhbGxiYWNrKG51bGwsIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgIH0pO1xuXG4gICAgbGV0IHNpdGVtYXBVcmxzID0gdGhpcy5zaXRlbWFwcy5tYXAoc2l0ZW1hcCA9PiBob3N0bmFtZSArICcvJyArIHNpdGVtYXApO1xuICAgIGxldCBzbUNvbmYgPSB7dXJsczogc2l0ZW1hcFVybHMsIHhzbFVybDogdGhpcy54c2xVcmwsIHhtbE5zOiB0aGlzLnhtbE5zfTtcbiAgICBsZXQgeG1sU3RyaW5nID0gYnVpbGRTaXRlbWFwSW5kZXgoc21Db25mKTtcblxuICAgIGxldCBzdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbSh0YXJnZXRGb2xkZXIgKyAnLycgK1xuICAgICAgdGhpcy5zaXRlbWFwTmFtZSArICctaW5kZXgueG1sJyk7XG4gICAgc3RyZWFtLm9uY2UoJ29wZW4nLCAoZmQpID0+IHtcbiAgICAgIHN0cmVhbS53cml0ZSh4bWxTdHJpbmcpO1xuICAgICAgc3RyZWFtLmVuZCgpO1xuICAgICAgcHJvY2Vzc2VzQ291bnQtLTtcbiAgICAgIGlmIChwcm9jZXNzZXNDb3VudCA9PT0gMCAmJiB0eXBlb2YgdGhpcy5jYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLmNhbGxiYWNrKG51bGwsIHRydWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCB7IFNpdGVtYXBJdGVtIH1cbiJdfQ==