import sax from 'sax';
import type { SAXStream } from 'sax';
import {
  Readable,
  Transform,
  TransformOptions,
  TransformCallback,
} from 'node:stream';
import {
  SitemapItem,
  isValidChangeFreq,
  isValidYesNo,
  VideoItem,
  Img,
  LinkItem,
  NewsItem,
  ErrorLevel,
  isAllowDeny,
  isPriceType,
  isResolution,
  TagNames,
} from './types.js';

// Security limits for parsing untrusted XML
const LIMITS = {
  MAX_URL_LENGTH: 2048,
  MAX_VIDEO_TITLE_LENGTH: 100,
  MAX_VIDEO_DESCRIPTION_LENGTH: 2048,
  MAX_NEWS_TITLE_LENGTH: 200,
  MAX_NEWS_NAME_LENGTH: 256,
  MAX_IMAGE_CAPTION_LENGTH: 512,
  MAX_IMAGE_TITLE_LENGTH: 512,
  MAX_IMAGES_PER_URL: 1000,
  MAX_VIDEOS_PER_URL: 100,
  MAX_LINKS_PER_URL: 100,
  MAX_TAGS_PER_VIDEO: 32,
  MAX_URL_ENTRIES: 50000,
  // Date validation regex - basic ISO 8601 / W3C format check
  ISO_DATE_REGEX:
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2}|Z)?)?$/,
  // URL validation - must be http/https
  URL_PROTOCOL_REGEX: /^https?:\/\//i,
};

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

type Logger = (
  level: 'warn' | 'error' | 'info' | 'log',
  ...message: Parameters<Console['log']>[0]
) => void;
export interface XMLToSitemapItemStreamOptions extends TransformOptions {
  level?: ErrorLevel;
  logger?: Logger | false;
}
const defaultLogger: Logger = (level, ...message) => console[level](...message);
const defaultStreamOpts: XMLToSitemapItemStreamOptions = {
  logger: defaultLogger,
};

// TODO does this need to end with `options`
/**
 * Takes a stream of xml and transforms it into a stream of SitemapItems
 * Use this to parse existing sitemaps into config options compatible with this library
 */
export class XMLToSitemapItemStream extends Transform {
  level: ErrorLevel;
  logger: Logger;
  /**
   * All errors encountered during parsing.
   * Each validation failure is captured here for comprehensive error reporting.
   */
  errors: Error[];
  saxStream: SAXStream;
  urlCount: number;

