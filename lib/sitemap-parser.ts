import type { QualifiedAttribute, QualifiedTag } from 'sax';
import {
  Readable,
  Transform,
  type TransformOptions,
  type TransformCallback,
} from 'node:stream';
import { TagNames } from './types.js';
import type {
  SitemapItem,
  VideoItem,
  Img,
  LinkItem,
  NewsItem,
  XMLToSitemapItemStreamOptions,
} from './types.js';
import {
  isValidChangeFreq,
  isValidYesNo,
  isAllowDeny,
  isPriceType,
  isResolution,
  isValidPriority,
  isValidVideoDuration,
  isValidVideoRating,
  isValidVideoViewCount,
  isValidISODate,
  getURLError,
} from './validation.js';
import { LIMITS } from './constants.js';
import { SaxParserStream } from './sax-parser-stream.js';

function isValidTagName(tagName: string): tagName is TagNames {
  // This only works because the enum name and value are the same
  return tagName in TagNames;
}

function getAttrValue(
  attr: string | { value: string } | undefined
): string | undefined {
  if (!attr) return undefined;
  return typeof attr === 'string' ? attr : attr.value;
}

function tagTemplate(): SitemapItem {
  return {
    img: [],
    video: [],
    links: [],
    url: '',
  };
}

function videoTemplate(): VideoItem {
  return {
    tag: [],
    thumbnail_loc: '',
    title: '',
    description: '',
  };
}

const imageTemplate: Img = {
  url: '',
};

const linkTemplate: LinkItem = {
  lang: '',
  url: '',
};

function newsTemplate(): NewsItem {
  return {
    publication: { name: '', language: '' },
    publication_date: '',
    title: '',
  };
}

export type { XMLToSitemapItemStreamOptions };
const defaultStreamOpts: XMLToSitemapItemStreamOptions = {};

// TODO does this need to end with `options`
/**
 * Takes a stream of xml and transforms it into a stream of SitemapItems
 * Use this to parse existing sitemaps into config options compatible with this library
 *
 * Emits `'maxEntriesExceeded'` (with the cap) once, when the first `<url>` past
 * `maxEntries` is seen. If nothing listens for that event, the stream logs the
 * overflow through its logger instead.
 */
export class XMLToSitemapItemStream extends SaxParserStream<SitemapItem> {
  private currentItem: SitemapItem = tagTemplate();
  private currentVideo: VideoItem = videoTemplate();
  private currentImage: Img = { ...imageTemplate };
  private currentLink: LinkItem = { ...linkTemplate };
  private dontpushCurrentLink = false;

  constructor(opts = defaultStreamOpts) {
    super(opts, {
      isKnownTag: isValidTagName,
      overflowMessage: (max) => `Sitemap exceeds maximum of ${max} URLs`,
    });
  }

  /**
   * Number of `<url>` entries seen, including any past `maxEntries`
   * @deprecated Use entryCount
   */
  get urlCount(): number {
    return this.entryCount;
  }

  protected onOpenTag(tag: QualifiedTag): void {
    if (tag.name.startsWith('news:') && !this.currentItem.news) {
      this.currentItem.news = newsTemplate();
    }
    if (tag.name === 'xhtml:link') {
      // SAX returns attributes as objects with {name, value, prefix, local, uri}
      // Check if required attributes exist and have values
      const rel = getAttrValue(tag.attributes.rel);
      const href = getAttrValue(tag.attributes.href);
      const hreflang = getAttrValue(tag.attributes.hreflang);

      if (!rel || !href) {
        this.report(
          'warn',
          'xhtml:link missing required rel or href attribute'
        );
        return;
      }

      if (rel === 'alternate' && hreflang) {
        this.currentLink.url = href;
        this.currentLink.lang = hreflang;
      } else if (rel === 'alternate') {
        this.dontpushCurrentLink = true;
        this.currentItem.androidLink = href;
      } else if (rel === 'amphtml') {
        this.dontpushCurrentLink = true;
        this.currentItem.ampLink = href;
      } else {
        this.logger('log', 'unhandled attr for xhtml:link', tag.attributes);
        this.err(
          `unhandled attr for xhtml:link ${JSON.stringify(tag.attributes)}`
        );
      }
    }
  }

