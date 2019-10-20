import { Transform, TransformOptions, TransformCallback } from 'stream';
import { InvalidAttr } from './errors'
import {
  SitemapItemOptions,
  ErrorLevel
} from './types';

function text(txt: string): string {
  return txt
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
}

function otag(nodeName: string, attrs?: IStringObj, selfClose = false): string {
  let attrstr = ''
  for (const k in attrs) {
    const val = attrs[k]
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/'/g, '&apos;')
      .replace(/"/g, '&quot;');
    attrstr += ` ${k}="${val}"`
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
        'rel': 'alternate',
        'hreflang': link.lang,
        'href': link.url
      }))
    })

    if (item.expires) {
      this.push(element('expires', new Date(item.expires).toISOString()))
    }

    if (item.androidLink) {
      this.push(element('xhtml:link', {rel: 'alternate', href: item.androidLink}))
    }

    if (item.ampLink) {
      this.push(element('xhtml:link', { rel: 'amphtml', href: item.ampLink }))
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

    this.push(ctag('url'))
    callback();
  }
}

