import { Transform, TransformOptions, TransformCallback } from 'stream';
import { InvalidAttr } from './errors';
import { SitemapItem, ErrorLevel, TagNames } from './types';
import { element, otag, ctag } from './sitemap-xml';

export interface StringObj {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [index: string]: any;
}
function attrBuilder(
  conf: StringObj,
  keys: string | string[]
): Record<string, string> {
  if (typeof keys === 'string') {
    keys = [keys];
  }

  const iv: StringObj = {};
  return keys.reduce((attrs, key): StringObj => {
    if (conf[key] !== undefined) {
      const keyAr = key.split(':');
      if (keyAr.length !== 2) {
        throw new InvalidAttr(key);
      }
      attrs[keyAr[1]] = conf[key];
    }

    return attrs;
  }, iv);
}

export interface SitemapItemStreamOptions extends TransformOptions {
  level?: ErrorLevel;
}

/**
 * Takes a stream of SitemapItemOptions and spits out xml for each
 * @example
 * // writes <url><loc>https://example.com</loc><url><url><loc>https://example.com/2</loc><url>
 * const smis = new SitemapItemStream({level: 'warn'})
 * smis.pipe(writestream)
 * smis.write({url: 'https://example.com', img: [], video: [], links: []})
 * smis.write({url: 'https://example.com/2', img: [], video: [], links: []})
 * smis.end()
 * @param level - Error level
 */
export class SitemapItemStream extends Transform {
  level: ErrorLevel;
  constructor(opts: SitemapItemStreamOptions = { level: ErrorLevel.WARN }) {
    opts.objectMode = true;
    super(opts);
    this.level = opts.level || ErrorLevel.WARN;
  }

  _transform(
    item: SitemapItem,
    encoding: string,
    callback: TransformCallback
  ): void {
    this.push(otag(TagNames.url));
    this.push(element(TagNames.loc, item.url));

    if (item.lastmod) {
      this.push(element(TagNames.lastmod, item.lastmod));
    }

    if (item.changefreq) {
      this.push(element(TagNames.changefreq, item.changefreq));
    }

    if (item.priority !== undefined && item.priority !== null) {
      if (item.fullPrecisionPriority) {
        this.push(element(TagNames.priority, item.priority.toString()));
      } else {
        this.push(element(TagNames.priority, item.priority.toFixed(1)));
      }
    }

    item.video.forEach((video) => {
      this.push(otag(TagNames['video:video']));

      this.push(element(TagNames['video:thumbnail_loc'], video.thumbnail_loc));
      this.push(element(TagNames['video:title'], video.title));
      this.push(element(TagNames['video:description'], video.description));

      if (video.content_loc) {
        this.push(element(TagNames['video:content_loc'], video.content_loc));
      }

      if (video.player_loc) {
        this.push(
          element(
            TagNames['video:player_loc'],
            attrBuilder(video, [
              'player_loc:autoplay',
              'player_loc:allow_embed',
            ]),
            video.player_loc
          )
        );
      }

      if (video.duration) {
        this.push(
          element(TagNames['video:duration'], video.duration.toString())
        );
      }

      if (video.expiration_date) {
        this.push(
          element(TagNames['video:expiration_date'], video.expiration_date)
        );
      }

      if (video.rating !== undefined) {
        this.push(element(TagNames['video:rating'], video.rating.toString()));
      }

      if (video.view_count !== undefined) {
        this.push(
          element(TagNames['video:view_count'], video.view_count.toString())
        );
      }

      if (video.publication_date) {
        this.push(
          element(TagNames['video:publication_date'], video.publication_date)
        );
      }

      for (const tag of video.tag) {
        this.push(element(TagNames['video:tag'], tag));
      }

      if (video.category) {
        this.push(element(TagNames['video:category'], video.category));
      }

      if (video.family_friendly) {
        this.push(
          element(TagNames['video:family_friendly'], video.family_friendly)
        );
      }

      if (video.restriction) {
        this.push(
          element(
            TagNames['video:restriction'],
            attrBuilder(video, 'restriction:relationship'),
            video.restriction
          )
        );
      }

      if (video.gallery_loc) {
        this.push(
          element(
            TagNames['video:gallery_loc'],
            { title: video['gallery_loc:title'] },
            video.gallery_loc
          )
        );
      }

      if (video.price) {
        this.push(
          element(
            TagNames['video:price'],
            attrBuilder(video, [
              'price:resolution',
              'price:currency',
              'price:type',
            ]),
            video.price
          )
        );
      }

      if (video.requires_subscription) {
        this.push(
          element(
            TagNames['video:requires_subscription'],
            video.requires_subscription
          )
        );
      }

      if (video.uploader) {
        this.push(
          element(
            TagNames['video:uploader'],
            attrBuilder(video, 'uploader:info'),
            video.uploader
          )
        );
      }

      if (video.platform) {
        this.push(
          element(
            TagNames['video:platform'],
            attrBuilder(video, 'platform:relationship'),
            video.platform
          )
        );
      }

      if (video.live) {
        this.push(element(TagNames['video:live'], video.live));
      }

      if (video.id) {
        this.push(element(TagNames['video:id'], { type: 'url' }, video.id));
      }

      this.push(ctag(TagNames['video:video']));
    });

    item.links.forEach((link) => {
      this.push(
        element(TagNames['xhtml:link'], {
          rel: 'alternate',
          hreflang: link.lang || link.hreflang,
          href: link.url,
        })
      );
    });

    if (item.expires) {
      this.push(
        element(TagNames.expires, new Date(item.expires).toISOString())
      );
    }

    if (item.androidLink) {
      this.push(
        element(TagNames['xhtml:link'], {
          rel: 'alternate',
          href: item.androidLink,
        })
      );
    }

    if (item.ampLink) {
      this.push(
        element(TagNames['xhtml:link'], {
          rel: 'amphtml',
          href: item.ampLink,
        })
      );
    }

    if (item.news) {
      this.push(otag(TagNames['news:news']));
      this.push(otag(TagNames['news:publication']));
      this.push(element(TagNames['news:name'], item.news.publication.name));

      this.push(
        element(TagNames['news:language'], item.news.publication.language)
      );
      this.push(ctag(TagNames['news:publication']));

      if (item.news.access) {
        this.push(element(TagNames['news:access'], item.news.access));
      }

      if (item.news.genres) {
        this.push(element(TagNames['news:genres'], item.news.genres));
      }

      this.push(
        element(TagNames['news:publication_date'], item.news.publication_date)
      );
      this.push(element(TagNames['news:title'], item.news.title));

      if (item.news.keywords) {
        this.push(element(TagNames['news:keywords'], item.news.keywords));
      }

      if (item.news.stock_tickers) {
        this.push(
          element(TagNames['news:stock_tickers'], item.news.stock_tickers)
        );
      }
      this.push(ctag(TagNames['news:news']));
    }

    // Image handling
    item.img.forEach((image): void => {
      this.push(otag(TagNames['image:image']));
      this.push(element(TagNames['image:loc'], image.url));

      if (image.caption) {
        this.push(element(TagNames['image:caption'], image.caption));
      }

      if (image.geoLocation) {
        this.push(element(TagNames['image:geo_location'], image.geoLocation));
      }

      if (image.title) {
        this.push(element(TagNames['image:title'], image.title));
      }

      if (image.license) {
        this.push(element(TagNames['image:license'], image.license));
      }

      this.push(ctag(TagNames['image:image']));
    });

    this.push(ctag(TagNames.url));
    callback();
  }
}