  protected onCharData(tag: string, text: string): void {
    switch (tag) {
      case 'mobile:mobile':
        break;
      case TagNames.loc:
        {
          const errMsg = getURLError(text, 'Sitemap URL');
          if (errMsg) {
            this.logger('warn', 'Invalid URL in sitemap:', errMsg);
            this.err(`Invalid URL in sitemap: ${errMsg}`);
          } else {
            this.currentItem.url = text;
          }
        }
        break;
      case TagNames.changefreq:
        if (isValidChangeFreq(text)) {
          this.currentItem.changefreq = text;
        }
        break;
      case TagNames.priority:
        {
          const priority = parseFloat(text);
          if (!isValidPriority(priority)) {
            this.report(
              'warn',
              `Invalid priority "${text}" - must be between ${LIMITS.MIN_PRIORITY} and ${LIMITS.MAX_PRIORITY}`
            );
          } else {
            this.currentItem.priority = priority;
          }
        }
        break;
      case TagNames.lastmod:
        if (isValidISODate(text)) {
          this.currentItem.lastmod = text;
        } else {
          this.report(
            'warn',
            `Invalid lastmod date format "${text}" - expected ISO 8601 format`
          );
        }
        break;
      case TagNames['video:thumbnail_loc']:
        this.currentVideo.thumbnail_loc = text;
        break;
      case TagNames['video:tag']:
        if (this.currentVideo.tag.length < LIMITS.MAX_TAGS_PER_VIDEO) {
          this.currentVideo.tag.push(text);
        } else {
          this.report(
            'warn',
            `video has too many tags (max ${LIMITS.MAX_TAGS_PER_VIDEO})`
          );
        }
        break;
      case TagNames['video:duration']:
        {
          const duration = parseInt(text, 10);
          if (!isValidVideoDuration(duration)) {
            this.report(
              'warn',
              `Invalid video duration "${text}" - must be between ${LIMITS.MIN_VIDEO_DURATION} and ${LIMITS.MAX_VIDEO_DURATION} seconds`
            );
          } else {
            this.currentVideo.duration = duration;
          }
        }
        break;
      case TagNames['video:player_loc']:
        this.currentVideo.player_loc = text;
        break;
      case TagNames['video:content_loc']:
        this.currentVideo.content_loc = text;
        break;
      case TagNames['video:requires_subscription']:
        if (isValidYesNo(text)) {
          this.currentVideo.requires_subscription = text;
        }
        break;
      case TagNames['video:publication_date']:
        if (isValidISODate(text)) {
          this.currentVideo.publication_date = text;
        } else {
          this.report(
            'warn',
            `Invalid video publication_date format "${text}" - expected ISO 8601 format`
          );
        }
        break;
      case TagNames['video:id']:
        this.currentVideo.id = text;
        break;
      case TagNames['video:restriction']:
        this.currentVideo.restriction = text;
        break;
      case TagNames['video:view_count']:
        {
          const viewCount = parseInt(text, 10);
          if (!isValidVideoViewCount(viewCount)) {
            this.report(
              'warn',
              `Invalid video view_count "${text}" - must be a positive integer`
            );
          } else {
            this.currentVideo.view_count = viewCount;
          }
        }
        break;
      case TagNames['video:uploader']:
        this.currentVideo.uploader = text;
        break;
      case TagNames['video:family_friendly']:
        if (isValidYesNo(text)) {
          this.currentVideo.family_friendly = text;
        }
        break;
      case TagNames['video:expiration_date']:
        if (isValidISODate(text)) {
          this.currentVideo.expiration_date = text;
        } else {
          this.report(
            'warn',
            `Invalid video expiration_date format "${text}" - expected ISO 8601 format`
          );
        }
        break;
      case TagNames['video:platform']:
        this.currentVideo.platform = text;
        break;
      case TagNames['video:price']:
        this.currentVideo.price = text;
        break;
      case TagNames['video:rating']:
        {
          const rating = parseFloat(text);
          if (!isValidVideoRating(rating)) {
            this.report(
              'warn',
              `Invalid video rating "${text}" - must be between ${LIMITS.MIN_VIDEO_RATING} and ${LIMITS.MAX_VIDEO_RATING}`
            );
          } else {
            this.currentVideo.rating = rating;
          }
        }
        break;
      case TagNames['video:category']:
        this.currentVideo.category = text;
        break;
      case TagNames['video:live']:
        if (isValidYesNo(text)) {
          this.currentVideo.live = text;
        }
        break;
      case TagNames['video:gallery_loc']:
        this.currentVideo.gallery_loc = text;
        break;
      case TagNames['image:loc']:
        this.currentImage.url = text;
        break;
      case TagNames['image:geo_location']:
        this.currentImage.geoLocation = text;
        break;
      case TagNames['image:license']:
        this.currentImage.license = text;
        break;
      case TagNames['news:access']:
        if (!this.currentItem.news) {
          this.currentItem.news = newsTemplate();
        }
        if (text === 'Registration' || text === 'Subscription') {
          this.currentItem.news.access = text;
        } else {
          this.report(
            'warn',
            `Invalid news:access value "${text}" - must be "Registration" or "Subscription"`
          );
        }
        break;
      case TagNames['news:genres']:
        if (!this.currentItem.news) {
          this.currentItem.news = newsTemplate();
        }
        this.currentItem.news.genres = text;
        break;
      case TagNames['news:publication_date']:
        if (!this.currentItem.news) {
          this.currentItem.news = newsTemplate();
        }
        if (isValidISODate(text)) {
          this.currentItem.news.publication_date = text;
        } else {
          this.report(
            'warn',
            `Invalid news publication_date format "${text}" - expected ISO 8601 format`
          );
        }
        break;
      case TagNames['news:keywords']:
        if (!this.currentItem.news) {
          this.currentItem.news = newsTemplate();
        }
        this.currentItem.news.keywords = text;
        break;
      case TagNames['news:stock_tickers']:
        if (!this.currentItem.news) {
          this.currentItem.news = newsTemplate();
        }
        this.currentItem.news.stock_tickers = text;
        break;
      case TagNames['news:language']:
        if (!this.currentItem.news) {
          this.currentItem.news = newsTemplate();
        }
        this.currentItem.news.publication.language = text;
        break;
      case TagNames['video:title']:
        if (
          this.currentVideo.title.length + text.length <=
          LIMITS.MAX_VIDEO_TITLE_LENGTH
        ) {
          this.currentVideo.title += text;
        } else {
          this.report(
            'warn',
            `video title exceeds max length of ${LIMITS.MAX_VIDEO_TITLE_LENGTH}`
          );
        }
        break;
      case TagNames['video:description']:
        if (
          this.currentVideo.description.length + text.length <=
          LIMITS.MAX_VIDEO_DESCRIPTION_LENGTH
        ) {
          this.currentVideo.description += text;
        } else {
          this.report(
            'warn',
            `video description exceeds max length of ${LIMITS.MAX_VIDEO_DESCRIPTION_LENGTH}`
          );
        }
        break;
      case TagNames['news:name']:
        if (!this.currentItem.news) {
          this.currentItem.news = newsTemplate();
        }
        if (
          this.currentItem.news.publication.name.length + text.length <=
          LIMITS.MAX_NEWS_NAME_LENGTH
        ) {
          this.currentItem.news.publication.name += text;
        } else {
          this.report(
            'warn',
            `news name exceeds max length of ${LIMITS.MAX_NEWS_NAME_LENGTH}`
          );
        }
        break;
      case TagNames['news:title']:
        if (!this.currentItem.news) {
          this.currentItem.news = newsTemplate();
        }
        if (
          this.currentItem.news.title.length + text.length <=
          LIMITS.MAX_NEWS_TITLE_LENGTH
        ) {
          this.currentItem.news.title += text;
        } else {
          this.report(
            'warn',
            `news title exceeds max length of ${LIMITS.MAX_NEWS_TITLE_LENGTH}`
          );
        }
        break;
      case TagNames['image:caption']:
        if (!this.currentImage.caption) {
          this.currentImage.caption =
            text.length <= LIMITS.MAX_IMAGE_CAPTION_LENGTH
              ? text
              : text.substring(0, LIMITS.MAX_IMAGE_CAPTION_LENGTH);
          if (text.length > LIMITS.MAX_IMAGE_CAPTION_LENGTH) {
            this.report(
              'warn',
              `image caption exceeds max length of ${LIMITS.MAX_IMAGE_CAPTION_LENGTH}`
            );
          }
        } else if (
          this.currentImage.caption.length + text.length <=
          LIMITS.MAX_IMAGE_CAPTION_LENGTH
        ) {
          this.currentImage.caption += text;
        } else {
          this.report(
            'warn',
            `image caption exceeds max length of ${LIMITS.MAX_IMAGE_CAPTION_LENGTH}`
          );
        }
        break;
      case TagNames['image:title']:
        if (!this.currentImage.title) {
          this.currentImage.title =
            text.length <= LIMITS.MAX_IMAGE_TITLE_LENGTH
              ? text
              : text.substring(0, LIMITS.MAX_IMAGE_TITLE_LENGTH);
          if (text.length > LIMITS.MAX_IMAGE_TITLE_LENGTH) {
            this.report(
              'warn',
              `image title exceeds max length of ${LIMITS.MAX_IMAGE_TITLE_LENGTH}`
            );
          }
        } else if (
          this.currentImage.title.length + text.length <=
          LIMITS.MAX_IMAGE_TITLE_LENGTH
        ) {
          this.currentImage.title += text;
        } else {
          this.report(
            'warn',
            `image title exceeds max length of ${LIMITS.MAX_IMAGE_TITLE_LENGTH}`
          );
        }
        break;

      default:
        this.logger('log', 'unhandled text for tag:', tag, `'${text}'`);

        this.err(`unhandled text for tag: ${tag} '${text}'`);
        break;
    }
  }