  constructor(opts = defaultStreamOpts) {
    opts.objectMode = true;
    super(opts);
    this.errors = [];
    this.urlCount = 0;
    this.saxStream = sax.createStream(true, {
      xmlns: true,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      strictEntities: true,
      trim: true,
    });
    this.level = opts.level || ErrorLevel.WARN;
    if (this.level !== ErrorLevel.SILENT && opts.logger !== false) {
      this.logger = opts.logger ?? defaultLogger;
    } else {
      this.logger = () => undefined;
    }
    let currentItem: SitemapItem = tagTemplate();
    let currentTag: string;
    let currentVideo: VideoItem = videoTemplate();
    let currentImage: Img = { ...imageTemplate };
    let currentLink: LinkItem = { ...linkTemplate };
    let dontpushCurrentLink = false;
    this.saxStream.on('opentagstart', (tag): void => {
      currentTag = tag.name;
      if (currentTag.startsWith('news:') && !currentItem.news) {
        currentItem.news = newsTemplate();
      }
    });

    this.saxStream.on('opentag', (tag): void => {
      if (isValidTagName(tag.name)) {
        if (tag.name === 'xhtml:link') {
          // SAX returns attributes as objects with {name, value, prefix, local, uri}
          // Check if required attributes exist and have values
          const rel = getAttrValue(tag.attributes.rel);
          const href = getAttrValue(tag.attributes.href);
          const hreflang = getAttrValue(tag.attributes.hreflang);

          if (!rel || !href) {
            this.logger(
              'warn',
              'xhtml:link missing required rel or href attribute'
            );
            this.err('xhtml:link missing required rel or href attribute');
            return;
          }

          if (rel === 'alternate' && hreflang) {
            currentLink.url = href;
            currentLink.lang = hreflang;
          } else if (rel === 'alternate') {
            dontpushCurrentLink = true;
            currentItem.androidLink = href;
          } else if (rel === 'amphtml') {
            dontpushCurrentLink = true;
            currentItem.ampLink = href;
          } else {
            this.logger('log', 'unhandled attr for xhtml:link', tag.attributes);
            this.err(
              `unhandled attr for xhtml:link ${JSON.stringify(tag.attributes)}`
            );
          }
        }
      } else {
        this.logger('warn', 'unhandled tag', tag.name);
        this.err(`unhandled tag: ${tag.name}`);
      }
    });

    this.saxStream.on('text', (text): void => {
      switch (currentTag) {
        case 'mobile:mobile':
          break;
        case TagNames.loc:
          // Validate URL
          if (text.length > LIMITS.MAX_URL_LENGTH) {
            this.logger(
              'warn',
              `URL exceeds max length of ${LIMITS.MAX_URL_LENGTH}: ${text.substring(0, 100)}...`
            );
            this.err(`URL exceeds max length of ${LIMITS.MAX_URL_LENGTH}`);
          } else if (!LIMITS.URL_PROTOCOL_REGEX.test(text)) {
            this.logger(
              'warn',
              `URL must start with http:// or https://: ${text}`
            );
            this.err(`URL must start with http:// or https://: ${text}`);
          } else {
            currentItem.url = text;
          }
          break;
        case TagNames.changefreq:
          if (isValidChangeFreq(text)) {
            currentItem.changefreq = text;
          }
          break;
        case TagNames.priority:
          {
            const priority = parseFloat(text);
            if (
              isNaN(priority) ||
              !isFinite(priority) ||
              priority < 0 ||
              priority > 1
            ) {
              this.logger(
                'warn',
                `Invalid priority "${text}" - must be between 0 and 1`
              );
              this.err(`Invalid priority "${text}" - must be between 0 and 1`);
            } else {
              currentItem.priority = priority;
            }
          }
          break;
        case TagNames.lastmod:
          if (LIMITS.ISO_DATE_REGEX.test(text)) {
            currentItem.lastmod = text;
          } else {
            this.logger(
              'warn',
              `Invalid lastmod date format "${text}" - expected ISO 8601 format`
            );

            this.err(
              `Invalid lastmod date format "${text}" - expected ISO 8601 format`
            );
          }
          break;
        case TagNames['video:thumbnail_loc']:
          currentVideo.thumbnail_loc = text;
          break;
        case TagNames['video:tag']:
          if (currentVideo.tag.length < LIMITS.MAX_TAGS_PER_VIDEO) {
            currentVideo.tag.push(text);
          } else {
            this.logger(
              'warn',
              `video has too many tags (max ${LIMITS.MAX_TAGS_PER_VIDEO})`
            );

            this.err(
              `video has too many tags (max ${LIMITS.MAX_TAGS_PER_VIDEO})`
            );
          }
          break;
        case TagNames['video:duration']:
          {
            const duration = parseInt(text, 10);
            if (
              isNaN(duration) ||
              !isFinite(duration) ||
              duration < 0 ||
              duration > 28800
            ) {
              this.logger(
                'warn',
                `Invalid video duration "${text}" - must be between 0 and 28800 seconds`
              );

              this.err(
                `Invalid video duration "${text}" - must be between 0 and 28800 seconds`
              );
            } else {
              currentVideo.duration = duration;
            }
          }
          break;
        case TagNames['video:player_loc']:
          currentVideo.player_loc = text;
          break;
        case TagNames['video:content_loc']:
          currentVideo.content_loc = text;
          break;
        case TagNames['video:requires_subscription']:
          if (isValidYesNo(text)) {
            currentVideo.requires_subscription = text;
          }
          break;
        case TagNames['video:publication_date']:
          if (LIMITS.ISO_DATE_REGEX.test(text)) {
            currentVideo.publication_date = text;
          } else {
            this.logger(
              'warn',
              `Invalid video publication_date format "${text}" - expected ISO 8601 format`
            );

            this.err(
              `Invalid video publication_date format "${text}" - expected ISO 8601 format`
            );
          }
          break;
        case TagNames['video:id']:
          currentVideo.id = text;
          break;
        case TagNames['video:restriction']:
          currentVideo.restriction = text;
          break;
        case TagNames['video:view_count']:
          {
            const viewCount = parseInt(text, 10);
            if (isNaN(viewCount) || !isFinite(viewCount) || viewCount < 0) {
              this.logger(
                'warn',
                `Invalid video view_count "${text}" - must be a positive integer`
              );

              this.err(
                `Invalid video view_count "${text}" - must be a positive integer`
              );
            } else {
              currentVideo.view_count = viewCount;
            }
          }
          break;
        case TagNames['video:uploader']:
          currentVideo.uploader = text;
          break;
        case TagNames['video:family_friendly']:
          if (isValidYesNo(text)) {
            currentVideo.family_friendly = text;
          }
          break;
        case TagNames['video:expiration_date']:
          if (LIMITS.ISO_DATE_REGEX.test(text)) {
            currentVideo.expiration_date = text;
          } else {
            this.logger(
              'warn',
              `Invalid video expiration_date format "${text}" - expected ISO 8601 format`
            );

            this.err(
              `Invalid video expiration_date format "${text}" - expected ISO 8601 format`
            );
          }
          break;
        case TagNames['video:platform']:
          currentVideo.platform = text;
          break;
        case TagNames['video:price']:
          currentVideo.price = text;
          break;
        case TagNames['video:rating']:
          {
            const rating = parseFloat(text);
            if (
              isNaN(rating) ||
              !isFinite(rating) ||
              rating < 0 ||
              rating > 5
            ) {
              this.logger(
                'warn',
                `Invalid video rating "${text}" - must be between 0 and 5`
              );

              this.err(
                `Invalid video rating "${text}" - must be between 0 and 5`
              );
            } else {
              currentVideo.rating = rating;
            }
          }
          break;
        case TagNames['video:category']:
          currentVideo.category = text;
          break;
        case TagNames['video:live']:
          if (isValidYesNo(text)) {
            currentVideo.live = text;
          }
          break;
        case TagNames['video:gallery_loc']:
          currentVideo.gallery_loc = text;
          break;
        case TagNames['image:loc']:
          currentImage.url = text;
          break;
        case TagNames['image:geo_location']:
          currentImage.geoLocation = text;
          break;
        case TagNames['image:license']:
          currentImage.license = text;
          break;
        case TagNames['news:access']:
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          if (text === 'Registration' || text === 'Subscription') {
            currentItem.news.access = text;
          } else {
            this.logger(
              'warn',
              `Invalid news:access value "${text}" - must be "Registration" or "Subscription"`
            );

            this.err(
              `Invalid news:access value "${text}" - must be "Registration" or "Subscription"`
            );
          }
          break;
        case TagNames['news:genres']:
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.genres = text;
          break;
        case TagNames['news:publication_date']:
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          if (LIMITS.ISO_DATE_REGEX.test(text)) {
            currentItem.news.publication_date = text;
          } else {
            this.logger(
              'warn',
              `Invalid news publication_date format "${text}" - expected ISO 8601 format`
            );

            this.err(
              `Invalid news publication_date format "${text}" - expected ISO 8601 format`
            );
          }
          break;
        case TagNames['news:keywords']:
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.keywords = text;
          break;
        case TagNames['news:stock_tickers']:
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.stock_tickers = text;
          break;
        case TagNames['news:language']:
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.publication.language = text;
          break;
        case TagNames['video:title']:
          if (
            currentVideo.title.length + text.length <=
            LIMITS.MAX_VIDEO_TITLE_LENGTH
          ) {
            currentVideo.title += text;
          } else {
            this.logger(
              'warn',
              `video title exceeds max length of ${LIMITS.MAX_VIDEO_TITLE_LENGTH}`
            );

            this.err(
              `video title exceeds max length of ${LIMITS.MAX_VIDEO_TITLE_LENGTH}`
            );
          }
          break;
        case TagNames['video:description']:
          if (
            currentVideo.description.length + text.length <=
            LIMITS.MAX_VIDEO_DESCRIPTION_LENGTH
          ) {
            currentVideo.description += text;
          } else {
            this.logger(
              'warn',
              `video description exceeds max length of ${LIMITS.MAX_VIDEO_DESCRIPTION_LENGTH}`
            );

            this.err(
              `video description exceeds max length of ${LIMITS.MAX_VIDEO_DESCRIPTION_LENGTH}`
            );
          }
          break;
        case TagNames['news:name']:
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          if (
            currentItem.news.publication.name.length + text.length <=
            LIMITS.MAX_NEWS_NAME_LENGTH
          ) {
            currentItem.news.publication.name += text;
          } else {
            this.logger(
              'warn',
              `news name exceeds max length of ${LIMITS.MAX_NEWS_NAME_LENGTH}`
            );

            this.err(
              `news name exceeds max length of ${LIMITS.MAX_NEWS_NAME_LENGTH}`
            );
          }
          break;
        case TagNames['news:title']:
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          if (
            currentItem.news.title.length + text.length <=
            LIMITS.MAX_NEWS_TITLE_LENGTH
          ) {
            currentItem.news.title += text;
          } else {
            this.logger(
              'warn',
              `news title exceeds max length of ${LIMITS.MAX_NEWS_TITLE_LENGTH}`
            );

            this.err(
              `news title exceeds max length of ${LIMITS.MAX_NEWS_TITLE_LENGTH}`
            );
          }
          break;
        case TagNames['image:caption']:
          if (!currentImage.caption) {
            currentImage.caption =
              text.length <= LIMITS.MAX_IMAGE_CAPTION_LENGTH
                ? text
                : text.substring(0, LIMITS.MAX_IMAGE_CAPTION_LENGTH);
            if (text.length > LIMITS.MAX_IMAGE_CAPTION_LENGTH) {
              this.logger(
                'warn',
                `image caption exceeds max length of ${LIMITS.MAX_IMAGE_CAPTION_LENGTH}`
              );

              this.err(
                `image caption exceeds max length of ${LIMITS.MAX_IMAGE_CAPTION_LENGTH}`
              );
            }
          } else if (
            currentImage.caption.length + text.length <=
            LIMITS.MAX_IMAGE_CAPTION_LENGTH
          ) {
            currentImage.caption += text;
          } else {
            this.logger(
              'warn',
              `image caption exceeds max length of ${LIMITS.MAX_IMAGE_CAPTION_LENGTH}`
            );

            this.err(
              `image caption exceeds max length of ${LIMITS.MAX_IMAGE_CAPTION_LENGTH}`
            );
          }
          break;
        case TagNames['image:title']:
          if (!currentImage.title) {
            currentImage.title =
              text.length <= LIMITS.MAX_IMAGE_TITLE_LENGTH
                ? text
                : text.substring(0, LIMITS.MAX_IMAGE_TITLE_LENGTH);
            if (text.length > LIMITS.MAX_IMAGE_TITLE_LENGTH) {
              this.logger(
                'warn',
                `image title exceeds max length of ${LIMITS.MAX_IMAGE_TITLE_LENGTH}`
              );

              this.err(
                `image title exceeds max length of ${LIMITS.MAX_IMAGE_TITLE_LENGTH}`
              );
            }
          } else if (
            currentImage.title.length + text.length <=
            LIMITS.MAX_IMAGE_TITLE_LENGTH
          ) {
            currentImage.title += text;
          } else {
            this.logger(
              'warn',
              `image title exceeds max length of ${LIMITS.MAX_IMAGE_TITLE_LENGTH}`
            );

            this.err(
              `image title exceeds max length of ${LIMITS.MAX_IMAGE_TITLE_LENGTH}`
            );
          }
          break;

        default:
          this.logger(
            'log',
            'unhandled text for tag:',
            currentTag,
            `'${text}'`
          );

          this.err(`unhandled text for tag: ${currentTag} '${text}'`);
          break;
      }
    });

    this.saxStream.on('cdata', (text): void => {
      switch (currentTag) {
        case TagNames['video:title']:
          if (
            currentVideo.title.length + text.length <=
            LIMITS.MAX_VIDEO_TITLE_LENGTH
          ) {
            currentVideo.title += text;
          } else {
            this.logger(
              'warn',
              `video title exceeds max length of ${LIMITS.MAX_VIDEO_TITLE_LENGTH}`
            );

            this.err(
              `video title exceeds max length of ${LIMITS.MAX_VIDEO_TITLE_LENGTH}`
            );
          }
          break;
        case TagNames['video:description']:
          if (
            currentVideo.description.length + text.length <=
            LIMITS.MAX_VIDEO_DESCRIPTION_LENGTH
          ) {
            currentVideo.description += text;
          } else {
            this.logger(
              'warn',
              `video description exceeds max length of ${LIMITS.MAX_VIDEO_DESCRIPTION_LENGTH}`
            );

            this.err(
              `video description exceeds max length of ${LIMITS.MAX_VIDEO_DESCRIPTION_LENGTH}`
            );
          }
          break;
        case TagNames['news:name']:
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          if (
            currentItem.news.publication.name.length + text.length <=
            LIMITS.MAX_NEWS_NAME_LENGTH
          ) {
            currentItem.news.publication.name += text;
          } else {
            this.logger(
              'warn',
              `news name exceeds max length of ${LIMITS.MAX_NEWS_NAME_LENGTH}`
            );

            this.err(
              `news name exceeds max length of ${LIMITS.MAX_NEWS_NAME_LENGTH}`
            );
          }
          break;
        case TagNames['news:title']:
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          if (
            currentItem.news.title.length + text.length <=
            LIMITS.MAX_NEWS_TITLE_LENGTH
          ) {
            currentItem.news.title += text;
          } else {
            this.logger(
              'warn',
              `news title exceeds max length of ${LIMITS.MAX_NEWS_TITLE_LENGTH}`
            );

            this.err(
              `news title exceeds max length of ${LIMITS.MAX_NEWS_TITLE_LENGTH}`
            );
          }
          break;
        case TagNames['image:caption']:
          if (!currentImage.caption) {
            currentImage.caption =
              text.length <= LIMITS.MAX_IMAGE_CAPTION_LENGTH
                ? text
                : text.substring(0, LIMITS.MAX_IMAGE_CAPTION_LENGTH);
            if (text.length > LIMITS.MAX_IMAGE_CAPTION_LENGTH) {
              this.logger(
                'warn',
                `image caption exceeds max length of ${LIMITS.MAX_IMAGE_CAPTION_LENGTH}`
              );

              this.err(
                `image caption exceeds max length of ${LIMITS.MAX_IMAGE_CAPTION_LENGTH}`
              );
            }
          } else if (
            currentImage.caption.length + text.length <=
            LIMITS.MAX_IMAGE_CAPTION_LENGTH
          ) {
            currentImage.caption += text;
          } else {
            this.logger(
              'warn',
              `image caption exceeds max length of ${LIMITS.MAX_IMAGE_CAPTION_LENGTH}`
            );

            this.err(
              `image caption exceeds max length of ${LIMITS.MAX_IMAGE_CAPTION_LENGTH}`
            );
          }
          break;
        case TagNames['image:title']:
          if (!currentImage.title) {
            currentImage.title =
              text.length <= LIMITS.MAX_IMAGE_TITLE_LENGTH
                ? text
                : text.substring(0, LIMITS.MAX_IMAGE_TITLE_LENGTH);
            if (text.length > LIMITS.MAX_IMAGE_TITLE_LENGTH) {
              this.logger(
                'warn',
                `image title exceeds max length of ${LIMITS.MAX_IMAGE_TITLE_LENGTH}`
              );

              this.err(
                `image title exceeds max length of ${LIMITS.MAX_IMAGE_TITLE_LENGTH}`
              );
            }
          } else if (
            currentImage.title.length + text.length <=
            LIMITS.MAX_IMAGE_TITLE_LENGTH
          ) {
            currentImage.title += text;
          } else {
            this.logger(
              'warn',
              `image title exceeds max length of ${LIMITS.MAX_IMAGE_TITLE_LENGTH}`
            );

            this.err(
              `image title exceeds max length of ${LIMITS.MAX_IMAGE_TITLE_LENGTH}`
            );
          }
          break;

        default:
          this.logger('log', 'unhandled cdata for tag:', currentTag);
          this.err(`unhandled cdata for tag: ${currentTag}`);
          break;
      }
    });

    this.saxStream.on('attribute', (attr): void => {
      switch (currentTag) {
        case TagNames['urlset']:
        case TagNames['xhtml:link']:
        case TagNames['video:id']:
          break;
        case TagNames['video:restriction']:
          if (attr.name === 'relationship' && isAllowDeny(attr.value)) {
            currentVideo['restriction:relationship'] = attr.value;
          } else {
            this.logger('log', 'unhandled attr', currentTag, attr.name);
            this.err(`unhandled attr: ${currentTag} ${attr.name}`);
          }
          break;
        case TagNames['video:price']:
          if (attr.name === 'type' && isPriceType(attr.value)) {
            currentVideo['price:type'] = attr.value;
          } else if (attr.name === 'currency') {
            currentVideo['price:currency'] = attr.value;
          } else if (attr.name === 'resolution' && isResolution(attr.value)) {
            currentVideo['price:resolution'] = attr.value;
          } else {
            this.logger('log', 'unhandled attr for video:price', attr.name);
            this.err(`unhandled attr: ${currentTag} ${attr.name}`);
          }
          break;
        case TagNames['video:player_loc']:
          if (attr.name === 'autoplay') {
            currentVideo['player_loc:autoplay'] = attr.value;
          } else if (attr.name === 'allow_embed' && isValidYesNo(attr.value)) {
            currentVideo['player_loc:allow_embed'] = attr.value;
          } else {
            this.logger(
              'log',
              'unhandled attr for video:player_loc',
              attr.name
            );

            this.err(`unhandled attr: ${currentTag} ${attr.name}`);
          }
          break;
        case TagNames['video:platform']:
          if (attr.name === 'relationship' && isAllowDeny(attr.value)) {
            currentVideo['platform:relationship'] = attr.value;
          } else {
            this.logger(
              'log',
              'unhandled attr for video:platform',
              attr.name,
              attr.value
            );

            this.err(
              `unhandled attr: ${currentTag} ${attr.name} ${attr.value}`
            );
          }
          break;
        case TagNames['video:gallery_loc']:
          if (attr.name === 'title') {
            currentVideo['gallery_loc:title'] = attr.value;
          } else {
            this.logger(
              'log',
              'unhandled attr for video:galler_loc',
              attr.name
            );

            this.err(`unhandled attr: ${currentTag} ${attr.name}`);
          }
          break;
        case TagNames['video:uploader']:
          if (attr.name === 'info') {
            currentVideo['uploader:info'] = attr.value;
          } else {
            this.logger('log', 'unhandled attr for video:uploader', attr.name);

            this.err(`unhandled attr: ${currentTag} ${attr.name}`);
          }
          break;
        default:
          this.logger('log', 'unhandled attr', currentTag, attr.name);

          this.err(`unhandled attr: ${currentTag} ${attr.name}`);
      }
    });

    this.saxStream.on('closetag', (tag): void => {
      switch (tag) {
        case TagNames.url:
          this.urlCount++;
          if (this.urlCount > LIMITS.MAX_URL_ENTRIES) {
            this.logger(
              'error',
              `Sitemap exceeds maximum of ${LIMITS.MAX_URL_ENTRIES} URLs`
            );

            this.err(
              `Sitemap exceeds maximum of ${LIMITS.MAX_URL_ENTRIES} URLs`
            );
            // Still push the item but log the error
          }
          this.push(currentItem);
          currentItem = tagTemplate();
          break;
        case TagNames['video:video']:
          if (currentItem.video.length < LIMITS.MAX_VIDEOS_PER_URL) {
            currentItem.video.push(currentVideo);
          } else {
            this.logger(
              'warn',
              `URL has too many videos (max ${LIMITS.MAX_VIDEOS_PER_URL})`
            );

            this.err(
              `URL has too many videos (max ${LIMITS.MAX_VIDEOS_PER_URL})`
            );
          }
          currentVideo = videoTemplate();
          break;
        case TagNames['image:image']:
          if (currentItem.img.length < LIMITS.MAX_IMAGES_PER_URL) {
            currentItem.img.push(currentImage);
          } else {
            this.logger(
              'warn',
              `URL has too many images (max ${LIMITS.MAX_IMAGES_PER_URL})`
            );

            this.err(
              `URL has too many images (max ${LIMITS.MAX_IMAGES_PER_URL})`
            );
          }
          currentImage = { ...imageTemplate };
          break;
        case TagNames['xhtml:link']:
          if (!dontpushCurrentLink) {
            if (currentItem.links.length < LIMITS.MAX_LINKS_PER_URL) {
              currentItem.links.push(currentLink);
            } else {
              this.logger(
                'warn',
                `URL has too many links (max ${LIMITS.MAX_LINKS_PER_URL})`
              );

              this.err(
                `URL has too many links (max ${LIMITS.MAX_LINKS_PER_URL})`
              );
            }
          }
          currentLink = { ...linkTemplate };
          dontpushCurrentLink = false; // Reset flag for next link
          break;

        default:
          break;
      }
    });
  }

