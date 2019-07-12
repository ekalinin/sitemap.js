import { getTimestampFromDate } from './utils';
import { statSync } from 'fs';
import { create, XMLElement } from 'xmlbuilder';
import {
  ChangeFreqInvalidError,
  InvalidAttr,
  InvalidAttrValue,
  InvalidNewsAccessValue,
  InvalidNewsFormat,
  InvalidVideoDescription,
  InvalidVideoDuration,
  InvalidVideoFormat,
  NoURLError,
  NoConfigError,
  PriorityInvalidError,
} from './errors'
import { CHANGEFREQ, IVideoItem, SitemapItemOptions } from './types';

function safeDuration (duration: number): number {
  if (duration < 0 || duration > 28800) {
    throw new InvalidVideoDuration()
  }

  return duration
}

const allowDeny = /^allow|deny$/
const validators: {[index: string]: RegExp} = {
  'price:currency': /^[A-Z]{3}$/,
  'price:type': /^rent|purchase|RENT|PURCHASE$/,
  'price:resolution': /^HD|hd|sd|SD$/,
  'platform:relationship': allowDeny,
  'restriction:relationship': allowDeny
}
// eslint-disable-next-line
interface IStringObj { [index: string]: any }
function attrBuilder (conf: IStringObj, keys: string | string[]): object {
  if (typeof keys === 'string') {
    keys = [keys]
  }

  const iv: IStringObj = {}
  return keys.reduce((attrs, key): IStringObj => {
    // eslint-disable-next-line
    if (conf[key] !== undefined) {
      let keyAr = key.split(':')
      if (keyAr.length !== 2) {
        throw new InvalidAttr(key)
      }

      // eslint-disable-next-line
      if (validators[key] && !validators[key].test(conf[key])) {
        throw new InvalidAttrValue(key, conf[key], validators[key])
      }
      attrs[keyAr[1]] = conf[key]
    }

    return attrs
  }, iv)
}

/**
 * Item in sitemap
 */
export class SitemapItem {
  loc: SitemapItemOptions["url"];
  lastmod: SitemapItemOptions["lastmod"];
  changefreq: SitemapItemOptions["changefreq"];
  priority: SitemapItemOptions["priority"];
  news?: SitemapItemOptions["news"];
  img?: SitemapItemOptions["img"];
  links?: SitemapItemOptions["links"];
  expires?: SitemapItemOptions["expires"];
  androidLink?: SitemapItemOptions["androidLink"];
  mobile?: SitemapItemOptions["mobile"];
  video?: SitemapItemOptions["video"];
  ampLink?: SitemapItemOptions["ampLink"];
  root: XMLElement;
  url: XMLElement;

  constructor (public conf: SitemapItemOptions) {
    if (!conf) {
      throw new NoConfigError()
    }
    const {
      url:loc,
      safe: isSafeUrl,
      lastmodfile,
      lastmod,
      lastmodrealtime,
      lastmodISO,
      changefreq,
      priority
    } = conf

    if (!loc) {
      throw new NoURLError()
    }

    // URL of the page
    this.loc = loc

    // If given a file to use for last modified date
    if (lastmodfile) {
      const { mtime } = statSync(lastmodfile)

      this.lastmod = getTimestampFromDate(new Date(mtime), lastmodrealtime)

      // The date of last modification (YYYY-MM-DD)
    } else if (lastmod) {
      // append the timezone offset so that dates are treated as local time.
      // Otherwise the Unit tests fail sometimes.
      let timezoneOffset = 'UTC-' + (new Date().getTimezoneOffset() / 60) + '00'
      timezoneOffset = timezoneOffset.replace('--', '-')
      this.lastmod = getTimestampFromDate(
        new Date(lastmod + ' ' + timezoneOffset),
        lastmodrealtime
      )
    } else if (lastmodISO) {
      this.lastmod = lastmodISO
    }

    // How frequently the page is likely to change
    // due to this field is optional no default value is set
    // please see: https://www.sitemaps.org/protocol.html
    this.changefreq = changefreq
    if (!isSafeUrl && changefreq) {
      if (CHANGEFREQ.indexOf(changefreq) === -1) {
        throw new ChangeFreqInvalidError()
      }
    }

    // The priority of this URL relative to other URLs
    // due to this field is optional no default value is set
    // please see: https://www.sitemaps.org/protocol.html
    this.priority = priority
    if (!isSafeUrl && priority) {
      if (!(priority >= 0.0 && priority <= 1.0) || typeof priority !== 'number') {
        throw new PriorityInvalidError()
      }
    }

    this.news = conf.news
    this.img = conf.img
    this.links = conf.links
    this.expires = conf.expires
    this.androidLink = conf.androidLink
    this.mobile = conf.mobile
    this.video = conf.video
    this.ampLink = conf.ampLink
    this.root = conf.root || create('root')
    this.url = this.root.element('url')
  }