  protected onAttribute(currentTag: string, attr: QualifiedAttribute): void {
    switch (currentTag) {
      case TagNames['urlset']:
      case TagNames['xhtml:link']:
      case TagNames['video:id']:
        break;
      case TagNames['video:restriction']:
        if (attr.name === 'relationship' && isAllowDeny(attr.value)) {
          this.currentVideo['restriction:relationship'] = attr.value;
        } else {
          this.logger('log', 'unhandled attr', currentTag, attr.name);
          this.err(`unhandled attr: ${currentTag} ${attr.name}`);
        }
        break;
      case TagNames['video:price']:
        if (attr.name === 'type' && isPriceType(attr.value)) {
          this.currentVideo['price:type'] = attr.value;
        } else if (attr.name === 'currency') {
          this.currentVideo['price:currency'] = attr.value;
        } else if (attr.name === 'resolution' && isResolution(attr.value)) {
          this.currentVideo['price:resolution'] = attr.value;
        } else {
          this.logger('log', 'unhandled attr for video:price', attr.name);
          this.err(`unhandled attr: ${currentTag} ${attr.name}`);
        }
        break;
      case TagNames['video:player_loc']:
        if (attr.name === 'autoplay') {
          this.currentVideo['player_loc:autoplay'] = attr.value;
        } else if (attr.name === 'allow_embed' && isValidYesNo(attr.value)) {
          this.currentVideo['player_loc:allow_embed'] = attr.value;
        } else {
          this.logger('log', 'unhandled attr for video:player_loc', attr.name);

          this.err(`unhandled attr: ${currentTag} ${attr.name}`);
        }
        break;
      case TagNames['video:platform']:
        if (attr.name === 'relationship' && isAllowDeny(attr.value)) {
          this.currentVideo['platform:relationship'] = attr.value;
        } else {
          this.logger(
            'log',
            'unhandled attr for video:platform',
            attr.name,
            attr.value
          );

          this.err(`unhandled attr: ${currentTag} ${attr.name} ${attr.value}`);
        }
        break;
      case TagNames['video:gallery_loc']:
        if (attr.name === 'title') {
          this.currentVideo['gallery_loc:title'] = attr.value;
        } else {
          this.logger('log', 'unhandled attr for video:galler_loc', attr.name);

          this.err(`unhandled attr: ${currentTag} ${attr.name}`);
        }
        break;
      case TagNames['video:uploader']:
        if (attr.name === 'info') {
          this.currentVideo['uploader:info'] = attr.value;
        } else {
          this.logger('log', 'unhandled attr for video:uploader', attr.name);

          this.err(`unhandled attr: ${currentTag} ${attr.name}`);
        }
        break;
      default:
        this.logger('log', 'unhandled attr', currentTag, attr.name);

        this.err(`unhandled attr: ${currentTag} ${attr.name}`);
    }
  }

