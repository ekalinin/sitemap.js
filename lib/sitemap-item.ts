import { Transform, TransformOptions, TransformCallback } from 'stream';
import { create, XMLElement } from 'xmlbuilder';
import { InvalidAttr } from './errors'
import {
  IVideoItem,
  SitemapItemOptions,
  ErrorLevel
} from './types';
import { validateSMIOptions } from './utils'

function text(txt: string): string {
  return txt;
}

function otag(nodeName: string, attrs?: IStringObj, selfClose = false): string {
  let attrstr = ''
  for (const k in attrs) {
    attrstr += ` ${k}="${attrs[k]}"}`
  }
  return `<${nodeName}${attrstr}${selfClose ? '/' : ''}>`;
}

function ctag(nodeName: string): string {
  return `</${nodeName}>`;
}

// TODO replace nodeName with full list of node names
function element(nodeName: string, attrs: IStringObj, innerText: string): string;
function element(nodeName: string, innerText: string): string;
function element(nodeName: string, attrs: IStringObj): string;
function element(nodeName: string, attrs: string|IStringObj, innerText?: string): string {
  if (typeof attrs === 'string') {
    return otag(nodeName) + text(attrs) + ctag(nodeName);
  } else if (innerText) {
    return otag(nodeName, attrs) + text(innerText) + ctag(nodeName);
  } else {
    return otag(nodeName, attrs, true);
  }
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
      const keyAr = key.split(':')
      if (keyAr.length !== 2) {
        throw new InvalidAttr(key)
      }
      attrs[keyAr[1]] = conf[key]
    }

    return attrs
  }, iv)
}

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export interface SitemapItemStreamOpts extends TransformOptions {
  level?: ErrorLevel;
}

export class SitemapItemStream extends Transform {
  level: ErrorLevel;
  constructor(opts: SitemapItemStreamOpts = { level: ErrorLevel.WARN }) {
    opts.objectMode = true;
    super(opts);
    this.level = opts.level || ErrorLevel.WARN;
  }

  _transform(item: SitemapItemOptions, encoding: string, callback: TransformCallback): void {
    this.push(otag('url'))
    this.push(element('loc', item.url))

    if (item.lastmod) {
      this.push(element('lastmod', item.lastmod));
    }

    if (item.changefreq) {
      this.push(element('changefreq', item.changefreq))
    }

    if (item.priority !== undefined) {
      if (item.fullPrecisionPriority) {
        this.push(element('priority', item.priority.toString()))
      } else {
        this.push(element('priority', item.priority.toFixed(1)))
      }
    }

    // Image handling
    item.img.forEach((image): void => {
      this.push(otag('image:image'))
      this.push(element('image:loc', image.url))

      if (image.caption) {
        this.push(element('image:caption', image.caption))
      }

      if (image.geoLocation) {
        this.push(element('image:geo_location', image.geoLocation))
      }

      if (image.title) {
        this.push(element('image:title', image.title))
      }

      if (image.license) {
        this.push(element('image:license', image.license))
      }

      this.push(ctag('image:image'))
    })

    item.video.forEach((video) => {
      this.push(otag('video:video'))

      this.push(element('video:thumbnail_loc', video.thumbnail_loc))
      this.push(element('video:title', video.title))
      this.push(element('video:description', video.description))

      if (video.content_loc) {
        this.push(element('video:content_loc', video.content_loc))
      }

      if (video.player_loc) {
        this.push(element('video:player_loc', attrBuilder(video, 'player_loc:autoplay'), video.player_loc))
      }

      if (video.duration) {
        this.push(element('video:duration', video.duration.toString()))
      }

      if (video.expiration_date) {
        this.push(element('video:expiration_date', video.expiration_date))
      }

      if (video.rating !== undefined) {
        this.push(element('video:rating', video.rating.toString()))
      }

      if (video.view_count !== undefined) {
        this.push(element('video:view_count', video.view_count.toString()))
      }

      if (video.publication_date) {
        this.push(element('video:publication_date', video.publication_date))
      }

      for (const tag of video.tag) {
        this.push(element('video:tag', tag))
      }

      if (video.category) {
        this.push(element('video:category', video.category))
      }

      if (video.family_friendly) {
        this.push(element('video:family_friendly', video.family_friendly))
      }

      if (video.restriction) {
        this.push(element(
          'video:restriction',
          attrBuilder(video, 'restriction:relationship'),
          video.restriction
        ))
      }

      if (video.gallery_loc) {
        this.push(element(
          'video:gallery_loc',
          {title: video['gallery_loc:title']},
          video.gallery_loc
        ))
      }

      if (video.price) {
        this.push(element(
          'video:price',
          attrBuilder(video, ['price:resolution', 'price:currency', 'price:type']),
          video.price
        ))
      }

      if (video.requires_subscription) {
        this.push(element('video:requires_subscription', video.requires_subscription))
      }

      if (video.uploader) {
        this.push(element('video:uploader', video.uploader))
      }

      if (video.platform) {
        this.push(element(
          'video:platform',
          attrBuilder(video, 'platform:relationship'),
          video.platform
        ))
      }

      if (video.live) {
        this.push(element('video:live', video.live))
      }

      if (video.id) {
        this.push(element('video:id', {type: 'url'}, video.id))
      }

      this.push(ctag('video:video'))
    })

    item.links.forEach(link => {
      this.push(element('xhtml:link', {
        '@rel': 'alternate',
        '@hreflang': link.lang,
        '@href': link.url
      }))
    })

    if (item.expires) {
      this.push(element('expires', new Date(item.expires).toISOString()))
    }

    if (item.androidLink) {
      this.push(element('xhtml:link', {rel: 'alternate', href: item.androidLink}))
    }

    if (item.news) {
      this.push(otag('news:news'))
      this.push(otag('news:publication'))
      this.push(element('news:name', item.news.publication.name))
      this.push(element('news:language', item.news.publication.language))
      this.push(ctag('news:publication'))

      if (item.news.access) {
        this.push(element('news:access', item.news.access))
      }

      if (item.news.genres) {
        this.push(element('news:genres', item.news.genres))
      }

      this.push(element('news:publication_date', item.news.publication_date))
      this.push(element('news:title', item.news.title))

      if (item.news.keywords) {
        this.push(element('news:keywords', item.news.keywords))
      }

      if (item.news.stock_tickers) {
        this.push(element('news:stock_tickers', item.news.stock_tickers))
      }
      this.push(ctag('news:news'))
    }

    if (item.ampLink) {
      this.push(element('xhtml:link', { rel: 'amphtml', href: item.ampLink }))
    }
    this.push(ctag('url'))
    callback();
  }
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
  video?: SitemapItemOptions["video"];
  ampLink?: SitemapItemOptions["ampLink"];
  url: XMLElement;

