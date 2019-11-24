import { Transform, TransformOptions, TransformCallback } from 'stream';
import { InvalidAttr } from './errors';
import { SitemapItemOptions, ErrorLevel } from './types';
import { ValidTagNames } from './sitemap-parser';
import { element, otag, ctag } from './sitemap-xml';

export interface IStringObj {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [index: string]: any;
}
function attrBuilder(conf: IStringObj, keys: string | string[]): object {
  if (typeof keys === 'string') {
    keys = [keys];
  }

  const iv: IStringObj = {};
  return keys.reduce((attrs, key): IStringObj => {
    // eslint-disable-next-line
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

  _transform(
    item: SitemapItemOptions,
    encoding: string,
    callback: TransformCallback
  ): void {
    this.push(otag(ValidTagNames.url));
    this.push(element(ValidTagNames.loc, item.url));

    if (item.lastmod) {
      this.push(element(ValidTagNames.lastmod, item.lastmod));
    }

    if (item.changefreq) {
      this.push(element(ValidTagNames.changefreq, item.changefreq));
    }

    if (item.priority !== undefined) {
      if (item.fullPrecisionPriority) {
        this.push(element(ValidTagNames.priority, item.priority.toString()));
      } else {
        this.push(element(ValidTagNames.priority, item.priority.toFixed(1)));
      }
    }

    item.video.forEach(video => {
      this.push(otag(ValidTagNames['video:video']));

      this.push(
        element(ValidTagNames['video:thumbnail_loc'], video.thumbnail_loc)
      );
      this.push(element(ValidTagNames['video:title'], video.title));
      this.push(element(ValidTagNames['video:description'], video.description));

      if (video.content_loc) {
        this.push(
          element(ValidTagNames['video:content_loc'], video.content_loc)
        );
      }

      if (video.player_loc) {
        this.push(
          element(
            ValidTagNames['video:player_loc'],
            attrBuilder(video, 'player_loc:autoplay'),
            video.player_loc
          )
        );
      }

      if (video.duration) {
        this.push(
          element(ValidTagNames['video:duration'], video.duration.toString())
        );
      }

      if (video.expiration_date) {
        this.push(
          element(ValidTagNames['video:expiration_date'], video.expiration_date)
        );
      }

      if (video.rating !== undefined) {
        this.push(
          element(ValidTagNames['video:rating'], video.rating.toString())
        );
      }

      if (video.view_count !== undefined) {
        this.push(
          element(
            ValidTagNames['video:view_count'],
            video.view_count.toString()
          )
        );
      }

      if (video.publication_date) {
        this.push(
          element(
            ValidTagNames['video:publication_date'],
            video.publication_date
          )
        );
      }

      for (const tag of video.tag) {
        this.push(element(ValidTagNames['video:tag'], tag));
      }

      if (video.category) {
        this.push(element(ValidTagNames['video:category'], video.category));
      }

      if (video.family_friendly) {
        this.push(
          element(ValidTagNames['video:family_friendly'], video.family_friendly)
        );
      }

      if (video.restriction) {
        this.push(
          element(
            ValidTagNames['video:restriction'],
            attrBuilder(video, 'restriction:relationship'),
            video.restriction
          )
        );
      }

      if (video.gallery_loc) {
        this.push(
          element(
            ValidTagNames['video:gallery_loc'],
            { title: video['gallery_loc:title'] },
            video.gallery_loc
          )
        );
      }

      if (video.price) {
        this.push(
          element(
            ValidTagNames['video:price'],
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
            ValidTagNames['video:requires_subscription'],
            video.requires_subscription
          )
        );
      }

      if (video.uploader) {
        this.push(element(ValidTagNames['video:uploader'], video.uploader));
      }

      if (video.platform) {
        this.push(
          element(
            ValidTagNames['video:platform'],
            attrBuilder(video, 'platform:relationship'),
            video.platform
          )
        );
      }

      if (video.live) {
        this.push(element(ValidTagNames['video:live'], video.live));
      }

      if (video.id) {
        this.push(
          element(ValidTagNames['video:id'], { type: 'url' }, video.id)
        );
      }

      this.push(ctag(ValidTagNames['video:video']));
    });

    item.links.forEach(link => {
      this.push(
        element(ValidTagNames['xhtml:link'], {
          rel: 'alternate',
          hreflang: link.lang,
          href: link.url,
        })
      );
    });

    if (item.expires) {
      this.push(
        element(ValidTagNames.expires, new Date(item.expires).toISOString())
      );
    }

    if (item.androidLink) {
      this.push(
        element(ValidTagNames['xhtml:link'], {
          rel: 'alternate',
          href: item.androidLink,
        })
      );
    }

    if (item.ampLink) {
      this.push(
        element(ValidTagNames['xhtml:link'], {
          rel: 'amphtml',
          href: item.ampLink,
        })
      );
    }

    if (item.news) {
      this.push(otag(ValidTagNames['news:news']));
      this.push(otag(ValidTagNames['news:publication']));
      this.push(
        element(ValidTagNames['news:name'], item.news.publication.name)
      );

      this.push(
        element(ValidTagNames['news:language'], item.news.publication.language)
      );
      this.push(ctag(ValidTagNames['news:publication']));

      if (item.news.access) {
        this.push(element(ValidTagNames['news:access'], item.news.access));
      }

      if (item.news.genres) {
        this.push(element(ValidTagNames['news:genres'], item.news.genres));
      }

      this.push(
        element(
          ValidTagNames['news:publication_date'],
          item.news.publication_date
        )
      );
      this.push(element(ValidTagNames['news:title'], item.news.title));

      if (item.news.keywords) {
        this.push(element(ValidTagNames['news:keywords'], item.news.keywords));
      }

      if (item.news.stock_tickers) {
        this.push(
          element(ValidTagNames['news:stock_tickers'], item.news.stock_tickers)
        );
      }
      this.push(ctag(ValidTagNames['news:news']));
    }

    // Image handling
    item.img.forEach((image): void => {
      this.push(otag(ValidTagNames['image:image']));
      this.push(element(ValidTagNames['image:loc'], image.url));

      if (image.caption) {
        this.push(element(ValidTagNames['image:caption'], image.caption));
      }

      if (image.geoLocation) {
        this.push(
          element(ValidTagNames['image:geo_location'], image.geoLocation)
        );
      }

      if (image.title) {
        this.push(element(ValidTagNames['image:title'], image.title));
      }

      if (image.license) {
        this.push(element(ValidTagNames['image:license'], image.license));
      }

      this.push(ctag(ValidTagNames['image:image']));
    });

    this.push(ctag(ValidTagNames.url));
    callback();
  }
}
