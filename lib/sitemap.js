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
const SitemapItem = require("./sitemap-item");
exports.SitemapItem = SitemapItem;
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
            const sitemapItem = new SitemapItem(smi);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2l0ZW1hcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNpdGVtYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsZ0ZBQWdGO0FBQ2hGOzs7O0dBSUc7QUFDSCxZQUFZLENBQUM7O0FBRWIscUNBQWlEO0FBQ2pELG9DQUFxQztBQUNyQyx5QkFBMEI7QUFDMUIsc0NBQXVDO0FBQ3ZDLDhDQUErQztBQStjdEMsa0NBQVc7QUE5Y3BCLHNDQUF1QztBQUl2Qzs7Ozs7Ozs7OztHQVVHO0FBQ0gsU0FBZ0IsYUFBYSxDQUFDLElBTTdCO0lBQ0MsT0FBTyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN4RixDQUFDO0FBUkQsc0NBUUM7QUFFRCxNQUFNLE9BQU8sR0FBRyxlQUFlLENBQUM7QUFFaEMsTUFBYSxPQUFPO0lBbUJsQjs7Ozs7OztPQU9HO0lBQ0gsWUFBWSxJQUE4QixFQUFFLFFBQWdCLEVBQUUsU0FBaUIsRUFBRSxNQUFjLEVBQUUsS0FBYTtRQUM1Ryx3Q0FBd0M7UUFDeEMseUNBQXlDO1FBQ3pDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBRWxCLGNBQWM7UUFDZCxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUV6Qix1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7UUFFZixzQkFBc0I7UUFDdEIsSUFBSSxJQUFJO1lBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXRFLGdCQUFnQjtRQUNoQixJQUFJLENBQUMs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LENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIGNhbWVsY2FzZSwgc2VtaSwgc3BhY2UtYmVmb3JlLWZ1bmN0aW9uLXBhcmVuLCBwYWRkZWQtYmxvY2tzICovXG4vKiFcbiAqIFNpdGVtYXBcbiAqIENvcHlyaWdodChjKSAyMDExIEV1Z2VuZSBLYWxpbmluXG4gKiBNSVQgTGljZW5zZWRcbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgeyBVbmRlZmluZWRUYXJnZXRGb2xkZXIgfSBmcm9tICcuL2Vycm9ycyc7XG5pbXBvcnQgdXJsam9pbiA9IHJlcXVpcmUoJ3VybC1qb2luJyk7XG5pbXBvcnQgZnMgPSByZXF1aXJlKCdmcycpO1xuaW1wb3J0IGJ1aWxkZXIgPSByZXF1aXJlKCd4bWxidWlsZGVyJyk7XG5pbXBvcnQgU2l0ZW1hcEl0ZW0gPSByZXF1aXJlKCcuL3NpdGVtYXAtaXRlbScpO1xuaW1wb3J0IGNodW5rID0gcmVxdWlyZSgnbG9kYXNoL2NodW5rJyk7XG5pbXBvcnQgeyBQcm9maWxlciB9IGZyb20gJ2luc3BlY3Rvcic7XG5pbXBvcnQgeyBJQ2FsbGJhY2ssIElTaXRlbWFwSW1nLCBTaXRlbWFwSXRlbU9wdGlvbnMgfSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBTaG9ydGN1dCBmb3IgYG5ldyBTaXRlbWFwICguLi4pYC5cbiAqXG4gKiBAcGFyYW0gICB7T2JqZWN0fSAgICAgICAgY29uZlxuICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIGNvbmYuaG9zdG5hbWVcbiAqIEBwYXJhbSAgIHtTdHJpbmd8QXJyYXl9ICBjb25mLnVybHNcbiAqIEBwYXJhbSAgIHtOdW1iZXJ9ICAgICAgICBjb25mLmNhY2hlVGltZVxuICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIGNvbmYueHNsVXJsXG4gKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgICAgY29uZi54bWxOc1xuICogQHJldHVybiAge1NpdGVtYXB9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTaXRlbWFwKGNvbmY6IHtcbiAgdXJsczogc3RyaW5nIHwgU2l0ZW1hcFtcInVybHNcIl0sXG4gIGhvc3RuYW1lOiBzdHJpbmcsXG4gIGNhY2hlVGltZTogbnVtYmVyLFxuICB4c2xVcmw6IHN0cmluZyxcbiAgeG1sTnM/OiBzdHJpbmcsXG59KSB7XG4gIHJldHVybiBuZXcgU2l0ZW1hcChjb25mLnVybHMsIGNvbmYuaG9zdG5hbWUsIGNvbmYuY2FjaGVUaW1lLCBjb25mLnhzbFVybCwgY29uZi54bWxOcyk7XG59XG5cbmNvbnN0IHJlUHJvdG8gPSAvXmh0dHBzPzpcXC9cXC8vaTtcblxuZXhwb3J0IGNsYXNzIFNpdGVtYXAge1xuXG4gIGxpbWl0OiBudW1iZXI7XG4gIGhvc3RuYW1lOiBzdHJpbmdcbiAgdXJsczogKHN0cmluZyB8IFNpdGVtYXBJdGVtT3B0aW9ucylbXVxuXG4gIGNhY2hlUmVzZXRQZXJpb2Q6IG51bWJlcjtcbiAgY2FjaGU6IHN0cmluZ1xuICB4c2xVcmw6IHN0cmluZ1xuICB4bWxOczogc3RyaW5nXG4gIHJvb3Q6IGJ1aWxkZXIuWE1MRWxlbWVudE9yWE1MTm9kZSAmIHtcbiAgICBhdHRyaWJ1dGVzPzogW10sXG4gICAgY2hpbGRyZW4/OiBbXSxcblxuICAgIGluc3RydWN0aW9uQmVmb3JlPyguLi5hcmd2KVxuICB9O1xuICBjYWNoZVNldFRpbWVzdGFtcDogbnVtYmVyO1xuXG5cbiAgLyoqXG4gICAqIFNpdGVtYXAgY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9ICB1cmxzXG4gICAqIEBwYXJhbSB7U3RyaW5nfSAgICAgICAgaG9zdG5hbWUgICAgb3B0aW9uYWxcbiAgICogQHBhcmFtIHtOdW1iZXJ9ICAgICAgICBjYWNoZVRpbWUgICBvcHRpb25hbCBpbiBtaWxsaXNlY29uZHM7IDAgLSBjYWNoZSBkaXNhYmxlZFxuICAgKiBAcGFyYW0ge1N0cmluZ30gICAgICAgIHhzbFVybCAgICAgICAgICAgIG9wdGlvbmFsXG4gICAqIEBwYXJhbSB7U3RyaW5nfSAgICAgICAgeG1sTnMgICAgICAgICAgICBvcHRpb25hbFxuICAgKi9cbiAgY29uc3RydWN0b3IodXJsczogc3RyaW5nIHwgU2l0ZW1hcFtcInVybHNcIl0sIGhvc3RuYW1lOiBzdHJpbmcsIGNhY2hlVGltZTogbnVtYmVyLCB4c2xVcmw6IHN0cmluZywgeG1sTnM6IHN0cmluZykge1xuICAgIC8vIFRoaXMgbGltaXQgaXMgZGVmaW5lZCBieSBHb29nbGUuIFNlZTpcbiAgICAvLyBodHRwOi8vc2l0ZW1hcHMub3JnL3Byb3RvY29sLnBocCNpbmRleFxuICAgIHRoaXMubGltaXQgPSA1MDAwMFxuXG4gICAgLy8gQmFzZSBkb21haW5cbiAgICB0aGlzLmhvc3RuYW1lID0gaG9zdG5hbWU7XG5cbiAgICAvLyBVUkwgbGlzdCBmb3Igc2l0ZW1hcFxuICAgIHRoaXMudXJscyA9IFtdO1xuXG4gICAgLy8gTWFrZSBjb3B5IG9mIG9iamVjdFxuICAgIGlmICh1cmxzKSB0aGlzLnVybHMgPSBBcnJheS5pc0FycmF5KHVybHMpID8gQXJyYXkuZnJvbSh1cmxzKSA6IFt1cmxzXTtcblxuICAgIC8vIHNpdGVtYXAgY2FjaGVcbiAgICB0aGlzLmNhY2hlUmVzZXRQZXJpb2QgPSBjYWNoZVRpbWUgfHwgMDtcbiAgICB0aGlzLmNhY2hlID0gJyc7XG5cbiAgICB0aGlzLnhzbFVybCA9IHhzbFVybDtcbiAgICB0aGlzLnhtbE5zID0geG1sTnM7XG4gICAgdGhpcy5yb290ID0gYnVpbGRlci5jcmVhdGUoJ3VybHNldCcsIHtlbmNvZGluZzogJ1VURi04J30pXG4gICAgaWYgKHRoaXMueG1sTnMpIHtcbiAgICAgIGNvbnN0IG5zID0gdGhpcy54bWxOcy5zcGxpdCgnICcpXG4gICAgICBmb3IgKGxldCBhdHRyIG9mIG5zKSB7XG4gICAgICAgIGNvbnN0IFtrLCB2XSA9IGF0dHIuc3BsaXQoJz0nKVxuICAgICAgICB0aGlzLnJvb3QuYXR0cmlidXRlKGssIHYucmVwbGFjZSgvXlsnXCJdfFsnXCJdJC9nLCAnJykpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqICBDbGVhciBzaXRlbWFwIGNhY2hlXG4gICAqL1xuICBjbGVhckNhY2hlKCkge1xuICAgIHRoaXMuY2FjaGUgPSAnJztcbiAgfVxuXG4gIC8qKlxuICAgKiAgQ2FuIGNhY2hlIGJlIHVzZWRcbiAgICovXG4gIGlzQ2FjaGVWYWxpZCgpIHtcbiAgICBsZXQgY3VyclRpbWVzdGFtcCA9IERhdGUubm93KCk7XG4gICAgcmV0dXJuIHRoaXMuY2FjaGVSZXNldFBlcmlvZCAmJiB0aGlzLmNhY2hlICYmXG4gICAgICAodGhpcy5jYWNoZVNldFRpbWVzdGFtcCArIHRoaXMuY2FjaGVSZXNldFBlcmlvZCkgPj0gY3VyclRpbWVzdGFtcDtcbiAgfVxuXG4gIC8qKlxuICAgKiAgRmlsbCBjYWNoZVxuICAgKi9cbiAgc2V0Q2FjaGUobmV3Q2FjaGU6IHN0cmluZykge1xuICAgIHRoaXMuY2FjaGUgPSBuZXdDYWNoZTtcbiAgICB0aGlzLmNhY2hlU2V0VGltZXN0YW1wID0gRGF0ZS5ub3coKTtcbiAgICByZXR1cm4gdGhpcy5jYWNoZTtcbiAgfVxuXG4gIC8qKlxuICAgKiAgQWRkIHVybCB0byBzaXRlbWFwXG4gICAqICBAcGFyYW0ge1N0cmluZ30gdXJsXG4gICAqL1xuICBhZGQodXJsOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy51cmxzLnB1c2godXJsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiAgRGVsZXRlIHVybCBmcm9tIHNpdGVtYXBcbiAgICogIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAgICovXG4gIGRlbCh1cmw6IHN0cmluZyB8IHtcbiAgICB1cmw6IHN0cmluZ1xuICB9KSB7XG4gICAgY29uc3QgaW5kZXhfdG9fcmVtb3ZlID0gW11cbiAgICBsZXQga2V5ID0gJydcblxuICAgIGlmICh0eXBlb2YgdXJsID09PSAnc3RyaW5nJykge1xuICAgICAga2V5ID0gdXJsO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBrZXkgPSB1cmwudXJsO1xuICAgIH1cblxuICAgIC8vIGZpbmRcbiAgICB0aGlzLnVybHMuZm9yRWFjaCgoZWxlbSwgaW5kZXgpID0+IHtcbiAgICAgIGlmICh0eXBlb2YgZWxlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgaWYgKGVsZW0gPT09IGtleSkge1xuICAgICAgICAgIGluZGV4X3RvX3JlbW92ZS5wdXNoKGluZGV4KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGVsZW0udXJsID09PSBrZXkpIHtcbiAgICAgICAgICBpbmRleF90b19yZW1vdmUucHVzaChpbmRleCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGRlbGV0ZVxuICAgIGluZGV4X3RvX3JlbW92ZS5mb3JFYWNoKChlbGVtKSA9PiB0aGlzLnVybHMuc3BsaWNlKGVsZW0sIDEpKTtcblxuICAgIHJldHVybiBpbmRleF90b19yZW1vdmUubGVuZ3RoO1xuICB9XG5cbiAgLyoqXG4gICAqICBDcmVhdGUgc2l0ZW1hcCB4bWxcbiAgICogIEBwYXJhbSB7RnVuY3Rpb259ICAgICBjYWxsYmFjayAgQ2FsbGJhY2sgZnVuY3Rpb24gd2l0aCBvbmUgYXJndW1lbnQg4oCUIHhtbFxuICAgKi9cbiAgdG9YTUwoY2FsbGJhY2s6IElDYWxsYmFjazxFcnJvciwgc3RyaW5nPikge1xuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gdGhpcy50b1N0cmluZygpO1xuICAgIH1cblxuICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHRoaXMudG9TdHJpbmcoKSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogIFN5bmNocm9ub3VzIGFsaWFzIGZvciB0b1hNTCgpXG4gICAqICBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICB0b1N0cmluZygpIHtcbiAgICBpZiAodGhpcy5yb290LmF0dHJpYnV0ZXMubGVuZ3RoKSB7XG4gICAgICB0aGlzLnJvb3QuYXR0cmlidXRlcyA9IFtdXG4gICAgfVxuICAgIGlmICh0aGlzLnJvb3QuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICB0aGlzLnJvb3QuY2hpbGRyZW4gPSBbXVxuICAgIH1cbiAgICBpZiAoIXRoaXMueG1sTnMpIHtcbiAgICAgIHRoaXMucm9vdC5hdHQoJ3htbG5zJywgJ2h0dHA6Ly93d3cuc2l0ZW1hcHMub3JnL3NjaGVtYXMvc2l0ZW1hcC8wLjknKVxuICAgICAgdGhpcy5yb290LmF0dCgneG1sbnM6bmV3cycsICdodHRwOi8vd3d3Lmdvb2dsZS5jb20vc2NoZW1hcy9zaXRlbWFwLW5ld3MvMC45JylcbiAgICAgIHRoaXMucm9vdC5hdHQoJ3htbG5zOnhodG1sJywgJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwnKVxuICAgICAgdGhpcy5yb290LmF0dCgneG1sbnM6bW9iaWxlJywgJ2h0dHA6Ly93d3cuZ29vZ2xlLmNvbS9zY2hlbWFzL3NpdGVtYXAtbW9iaWxlLzEuMCcpXG4gICAgICB0aGlzLnJvb3QuYXR0KCd4bWxuczppbWFnZScsICdodHRwOi8vd3d3Lmdvb2dsZS5jb20vc2NoZW1hcy9zaXRlbWFwLWltYWdlLzEuMScpXG4gICAgICB0aGlzLnJvb3QuYXR0KCd4bWxuczp2aWRlbycsICdodHRwOi8vd3d3Lmdvb2dsZS5jb20vc2NoZW1hcy9zaXRlbWFwLXZpZGVvLzEuMScpXG4gICAgfVxuXG4gICAgaWYgKHRoaXMueHNsVXJsKSB7XG4gICAgICB0aGlzLnJvb3QuaW5zdHJ1Y3Rpb25CZWZvcmUoJ3htbC1zdHlsZXNoZWV0JywgYHR5cGU9XCJ0ZXh0L3hzbFwiIGhyZWY9XCIke3RoaXMueHNsVXJsfVwiYClcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pc0NhY2hlVmFsaWQoKSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGU7XG4gICAgfVxuXG4gICAgLy8gVE9ETzogaWYgc2l6ZSA+IGxpbWl0OiBjcmVhdGUgc2l0ZW1hcGluZGV4XG5cbiAgICB0aGlzLnVybHMuZm9yRWFjaCgoZWxlbSwgaW5kZXgpID0+IHtcbiAgICAgIC8vIFNpdGVtYXBJdGVtXG4gICAgICAvLyBjcmVhdGUgb2JqZWN0IHdpdGggdXJsIHByb3BlcnR5XG4gICAgICBsZXQgc21pOiBTaXRlbWFwSXRlbU9wdGlvbnMgPSAodHlwZW9mIGVsZW0gPT09ICdzdHJpbmcnKSA/IHsndXJsJzogZWxlbSwgcm9vdDogdGhpcy5yb290fSA6IE9iamVjdC5hc3NpZ24oe3Jvb3Q6IHRoaXMucm9vdH0sIGVsZW0pXG5cbiAgICAgIC8vIGluc2VydCBkb21haW4gbmFtZVxuICAgICAgaWYgKHRoaXMuaG9zdG5hbWUpIHtcbiAgICAgICAgaWYgKCFyZVByb3RvLnRlc3Qoc21pLnVybCkpIHtcbiAgICAgICAgICBzbWkudXJsID0gdXJsam9pbih0aGlzLmhvc3RuYW1lLCBzbWkudXJsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc21pLmltZykge1xuICAgICAgICAgIGlmICh0eXBlb2Ygc21pLmltZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIC8vIHN0cmluZyAtPiBhcnJheSBvZiBvYmplY3RzXG4gICAgICAgICAgICBzbWkuaW1nID0gW3t1cmw6IHNtaS5pbWcgYXMgc3RyaW5nfV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2Ygc21pLmltZyA9PT0gJ29iamVjdCcgJiYgc21pLmltZy5sZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gb2JqZWN0IC0+IGFycmF5IG9mIG9iamVjdHNcbiAgICAgICAgICAgIHNtaS5pbWcgPSBbc21pLmltZyBhcyBJU2l0ZW1hcEltZ107XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHByZXBlbmQgaG9zdG5hbWUgdG8gYWxsIGltYWdlIHVybHNcbiAgICAgICAgICAoc21pLmltZyBhcyBJU2l0ZW1hcEltZ1tdKS5mb3JFYWNoKGltZyA9PiB7XG4gICAgICAgICAgICBpZiAoIXJlUHJvdG8udGVzdChpbWcudXJsKSkge1xuICAgICAgICAgICAgICBpbWcudXJsID0gdXJsam9pbih0aGlzLmhvc3RuYW1lLCBpbWcudXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc21pLmxpbmtzKSB7XG4gICAgICAgICAgc21pLmxpbmtzLmZvckVhY2gobGluayA9PiB7XG4gICAgICAgICAgICBpZiAoIXJlUHJvdG8udGVzdChsaW5rLnVybCkpIHtcbiAgICAgICAgICAgICAgbGluay51cmwgPSB1cmxqb2luKHRoaXMuaG9zdG5hbWUsIGxpbmsudXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3Qgc2l0ZW1hcEl0ZW0gPSBuZXcgU2l0ZW1hcEl0ZW0oc21pKVxuICAgICAgc2l0ZW1hcEl0ZW0uYnVpbGRYTUwoKVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRoaXMuc2V0Q2FjaGUodGhpcy5yb290LmVuZCgpKVxuICB9XG5cbiAgdG9HemlwKGNhbGxiYWNrOiBJQ2FsbGJhY2s8RXJyb3IsIEJ1ZmZlcj4pOiB2b2lkXG4gIHRvR3ppcCgpOiBCdWZmZXJcbiAgdG9HemlwKGNhbGxiYWNrPzogSUNhbGxiYWNrPEVycm9yLCBCdWZmZXI+KSB7XG4gICAgY29uc3QgemxpYjogdHlwZW9mIGltcG9ydCgnemxpYicpID0gcmVxdWlyZSgnemxpYicpO1xuXG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgemxpYi5nemlwKHRoaXMudG9TdHJpbmcoKSwgY2FsbGJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gemxpYi5nemlwU3luYyh0aGlzLnRvU3RyaW5nKCkpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFNob3J0Y3V0IGZvciBgbmV3IFNpdGVtYXBJbmRleCAoLi4uKWAuXG4gKlxuICogQHBhcmFtICAge09iamVjdH0gICAgICAgIGNvbmZcbiAqIEBwYXJhbSAgIHtTdHJpbmd8QXJyYXl9ICBjb25mLnVybHNcbiAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgICBjb25mLnRhcmdldEZvbGRlclxuICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIGNvbmYuaG9zdG5hbWVcbiAqIEBwYXJhbSAgIHtOdW1iZXJ9ICAgICAgICBjb25mLmNhY2hlVGltZVxuICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIGNvbmYuc2l0ZW1hcE5hbWVcbiAqIEBwYXJhbSAgIHtOdW1iZXJ9ICAgICAgICBjb25mLnNpdGVtYXBTaXplXG4gKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgICAgY29uZi54c2xVcmxcbiAqIEByZXR1cm4gIHtTaXRlbWFwSW5kZXh9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTaXRlbWFwSW5kZXggKGNvbmYpIHtcbiAgcmV0dXJuIG5ldyBTaXRlbWFwSW5kZXgoY29uZi51cmxzLFxuICAgIGNvbmYudGFyZ2V0Rm9sZGVyLFxuICAgIGNvbmYuaG9zdG5hbWUsXG4gICAgY29uZi5jYWNoZVRpbWUsXG4gICAgY29uZi5zaXRlbWFwTmFtZSxcbiAgICBjb25mLnNpdGVtYXBTaXplLFxuICAgIGNvbmYueHNsVXJsLFxuICAgIGNvbmYuZ3ppcCxcbiAgICBjb25mLmNhbGxiYWNrKTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgYSBzaXRlbWFwIGluZGV4IGZyb20gdXJsc1xuICpcbiAqIEBwYXJhbSAgIHtPYmplY3R9ICAgIGNvbmZcbiAqIEBwYXJhbSAgIHtBcnJheX0gICAgIGNvbmYudXJsc1xuICogQHBhcmFtICAge1N0cmluZ30gICAgY29uZi54c2xVcmxcbiAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgIGNvbmYueG1sTnNcbiAqIEByZXR1cm4gIHtTdHJpbmd9ICAgIFhNTCBTdHJpbmcgb2YgU2l0ZW1hcEluZGV4XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFNpdGVtYXBJbmRleCAoY29uZjoge1xuICB1cmxzOiBhbnlbXSxcbiAgeHNsVXJsOiBzdHJpbmcsXG4gIHhtbE5zOiBzdHJpbmcsXG5cbiAgbGFzdG1vZElTTz86IERhdGVcbiAgbGFzdG1vZHJlYWx0aW1lPzogYm9vbGVhbixcbiAgbGFzdG1vZD86IG51bWJlciB8IHN0cmluZ1xufSkge1xuICBsZXQgeG1sID0gW107XG4gIGxldCBsYXN0bW9kO1xuXG4gIHhtbC5wdXNoKCc8P3htbCB2ZXJzaW9uPVwiMS4wXCIgZW5jb2Rpbmc9XCJVVEYtOFwiPz4nKTtcbiAgaWYgKGNvbmYueHNsVXJsKSB7XG4gICAgeG1sLnB1c2goJzw/eG1sLXN0eWxlc2hlZXQgdHlwZT1cInRleHQveHNsXCIgaHJlZj1cIicgKyBjb25mLnhzbFVybCArICdcIj8+Jyk7XG4gIH1cbiAgaWYgKCFjb25mLnhtbE5zKSB7XG4gICAgeG1sLnB1c2goJzxzaXRlbWFwaW5kZXggeG1sbnM9XCJodHRwOi8vd3d3LnNpdGVtYXBzLm9yZy9zY2hlbWFzL3NpdGVtYXAvMC45XCIgJyArXG4gICAgICAneG1sbnM6bW9iaWxlPVwiaHR0cDovL3d3dy5nb29nbGUuY29tL3NjaGVtYXMvc2l0ZW1hcC1tb2JpbGUvMS4wXCIgJyArXG4gICAgICAneG1sbnM6aW1hZ2U9XCJodHRwOi8vd3d3Lmdvb2dsZS5jb20vc2NoZW1hcy9zaXRlbWFwLWltYWdlLzEuMVwiICcgK1xuICAgICAgJ3htbG5zOnZpZGVvPVwiaHR0cDovL3d3dy5nb29nbGUuY29tL3NjaGVtYXMvc2l0ZW1hcC12aWRlby8xLjFcIj4nKTtcbiAgfSBlbHNlIHtcbiAgICB4bWwucHVzaCgnPHNpdGVtYXBpbmRleCAnICsgY29uZi54bWxOcyArICc+JylcbiAgfVxuXG4gIGlmIChjb25mLmxhc3Rtb2RJU08pIHtcbiAgICBsYXN0bW9kID0gY29uZi5sYXN0bW9kSVNPO1xuICB9IGVsc2UgaWYgKGNvbmYubGFzdG1vZHJlYWx0aW1lKSB7XG4gICAgbGFzdG1vZCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgfSBlbHNlIGlmIChjb25mLmxhc3Rtb2QpIHtcbiAgICBsYXN0bW9kID0gbmV3IERhdGUoY29uZi5sYXN0bW9kKS50b0lTT1N0cmluZygpO1xuICB9XG5cblxuICBjb25mLnVybHMuZm9yRWFjaCh1cmwgPT4ge1xuICAgIGlmICh1cmwgaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgIGxhc3Rtb2QgPSB1cmwubGFzdG1vZCA/IHVybC5sYXN0bW9kIDogbGFzdG1vZDtcblxuICAgICAgdXJsID0gdXJsLnVybDtcbiAgICB9XG4gICAgeG1sLnB1c2goJzxzaXRlbWFwPicpO1xuICAgIHhtbC5wdXNoKCc8bG9jPicgKyB1cmwgKyAnPC9sb2M+Jyk7XG4gICAgaWYgKGxhc3Rtb2QpIHtcbiAgICAgIHhtbC5wdXNoKCc8bGFzdG1vZD4nICsgbGFzdG1vZCArICc8L2xhc3Rtb2Q+Jyk7XG4gICAgfVxuICAgIHhtbC5wdXNoKCc8L3NpdGVtYXA+Jyk7XG4gIH0pO1xuXG4gIHhtbC5wdXNoKCc8L3NpdGVtYXBpbmRleD4nKTtcblxuICByZXR1cm4geG1sLmpvaW4oJ1xcbicpO1xufVxuXG4vKipcbiAqIFNpdGVtYXAgaW5kZXggKGZvciBzZXZlcmFsIHNpdGVtYXBzKVxuICovXG5jbGFzcyBTaXRlbWFwSW5kZXgge1xuXG4gIGhvc3RuYW1lOiBzdHJpbmc7XG4gIHNpdGVtYXBOYW1lOiBzdHJpbmc7XG4gIHNpdGVtYXBTaXplOiBudW1iZXJcbiAgeHNsVXJsOiBzdHJpbmdcbiAgc2l0ZW1hcElkOiBudW1iZXJcbiAgc2l0ZW1hcHM6IHVua25vd25bXVxuICB0YXJnZXRGb2xkZXI6IHN0cmluZztcbiAgdXJsczogdW5rbm93bltdXG5cbiAgY2h1bmtzXG4gIGNhbGxiYWNrPzogSUNhbGxiYWNrPEVycm9yLCBib29sZWFuPlxuICBjYWNoZVRpbWU6IG51bWJlclxuXG4gIHhtbE5zOiBzdHJpbmdcblxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gIHVybHNcbiAgICogQHBhcmFtIHtTdHJpbmd9ICAgICAgICB0YXJnZXRGb2xkZXJcbiAgICogQHBhcmFtIHtTdHJpbmd9ICAgICAgICBob3N0bmFtZSAgICAgIG9wdGlvbmFsXG4gICAqIEBwYXJhbSB7TnVtYmVyfSAgICAgICAgY2FjaGVUaW1lICAgICBvcHRpb25hbCBpbiBtaWxsaXNlY29uZHNcbiAgICogQHBhcmFtIHtTdHJpbmd9ICAgICAgICBzaXRlbWFwTmFtZSAgIG9wdGlvbmFsXG4gICAqIEBwYXJhbSB7TnVtYmVyfSAgICAgICAgc2l0ZW1hcFNpemUgICBvcHRpb25hbFxuICAgKiBAcGFyYW0ge051bWJlcn0gICAgICAgIHhzbFVybCAgICAgICAgICAgICAgICBvcHRpb25hbFxuICAgKiBAcGFyYW0ge0Jvb2xlYW59ICAgICAgIGd6aXAgICAgICAgICAgb3B0aW9uYWxcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gICAgICBjYWxsYmFjayAgICAgIG9wdGlvbmFsXG4gICAqL1xuICBjb25zdHJ1Y3RvciAodXJsczogc3RyaW5nIHwgc3RyaW5nW10sIHRhcmdldEZvbGRlcjogc3RyaW5nLCBob3N0bmFtZT86IHN0cmluZywgY2FjaGVUaW1lPzogbnVtYmVyLCBzaXRlbWFwTmFtZT86IHN0cmluZywgc2l0ZW1hcFNpemU/OiBudW1iZXIsIHhzbFVybD86IHN0cmluZywgZ3ppcD86IGJvb2xlYW4sIGNhbGxiYWNrPzogSUNhbGxiYWNrPEVycm9yLCBib29sZWFuPikge1xuICAgIC8vIEJhc2UgZG9tYWluXG4gICAgdGhpcy5ob3N0bmFtZSA9IGhvc3RuYW1lO1xuXG4gICAgaWYgKHNpdGVtYXBOYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuc2l0ZW1hcE5hbWUgPSAnc2l0ZW1hcCc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2l0ZW1hcE5hbWUgPSBzaXRlbWFwTmFtZTtcbiAgICB9XG5cbiAgICAvLyBUaGlzIGxpbWl0IGlzIGRlZmluZWQgYnkgR29vZ2xlLiBTZWU6XG4gICAgLy8gaHR0cDovL3NpdGVtYXBzLm9yZy9wcm90b2NvbC5waHAjaW5kZXhcbiAgICB0aGlzLnNpdGVtYXBTaXplID0gc2l0ZW1hcFNpemU7XG5cbiAgICB0aGlzLnhzbFVybCA9IHhzbFVybDtcblxuICAgIHRoaXMuc2l0ZW1hcElkID0gMDtcblxuICAgIHRoaXMuc2l0ZW1hcHMgPSBbXTtcblxuICAgIHRoaXMudGFyZ2V0Rm9sZGVyID0gJy4nO1xuXG4gICAgdHJ5IHtcbiAgICAgIGlmICghZnMuc3RhdFN5bmModGFyZ2V0Rm9sZGVyKS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIHRocm93IG5ldyBVbmRlZmluZWRUYXJnZXRGb2xkZXIoKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRocm93IG5ldyBlcnIuVW5kZWZpbmVkVGFyZ2V0Rm9sZGVyKCk7XG4gICAgfVxuXG4gICAgdGhpcy50YXJnZXRGb2xkZXIgPSB0YXJnZXRGb2xkZXI7XG5cbiAgICAvLyBVUkwgbGlzdCBmb3Igc2l0ZW1hcFxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICB0aGlzLnVybHMgPSB1cmxzIHx8IFtdO1xuICAgIGlmICghQXJyYXkuaXNBcnJheSh0aGlzLnVybHMpKSB7XG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICB0aGlzLnVybHMgPSBbdGhpcy51cmxzXVxuICAgIH1cblxuICAgIHRoaXMuY2h1bmtzID0gY2h1bmsodGhpcy51cmxzLCB0aGlzLnNpdGVtYXBTaXplKTtcblxuICAgIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcblxuICAgIGxldCBwcm9jZXNzZXNDb3VudCA9IHRoaXMuY2h1bmtzLmxlbmd0aCArIDE7XG5cbiAgICB0aGlzLmNodW5rcy5mb3JFYWNoKChjaHVuaywgaW5kZXgpID0+IHtcbiAgICAgIGNvbnN0IGV4dGVuc2lvbiA9ICcueG1sJyArIChnemlwID8gJy5neicgOiAnJyk7XG4gICAgICBjb25zdCBmaWxlbmFtZSA9IHRoaXMuc2l0ZW1hcE5hbWUgKyAnLScgKyB0aGlzLnNpdGVtYXBJZCsrICsgZXh0ZW5zaW9uO1xuXG4gICAgICB0aGlzLnNpdGVtYXBzLnB1c2goZmlsZW5hbWUpO1xuXG4gICAgICBsZXQgc2l0ZW1hcCA9IGNyZWF0ZVNpdGVtYXAoe1xuICAgICAgICBob3N0bmFtZTogdGhpcy5ob3N0bmFtZSxcbiAgICAgICAgY2FjaGVUaW1lOiB0aGlzLmNhY2hlVGltZSwgLy8gNjAwIHNlYyAtIGNhY2hlIHB1cmdlIHBlcmlvZFxuICAgICAgICB1cmxzOiBjaHVuayxcbiAgICAgICAgeHNsVXJsOiB0aGlzLnhzbFVybFxuICAgICAgfSk7XG5cbiAgICAgIGxldCBzdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbSh0YXJnZXRGb2xkZXIgKyAnLycgKyBmaWxlbmFtZSk7XG4gICAgICBzdHJlYW0ub25jZSgnb3BlbicsIGZkID0+IHtcbiAgICAgICAgc3RyZWFtLndyaXRlKGd6aXAgPyBzaXRlbWFwLnRvR3ppcCgpIDogc2l0ZW1hcC50b1N0cmluZygpKTtcbiAgICAgICAgc3RyZWFtLmVuZCgpO1xuICAgICAgICBwcm9jZXNzZXNDb3VudC0tO1xuICAgICAgICBpZiAocHJvY2Vzc2VzQ291bnQgPT09IDAgJiYgdHlwZW9mIHRoaXMuY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICB0aGlzLmNhbGxiYWNrKG51bGwsIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgIH0pO1xuXG4gICAgbGV0IHNpdGVtYXBVcmxzID0gdGhpcy5zaXRlbWFwcy5tYXAoc2l0ZW1hcCA9PiBob3N0bmFtZSArICcvJyArIHNpdGVtYXApO1xuICAgIGxldCBzbUNvbmYgPSB7dXJsczogc2l0ZW1hcFVybHMsIHhzbFVybDogdGhpcy54c2xVcmwsIHhtbE5zOiB0aGlzLnhtbE5zfTtcbiAgICBsZXQgeG1sU3RyaW5nID0gYnVpbGRTaXRlbWFwSW5kZXgoc21Db25mKTtcblxuICAgIGxldCBzdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbSh0YXJnZXRGb2xkZXIgKyAnLycgK1xuICAgICAgdGhpcy5zaXRlbWFwTmFtZSArICctaW5kZXgueG1sJyk7XG4gICAgc3RyZWFtLm9uY2UoJ29wZW4nLCAoZmQpID0+IHtcbiAgICAgIHN0cmVhbS53cml0ZSh4bWxTdHJpbmcpO1xuICAgICAgc3RyZWFtLmVuZCgpO1xuICAgICAgcHJvY2Vzc2VzQ291bnQtLTtcbiAgICAgIGlmIChwcm9jZXNzZXNDb3VudCA9PT0gMCAmJiB0eXBlb2YgdGhpcy5jYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLmNhbGxiYWNrKG51bGwsIHRydWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCB7IFNpdGVtYXBJdGVtIH1cbiJdfQ==