  /**
   *  Create sitemap xml
   *  @return {String}
   */
  toXML (): string {
    return this.toString()
  }

  buildVideoElement (video: IVideoItem): void {
    const videoxml = this.url.element('video:video')
    if (typeof (video) !== 'object' || !video.thumbnail_loc || !video.title || !video.description) {
      // has to be an object and include required categories https://support.google.com/webmasters/answer/80471?hl=en&ref_topic=4581190
      throw new InvalidVideoFormat()
    }

    if (video.description.length > 2048) {
      throw new InvalidVideoDescription()
    }

    videoxml.element('video:thumbnail_loc', video.thumbnail_loc)
    videoxml.element('video:title').cdata(video.title)
    videoxml.element('video:description').cdata(video.description)
    if (video.content_loc) {
      videoxml.element('video:content_loc', video.content_loc)
    }
    if (video.player_loc) {
      videoxml.element('video:player_loc', attrBuilder(video, 'player_loc:autoplay'), video.player_loc)
    }
    if (video.duration) {
      videoxml.element('video:duration', safeDuration(video.duration))
    }
    if (video.expiration_date) {
      videoxml.element('video:expiration_date', video.expiration_date)
    }
    if (video.rating) {
      videoxml.element('video:rating', video.rating)
    }
    if (video.view_count) {
      videoxml.element('video:view_count', video.view_count)
    }
    if (video.publication_date) {
      videoxml.element('video:publication_date', video.publication_date)
    }
    if (video.family_friendly) {
      videoxml.element('video:family_friendly', video.family_friendly)
    }
    if (video.tag) {
      if (!Array.isArray(video.tag)) {
        videoxml.element('video:tag', video.tag)
      } else {
        for (const tag of video.tag) {
          videoxml.element('video:tag', tag)
        }
      }
    }
    if (video.category) {
      videoxml.element('video:category', video.category)
    }
    if (video.restriction) {
      videoxml.element(
        'video:restriction',
        attrBuilder(video, 'restriction:relationship'),
        video.restriction
      )
    }
    if (video.gallery_loc) {
      videoxml.element(
        'video:gallery_loc',
        {title: video['gallery_loc:title']},
        video.gallery_loc
      )
    }
    if (video.price) {
      videoxml.element(
        'video:price',
        attrBuilder(video, ['price:resolution', 'price:currency', 'price:type']),
        video.price
      )
    }
    if (video.requires_subscription) {
      videoxml.element('video:requires_subscription', video.requires_subscription)
    }
    if (video.uploader) {
      videoxml.element('video:uploader', video.uploader)
    }
    if (video.platform) {
      videoxml.element(
        'video:platform',
        attrBuilder(video, 'platform:relationship'),
        video.platform
      )
    }
    if (video.live) {
      videoxml.element('video:live', video.live)
    }
  }