  protected onCloseTag(tag: string): void {
    switch (tag) {
      case TagNames.url:
        this.emitEntry(this.currentItem);
        this.currentItem = tagTemplate();
        break;
      case TagNames['video:video']:
        if (this.currentItem.video.length < LIMITS.MAX_VIDEOS_PER_URL) {
          this.currentItem.video.push(this.currentVideo);
        } else {
          this.report(
            'warn',
            `URL has too many videos (max ${LIMITS.MAX_VIDEOS_PER_URL})`
          );
        }
        this.currentVideo = videoTemplate();
        break;
      case TagNames['image:image']:
        if (this.currentItem.img.length < LIMITS.MAX_IMAGES_PER_URL) {
          this.currentItem.img.push(this.currentImage);
        } else {
          this.report(
            'warn',
            `URL has too many images (max ${LIMITS.MAX_IMAGES_PER_URL})`
          );
        }
        this.currentImage = { ...imageTemplate };
        break;
      case TagNames['xhtml:link']:
        if (!this.dontpushCurrentLink) {
          if (this.currentItem.links.length < LIMITS.MAX_LINKS_PER_URL) {
            this.currentItem.links.push(this.currentLink);
          } else {
            this.report(
              'warn',
              `URL has too many links (max ${LIMITS.MAX_LINKS_PER_URL})`
            );
          }
        }
        this.currentLink = { ...linkTemplate };
        this.dontpushCurrentLink = false; // Reset flag for next link
        break;

      default:
        break;
    }
  }
}

