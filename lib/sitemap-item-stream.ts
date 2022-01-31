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

/**
 * Serializes a SitemapItem into an XML String
 * @param item Item to serialize
 * @returns string
 */
export function SitemapItemToXMLString(item: SitemapItem): string {
  const tagParts: string[] = [];

  tagParts.push(otag(TagNames.url));
  tagParts.push(element(TagNames.loc, item.url));

  if (item.lastmod) {
    tagParts.push(element(TagNames.lastmod, item.lastmod));
  }

  if (item.changefreq) {
    tagParts.push(element(TagNames.changefreq, item.changefreq));
  }

  if (item.priority !== undefined && item.priority !== null) {
    if (item.fullPrecisionPriority) {
      tagParts.push(element(TagNames.priority, item.priority.toString()));
    } else {
      tagParts.push(element(TagNames.priority, item.priority.toFixed(1)));
    }
  }

  item.video.forEach((video) => {
    tagParts.push(otag(TagNames['video:video']));

    tagParts.push(
      element(TagNames['video:thumbnail_loc'], video.thumbnail_loc)
    );
    tagParts.push(element(TagNames['video:title'], video.title));
    tagParts.push(element(TagNames['video:description'], video.description));

    if (video.content_loc) {
      tagParts.push(element(TagNames['video:content_loc'], video.content_loc));
    }

    if (video.player_loc) {
      tagParts.push(
        element(
          TagNames['video:player_loc'],
          attrBuilder(video, ['player_loc:autoplay', 'player_loc:allow_embed']),
          video.player_loc
        )
      );
    }

    if (video.duration) {
      tagParts.push(
        element(TagNames['video:duration'], video.duration.toString())
      );
    }

    if (video.expiration_date) {
      tagParts.push(
        element(TagNames['video:expiration_date'], video.expiration_date)
      );
    }

    if (video.rating !== undefined) {
      tagParts.push(element(TagNames['video:rating'], video.rating.toString()));
    }

    if (video.view_count !== undefined) {
      tagParts.push(
        element(TagNames['video:view_count'], video.view_count.toString())
      );
    }

    if (video.publication_date) {
      tagParts.push(
        element(TagNames['video:publication_date'], video.publication_date)
      );
    }

    for (const tag of video.tag) {
      tagParts.push(element(TagNames['video:tag'], tag));
    }

    if (video.category) {
      tagParts.push(element(TagNames['video:category'], video.category));
    }

    if (video.family_friendly) {
      tagParts.push(
        element(TagNames['video:family_friendly'], video.family_friendly)
      );
    }

    if (video.restriction) {
      tagParts.push(
        element(
          TagNames['video:restriction'],
          attrBuilder(video, 'restriction:relationship'),
          video.restriction
        )
      );
    }

    if (video.gallery_loc) {
      tagParts.push(
        element(
          TagNames['video:gallery_loc'],
          { title: video['gallery_loc:title'] },
          video.gallery_loc
        )
      );
    }

    if (video.price) {
      tagParts.push(
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
      tagParts.push(
        element(
          TagNames['video:requires_subscription'],
          video.requires_subscription
        )
      );
    }

    if (video.uploader) {
      tagParts.push(
        element(
          TagNames['video:uploader'],
          attrBuilder(video, 'uploader:info'),
          video.uploader
        )
      );
    }

    if (video.platform) {
      tagParts.push(
        element(
          TagNames['video:platform'],
          attrBuilder(video, 'platform:relationship'),
          video.platform
        )
      );
    }

    if (video.live) {
      tagParts.push(element(TagNames['video:live'], video.live));
    }

    if (video.id) {
      tagParts.push(element(TagNames['video:id'], { type: 'url' }, video.id));
    }

    tagParts.push(ctag(TagNames['video:video']));
  });

  item.links.forEach((link) => {
    tagParts.push(
      element(TagNames['xhtml:link'], {
        rel: 'alternate',
        hreflang: link.lang || link.hreflang,
        href: link.url,
      })
    );
  });

  if (item.expires) {
    tagParts.push(
      element(TagNames.expires, new Date(item.expires).toISOString())
    );
  }

  if (item.androidLink) {
    tagParts.push(
      element(TagNames['xhtml:link'], {
        rel: 'alternate',
        href: item.androidLink,
      })
    );
  }

  if (item.ampLink) {
    tagParts.push(
      element(TagNames['xhtml:link'], {
        rel: 'amphtml',
        href: item.ampLink,
      })
    );
  }

  if (item.news) {
    tagParts.push(otag(TagNames['news:news']));
    tagParts.push(otag(TagNames['news:publication']));
    tagParts.push(element(TagNames['news:name'], item.news.publication.name));

    tagParts.push(
      element(TagNames['news:language'], item.news.publication.language)
    );
    tagParts.push(ctag(TagNames['news:publication']));

    if (item.news.access) {
      tagParts.push(element(TagNames['news:access'], item.news.access));
    }

    if (item.news.genres) {
      tagParts.push(element(TagNames['news:genres'], item.news.genres));
    }

    tagParts.push(
      element(TagNames['news:publication_date'], item.news.publication_date)
    );
    tagParts.push(element(TagNames['news:title'], item.news.title));

    if (item.news.keywords) {
      tagParts.push(element(TagNames['news:keywords'], item.news.keywords));
    }

    if (item.news.stock_tickers) {
      tagParts.push(
        element(TagNames['news:stock_tickers'], item.news.stock_tickers)
      );
    }
    tagParts.push(ctag(TagNames['news:news']));
  }

  // Image handling
  item.img.forEach((image): void => {
    tagParts.push(otag(TagNames['image:image']));
    tagParts.push(element(TagNames['image:loc'], image.url));

    if (image.caption) {
      tagParts.push(element(TagNames['image:caption'], image.caption));
    }

    if (image.geoLocation) {
      tagParts.push(element(TagNames['image:geo_location'], image.geoLocation));
    }

    if (image.title) {
      tagParts.push(element(TagNames['image:title'], image.title));
    }

    if (image.license) {
      tagParts.push(element(TagNames['image:license'], image.license));
    }

    tagParts.push(ctag(TagNames['image:image']));
  });

  tagParts.push(ctag(TagNames.url));

  return tagParts.join('');
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
    this.push(SitemapItemToXMLString(item));
    callback();
  }
}