  _transform(
    data: string,
    encoding: string,
    callback: TransformCallback
  ): void {
    try {
      const cb = () =>
        callback(
          this.level === ErrorLevel.THROW && this.errors.length > 0
            ? this.errors[0]
            : null
        );
      // correcting the type here can be done without making it a breaking change
      // TODO fix this
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (!this.saxStream.write(data, encoding)) {
        this.saxStream.once('drain', cb);
      } else {
        process.nextTick(cb);
      }
    } catch (error) {
      callback(error as Error);
    }
  }

  private err(msg: string) {
    const error = new Error(msg);
    this.errors.push(error);
  }
}

/**
  Read xml and resolve with the configuration that would produce it or reject with
  an error
  ```
  const { createReadStream } = require('fs')
  const { parseSitemap, createSitemap } = require('sitemap')
  parseSitemap(createReadStream('./example.xml')).then(
    // produces the same xml
    // you can, of course, more practically modify it or store it
    (xmlConfig) => console.log(createSitemap(xmlConfig).toString()),
    (err) => console.log(err)
  )
  ```
  @param {Readable} xml what to parse
  @return {Promise<SitemapItem[]>} resolves with list of sitemap items that can be fed into a SitemapStream. Rejects with an Error object.
 */
export async function parseSitemap(xml: Readable): Promise<SitemapItem[]> {
  const urls: SitemapItem[] = [];
  return new Promise((resolve, reject): void => {
    xml
      .pipe(new XMLToSitemapItemStream())
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