/**
  Read xml and resolve with the configuration that would produce it or reject with
  an error
  ```
  import { createReadStream } from 'fs'
  import { Readable } from 'stream'
  import { parseSitemap, SitemapStream, streamToPromise } from 'sitemap'
  const items = await parseSitemap(createReadStream('./example.xml'))
  // produces the same xml
  // you can, of course, more practically modify it or store it
  const sms = new SitemapStream()
  Readable.from(items).pipe(sms)
  console.log((await streamToPromise(sms)).toString())
  ```
  @param {Readable} xml what to parse
  @return {Promise<SitemapItem[]>} resolves with list of sitemap items that can be fed into a SitemapStream. Rejects with an Error object.
 */
export async function parseSitemap(xml: Readable): Promise<SitemapItem[]> {
  const urls: SitemapItem[] = [];
  return new Promise((resolve, reject): void => {
    const parser = new XMLToSitemapItemStream();
    // Entries past the cap are dropped, so stop reading the source once it is
    // crossed instead of parsing the rest of it (BB-05). Ending the parser
    // still delivers the entries it already emitted.
    parser.once('maxEntriesExceeded', (max: number): void => {
      parser.logger(
        'error',
        `Sitemap exceeds maximum of ${max} URLs; ignoring the rest`
      );
      xml.unpipe(parser);
      xml.destroy();
      parser.end();
    });

    xml
      .pipe(parser)
      .on('data', (smi: SitemapItem) => urls.push(smi))
      .on('end', (): void => {
        resolve(urls);
      })
      .on('error', (error: Error): void => {
        reject(error);
      });
  });
}

export interface ObjectStreamToJSONOptions extends TransformOptions {
  lineSeparated: boolean;
}

const defaultObjectStreamOpts: ObjectStreamToJSONOptions = {
  lineSeparated: false,
};
/**
 * A Transform that converts a stream of objects into a JSON Array or a line
 * separated stringified JSON
 * @param [lineSeparated=false] whether to separate entries by a new line or comma
 */
export class ObjectStreamToJSON extends Transform {
  lineSeparated: boolean;
  firstWritten: boolean;

  constructor(opts = defaultObjectStreamOpts) {
    opts.writableObjectMode = true;
    super(opts);
    this.lineSeparated = opts.lineSeparated;
    this.firstWritten = false;
  }

  _transform(
    chunk: SitemapItem,
    encoding: string,
    cb: TransformCallback
  ): void {
    if (!this.firstWritten) {
      this.firstWritten = true;
      if (!this.lineSeparated) {
        this.push('[');
      }
    } else if (this.lineSeparated) {
      this.push('\n');
    } else {
      this.push(',');
    }
    if (chunk) {
      this.push(JSON.stringify(chunk));
    }
    cb();
  }

  _flush(cb: TransformCallback): void {
    if (!this.lineSeparated) {
      this.push(']');
    }
    cb();
  }
}