  constructor (public conf: SitemapItemOptions, public root = create('root'), level = ErrorLevel.WARN) {
    validateSMIOptions(conf, level)
    const {
      url:loc,
      lastmod,
      changefreq,
      priority
    } = conf

    // URL of the page
    this.loc = loc

    // How frequently the page is likely to change
    // due to this field is optional no default value is set
    // please see: https://www.sitemaps.org/protocol.html
    this.changefreq = changefreq

    // The priority of this URL relative to other URLs
    // due to this field is optional no default value is set
    // please see: https://www.sitemaps.org/protocol.html
    this.priority = priority

    this.news = conf.news
    this.img = conf.img
    this.links = conf.links
    this.expires = conf.expires
    this.androidLink = conf.androidLink
    this.video = conf.video
    this.ampLink = conf.ampLink
    this.url = this.root.element('url')
    this.lastmod = lastmod
  }

  /**
   * For creating standalone sitemap entries
   * @param {SitemapItemOptions} conf sitemap entry options
   * @param {ErrorLevel} [level=ErrorLevel.WARN] How to handle errors in data passed in
   * @return {string} the entry
   */
  static justItem (conf: SitemapItemOptions, level?: ErrorLevel): string {
    const smi = new SitemapItem(conf, undefined, level)
    return smi.toString()
  }

  /**
   *  Create sitemap xml
   *  @return {String}
   */
  toXML (): string {
    return this.toString()
  }