  buildXML (): XMLElement {
    this.url.children = []
    // @ts-ignore
    this.url.attribs = {}
    // xml property
    const props = ['loc', 'lastmod', 'changefreq', 'priority', 'img', 'video', 'links', 'expires', 'androidLink', 'mobile', 'news', 'ampLink'];
    // property array size (for loop)
    let ps = 0
    // current property name (for loop)
    let p

    while (ps < props.length) {
      p = props[ps]
      ps++

      if (this.img && p === 'img') {
        // Image handling
        if (!Array.isArray(this.img)) {
          // make it an array
          this.img = [this.img]
        }
        this.img.forEach((image): void => {
          const xmlObj: {[index: string]: string|{'#cdata': string}} = {}
          if (typeof (image) !== 'object') {
            // it’s a string
            // make it an object
            image = {url: image}
          }

          xmlObj['image:loc'] = image.url

          if (image.caption) {
            xmlObj['image:caption'] = {'#cdata': image.caption}
          }
          if (image.geoLocation) {
            xmlObj['image:geo_location'] = image.geoLocation
          }
          if (image.title) {
            xmlObj['image:title'] = {'#cdata': image.title}
          }
          if (image.license) {
            xmlObj['image:license'] = image.license
          }

          this.url.element({'image:image': xmlObj})
        })
      } else if (this.video && p === 'video') {
        // Image handling
        if (!Array.isArray(this.video)) {
          // make it an array
          this.video = [this.video]
        }
        this.video.forEach(this.buildVideoElement, this)
      } else if (this.links && p === 'links') {
        this.links.forEach((link): void => {
          this.url.element({'xhtml:link': {
            '@rel': 'alternate',
            '@hreflang': link.lang,
            '@href': link.url
          }})
        })
      } else if (this.expires && p === 'expires') {
        this.url.element('expires', new Date(this.expires).toISOString())
      } else if (this.androidLink && p === 'androidLink') {
        this.url.element('xhtml:link', {rel: 'alternate', href: this.androidLink})
      } else if (this.mobile && p === 'mobile') {
        const mobileitem = this.url.element('mobile:mobile')
        if (typeof this.mobile === 'string') {
          mobileitem.att('type', this.mobile)
        }
      } else if (this.priority !== undefined && p === 'priority') {
        if (this.conf.fullPrecisionPriority) {
          this.url.element(p, this.priority + '')
        } else {
          this.url.element(p, parseFloat(this.priority + '').toFixed(1))
        }
      } else if (this.ampLink && p === 'ampLink') {
        this.url.element('xhtml:link', { rel: 'amphtml', href: this.ampLink })
      } else if (this.news && p === 'news') {
        let newsitem = this.url.element('news:news')

        if (!this.news.publication ||
            !this.news.publication.name ||
            !this.news.publication.language ||
            !this.news.publication_date ||
            !this.news.title
        ) {
          throw new InvalidNewsFormat()
        }

        if (this.news.publication) {
          let publication = newsitem.element('news:publication')
          if (this.news.publication.name) {
            publication.element('news:name').cdata(this.news.publication.name)
          }
          if (this.news.publication.language) {
            publication.element('news:language', this.news.publication.language)
          }
        }

        if (this.news.access) {
          if (
            this.news.access !== 'Registration' &&
            this.news.access !== 'Subscription'
          ) {
            throw new InvalidNewsAccessValue()
          }
          newsitem.element('news:access', this.news.access)
        }

        if (this.news.genres) {
          newsitem.element('news:genres', this.news.genres)
        }

        newsitem.element('news:publication_date', this.news.publication_date)
        newsitem.element('news:title').cdata(this.news.title)

        if (this.news.keywords) {
          newsitem.element('news:keywords', this.news.keywords)
        }

        if (this.news.stock_tickers) {
          newsitem.element('news:stock_tickers', this.news.stock_tickers)
        }
      } else if (this.loc && p === 'loc' && this.conf.cdata) {
        this.url.element({
          loc: {
            '#raw': this.loc
          }
        })
      } else if (this.loc && p === 'loc') {
        this.url.element(p, this.loc)
      } else if (this.changefreq && p === 'changefreq') {
        this.url.element(p, this.changefreq)
      } else if (this.lastmod && p === 'lastmod') {
        this.url.element(p, this.lastmod)
      }
    }

    return this.url
  }

  /**
   *  Alias for toXML()
   *  @return {String}
   */
  toString (): string {
    return this.buildXML().toString()
  }
}
