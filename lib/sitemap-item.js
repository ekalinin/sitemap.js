"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ut = require("./utils");
const fs = require("fs");
const errors_1 = require("./errors");
const builder = require("xmlbuilder");
const isArray = require("lodash/isArray");
const types_1 = require("./types");
function safeDuration(duration) {
    if (duration < 0 || duration > 28800) {
        throw new errors_1.InvalidVideoDuration();
    }
    return duration;
}
const allowDeny = /^allow|deny$/;
const validators = {
    'price:currency': /^[A-Z]{3}$/,
    'price:type': /^rent|purchase|RENT|PURCHASE$/,
    'price:resolution': /^HD|hd|sd|SD$/,
    'platform:relationship': allowDeny,
    'restriction:relationship': allowDeny
};
function attrBuilder(conf, keys) {
    if (typeof keys === 'string') {
        keys = [keys];
    }
    let attrs = keys.reduce((attrs, key) => {
        if (conf[key] !== undefined) {
            let keyAr = key.split(':');
            if (keyAr.length !== 2) {
                throw new errors_1.InvalidAttr(key);
            }
            if (validators[key] && !validators[key].test(conf[key])) {
                throw new errors_1.InvalidAttrValue(key, conf[key], validators[key]);
            }
            attrs[keyAr[1]] = conf[key];
        }
        return attrs;
    }, {});
    return attrs;
}
/**
 * Item in sitemap
 */
