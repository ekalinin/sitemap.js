"use strict";
const ut = require("./utils");
const fs = require("fs");
const builder = require("xmlbuilder");
const isArray = require("lodash/isArray");
const errors_1 = require("./errors");
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
module.exports = SitemapItem;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2l0ZW1hcC1pdGVtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2l0ZW1hcC1pdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw4QkFBK0I7QUFDL0IseUJBQTBCO0FBQzFCLHNDQUF1QztBQUN2QywwQ0FBMkM7QUFDM0MscUNBV2lCO0FBQ2pCLG1DQUFxRTtBQUVyRSxTQUFTLFlBQVksQ0FBRSxRQUFRO0lBQzdCLElBQUksUUFBUSxHQUFHLENBQUMsSUFBSSxRQUFRLEdBQUcsS0FBSyxFQUFFO1FBQ3BDLE1BQU0sSUFBSSw2QkFBb0IsRUFBRSxDQUFBO0tBQ2pDO0lBRUQsT0FBTyxRQUFRLENBQUE7QUFDakIsQ0FBQztBQUVELE1BQU0sU0FBUyxHQUFHLGNBQWMsQ0FBQTtBQUNoQyxNQUFNLFVBQVUsR0FBRztJQUNqQixnQkFBZ0IsRUFBRSxZQUFZO0lBQzlCLFlBQVksRUFBRSwrQkFBK0I7SUFDN0Msa0JBQWtCLEVBQUUsZUFBZTtJQUNuQyx1QkFBdUIsRUFBRSxTQUFTO0lBQ2xDLDBCQUEwQixFQUFFLFNBQVM7Q0FDdEMsQ0FBQTtBQUVELFNBQVMsV0FBVyxDQUFFLElBQUksRUFBRSxJQUFJO0lBQzlCLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFO1FBQzVCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO0tBQ2Q7SUFFRCxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ3JDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLFNBQVMsRUFBRTtZQUM5QixJQUFJLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3ZCLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ3RCLE1BQU0sSUFBSSxvQkFBVyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2FBQzNCO1lBRUQsSUFBSSxVQUFVLENB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LENBQUE7Z0JBRW5ELElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRTtvQkFDcEIsUUFBUSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFBO2lCQUNwRDtnQkFFRCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLEVBQUU7b0JBQ3pCLFFBQVEsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFBO2lCQUM5RDthQUNGO2lCQUFNLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNsQixJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7b0JBQ2xDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDO3dCQUNmLENBQUMsQ0FBQyxDQUFDLEVBQUU7NEJBQ0gsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7eUJBQ2hCO3FCQUNGLENBQUMsQ0FBQTtpQkFDSDtxQkFBTTtvQkFDTCxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7aUJBQzdCO2FBQ0Y7U0FDRjtRQUVELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQTtJQUNqQixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsUUFBUTtRQUNOLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ25DLENBQUM7Q0FDRjtBQUVELGlCQUFTLFdBQVcsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB1dCA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbmltcG9ydCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5pbXBvcnQgYnVpbGRlciA9IHJlcXVpcmUoJ3htbGJ1aWxkZXInKTtcbmltcG9ydCBpc0FycmF5ID0gcmVxdWlyZSgnbG9kYXNoL2lzQXJyYXknKTtcbmltcG9ydCB7XG5cdENoYW5nZUZyZXFJbnZhbGlkRXJyb3IsXG5cdEludmFsaWRBdHRyLFxuXHRJbnZhbGlkQXR0clZhbHVlLFxuXHRJbnZhbGlkTmV3c0FjY2Vzc1ZhbHVlLFxuXHRJbnZhbGlkTmV3c0Zvcm1hdCxcblx0SW52YWxpZFZpZGVvRGVzY3JpcHRpb24sXG5cdEludmFsaWRWaWRlb0R1cmF0aW9uLFxuXHRJbnZhbGlkVmlkZW9Gb3JtYXQsXG5cdE5vVVJMRXJyb3IsXG5cdFByaW9yaXR5SW52YWxpZEVycm9yLFxufSBmcm9tICcuL2Vycm9ycydcbmltcG9ydCB7IENIQU5HRUZSRVEsIElWaWRlb0l0ZW0sIFNpdGVtYXBJdGVtT3B0aW9ucyB9IGZyb20gJy4vdHlwZXMnO1xuXG5mdW5jdGlvbiBzYWZlRHVyYXRpb24gKGR1cmF0aW9uKSB7XG4gIGlmIChkdXJhdGlvbiA8IDAgfHwgZHVyYXRpb24gPiAyODgwMCkge1xuICAgIHRocm93IG5ldyBJbnZhbGlkVmlkZW9EdXJhdGlvbigpXG4gIH1cblxuICByZXR1cm4gZHVyYXRpb25cbn1cblxuY29uc3QgYWxsb3dEZW55ID0gL15hbGxvd3xkZW55JC9cbmNvbnN0IHZhbGlkYXRvcnMgPSB7XG4gICdwcmljZTpjdXJyZW5jeSc6IC9eW0EtWl17M30kLyxcbiAgJ3ByaWNlOnR5cGUnOiAvXnJlbnR8cHVyY2hhc2V8UkVOVHxQVVJDSEFTRSQvLFxuICAncHJpY2U6cmVzb2x1dGlvbic6IC9eSER8aGR8c2R8U0QkLyxcbiAgJ3BsYXRmb3JtOnJlbGF0aW9uc2hpcCc6IGFsbG93RGVueSxcbiAgJ3Jlc3RyaWN0aW9uOnJlbGF0aW9uc2hpcCc6IGFsbG93RGVueVxufVxuXG5mdW5jdGlvbiBhdHRyQnVpbGRlciAoY29uZiwga2V5cykge1xuICBpZiAodHlwZW9mIGtleXMgPT09ICdzdHJpbmcnKSB7XG4gICAga2V5cyA9IFtrZXlzXVxuICB9XG5cbiAgbGV0IGF0dHJzID0ga2V5cy5yZWR1Y2UoKGF0dHJzLCBrZXkpID0+IHtcbiAgICBpZiAoY29uZltrZXldICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGxldCBrZXlBciA9IGtleS5zcGxpdCgnOicpXG4gICAgICBpZiAoa2V5QXIubGVuZ3RoICE9PSAyKSB7XG4gICAgICAgIHRocm93IG5ldyBJbnZhbGlkQXR0cihrZXkpXG4gICAgICB9XG5cbiAgICAgIGlmICh2YWxpZGF0b3JzW2tleV0gJiYgIXZhbGlkYXRvcnNba2V5XS50ZXN0KGNvbmZba2V5XSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEludmFsaWRBdHRyVmFsdWUoa2V5LCBjb25mW2tleV0sIHZhbGlkYXRvcnNba2V5XSlcbiAgICAgIH1cbiAgICAgIGF0dHJzW2tleUFyWzFdXSA9IGNvbmZba2V5XVxuICAgIH1cblxuICAgIHJldHVybiBhdHRyc1xuICB9LCB7fSlcblxuICByZXR1cm4gYXR0cnNcbn1cblxuLyoqXG4gKiBJdGVtIGluIHNpdGVtYXBcbiAqL1xuY2xhc3MgU2l0ZW1hcEl0ZW0ge1xuXG5cdGNvbmY6IFNpdGVtYXBJdGVtT3B0aW9ucztcblx0bG9jOiBTaXRlbWFwSXRlbU9wdGlvbnNbXCJ1cmxcIl07XG5cdGxhc3Rtb2Q6IFNpdGVtYXBJdGVtT3B0aW9uc1tcImxhc3Rtb2RcIl07XG5cdGNoYW5nZWZyZXE6IFNpdGVtYXBJdGVtT3B0aW9uc1tcImNoYW5nZWZyZXFcIl07XG5cdHByaW9yaXR5OiBTaXRlbWFwSXRlbU9wdGlvbnNbXCJwcmlvcml0eVwiXTtcblx0bmV3cz86IFNpdGVtYXBJdGVtT3B0aW9uc1tcIm5ld3NcIl07XG5cdGltZz86IFNpdGVtYXBJdGVtT3B0aW9uc1tcImltZ1wiXTtcblx0bGlua3M/OiBTaXRlbWFwSXRlbU9wdGlvbnNbXCJsaW5rc1wiXTtcblx0ZXhwaXJlcz86IFNpdGVtYXBJdGVtT3B0aW9uc1tcImV4cGlyZXNcIl07XG5cdGFuZHJvaWRMaW5rPzogU2l0ZW1hcEl0ZW1PcHRpb25zW1wiYW5kcm9pZExpbmtcIl07XG5cdG1vYmlsZT86IFNpdGVtYXBJdGVtT3B0aW9uc1tcIm1vYmlsZVwiXTtcblx0dmlkZW8/OiBTaXRlbWFwSXRlbU9wdGlvbnNbXCJ2aWRlb1wiXTtcblx0YW1wTGluaz86IFNpdGVtYXBJdGVtT3B0aW9uc1tcImFtcExpbmtcIl07XG4gIHJvb3Q6IGJ1aWxkZXIuWE1MRWxlbWVudE9yWE1MTm9kZTtcbiAgdXJsOiBidWlsZGVyLlhNTEVsZW1lbnRPclhNTE5vZGUgJiB7XG4gICAgY2hpbGRyZW4/OiBbXSxcbiAgICBhdHRyaWJ1dGVzPzoge31cbiAgfTtcblxuICBjb25zdHJ1Y3RvciAoY29uZjogU2l0ZW1hcEl0ZW1PcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmNvbmYgPSBjb25mXG4gICAgY29uc3QgaXNTYWZlVXJsID0gY29uZi5zYWZlXG5cbiAgICBpZiAoIWNvbmYudXJsKSB7XG4gICAgICB0aHJvdyBuZXcgTm9VUkxFcnJvcigpXG4gICAgfVxuXG4gICAgLy8gVVJMIG9mIHRoZSBwYWdlXG4gICAgdGhpcy5sb2MgPSBjb25mLnVybFxuXG4gICAgbGV0IGR0XG4gICAgLy8gSWYgZ2l2ZW4gYSBmaWxlIHRvIHVzZSBmb3IgbGFzdCBtb2RpZmllZCBkYXRlXG4gICAgaWYgKGNvbmYubGFzdG1vZGZpbGUpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdzaG91bGQgcmVhZCBzdGF0IGZyb20gZmlsZTogJyArIGNvbmYubGFzdG1vZGZpbGUpO1xuICAgICAgbGV0IGZpbGUgPSBjb25mLmxhc3Rtb2RmaWxlXG5cbiAgICAgIGxldCBzdGF0ID0gZnMuc3RhdFN5bmMoZmlsZSlcblxuICAgICAgbGV0IG10aW1lID0gc3RhdC5tdGltZVxuXG4gICAgICBkdCA9IG5ldyBEYXRlKG10aW1lKVxuICAgICAgdGhpcy5sYXN0bW9kID0gdXQuZ2V0VGltZXN0YW1wRnJvbURhdGUoZHQsIGNvbmYubGFzdG1vZHJlYWx0aW1lKVxuXG4gICAgICAvLyBUaGUgZGF0ZSBvZiBsYXN0IG1vZGlmaWNhdGlvbiAoWVlZWS1NTS1ERClcbiAgICB9IGVsc2UgaWYgKGNvbmYubGFzdG1vZCkge1xuICAgICAgLy8gYXBwZW5kIHRoZSB0aW1lem9uZSBvZmZzZXQgc28gdGhhdCBkYXRlcyBhcmUgdHJlYXRlZCBhcyBsb2NhbCB0aW1lLlxuICAgICAgLy8gT3RoZXJ3aXNlIHRoZSBVbml0IHRlc3RzIGZhaWwgc29tZXRpbWVzLlxuICAgICAgbGV0IHRpbWV6b25lT2Zmc2V0ID0gJ1VUQy0nICsgKG5ldyBEYXRlKCkuZ2V0VGltZXpvbmVPZmZzZXQoKSAvIDYwKSArICcwMCdcbiAgICAgIHRpbWV6b25lT2Zmc2V0ID0gdGltZXpvbmVPZmZzZXQucmVwbGFjZSgnLS0nLCAnLScpXG4gICAgICBkdCA9IG5ldyBEYXRlKGNvbmYubGFzdG1vZCArICcgJyArIHRpbWV6b25lT2Zmc2V0KVxuICAgICAgdGhpcy5sYXN0bW9kID0gdXQuZ2V0VGltZXN0YW1wRnJvbURhdGUoZHQsIGNvbmYubGFzdG1vZHJlYWx0aW1lKVxuICAgIH0gZWxzZSBpZiAoY29uZi5sYXN0bW9kSVNPKSB7XG4gICAgICB0aGlzLmxhc3Rtb2QgPSBjb25mLmxhc3Rtb2RJU09cbiAgICB9XG5cbiAgICAvLyBIb3cgZnJlcXVlbnRseSB0aGUgcGFnZSBpcyBsaWtlbHkgdG8gY2hhbmdlXG4gICAgLy8gZHVlIHRvIHRoaXMgZmllbGQgaXMgb3B0aW9uYWwgbm8gZGVmYXVsdCB2YWx1ZSBpcyBzZXRcbiAgICAvLyBwbGVhc2Ugc2VlOiBodHRwOi8vd3d3LnNpdGVtYXBzLm9yZy9wcm90b2NvbC5odG1sXG4gICAgdGhpcy5jaGFuZ2VmcmVxID0gY29uZi5jaGFuZ2VmcmVxXG4gICAgaWYgKCFpc1NhZmVVcmwgJiYgdGhpcy5jaGFuZ2VmcmVxKSB7XG4gICAgICBpZiAoQ0hBTkdFRlJFUS5pbmRleE9mKHRoaXMuY2hhbmdlZnJlcSkgPT09IC0xKSB7XG4gICAgICAgIHRocm93IG5ldyBDaGFuZ2VGcmVxSW52YWxpZEVycm9yKClcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUaGUgcHJpb3JpdHkgb2YgdGhpcyBVUkwgcmVsYXRpdmUgdG8gb3RoZXIgVVJMc1xuICAgIC8vIGR1ZSB0byB0aGlzIGZpZWxkIGlzIG9wdGlvbmFsIG5vIGRlZmF1bHQgdmFsdWUgaXMgc2V0XG4gICAgLy8gcGxlYXNlIHNlZTogaHR0cDovL3d3dy5zaXRlbWFwcy5vcmcvcHJvdG9jb2wuaHRtbFxuICAgIHRoaXMucHJpb3JpdHkgPSBjb25mLnByaW9yaXR5XG4gICAgaWYgKCFpc1NhZmVVcmwgJiYgdGhpcy5wcmlvcml0eSkge1xuICAgICAgaWYgKCEodGhpcy5wcmlvcml0eSA+PSAwLjAgJiYgdGhpcy5wcmlvcml0eSA8PSAxLjApIHx8IHR5cGVvZiB0aGlzLnByaW9yaXR5ICE9PSAnbnVtYmVyJykge1xuICAgICAgICB0aHJvdyBuZXcgUHJpb3JpdHlJbnZhbGlkRXJyb3IoKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMubmV3cyA9IGNvbmYubmV3cyB8fCBudWxsXG4gICAgdGhpcy5pbWcgPSBjb25mLmltZyB8fCBudWxsXG4gICAgdGhpcy5saW5rcyA9IGNvbmYubGlua3MgfHwgbnVsbFxuICAgIHRoaXMuZXhwaXJlcyA9IGNvbmYuZXhwaXJlcyB8fCBudWxsXG4gICAgdGhpcy5hbmRyb2lkTGluayA9IGNvbmYuYW5kcm9pZExpbmsgfHwgbnVsbFxuICAgIHRoaXMubW9iaWxlID0gY29uZi5tb2JpbGUgfHwgbnVsbFxuICAgIHRoaXMudmlkZW8gPSBjb25mLnZpZGVvIHx8IG51bGxcbiAgICB0aGlzLmFtcExpbmsgPSBjb25mLmFtcExpbmsgfHwgbnVsbFxuICAgIHRoaXMucm9vdCA9IGNvbmYucm9vdCB8fCBidWlsZGVyLmNyZWF0ZSgncm9vdCcpXG4gICAgdGhpcy51cmwgPSB0aGlzLnJvb3QuZWxlbWVudCgndXJsJylcbiAgfVxuXG4gIC8qKlxuICAgKiAgQ3JlYXRlIHNpdGVtYXAgeG1sXG4gICAqICBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICB0b1hNTCAoKSB7XG4gICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKVxuICB9XG5cbiAgYnVpbGRWaWRlb0VsZW1lbnQgKHZpZGVvOiBJVmlkZW9JdGVtKSB7XG4gICAgY29uc3QgdmlkZW94bWwgPSB0aGlzLnVybC5lbGVtZW50KCd2aWRlbzp2aWRlbycpXG4gICAgaWYgKHR5cGVvZiAodmlkZW8pICE9PSAnb2JqZWN0JyB8fCAhdmlkZW8udGh1bWJuYWlsX2xvYyB8fCAhdmlkZW8udGl0bGUgfHwgIXZpZGVvLmRlc2NyaXB0aW9uKSB7XG4gICAgICAvLyBoYXMgdG8gYmUgYW4gb2JqZWN0IGFuZCBpbmNsdWRlIHJlcXVpcmVkIGNhdGVnb3JpZXMgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20vd2VibWFzdGVycy92aWRlb3NlYXJjaC9zaXRlbWFwc1xuICAgICAgdGhyb3cgbmV3IEludmFsaWRWaWRlb0Zvcm1hdCgpXG4gICAgfVxuXG4gICAgaWYgKHZpZGVvLmRlc2NyaXB0aW9uLmxlbmd0aCA+IDIwNDgpIHtcbiAgICAgIHRocm93IG5ldyBJbnZhbGlkVmlkZW9EZXNjcmlwdGlvbigpXG4gICAgfVxuXG4gICAgdmlkZW94bWwuZWxlbWVudCgndmlkZW86dGh1bWJuYWlsX2xvYycsIHZpZGVvLnRodW1ibmFpbF9sb2MpXG4gICAgdmlkZW94bWwuZWxlbWVudCgndmlkZW86dGl0bGUnKS5jZGF0YSh2aWRlby50aXRsZSlcbiAgICB2aWRlb3htbC5lbGVtZW50KCd2aWRlbzpkZXNjcmlwdGlvbicpLmNkYXRhKHZpZGVvLmRlc2NyaXB0aW9uKVxuICAgIGlmICh2aWRlby5jb250ZW50X2xvYykge1xuICAgICAgdmlkZW94bWwuZWxlbWVudCgndmlkZW86Y29udGVudF9sb2MnLCB2aWRlby5jb250ZW50X2xvYylcbiAgICB9XG4gICAgaWYgKHZpZGVvLnBsYXllcl9sb2MpIHtcbiAgICAgIHZpZGVveG1sLmVsZW1lbnQoJ3ZpZGVvOnBsYXllcl9sb2MnLCBhdHRyQnVpbGRlcih2aWRlbywgJ3BsYXllcl9sb2M6YXV0b3BsYXknKSwgdmlkZW8ucGxheWVyX2xvYylcbiAgICB9XG4gICAgaWYgKHZpZGVvLmR1cmF0aW9uKSB7XG4gICAgICB2aWRlb3htbC5lbGVtZW50KCd2aWRlbzpkdXJhdGlvbicsIHNhZmVEdXJhdGlvbih2aWRlby5kdXJhdGlvbikpXG4gICAgfVxuICAgIGlmICh2aWRlby5leHBpcmF0aW9uX2RhdGUpIHtcbiAgICAgIHZpZGVveG1sLmVsZW1lbnQoJ3ZpZGVvOmV4cGlyYXRpb25fZGF0ZScsIHZpZGVvLmV4cGlyYXRpb25fZGF0ZSlcbiAgICB9XG4gICAgaWYgKHZpZGVvLnJhdGluZykge1xuICAgICAgdmlkZW94bWwuZWxlbWVudCgndmlkZW86cmF0aW5nJywgdmlkZW8ucmF0aW5nKVxuICAgIH1cbiAgICBpZiAodmlkZW8udmlld19jb3VudCkge1xuICAgICAgdmlkZW94bWwuZWxlbWVudCgndmlkZW86dmlld19jb3VudCcsIHZpZGVvLnZpZXdfY291bnQpXG4gICAgfVxuICAgIGlmICh2aWRlby5wdWJsaWNhdGlvbl9kYXRlKSB7XG4gICAgICB2aWRlb3htbC5lbGVtZW50KCd2aWRlbzpwdWJsaWNhdGlvbl9kYXRlJywgdmlkZW8ucHVibGljYXRpb25fZGF0ZSlcbiAgICB9XG4gICAgaWYgKHZpZGVvLmZhbWlseV9mcmllbmRseSkge1xuICAgICAgdmlkZW94bWwuZWxlbWVudCgndmlkZW86ZmFtaWx5X2ZyaWVuZGx5JywgdmlkZW8uZmFtaWx5X2ZyaWVuZGx5KVxuICAgIH1cbiAgICBpZiAodmlkZW8udGFnKSB7XG4gICAgICBpZiAoIWlzQXJyYXkodmlkZW8udGFnKSkge1xuICAgICAgICB2aWRlb3htbC5lbGVtZW50KCd2aWRlbzp0YWcnLCB2aWRlby50YWcpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGNvbnN0IHRhZyBvZiB2aWRlby50YWcpIHtcbiAgICAgICAgICB2aWRlb3htbC5lbGVtZW50KCd2aWRlbzp0YWcnLCB0YWcpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHZpZGVvLmNhdGVnb3J5KSB7XG4gICAgICB2aWRlb3htbC5lbGVtZW50KCd2aWRlbzpjYXRlZ29yeScsIHZpZGVvLmNhdGVnb3J5KVxuICAgIH1cbiAgICBpZiAodmlkZW8ucmVzdHJpY3Rpb24pIHtcbiAgICAgIHZpZGVveG1sLmVsZW1lbnQoXG4gICAgICAgICd2aWRlbzpyZXN0cmljdGlvbicsXG4gICAgICAgIGF0dHJCdWlsZGVyKHZpZGVvLCAncmVzdHJpY3Rpb246cmVsYXRpb25zaGlwJyksXG4gICAgICAgIHZpZGVvLnJlc3RyaWN0aW9uXG4gICAgICApXG4gICAgfVxuICAgIGlmICh2aWRlby5nYWxsZXJ5X2xvYykge1xuICAgICAgdmlkZW94bWwuZWxlbWVudChcbiAgICAgICAgJ3ZpZGVvOmdhbGxlcnlfbG9jJyxcbiAgICAgICAge3RpdGxlOiB2aWRlb1snZ2FsbGVyeV9sb2M6dGl0bGUnXX0sXG4gICAgICAgIHZpZGVvLmdhbGxlcnlfbG9jXG4gICAgICApXG4gICAgfVxuICAgIGlmICh2aWRlby5wcmljZSkge1xuICAgICAgdmlkZW94bWwuZWxlbWVudChcbiAgICAgICAgJ3ZpZGVvOnByaWNlJyxcbiAgICAgICAgYXR0ckJ1aWxkZXIodmlkZW8sIFsncHJpY2U6cmVzb2x1dGlvbicsICdwcmljZTpjdXJyZW5jeScsICdwcmljZTp0eXBlJ10pLFxuICAgICAgICB2aWRlby5wcmljZVxuICAgICAgKVxuICAgIH1cbiAgICBpZiAodmlkZW8ucmVxdWlyZXNfc3Vic2NyaXB0aW9uKSB7XG4gICAgICB2aWRlb3htbC5lbGVtZW50KCd2aWRlbzpyZXF1aXJlc19zdWJzY3JpcHRpb24nLCB2aWRlby5yZXF1aXJlc19zdWJzY3JpcHRpb24pXG4gICAgfVxuICAgIGlmICh2aWRlby51cGxvYWRlcikge1xuICAgICAgdmlkZW94bWwuZWxlbWVudCgndmlkZW86dXBsb2FkZXInLCB2aWRlby51cGxvYWRlcilcbiAgICB9XG4gICAgaWYgKHZpZGVvLnBsYXRmb3JtKSB7XG4gICAgICB2aWRlb3htbC5lbGVtZW50KFxuICAgICAgICAndmlkZW86cGxhdGZvcm0nLFxuICAgICAgICBhdHRyQnVpbGRlcih2aWRlbywgJ3BsYXRmb3JtOnJlbGF0aW9uc2hpcCcpLFxuICAgICAgICB2aWRlby5wbGF0Zm9ybVxuICAgICAgKVxuICAgIH1cbiAgICBpZiAodmlkZW8ubGl2ZSkge1xuICAgICAgdmlkZW94bWwuZWxlbWVudCgndmlkZW86bGl2ZScsIHZpZGVvLmxpdmUpXG4gICAgfVxuICB9XG5cbiAgYnVpbGRYTUwgKCk6IGJ1aWxkZXIuWE1MRWxlbWVudE9yWE1MTm9kZSB7XG4gICAgdGhpcy51cmwuY2hpbGRyZW4gPSBbXVxuICAgIHRoaXMudXJsLmF0dHJpYnV0ZXMgPSB7fVxuICAgIC8vIHhtbCBwcm9wZXJ0eVxuICAgIGNvbnN0IHByb3BzID0gWydsb2MnLCAnbGFzdG1vZCcsICdjaGFuZ2VmcmVxJywgJ3ByaW9yaXR5JywgJ2ltZycsICd2aWRlbycsICdsaW5rcycsICdleHBpcmVzJywgJ2FuZHJvaWRMaW5rJywgJ21vYmlsZScsICduZXdzJywgJ2FtcExpbmsnXSBhcyBjb25zdDtcbiAgICAvLyBwcm9wZXJ0eSBhcnJheSBzaXplIChmb3IgbG9vcClcbiAgICBsZXQgcHMgPSAwXG4gICAgLy8gY3VycmVudCBwcm9wZXJ0eSBuYW1lIChmb3IgbG9vcClcbiAgICBsZXQgcFxuXG4gICAgd2hpbGUgKHBzIDwgcHJvcHMubGVuZ3RoKSB7XG4gICAgICBwID0gcHJvcHNbcHNdXG4gICAgICBwcysrXG5cbiAgICAgIGlmICh0aGlzW3BdICYmIHAgPT09ICdpbWcnKSB7XG4gICAgICAgIC8vIEltYWdlIGhhbmRsaW5nXG4gICAgICAgIGlmICh0eXBlb2YgKHRoaXNbcF0pICE9PSAnb2JqZWN0JyB8fCB0aGlzW3BdLmxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gbWFrZSBpdCBhbiBhcnJheVxuICAgICAgICAgIHRoaXNbcF0gPSBbdGhpc1twXV1cbiAgICAgICAgfVxuICAgICAgICB0aGlzW3BdLmZvckVhY2goaW1hZ2UgPT4ge1xuICAgICAgICAgIGNvbnN0IHhtbE9iaiA9IHt9XG4gICAgICAgICAgaWYgKHR5cGVvZiAoaW1hZ2UpICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgLy8gaXTigJlzIGEgc3RyaW5nXG4gICAgICAgICAgICAvLyBtYWtlIGl0IGFuIG9iamVjdFxuICAgICAgICAgICAgeG1sT2JqWydpbWFnZTpsb2MnXSA9IGltYWdlXG4gICAgICAgICAgfSBlbHNlIGlmIChpbWFnZS51cmwpIHtcbiAgICAgICAgICAgIHhtbE9ialsnaW1hZ2U6bG9jJ10gPSBpbWFnZS51cmxcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGltYWdlLmNhcHRpb24pIHtcbiAgICAgICAgICAgIHhtbE9ialsnaW1hZ2U6Y2FwdGlvbiddID0geycjY2RhdGEnOiBpbWFnZS5jYXB0aW9ufVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaW1hZ2UuZ2VvTG9jYXRpb24pIHtcbiAgICAgICAgICAgIHhtbE9ialsnaW1hZ2U6Z2VvX2xvY2F0aW9uJ10gPSBpbWFnZS5nZW9Mb2NhdGlvblxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaW1hZ2UudGl0bGUpIHtcbiAgICAgICAgICAgIHhtbE9ialsnaW1hZ2U6dGl0bGUnXSA9IHsnI2NkYXRhJzogaW1hZ2UudGl0bGV9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpbWFnZS5saWNlbnNlKSB7XG4gICAgICAgICAgICB4bWxPYmpbJ2ltYWdlOmxpY2Vuc2UnXSA9IGltYWdlLmxpY2Vuc2VcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLnVybC5lbGVtZW50KHsnaW1hZ2U6aW1hZ2UnOiB4bWxPYmp9KVxuICAgICAgICB9KVxuICAgICAgfSBlbHNlIGlmICh0aGlzW3BdICYmIHAgPT09ICd2aWRlbycpIHtcbiAgICAgICAgLy8gSW1hZ2UgaGFuZGxpbmdcbiAgICAgICAgaWYgKHR5cGVvZiAodGhpc1twXSkgIT09ICdvYmplY3QnIHx8IHRoaXNbcF0ubGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBtYWtlIGl0IGFuIGFycmF5XG4gICAgICAgICAgdGhpc1twXSA9IFt0aGlzW3BdXVxuICAgICAgICB9XG4gICAgICAgIHRoaXNbcF0uZm9yRWFjaCh0aGlzLmJ1aWxkVmlkZW9FbGVtZW50LCB0aGlzKVxuICAgICAgfSBlbHNlIGlmICh0aGlzW3BdICYmIHAgPT09ICdsaW5rcycpIHtcbiAgICAgICAgdGhpc1twXS5mb3JFYWNoKGxpbmsgPT4ge1xuICAgICAgICAgIHRoaXMudXJsLmVsZW1lbnQoeyd4aHRtbDpsaW5rJzoge1xuICAgICAgICAgICAgJ0ByZWwnOiAnYWx0ZXJuYXRlJyxcbiAgICAgICAgICAgICdAaHJlZmxhbmcnOiBsaW5rLmxhbmcsXG4gICAgICAgICAgICAnQGhyZWYnOiBsaW5rLnVybFxuICAgICAgICAgIH19KVxuICAgICAgICB9KVxuICAgICAgfSBlbHNlIGlmICh0aGlzW3BdICYmIHAgPT09ICdleHBpcmVzJykge1xuICAgICAgICB0aGlzLnVybC5lbGVtZW50KCdleHBpcmVzJywgbmV3IERhdGUodGhpc1twXSkudG9JU09TdHJpbmcoKSlcbiAgICAgIH0gZWxzZSBpZiAodGhpc1twXSAmJiBwID09PSAnYW5kcm9pZExpbmsnKSB7XG4gICAgICAgIHRoaXMudXJsLmVsZW1lbnQoJ3hodG1sOmxpbmsnLCB7cmVsOiAnYWx0ZXJuYXRlJywgaHJlZjogdGhpc1twXX0pXG4gICAgICB9IGVsc2UgaWYgKHRoaXNbcF0gJiYgcCA9PT0gJ21vYmlsZScpIHtcbiAgICAgICAgY29uc3QgbW9iaWxlaXRlbSA9IHRoaXMudXJsLmVsZW1lbnQoJ21vYmlsZTptb2JpbGUnKVxuICAgICAgICBpZiAodHlwZW9mIHRoaXNbcF0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgbW9iaWxlaXRlbS5hdHQoJ3R5cGUnLCB0aGlzW3BdKVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHAgPT09ICdwcmlvcml0eScgJiYgKHRoaXNbcF0gPj0gMC4wICYmIHRoaXNbcF0gPD0gMS4wKSkge1xuICAgICAgICB0aGlzLnVybC5lbGVtZW50KHAsIHBhcnNlRmxvYXQodGhpc1twXSkudG9GaXhlZCgxKSlcbiAgICAgIH0gZWxzZSBpZiAodGhpc1twXSAmJiBwID09PSAnYW1wTGluaycpIHtcbiAgICAgICAgdGhpcy51cmwuZWxlbWVudCgneGh0bWw6bGluaycsIHsgcmVsOiAnYW1waHRtbCcsIGhyZWY6IHRoaXNbcF0gfSlcbiAgICAgIH0gZWxzZSBpZiAodGhpc1twXSAmJiBwID09PSAnbmV3cycpIHtcbiAgICAgICAgbGV0IG5ld3NpdGVtID0gdGhpcy51cmwuZWxlbWVudCgnbmV3czpuZXdzJylcblxuICAgICAgICBpZiAoIXRoaXNbcF0ucHVibGljYXRpb24gfHxcbiAgICAgICAgICAgICF0aGlzW3BdLnB1YmxpY2F0aW9uLm5hbWUgfHxcbiAgICAgICAgICAgICF0aGlzW3BdLnB1YmxpY2F0aW9uLmxhbmd1YWdlIHx8XG4gICAgICAgICAgICAhdGhpc1twXS5wdWJsaWNhdGlvbl9kYXRlIHx8XG4gICAgICAgICAgICAhdGhpc1twXS50aXRsZVxuICAgICAgICApIHtcbiAgICAgICAgICB0aHJvdyBuZXcgSW52YWxpZE5ld3NGb3JtYXQoKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXNbcF0ucHVibGljYXRpb24pIHtcbiAgICAgICAgICBsZXQgcHVibGljYXRpb24gPSBuZXdzaXRlbS5lbGVtZW50KCduZXdzOnB1YmxpY2F0aW9uJylcbiAgICAgICAgICBpZiAodGhpc1twXS5wdWJsaWNhdGlvbi5uYW1lKSB7XG4gICAgICAgICAgICBwdWJsaWNhdGlvbi5lbGVtZW50KCduZXdzOm5hbWUnKS5jZGF0YSh0aGlzW3BdLnB1YmxpY2F0aW9uLm5hbWUpXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0aGlzW3BdLnB1YmxpY2F0aW9uLmxhbmd1YWdlKSB7XG4gICAgICAgICAgICBwdWJsaWNhdGlvbi5lbGVtZW50KCduZXdzOmxhbmd1YWdlJywgdGhpc1twXS5wdWJsaWNhdGlvbi5sYW5ndWFnZSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpc1twXS5hY2Nlc3MpIHtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICB0aGlzW3BdLmFjY2VzcyAhPT0gJ1JlZ2lzdHJhdGlvbicgJiZcbiAgICAgICAgICAgIHRoaXNbcF0uYWNjZXNzICE9PSAnU3Vic2NyaXB0aW9uJ1xuICAgICAgICAgICkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEludmFsaWROZXdzQWNjZXNzVmFsdWUoKVxuICAgICAgICAgIH1cbiAgICAgICAgICBuZXdzaXRlbS5lbGVtZW50KCduZXdzOmFjY2VzcycsIHRoaXNbcF0uYWNjZXNzKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXNbcF0uZ2VucmVzKSB7XG4gICAgICAgICAgbmV3c2l0ZW0uZWxlbWVudCgnbmV3czpnZW5yZXMnLCB0aGlzW3BdLmdlbnJlcylcbiAgICAgICAgfVxuXG4gICAgICAgIG5ld3NpdGVtLmVsZW1lbnQoJ25ld3M6cHVibGljYXRpb25fZGF0ZScsIHRoaXNbcF0ucHVibGljYXRpb25fZGF0ZSlcbiAgICAgICAgbmV3c2l0ZW0uZWxlbWVudCgnbmV3czp0aXRsZScpLmNkYXRhKHRoaXNbcF0udGl0bGUpXG5cbiAgICAgICAgaWYgKHRoaXNbcF0ua2V5d29yZHMpIHtcbiAgICAgICAgICBuZXdzaXRlbS5lbGVtZW50KCduZXdzOmtleXdvcmRzJywgdGhpc1twXS5rZXl3b3JkcylcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzW3BdLnN0b2NrX3RpY2tlcnMpIHtcbiAgICAgICAgICBuZXdzaXRlbS5lbGVtZW50KCduZXdzOnN0b2NrX3RpY2tlcnMnLCB0aGlzW3BdLnN0b2NrX3RpY2tlcnMpXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodGhpc1twXSkge1xuICAgICAgICBpZiAocCA9PT0gJ2xvYycgJiYgdGhpcy5jb25mLmNkYXRhKSB7XG4gICAgICAgICAgdGhpcy51cmwuZWxlbWVudCh7XG4gICAgICAgICAgICBbcF06IHtcbiAgICAgICAgICAgICAgJyNyYXcnOiB0aGlzW3BdXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnVybC5lbGVtZW50KHAsIHRoaXNbcF0pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy51cmxcbiAgfVxuXG4gIC8qKlxuICAgKiAgQWxpYXMgZm9yIHRvWE1MKClcbiAgICogIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG4gIHRvU3RyaW5nICgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmJ1aWxkWE1MKCkudG9TdHJpbmcoKVxuICB9XG59XG5cbmV4cG9ydCA9IFNpdGVtYXBJdGVtXG4iXX0=