  /**
   * Builds just video element
   * @param {IVideoItem} video sitemap video configuration
   */
  buildVideoElement (video: IVideoItem): void {
    const videoxml = this.url.element('video:video')

    videoxml.element('video:thumbnail_loc').text(video.thumbnail_loc)
    videoxml.element('video:title').text(video.title)
    videoxml.element('video:description').text(video.description)
    if (video.content_loc) {
      videoxml.element('video:content_loc').text(video.content_loc)
    }
    if (video.player_loc) {
      videoxml.element('video:player_loc', attrBuilder(video, 'player_loc:autoplay')).text(video.player_loc)
    }
    if (video.duration) {
      videoxml.element('video:duration', video.duration)
    }
    if (video.expiration_date) {
      videoxml.element('video:expiration_date').text(video.expiration_date)
    }
    if (video.rating !== undefined) {
      videoxml.element('video:rating', video.rating)
    }
    if (video.view_count !== undefined) {
      videoxml.element('video:view_count', video.view_count)
    }
    if (video.publication_date) {
      videoxml.element('video:publication_date').text(video.publication_date)
    }
    for (const tag of video.tag) {
      videoxml.element('video:tag').text(tag)
    }
    if (video.category) {
      videoxml.element('video:category').text(video.category)
    }
    if (video.family_friendly) {
      videoxml.element('video:family_friendly').text(video.family_friendly)
    }
    if (video.restriction) {
      videoxml.element(
        'video:restriction',
        attrBuilder(video, 'restriction:relationship')).text(
        video.restriction
      )
    }
    if (video.gallery_loc) {
      videoxml.element(
        'video:gallery_loc',
        {title: video['gallery_loc:title']}).text(
        video.gallery_loc
      )
    }
    if (video.price) {
      videoxml.element(
        'video:price',
        attrBuilder(video, ['price:resolution', 'price:currency', 'price:type'])).text(
        video.price
      )
    }
    if (video.requires_subscription) {
      videoxml.element('video:requires_subscription').text(video.requires_subscription)
    }
    if (video.uploader) {
      videoxml.element('video:uploader').text(video.uploader)
    }
    if (video.platform) {
      videoxml.element(
        'video:platform',
        attrBuilder(video, 'platform:relationship')).text(
        video.platform
      )
    }
    if (video.live) {
      videoxml.element('video:live').text(video.live)
    }
    if (video.id) {
      videoxml.element('video:id', {type: 'url'}).text(video.id)
    }
  }

  /**
   * given the passed in sitemap item options builds an internal xml structure
   * @returns the XMLElement built
   */
  buildXML (): XMLElement {
    this.url.children = []
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
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
        this.img.forEach((image): void => {
          const xmlObj: {
            [index: string]: string | { "#cdata"?: string; "#text"?: string };
          } = {};
          xmlObj['image:loc'] = { '#text': image.url }

          if (image.caption) {
            xmlObj['image:caption'] = { '#text': image.caption }
          }
          if (image.geoLocation) {
            xmlObj['image:geo_location'] = { '#text': image.geoLocation }
          }
          if (image.title) {
            xmlObj['image:title'] = { '#text': image.title }
          }
          if (image.license) {
            xmlObj['image:license'] = { '#text': image.license }
          }

          this.url.element({'image:image': xmlObj})
        })
      } else if (this.video && p === 'video') {
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
        this.url.element('expires').text(new Date(this.expires).toISOString())
      } else if (this.androidLink && p === 'androidLink') {
        this.url.element('xhtml:link', {rel: 'alternate', href: this.androidLink})
      } else if (this.priority !== undefined && p === 'priority') {
        if (this.conf.fullPrecisionPriority) {
          this.url.element(p).text(this.priority + '')
        } else {
          this.url.element(p, parseFloat(this.priority + '').toFixed(1))
        }
      } else if (this.ampLink && p === 'ampLink') {
        this.url.element('xhtml:link', { rel: 'amphtml', href: this.ampLink })
      } else if (this.news && p === 'news') {
        const newsitem = this.url.element('news:news')

        if (this.news.publication) {
          const publication = newsitem.element('news:publication')
          if (this.news.publication.name) {
            publication.element('news:name').text(this.news.publication.name)
          }
          if (this.news.publication.language) {
            publication.element('news:language').text(this.news.publication.language)
          }
        }

        if (this.news.access) {
          newsitem.element('news:access').text(this.news.access)
        }

        if (this.news.genres) {
          newsitem.element('news:genres').text(this.news.genres)
        }

        newsitem.element('news:publication_date').text(this.news.publication_date)
        newsitem.element('news:title').text(this.news.title)

        if (this.news.keywords) {
          newsitem.element('news:keywords').text(this.news.keywords)
        }

        if (this.news.stock_tickers) {
          newsitem.element('news:stock_tickers').text(this.news.stock_tickers)
        }
      } else if (this.loc && p === 'loc' && this.conf.cdata) {
        this.url.element({
          loc: {
            '#raw': this.loc
          }
        })
      } else if (this.loc && p === 'loc') {
        this.url.element(p).text(this.loc)
      } else if (this.changefreq && p === 'changefreq') {
        this.url.element(p).text(this.changefreq)
      } else if (this.lastmod && p === 'lastmod') {
        this.url.element(p).text(this.lastmod)
      }
    }

    return this.url
  }

  /**
   *  Builds and stringifies the xml as configured by constructor
   *  @return {String} the item converted to a string of xml
   */
  toString (): string {
    return this.buildXML().toString()
  }
}