class SitemapItem {
    constructor(conf = {}) {
        this.conf = conf;
        const isSafeUrl = conf.safe;
        if (!conf.url) {
            throw new errors_1.NoURLError();
        }
        // URL of the page
        this.loc = conf.url;
        let dt;
        // If given a file to use for last modified date
        if (conf.lastmodfile) {
            // console.log('should read stat from file: ' + conf.lastmodfile);
            let file = conf.lastmodfile;
            let stat = fs.statSync(file);
            let mtime = stat.mtime;
            dt = new Date(mtime);
            this.lastmod = ut.getTimestampFromDate(dt, conf.lastmodrealtime);
            // The date of last modification (YYYY-MM-DD)
        }
        else if (conf.lastmod) {
            // append the timezone offset so that dates are treated as local time.
            // Otherwise the Unit tests fail sometimes.
            let timezoneOffset = 'UTC-' + (new Date().getTimezoneOffset() / 60) + '00';
            timezoneOffset = timezoneOffset.replace('--', '-');
            dt = new Date(conf.lastmod + ' ' + timezoneOffset);
            this.lastmod = ut.getTimestampFromDate(dt, conf.lastmodrealtime);
        }
        else if (conf.lastmodISO) {
            this.lastmod = conf.lastmodISO;
        }
        // How frequently the page is likely to change
        // due to this field is optional no default value is set
        // please see: http://www.sitemaps.org/protocol.html
        this.changefreq = conf.changefreq;
        if (!isSafeUrl && this.changefreq) {
            if (types_1.CHANGEFREQ.indexOf(this.changefreq) === -1) {
                throw new errors_1.ChangeFreqInvalidError();
            }
        }
        // The priority of this URL relative to other URLs
        // due to this field is optional no default value is set
        // please see: http://www.sitemaps.org/protocol.html
        this.priority = conf.priority;
        if (!isSafeUrl && this.priority) {
            if (!(this.priority >= 0.0 && this.priority <= 1.0) || typeof this.priority !== 'number') {
                throw new errors_1.PriorityInvalidError();
            }
        }
        this.news = conf.news || null;
        this.img = conf.img || null;
        this.links = conf.links || null;
        this.expires = conf.expires || null;
        this.androidLink = conf.androidLink || null;
        this.mobile = conf.mobile || null;
        this.video = conf.video || null;
        this.ampLink = conf.ampLink || null;
        this.root = conf.root || builder.create('root');
        this.url = this.root.element('url');
    }
    /**
     *  Create sitemap xml
     *  @return {String}
     */
    toXML() {
        return this.toString();
    }
    buildVideoElement(video) {
        const videoxml = this.url.element('video:video');
        if (typeof (video) !== 'object' || !video.thumbnail_loc || !video.title || !video.description) {
            // has to be an object and include required categories https://developers.google.com/webmasters/videosearch/sitemaps
            throw new errors_1.InvalidVideoFormat();
        }
        if (video.description.length > 2048) {
            throw new errors_1.InvalidVideoDescription();
        }
        videoxml.element('video:thumbnail_loc', video.thumbnail_loc);
        videoxml.element('video:title').cdata(video.title);
        videoxml.element('video:description').cdata(video.description);
        if (video.content_loc) {
            videoxml.element('video:content_loc', video.content_loc);
        }
        if (video.player_loc) {
            videoxml.element('video:player_loc', attrBuilder(video, 'player_loc:autoplay'), video.player_loc);
        }
        if (video.duration) {
            videoxml.element('video:duration', safeDuration(video.duration));
        }
        if (video.expiration_date) {
            videoxml.element('video:expiration_date', video.expiration_date);
        }
        if (video.rating) {
            videoxml.element('video:rating', video.rating);
        }
        if (video.view_count) {
            videoxml.element('video:view_count', video.view_count);
        }
        if (video.publication_date) {
            videoxml.element('video:publication_date', video.publication_date);
        }
        if (video.family_friendly) {
            videoxml.element('video:family_friendly', video.family_friendly);
        }
        if (video.tag) {
            if (!isArray(video.tag)) {
                videoxml.element('video:tag', video.tag);
            }
            else {
                for (const tag of video.tag) {
                    videoxml.element('video:tag', tag);
                }
            }
        }
        if (video.category) {
            videoxml.element('video:category', video.category);
        }
        if (video.restriction) {
            videoxml.element('video:restriction', attrBuilder(video, 'restriction:relationship'), video.restriction);
        }
        if (video.gallery_loc) {
            videoxml.element('video:gallery_loc', { title: video['gallery_loc:title'] }, video.gallery_loc);
        }
        if (video.price) {
            videoxml.element('video:price', attrBuilder(video, ['price:resolution', 'price:currency', 'price:type']), video.price);
        }
        if (video.requires_subscription) {
            videoxml.element('video:requires_subscription', video.requires_subscription);
        }
        if (video.uploader) {
            videoxml.element('video:uploader', video.uploader);
        }
        if (video.platform) {
            videoxml.element('video:platform', attrBuilder(video, 'platform:relationship'), video.platform);
        }
        if (video.live) {
            videoxml.element('video:live', video.live);
        }
    }
    buildXML() {
        this.url.children = [];
        this.url.attributes = {};
        // xml property
        const props = ['loc', 'lastmod', 'changefreq', 'priority', 'img', 'video', 'links', 'expires', 'androidLink', 'mobile', 'news', 'ampLink'];
        // property array size (for loop)
        let ps = 0;
        // current property name (for loop)
        let p;
        while (ps < props.length) {
            p = props[ps];
            ps++;
            if (this[p] && p === 'img') {
                // Image handling
                if (typeof (this[p]) !== 'object' || this[p].length === undefined) {
                    // make it an array
                    this[p] = [this[p]];
                }
                this[p].forEach(image => {
                    const xmlObj = {};
                    if (typeof (image) !== 'object') {
                        // it’s a string
                        // make it an object
                        xmlObj['image:loc'] = image;
                    }
                    else if (image.url) {
                        xmlObj['image:loc'] = image.url;
                    }
                    if (image.caption) {
                        xmlObj['image:caption'] = { '#cdata': image.caption };
                    }
                    if (image.geoLocation) {
                        xmlObj['image:geo_location'] = image.geoLocation;
                    }
                    if (image.title) {
                        xmlObj['image:title'] = { '#cdata': image.title };
                    }
                    if (image.license) {
                        xmlObj['image:license'] = image.license;
                    }
                    this.url.element({ 'image:image': xmlObj });
                });
            }
            else if (this[p] && p === 'video') {
                // Image handling
                if (typeof (this[p]) !== 'object' || this[p].length === undefined) {
                    // make it an array
                    this[p] = [this[p]];
                }
                this[p].forEach(this.buildVideoElement, this);
            }
            else if (this[p] && p === 'links') {
                this[p].forEach(link => {
                    this.url.element({ 'xhtml:link': {
                            '@rel': 'alternate',
                            '@hreflang': link.lang,
                            '@href': link.url
                        } });
                });
            }
            else if (this[p] && p === 'expires') {
                this.url.element('expires', new Date(this[p]).toISOString());
            }
            else if (this[p] && p === 'androidLink') {
                this.url.element('xhtml:link', { rel: 'alternate', href: this[p] });
            }
            else if (this[p] && p === 'mobile') {
                const mobileitem = this.url.element('mobile:mobile');
                if (typeof this[p] === 'string') {
                    mobileitem.att('type', this[p]);
                }
            }
            else if (p === 'priority' && (this[p] >= 0.0 && this[p] <= 1.0)) {
                this.url.element(p, parseFloat(this[p]).toFixed(1));
            }
            else if (this[p] && p === 'ampLink') {
                this.url.element('xhtml:link', { rel: 'amphtml', href: this[p] });
            }
            else if (this[p] && p === 'news') {
                let newsitem = this.url.element('news:news');
                if (!this[p].publication ||
                    !this[p].publication.name ||
                    !this[p].publication.language ||
                    !this[p].publication_date ||
                    !this[p].title) {
                    throw new errors_1.InvalidNewsFormat();
                }
                if (this[p].publication) {
                    let publication = newsitem.element('news:publication');
                    if (this[p].publication.name) {
                        publication.element('news:name').cdata(this[p].publication.name);
                    }
                    if (this[p].publication.language) {
                        publication.element('news:language', this[p].publication.language);
                    }
                }
                if (this[p].access) {
                    if (this[p].access !== 'Registration' &&
                        this[p].access !== 'Subscription') {
                        throw new errors_1.InvalidNewsAccessValue();
                    }
                    newsitem.element('news:access', this[p].access);
                }
                if (this[p].genres) {
                    newsitem.element('news:genres', this[p].genres);
                }
                newsitem.element('news:publication_date', this[p].publication_date);
                newsitem.element('news:title').cdata(this[p].title);
                if (this[p].keywords) {
                    newsitem.element('news:keywords', this[p].keywords);
                }
                if (this[p].stock_tickers) {
                    newsitem.element('news:stock_tickers', this[p].stock_tickers);
                }
            }
            else if (this[p]) {
                if (p === 'loc' && this.conf.cdata) {
                    this.url.element({
                        [p]: {
                            '#raw': this[p]
                        }
                    });
                }
                else {
                    this.url.element(p, this[p]);
                }
            }
        }
        return this.url;
    }
    /**
     *  Alias for toXML()
     *  @return {String}
     */
    toString() {
        return this.buildXML().toString();
    }
}
exports.SitemapItem = SitemapItem;
exports.default = SitemapItem;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2l0ZW1hcC1pdGVtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2l0ZW1hcC1pdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsOEJBQThCO0FBQzlCLHlCQUF5QjtBQUN6QixxQ0FBMlE7QUFDM1Esc0NBQXNDO0FBQ3RDLDBDQUEwQztBQUUxQyxtQ0FBK0U7QUFpRi9FLFNBQVMsWUFBWSxDQUFFLFFBQVE7SUFDN0IsSUFBSSxRQUFRLEdBQUcsQ0FBQyxJQUFJLFFBQVEsR0FBRyxLQUFLLEVBQUU7UUFDcEMsTUFBTSxJQUFJLDZCQUFvQixFQUFFLENBQUE7S0FDakM7SUFFRCxPQUFPLFFBQVEsQ0FBQTtBQUNqQixDQUFDO0FBRUQsTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFBO0FBQ2hDLE1BQU0sVUFBVSxHQUFHO0lBQ2pCLGdCQUFnQixFQUFFLFlBQVk7SUFDOUIsWUFBWSxFQUFFLCtCQUErQjtJQUM3QyxrQkFBa0IsRUFBRSxlQUFlO0lBQ25DLHVCQUF1QixFQUFFLFNBQVM7SUFDbEMsMEJBQTBCLEVBQUUsU0FBUztDQUN0QyxDQUFBO0FBRUQsU0FBUyxXQUFXLENBQUUsSUFBSSxFQUFFLElBQUk7SUFDOUIsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7UUFDNUIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7S0FDZDtJQUVELElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDckMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssU0FBUyxFQUFFO1lBQzlCLElBQUksS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDdkIsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDdEIsTUFBTSxJQUFJLG9CQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7YUFDM0I7WUFFRCxJQUFJLFVBQVUs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QUFDLENBQUE7Z0JBRW5ELElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRTtvQkFDcEIsUUFBUSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFBO2lCQUNwRDtnQkFFRCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLEVBQUU7b0JBQ3pCLFFBQVEsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFBO2lCQUM5RDthQUNGO2lCQUFNLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNsQixJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7b0JBQ2xDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDO3dCQUNmLENBQUMsQ0FBQyxDQUFDLEVBQUU7NEJBQ0gsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7eUJBQ2hCO3FCQUNGLENBQUMsQ0FBQTtpQkFDSDtxQkFBTTtvQkFDTCxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7aUJBQzdCO2FBQ0Y7U0FDRjtRQUVELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQTtJQUNqQixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsUUFBUTtRQUNOLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ25DLENBQUM7Q0FDRjtBQXZVRCxrQ0F1VUM7QUFFRCxrQkFBZSxXQUFXLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdXQgPSByZXF1aXJlKCcuL3V0aWxzJylcbmltcG9ydCBmcyA9IHJlcXVpcmUoJ2ZzJylcbmltcG9ydCB7IENoYW5nZUZyZXFJbnZhbGlkRXJyb3IsIE5vVVJMRXJyb3IsIE5vVVJMUHJvdG9jb2xFcnJvciwgUHJpb3JpdHlJbnZhbGlkRXJyb3IsIEludmFsaWRWaWRlb0R1cmF0aW9uLCBJbnZhbGlkQXR0ciwgSW52YWxpZEF0dHJWYWx1ZSwgSW52YWxpZE5ld3NBY2Nlc3NWYWx1ZSwgSW52YWxpZE5ld3NGb3JtYXQsIEludmFsaWRWaWRlb0Rlc2NyaXB0aW9uLCBJbnZhbGlkVmlkZW9Gb3JtYXQsIFVuZGVmaW5lZFRhcmdldEZvbGRlciB9IGZyb20gJy4vZXJyb3JzJ1xuaW1wb3J0IGJ1aWxkZXIgPSByZXF1aXJlKCd4bWxidWlsZGVyJylcbmltcG9ydCBpc0FycmF5ID0gcmVxdWlyZSgnbG9kYXNoL2lzQXJyYXknKVxuaW1wb3J0IHsgWE1MRWxlbWVudE9yWE1MTm9kZSB9IGZyb20gJ3htbGJ1aWxkZXInO1xuaW1wb3J0IHsgQ0hBTkdFRlJFUSwgRW51bUFsbG93RGVueSwgRW51bUNoYW5nZWZyZXEsIEVudW1ZZXNObyB9IGZyb20gJy4vdHlwZXMnO1xuXG5leHBvcnQgdHlwZSBJQ2FsbGJhY2s8RSBleHRlbmRzIEVycm9yLCBUPiA9IChlcnI6IEUsIGRhdGE/OiBUKSA9PiB2b2lkO1xuXG5leHBvcnQgaW50ZXJmYWNlIElOZXdzSXRlbSB7XG5cdHB1YmxpY2F0aW9uOiB7XG5cdFx0bmFtZTogc3RyaW5nLFxuXHRcdGxhbmd1YWdlOiBzdHJpbmdcblx0fSxcblx0Z2VucmVzOiBzdHJpbmcsXG5cdHB1YmxpY2F0aW9uX2RhdGU6IHN0cmluZyxcblx0dGl0bGU6IHN0cmluZyxcblx0a2V5d29yZHM6IHN0cmluZyxcblx0c3RvY2tfdGlja2Vyczogc3RyaW5nXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSVNpdGVtYXBJbWcge1xuXHR1cmw6IHN0cmluZyxcblx0Y2FwdGlvbjogc3RyaW5nLFxuXHR0aXRsZTogc3RyaW5nLFxuXHRnZW9Mb2NhdGlvbjogc3RyaW5nLFxuXHRsaWNlbnNlOiBzdHJpbmcsXG5cdGxlbmd0aD86IG5ldmVyLFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIElWaWRlb0l0ZW0ge1xuXHR0aHVtYm5haWxfbG9jOiBzdHJpbmc7XG5cdHRpdGxlOiBzdHJpbmc7XG5cdGRlc2NyaXB0aW9uOiBzdHJpbmc7XG5cdGNvbnRlbnRfbG9jPzogc3RyaW5nO1xuXHRwbGF5ZXJfbG9jPzogc3RyaW5nO1xuXHQncGxheWVyX2xvYzphdXRvcGxheSdcblx0ZHVyYXRpb24/OiBzdHJpbmd8bnVtYmVyO1xuXHRleHBpcmF0aW9uX2RhdGU/OiBzdHJpbmc7XG5cdHJhdGluZz86IHN0cmluZ3xudW1iZXI7XG5cdHZpZXdfY291bnQ/OiBzdHJpbmd8bnVtYmVyO1xuXHRwdWJsaWNhdGlvbl9kYXRlPzogc3RyaW5nO1xuXHRmYW1pbHlfZnJpZW5kbHk/OiBFbnVtWWVzTm87XG5cdHRhZz86IHN0cmluZyB8IHN0cmluZ1tdO1xuXHRjYXRlZ29yeT86IHN0cmluZztcblx0cmVzdHJpY3Rpb24/OiBzdHJpbmc7XG5cdCdyZXN0cmljdGlvbjpyZWxhdGlvbnNoaXAnOiBzdHJpbmcsXG5cdGdhbGxlcnlfbG9jPzogYW55O1xuXHRwcmljZT86IHN0cmluZztcblx0J3ByaWNlOnJlc29sdXRpb24nPzogc3RyaW5nO1xuXHQncHJpY2U6Y3VycmVuY3knPzogc3RyaW5nO1xuXHQncHJpY2U6dHlwZSc/OiBzdHJpbmc7XG5cdHJlcXVpcmVzX3N1YnNjcmlwdGlvbj86IEVudW1ZZXNObztcblx0dXBsb2FkZXI/OiBzdHJpbmc7XG5cdHBsYXRmb3JtPzogc3RyaW5nO1xuXHQncGxhdGZvcm06cmVsYXRpb25zaGlwJz86IEVudW1BbGxvd0Rlbnk7XG5cdGxpdmU/OiBFbnVtWWVzTm87XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSUxpbmtJdGVtIHtcblx0bGFuZzogc3RyaW5nO1xuXHR1cmw6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTaXRlbWFwSXRlbU9wdGlvbnMge1xuXHRzYWZlPzogYm9vbGVhbjtcblx0bGFzdG1vZGZpbGU/OiBhbnk7XG5cdGxhc3Rtb2RyZWFsdGltZT86IGJvb2xlYW47XG5cdGxhc3Rtb2Q/OiBzdHJpbmc7XG5cdGxhc3Rtb2RJU08/OiBzdHJpbmc7XG5cdGNoYW5nZWZyZXE/OiBFbnVtQ2hhbmdlZnJlcTtcblx0cHJpb3JpdHk/OiBudW1iZXI7XG5cdG5ld3M/OiBJTmV3c0l0ZW07XG5cdGltZz86IFBhcnRpYWw8SVNpdGVtYXBJbWc+IHwgUGFydGlhbDxJU2l0ZW1hcEltZz5bXTtcblx0bGlua3M/OiBJTGlua0l0ZW1bXTtcblx0ZXhwaXJlcz86IHN0cmluZztcblx0YW5kcm9pZExpbms/OiBzdHJpbmc7XG5cdG1vYmlsZT86IGJvb2xlYW58c3RyaW5nO1xuXHR2aWRlbz86IElWaWRlb0l0ZW07XG5cdGFtcExpbms/OiBzdHJpbmc7XG5cdHJvb3Q/OiBidWlsZGVyLlhNTEVsZW1lbnRPclhNTE5vZGU7XG5cdHVybD86IHN0cmluZztcblxuXHRjZGF0YT9cbn1cblxuZnVuY3Rpb24gc2FmZUR1cmF0aW9uIChkdXJhdGlvbikge1xuICBpZiAoZHVyYXRpb24gPCAwIHx8IGR1cmF0aW9uID4gMjg4MDApIHtcbiAgICB0aHJvdyBuZXcgSW52YWxpZFZpZGVvRHVyYXRpb24oKVxuICB9XG5cbiAgcmV0dXJuIGR1cmF0aW9uXG59XG5cbmNvbnN0IGFsbG93RGVueSA9IC9eYWxsb3d8ZGVueSQvXG5jb25zdCB2YWxpZGF0b3JzID0ge1xuICAncHJpY2U6Y3VycmVuY3knOiAvXltBLVpdezN9JC8sXG4gICdwcmljZTp0eXBlJzogL15yZW50fHB1cmNoYXNlfFJFTlR8UFVSQ0hBU0UkLyxcbiAgJ3ByaWNlOnJlc29sdXRpb24nOiAvXkhEfGhkfHNkfFNEJC8sXG4gICdwbGF0Zm9ybTpyZWxhdGlvbnNoaXAnOiBhbGxvd0RlbnksXG4gICdyZXN0cmljdGlvbjpyZWxhdGlvbnNoaXAnOiBhbGxvd0Rlbnlcbn1cblxuZnVuY3Rpb24gYXR0ckJ1aWxkZXIgKGNvbmYsIGtleXMpIHtcbiAgaWYgKHR5cGVvZiBrZXlzID09PSAnc3RyaW5nJykge1xuICAgIGtleXMgPSBba2V5c11cbiAgfVxuXG4gIGxldCBhdHRycyA9IGtleXMucmVkdWNlKChhdHRycywga2V5KSA9PiB7XG4gICAgaWYgKGNvbmZba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRsZXQga2V5QXIgPSBrZXkuc3BsaXQoJzonKVxuICAgICAgaWYgKGtleUFyLmxlbmd0aCAhPT0gMikge1xuICAgICAgICB0aHJvdyBuZXcgSW52YWxpZEF0dHIoa2V5KVxuICAgICAgfVxuXG4gICAgICBpZiAodmFsaWRhdG9yc1trZXldICYmICF2YWxpZGF0b3JzW2tleV0udGVzdChjb25mW2tleV0pKSB7XG4gICAgICAgIHRocm93IG5ldyBJbnZhbGlkQXR0clZhbHVlKGtleSwgY29uZltrZXldLCB2YWxpZGF0b3JzW2tleV0pXG4gICAgICB9XG4gICAgICBhdHRyc1trZXlBclsxXV0gPSBjb25mW2tleV1cbiAgICB9XG5cbiAgICByZXR1cm4gYXR0cnNcbiAgfSwge30pXG5cbiAgcmV0dXJuIGF0dHJzXG59XG5cbi8qKlxuICogSXRlbSBpbiBzaXRlbWFwXG4gKi9cbmV4cG9ydCBjbGFzcyBTaXRlbWFwSXRlbSB7XG5cblx0Y29uZjogU2l0ZW1hcEl0ZW1PcHRpb25zO1xuXHRsb2M6IFNpdGVtYXBJdGVtT3B0aW9uc1tcInVybFwiXTtcblx0bGFzdG1vZDogU2l0ZW1hcEl0ZW1PcHRpb25zW1wibGFzdG1vZFwiXTtcblx0Y2hhbmdlZnJlcTogU2l0ZW1hcEl0ZW1PcHRpb25zW1wiY2hhbmdlZnJlcVwiXTtcblx0cHJpb3JpdHk6IFNpdGVtYXBJdGVtT3B0aW9uc1tcInByaW9yaXR5XCJdO1xuXHRuZXdzPzogU2l0ZW1hcEl0ZW1PcHRpb25zW1wibmV3c1wiXTtcblx0aW1nPzogU2l0ZW1hcEl0ZW1PcHRpb25zW1wiaW1nXCJdO1xuXHRsaW5rcz86IFNpdGVtYXBJdGVtT3B0aW9uc1tcImxpbmtzXCJdO1xuXHRleHBpcmVzPzogU2l0ZW1hcEl0ZW1PcHRpb25zW1wiZXhwaXJlc1wiXTtcblx0YW5kcm9pZExpbms/OiBTaXRlbWFwSXRlbU9wdGlvbnNbXCJhbmRyb2lkTGlua1wiXTtcblx0bW9iaWxlPzogU2l0ZW1hcEl0ZW1PcHRpb25zW1wibW9iaWxlXCJdO1xuXHR2aWRlbz86IFNpdGVtYXBJdGVtT3B0aW9uc1tcInZpZGVvXCJdO1xuXHRhbXBMaW5rPzogU2l0ZW1hcEl0ZW1PcHRpb25zW1wiYW1wTGlua1wiXTtcbiAgcm9vdDogYnVpbGRlci5YTUxFbGVtZW50T3JYTUxOb2RlO1xuICB1cmw6IGJ1aWxkZXIuWE1MRWxlbWVudE9yWE1MTm9kZSAmIHtcbiAgICBjaGlsZHJlbj86IFtdLFxuICAgIGF0dHJpYnV0ZXM/OiB7fVxuICB9O1xuXG4gIGNvbnN0cnVjdG9yIChjb25mOiBTaXRlbWFwSXRlbU9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMuY29uZiA9IGNvbmZcbiAgICBjb25zdCBpc1NhZmVVcmwgPSBjb25mLnNhZmVcblxuICAgIGlmICghY29uZi51cmwpIHtcbiAgICAgIHRocm93IG5ldyBOb1VSTEVycm9yKClcbiAgICB9XG5cbiAgICAvLyBVUkwgb2YgdGhlIHBhZ2VcbiAgICB0aGlzLmxvYyA9IGNvbmYudXJsXG5cbiAgICBsZXQgZHRcbiAgICAvLyBJZiBnaXZlbiBhIGZpbGUgdG8gdXNlIGZvciBsYXN0IG1vZGlmaWVkIGRhdGVcbiAgICBpZiAoY29uZi5sYXN0bW9kZmlsZSkge1xuICAgICAgLy8gY29uc29sZS5sb2coJ3Nob3VsZCByZWFkIHN0YXQgZnJvbSBmaWxlOiAnICsgY29uZi5sYXN0bW9kZmlsZSk7XG4gICAgICBsZXQgZmlsZSA9IGNvbmYubGFzdG1vZGZpbGVcblxuICAgICAgbGV0IHN0YXQgPSBmcy5zdGF0U3luYyhmaWxlKVxuXG4gICAgICBsZXQgbXRpbWUgPSBzdGF0Lm10aW1lXG5cbiAgICAgIGR0ID0gbmV3IERhdGUobXRpbWUpXG4gICAgICB0aGlzLmxhc3Rtb2QgPSB1dC5nZXRUaW1lc3RhbXBGcm9tRGF0ZShkdCwgY29uZi5sYXN0bW9kcmVhbHRpbWUpXG5cbiAgICAgIC8vIFRoZSBkYXRlIG9mIGxhc3QgbW9kaWZpY2F0aW9uIChZWVlZLU1NLUREKVxuICAgIH0gZWxzZSBpZiAoY29uZi5sYXN0bW9kKSB7XG4gICAgICAvLyBhcHBlbmQgdGhlIHRpbWV6b25lIG9mZnNldCBzbyB0aGF0IGRhdGVzIGFyZSB0cmVhdGVkIGFzIGxvY2FsIHRpbWUuXG4gICAgICAvLyBPdGhlcndpc2UgdGhlIFVuaXQgdGVzdHMgZmFpbCBzb21ldGltZXMuXG4gICAgICBsZXQgdGltZXpvbmVPZmZzZXQgPSAnVVRDLScgKyAobmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpIC8gNjApICsgJzAwJ1xuICAgICAgdGltZXpvbmVPZmZzZXQgPSB0aW1lem9uZU9mZnNldC5yZXBsYWNlKCctLScsICctJylcbiAgICAgIGR0ID0gbmV3IERhdGUoY29uZi5sYXN0bW9kICsgJyAnICsgdGltZXpvbmVPZmZzZXQpXG4gICAgICB0aGlzLmxhc3Rtb2QgPSB1dC5nZXRUaW1lc3RhbXBGcm9tRGF0ZShkdCwgY29uZi5sYXN0bW9kcmVhbHRpbWUpXG4gICAgfSBlbHNlIGlmIChjb25mLmxhc3Rtb2RJU08pIHtcbiAgICAgIHRoaXMubGFzdG1vZCA9IGNvbmYubGFzdG1vZElTT1xuICAgIH1cblxuICAgIC8vIEhvdyBmcmVxdWVudGx5IHRoZSBwYWdlIGlzIGxpa2VseSB0byBjaGFuZ2VcbiAgICAvLyBkdWUgdG8gdGhpcyBmaWVsZCBpcyBvcHRpb25hbCBubyBkZWZhdWx0IHZhbHVlIGlzIHNldFxuICAgIC8vIHBsZWFzZSBzZWU6IGh0dHA6Ly93d3cuc2l0ZW1hcHMub3JnL3Byb3RvY29sLmh0bWxcbiAgICB0aGlzLmNoYW5nZWZyZXEgPSBjb25mLmNoYW5nZWZyZXFcbiAgICBpZiAoIWlzU2FmZVVybCAmJiB0aGlzLmNoYW5nZWZyZXEpIHtcbiAgICAgIGlmIChDSEFOR0VGUkVRLmluZGV4T2YodGhpcy5jaGFuZ2VmcmVxKSA9PT0gLTEpIHtcbiAgICAgICAgdGhyb3cgbmV3IENoYW5nZUZyZXFJbnZhbGlkRXJyb3IoKVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoZSBwcmlvcml0eSBvZiB0aGlzIFVSTCByZWxhdGl2ZSB0byBvdGhlciBVUkxzXG4gICAgLy8gZHVlIHRvIHRoaXMgZmllbGQgaXMgb3B0aW9uYWwgbm8gZGVmYXVsdCB2YWx1ZSBpcyBzZXRcbiAgICAvLyBwbGVhc2Ugc2VlOiBodHRwOi8vd3d3LnNpdGVtYXBzLm9yZy9wcm90b2NvbC5odG1sXG4gICAgdGhpcy5wcmlvcml0eSA9IGNvbmYucHJpb3JpdHlcbiAgICBpZiAoIWlzU2FmZVVybCAmJiB0aGlzLnByaW9yaXR5KSB7XG4gICAgICBpZiAoISh0aGlzLnByaW9yaXR5ID49IDAuMCAmJiB0aGlzLnByaW9yaXR5IDw9IDEuMCkgfHwgdHlwZW9mIHRoaXMucHJpb3JpdHkgIT09ICdudW1iZXInKSB7XG4gICAgICAgIHRocm93IG5ldyBQcmlvcml0eUludmFsaWRFcnJvcigpXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5uZXdzID0gY29uZi5uZXdzIHx8IG51bGxcbiAgICB0aGlzLmltZyA9IGNvbmYuaW1nIHx8IG51bGxcbiAgICB0aGlzLmxpbmtzID0gY29uZi5saW5rcyB8fCBudWxsXG4gICAgdGhpcy5leHBpcmVzID0gY29uZi5leHBpcmVzIHx8IG51bGxcbiAgICB0aGlzLmFuZHJvaWRMaW5rID0gY29uZi5hbmRyb2lkTGluayB8fCBudWxsXG4gICAgdGhpcy5tb2JpbGUgPSBjb25mLm1vYmlsZSB8fCBudWxsXG4gICAgdGhpcy52aWRlbyA9IGNvbmYudmlkZW8gfHwgbnVsbFxuICAgIHRoaXMuYW1wTGluayA9IGNvbmYuYW1wTGluayB8fCBudWxsXG4gICAgdGhpcy5yb290ID0gY29uZi5yb290IHx8IGJ1aWxkZXIuY3JlYXRlKCdyb290JylcbiAgICB0aGlzLnVybCA9IHRoaXMucm9vdC5lbGVtZW50KCd1cmwnKVxuICB9XG5cbiAgLyoqXG4gICAqICBDcmVhdGUgc2l0ZW1hcCB4bWxcbiAgICogIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG4gIHRvWE1MICgpIHtcbiAgICByZXR1cm4gdGhpcy50b1N0cmluZygpXG4gIH1cblxuICBidWlsZFZpZGVvRWxlbWVudCAodmlkZW86IElWaWRlb0l0ZW0pIHtcbiAgICBjb25zdCB2aWRlb3htbCA9IHRoaXMudXJsLmVsZW1lbnQoJ3ZpZGVvOnZpZGVvJylcbiAgICBpZiAodHlwZW9mICh2aWRlbykgIT09ICdvYmplY3QnIHx8ICF2aWRlby50aHVtYm5haWxfbG9jIHx8ICF2aWRlby50aXRsZSB8fCAhdmlkZW8uZGVzY3JpcHRpb24pIHtcbiAgICAgIC8vIGhhcyB0byBiZSBhbiBvYmplY3QgYW5kIGluY2x1ZGUgcmVxdWlyZWQgY2F0ZWdvcmllcyBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS93ZWJtYXN0ZXJzL3ZpZGVvc2VhcmNoL3NpdGVtYXBzXG4gICAgICB0aHJvdyBuZXcgSW52YWxpZFZpZGVvRm9ybWF0KClcbiAgICB9XG5cbiAgICBpZiAodmlkZW8uZGVzY3JpcHRpb24ubGVuZ3RoID4gMjA0OCkge1xuICAgICAgdGhyb3cgbmV3IEludmFsaWRWaWRlb0Rlc2NyaXB0aW9uKClcbiAgICB9XG5cbiAgICB2aWRlb3htbC5lbGVtZW50KCd2aWRlbzp0aHVtYm5haWxfbG9jJywgdmlkZW8udGh1bWJuYWlsX2xvYylcbiAgICB2aWRlb3htbC5lbGVtZW50KCd2aWRlbzp0aXRsZScpLmNkYXRhKHZpZGVvLnRpdGxlKVxuICAgIHZpZGVveG1sLmVsZW1lbnQoJ3ZpZGVvOmRlc2NyaXB0aW9uJykuY2RhdGEodmlkZW8uZGVzY3JpcHRpb24pXG4gICAgaWYgKHZpZGVvLmNvbnRlbnRfbG9jKSB7XG4gICAgICB2aWRlb3htbC5lbGVtZW50KCd2aWRlbzpjb250ZW50X2xvYycsIHZpZGVvLmNvbnRlbnRfbG9jKVxuICAgIH1cbiAgICBpZiAodmlkZW8ucGxheWVyX2xvYykge1xuICAgICAgdmlkZW94bWwuZWxlbWVudCgndmlkZW86cGxheWVyX2xvYycsIGF0dHJCdWlsZGVyKHZpZGVvLCAncGxheWVyX2xvYzphdXRvcGxheScpLCB2aWRlby5wbGF5ZXJfbG9jKVxuICAgIH1cbiAgICBpZiAodmlkZW8uZHVyYXRpb24pIHtcbiAgICAgIHZpZGVveG1sLmVsZW1lbnQoJ3ZpZGVvOmR1cmF0aW9uJywgc2FmZUR1cmF0aW9uKHZpZGVvLmR1cmF0aW9uKSlcbiAgICB9XG4gICAgaWYgKHZpZGVvLmV4cGlyYXRpb25fZGF0ZSkge1xuICAgICAgdmlkZW94bWwuZWxlbWVudCgndmlkZW86ZXhwaXJhdGlvbl9kYXRlJywgdmlkZW8uZXhwaXJhdGlvbl9kYXRlKVxuICAgIH1cbiAgICBpZiAodmlkZW8ucmF0aW5nKSB7XG4gICAgICB2aWRlb3htbC5lbGVtZW50KCd2aWRlbzpyYXRpbmcnLCB2aWRlby5yYXRpbmcpXG4gICAgfVxuICAgIGlmICh2aWRlby52aWV3X2NvdW50KSB7XG4gICAgICB2aWRlb3htbC5lbGVtZW50KCd2aWRlbzp2aWV3X2NvdW50JywgdmlkZW8udmlld19jb3VudClcbiAgICB9XG4gICAgaWYgKHZpZGVvLnB1YmxpY2F0aW9uX2RhdGUpIHtcbiAgICAgIHZpZGVveG1sLmVsZW1lbnQoJ3ZpZGVvOnB1YmxpY2F0aW9uX2RhdGUnLCB2aWRlby5wdWJsaWNhdGlvbl9kYXRlKVxuICAgIH1cbiAgICBpZiAodmlkZW8uZmFtaWx5X2ZyaWVuZGx5KSB7XG4gICAgICB2aWRlb3htbC5lbGVtZW50KCd2aWRlbzpmYW1pbHlfZnJpZW5kbHknLCB2aWRlby5mYW1pbHlfZnJpZW5kbHkpXG4gICAgfVxuICAgIGlmICh2aWRlby50YWcpIHtcbiAgICAgIGlmICghaXNBcnJheSh2aWRlby50YWcpKSB7XG4gICAgICAgIHZpZGVveG1sLmVsZW1lbnQoJ3ZpZGVvOnRhZycsIHZpZGVvLnRhZylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAoY29uc3QgdGFnIG9mIHZpZGVvLnRhZykge1xuICAgICAgICAgIHZpZGVveG1sLmVsZW1lbnQoJ3ZpZGVvOnRhZycsIHRhZylcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAodmlkZW8uY2F0ZWdvcnkpIHtcbiAgICAgIHZpZGVveG1sLmVsZW1lbnQoJ3ZpZGVvOmNhdGVnb3J5JywgdmlkZW8uY2F0ZWdvcnkpXG4gICAgfVxuICAgIGlmICh2aWRlby5yZXN0cmljdGlvbikge1xuICAgICAgdmlkZW94bWwuZWxlbWVudChcbiAgICAgICAgJ3ZpZGVvOnJlc3RyaWN0aW9uJyxcbiAgICAgICAgYXR0ckJ1aWxkZXIodmlkZW8sICdyZXN0cmljdGlvbjpyZWxhdGlvbnNoaXAnKSxcbiAgICAgICAgdmlkZW8ucmVzdHJpY3Rpb25cbiAgICAgIClcbiAgICB9XG4gICAgaWYgKHZpZGVvLmdhbGxlcnlfbG9jKSB7XG4gICAgICB2aWRlb3htbC5lbGVtZW50KFxuICAgICAgICAndmlkZW86Z2FsbGVyeV9sb2MnLFxuICAgICAgICB7dGl0bGU6IHZpZGVvWydnYWxsZXJ5X2xvYzp0aXRsZSddfSxcbiAgICAgICAgdmlkZW8uZ2FsbGVyeV9sb2NcbiAgICAgIClcbiAgICB9XG4gICAgaWYgKHZpZGVvLnByaWNlKSB7XG4gICAgICB2aWRlb3htbC5lbGVtZW50KFxuICAgICAgICAndmlkZW86cHJpY2UnLFxuICAgICAgICBhdHRyQnVpbGRlcih2aWRlbywgWydwcmljZTpyZXNvbHV0aW9uJywgJ3ByaWNlOmN1cnJlbmN5JywgJ3ByaWNlOnR5cGUnXSksXG4gICAgICAgIHZpZGVvLnByaWNlXG4gICAgICApXG4gICAgfVxuICAgIGlmICh2aWRlby5yZXF1aXJlc19zdWJzY3JpcHRpb24pIHtcbiAgICAgIHZpZGVveG1sLmVsZW1lbnQoJ3ZpZGVvOnJlcXVpcmVzX3N1YnNjcmlwdGlvbicsIHZpZGVvLnJlcXVpcmVzX3N1YnNjcmlwdGlvbilcbiAgICB9XG4gICAgaWYgKHZpZGVvLnVwbG9hZGVyKSB7XG4gICAgICB2aWRlb3htbC5lbGVtZW50KCd2aWRlbzp1cGxvYWRlcicsIHZpZGVvLnVwbG9hZGVyKVxuICAgIH1cbiAgICBpZiAodmlkZW8ucGxhdGZvcm0pIHtcbiAgICAgIHZpZGVveG1sLmVsZW1lbnQoXG4gICAgICAgICd2aWRlbzpwbGF0Zm9ybScsXG4gICAgICAgIGF0dHJCdWlsZGVyKHZpZGVvLCAncGxhdGZvcm06cmVsYXRpb25zaGlwJyksXG4gICAgICAgIHZpZGVvLnBsYXRmb3JtXG4gICAgICApXG4gICAgfVxuICAgIGlmICh2aWRlby5saXZlKSB7XG4gICAgICB2aWRlb3htbC5lbGVtZW50KCd2aWRlbzpsaXZlJywgdmlkZW8ubGl2ZSlcbiAgICB9XG4gIH1cblxuICBidWlsZFhNTCAoKTogYnVpbGRlci5YTUxFbGVtZW50T3JYTUxOb2RlIHtcbiAgICB0aGlzLnVybC5jaGlsZHJlbiA9IFtdXG4gICAgdGhpcy51cmwuYXR0cmlidXRlcyA9IHt9XG4gICAgLy8geG1sIHByb3BlcnR5XG4gICAgY29uc3QgcHJvcHMgPSBbJ2xvYycsICdsYXN0bW9kJywgJ2NoYW5nZWZyZXEnLCAncHJpb3JpdHknLCAnaW1nJywgJ3ZpZGVvJywgJ2xpbmtzJywgJ2V4cGlyZXMnLCAnYW5kcm9pZExpbmsnLCAnbW9iaWxlJywgJ25ld3MnLCAnYW1wTGluayddIGFzIGNvbnN0O1xuICAgIC8vIHByb3BlcnR5IGFycmF5IHNpemUgKGZvciBsb29wKVxuICAgIGxldCBwcyA9IDBcbiAgICAvLyBjdXJyZW50IHByb3BlcnR5IG5hbWUgKGZvciBsb29wKVxuICAgIGxldCBwXG5cbiAgICB3aGlsZSAocHMgPCBwcm9wcy5sZW5ndGgpIHtcbiAgICAgIHAgPSBwcm9wc1twc11cbiAgICAgIHBzKytcblxuICAgICAgaWYgKHRoaXNbcF0gJiYgcCA9PT0gJ2ltZycpIHtcbiAgICAgICAgLy8gSW1hZ2UgaGFuZGxpbmdcbiAgICAgICAgaWYgKHR5cGVvZiAodGhpc1twXSkgIT09ICdvYmplY3QnIHx8IHRoaXNbcF0ubGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBtYWtlIGl0IGFuIGFycmF5XG4gICAgICAgICAgdGhpc1twXSA9IFt0aGlzW3BdXVxuICAgICAgICB9XG4gICAgICAgIHRoaXNbcF0uZm9yRWFjaChpbWFnZSA9PiB7XG4gICAgICAgICAgY29uc3QgeG1sT2JqID0ge31cbiAgICAgICAgICBpZiAodHlwZW9mIChpbWFnZSkgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBpdOKAmXMgYSBzdHJpbmdcbiAgICAgICAgICAgIC8vIG1ha2UgaXQgYW4gb2JqZWN0XG4gICAgICAgICAgICB4bWxPYmpbJ2ltYWdlOmxvYyddID0gaW1hZ2VcbiAgICAgICAgICB9IGVsc2UgaWYgKGltYWdlLnVybCkge1xuICAgICAgICAgICAgeG1sT2JqWydpbWFnZTpsb2MnXSA9IGltYWdlLnVybFxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaW1hZ2UuY2FwdGlvbikge1xuICAgICAgICAgICAgeG1sT2JqWydpbWFnZTpjYXB0aW9uJ10gPSB7JyNjZGF0YSc6IGltYWdlLmNhcHRpb259XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpbWFnZS5nZW9Mb2NhdGlvbikge1xuICAgICAgICAgICAgeG1sT2JqWydpbWFnZTpnZW9fbG9jYXRpb24nXSA9IGltYWdlLmdlb0xvY2F0aW9uXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpbWFnZS50aXRsZSkge1xuICAgICAgICAgICAgeG1sT2JqWydpbWFnZTp0aXRsZSddID0geycjY2RhdGEnOiBpbWFnZS50aXRsZX1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGltYWdlLmxpY2Vuc2UpIHtcbiAgICAgICAgICAgIHhtbE9ialsnaW1hZ2U6bGljZW5zZSddID0gaW1hZ2UubGljZW5zZVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMudXJsLmVsZW1lbnQoeydpbWFnZTppbWFnZSc6IHhtbE9ian0pXG4gICAgICAgIH0pXG4gICAgICB9IGVsc2UgaWYgKHRoaXNbcF0gJiYgcCA9PT0gJ3ZpZGVvJykge1xuICAgICAgICAvLyBJbWFnZSBoYW5kbGluZ1xuICAgICAgICBpZiAodHlwZW9mICh0aGlzW3BdKSAhPT0gJ29iamVjdCcgfHwgdGhpc1twXS5sZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIG1ha2UgaXQgYW4gYXJyYXlcbiAgICAgICAgICB0aGlzW3BdID0gW3RoaXNbcF1dXG4gICAgICAgIH1cbiAgICAgICAgdGhpc1twXS5mb3JFYWNoKHRoaXMuYnVpbGRWaWRlb0VsZW1lbnQsIHRoaXMpXG4gICAgICB9IGVsc2UgaWYgKHRoaXNbcF0gJiYgcCA9PT0gJ2xpbmtzJykge1xuICAgICAgICB0aGlzW3BdLmZvckVhY2gobGluayA9PiB7XG4gICAgICAgICAgdGhpcy51cmwuZWxlbWVudCh7J3hodG1sOmxpbmsnOiB7XG4gICAgICAgICAgICAnQHJlbCc6ICdhbHRlcm5hdGUnLFxuICAgICAgICAgICAgJ0BocmVmbGFuZyc6IGxpbmsubGFuZyxcbiAgICAgICAgICAgICdAaHJlZic6IGxpbmsudXJsXG4gICAgICAgICAgfX0pXG4gICAgICAgIH0pXG4gICAgICB9IGVsc2UgaWYgKHRoaXNbcF0gJiYgcCA9PT0gJ2V4cGlyZXMnKSB7XG4gICAgICAgIHRoaXMudXJsLmVsZW1lbnQoJ2V4cGlyZXMnLCBuZXcgRGF0ZSh0aGlzW3BdKS50b0lTT1N0cmluZygpKVxuICAgICAgfSBlbHNlIGlmICh0aGlzW3BdICYmIHAgPT09ICdhbmRyb2lkTGluaycpIHtcbiAgICAgICAgdGhpcy51cmwuZWxlbWVudCgneGh0bWw6bGluaycsIHtyZWw6ICdhbHRlcm5hdGUnLCBocmVmOiB0aGlzW3BdfSlcbiAgICAgIH0gZWxzZSBpZiAodGhpc1twXSAmJiBwID09PSAnbW9iaWxlJykge1xuICAgICAgICBjb25zdCBtb2JpbGVpdGVtID0gdGhpcy51cmwuZWxlbWVudCgnbW9iaWxlOm1vYmlsZScpXG4gICAgICAgIGlmICh0eXBlb2YgdGhpc1twXSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBtb2JpbGVpdGVtLmF0dCgndHlwZScsIHRoaXNbcF0pXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocCA9PT0gJ3ByaW9yaXR5JyAmJiAodGhpc1twXSA+PSAwLjAgJiYgdGhpc1twXSA8PSAxLjApKSB7XG4gICAgICAgIHRoaXMudXJsLmVsZW1lbnQocCwgcGFyc2VGbG9hdCh0aGlzW3BdKS50b0ZpeGVkKDEpKVxuICAgICAgfSBlbHNlIGlmICh0aGlzW3BdICYmIHAgPT09ICdhbXBMaW5rJykge1xuICAgICAgICB0aGlzLnVybC5lbGVtZW50KCd4aHRtbDpsaW5rJywgeyByZWw6ICdhbXBodG1sJywgaHJlZjogdGhpc1twXSB9KVxuICAgICAgfSBlbHNlIGlmICh0aGlzW3BdICYmIHAgPT09ICduZXdzJykge1xuICAgICAgICBsZXQgbmV3c2l0ZW0gPSB0aGlzLnVybC5lbGVtZW50KCduZXdzOm5ld3MnKVxuXG4gICAgICAgIGlmICghdGhpc1twXS5wdWJsaWNhdGlvbiB8fFxuICAgICAgICAgICAgIXRoaXNbcF0ucHVibGljYXRpb24ubmFtZSB8fFxuICAgICAgICAgICAgIXRoaXNbcF0ucHVibGljYXRpb24ubGFuZ3VhZ2UgfHxcbiAgICAgICAgICAgICF0aGlzW3BdLnB1YmxpY2F0aW9uX2RhdGUgfHxcbiAgICAgICAgICAgICF0aGlzW3BdLnRpdGxlXG4gICAgICAgICkge1xuICAgICAgICAgIHRocm93IG5ldyBJbnZhbGlkTmV3c0Zvcm1hdCgpXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpc1twXS5wdWJsaWNhdGlvbikge1xuICAgICAgICAgIGxldCBwdWJsaWNhdGlvbiA9IG5ld3NpdGVtLmVsZW1lbnQoJ25ld3M6cHVibGljYXRpb24nKVxuICAgICAgICAgIGlmICh0aGlzW3BdLnB1YmxpY2F0aW9uLm5hbWUpIHtcbiAgICAgICAgICAgIHB1YmxpY2F0aW9uLmVsZW1lbnQoJ25ld3M6bmFtZScpLmNkYXRhKHRoaXNbcF0ucHVibGljYXRpb24ubmFtZSlcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHRoaXNbcF0ucHVibGljYXRpb24ubGFuZ3VhZ2UpIHtcbiAgICAgICAgICAgIHB1YmxpY2F0aW9uLmVsZW1lbnQoJ25ld3M6bGFuZ3VhZ2UnLCB0aGlzW3BdLnB1YmxpY2F0aW9uLmxhbmd1YWdlKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzW3BdLmFjY2Vzcykge1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIHRoaXNbcF0uYWNjZXNzICE9PSAnUmVnaXN0cmF0aW9uJyAmJlxuICAgICAgICAgICAgdGhpc1twXS5hY2Nlc3MgIT09ICdTdWJzY3JpcHRpb24nXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgSW52YWxpZE5ld3NBY2Nlc3NWYWx1ZSgpXG4gICAgICAgICAgfVxuICAgICAgICAgIG5ld3NpdGVtLmVsZW1lbnQoJ25ld3M6YWNjZXNzJywgdGhpc1twXS5hY2Nlc3MpXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpc1twXS5nZW5yZXMpIHtcbiAgICAgICAgICBuZXdzaXRlbS5lbGVtZW50KCduZXdzOmdlbnJlcycsIHRoaXNbcF0uZ2VucmVzKVxuICAgICAgICB9XG5cbiAgICAgICAgbmV3c2l0ZW0uZWxlbWVudCgnbmV3czpwdWJsaWNhdGlvbl9kYXRlJywgdGhpc1twXS5wdWJsaWNhdGlvbl9kYXRlKVxuICAgICAgICBuZXdzaXRlbS5lbGVtZW50KCduZXdzOnRpdGxlJykuY2RhdGEodGhpc1twXS50aXRsZSlcblxuICAgICAgICBpZiAodGhpc1twXS5rZXl3b3Jkcykge1xuICAgICAgICAgIG5ld3NpdGVtLmVsZW1lbnQoJ25ld3M6a2V5d29yZHMnLCB0aGlzW3BdLmtleXdvcmRzKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXNbcF0uc3RvY2tfdGlja2Vycykge1xuICAgICAgICAgIG5ld3NpdGVtLmVsZW1lbnQoJ25ld3M6c3RvY2tfdGlja2VycycsIHRoaXNbcF0uc3RvY2tfdGlja2VycylcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0aGlzW3BdKSB7XG4gICAgICAgIGlmIChwID09PSAnbG9jJyAmJiB0aGlzLmNvbmYuY2RhdGEpIHtcbiAgICAgICAgICB0aGlzLnVybC5lbGVtZW50KHtcbiAgICAgICAgICAgIFtwXToge1xuICAgICAgICAgICAgICAnI3Jhdyc6IHRoaXNbcF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudXJsLmVsZW1lbnQocCwgdGhpc1twXSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnVybFxuICB9XG5cbiAgLyoqXG4gICAqICBBbGlhcyBmb3IgdG9YTUwoKVxuICAgKiAgQHJldHVybiB7U3RyaW5nfVxuICAgKi9cbiAgdG9TdHJpbmcgKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuYnVpbGRYTUwoKS50b1N0cmluZygpXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgU2l0ZW1hcEl0ZW1cbiJdfQ==