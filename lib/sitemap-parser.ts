/* eslint-disable @typescript-eslint/camelcase */
import sax, { SAXStream } from 'sax';
import {
  Readable,
  Transform,
  TransformOptions,
  TransformCallback,
} from 'stream';
import {
  SitemapItemOptions,
  isValidChangeFreq,
  isValidYesNo,
  IVideoItem,
  ISitemapImg,
  ILinkItem,
  EnumAllowDeny,
  INewsItem,
  ErrorLevel,
  ISitemapOptions,
} from './types';

export enum ValidTagNames {
  url = 'url',
  loc = 'loc',
  urlset = 'urlset',
  lastmod = 'lastmod',
  changefreq = 'changefreq',
  priority = 'priority',
  'video:thumbnail_loc' = 'video:thumbnail_loc',
  'video:video' = 'video:video',
  'video:title' = 'video:title',
  'video:description' = 'video:description',
  'video:tag' = 'video:tag',
  'video:duration' = 'video:duration',
  'video:player_loc' = 'video:player_loc',
  'image:image' = 'image:image',
  'image:loc' = 'image:loc',
  'image:geo_location' = 'image:geo_location',
  'image:license' = 'image:license',
  'image:title' = 'image:title',
  'image:caption' = 'image:caption',
  'video:requires_subscription' = 'video:requires_subscription',
  'video:publication_date' = 'video:publication_date',
  'video:id' = 'video:id',
  'video:restriction' = 'video:restriction',
  'video:family_friendly' = 'video:family_friendly',
  'video:view_count' = 'video:view_count',
  'video:uploader' = 'video:uploader',
  'video:expiration_date' = 'video:expiration_date',
  'video:platform' = 'video:platform',
  'video:price' = 'video:price',
  'video:rating' = 'video:rating',
  'video:category' = 'video:category',
  'video:live' = 'video:live',
  'video:gallery_loc' = 'video:gallery_loc',
  'news:news' = 'news:news',
  'news:publication' = 'news:publication',
  'news:name' = 'news:name',
  'news:access' = 'news:access',
  'news:genres' = 'news:genres',
  'news:publication_date' = 'news:publication_date',
  'news:title' = 'news:title',
  'news:keywords' = 'news:keywords',
  'news:stock_tickers' = 'news:stock_tickers',
  'news:language' = 'news:language',
  'mobile:mobile' = 'mobile:mobile',
  'xhtml:link' = 'xhtml:link',
}

function isValidTagName(tagName: string): tagName is ValidTagNames {
  // This only works because the enum name and value are the same
  return tagName in ValidTagNames;
}

function tagTemplate(): SitemapItemOptions {
  return {
    img: [],
    video: [],
    links: [],
    url: '',
  };
}

function videoTemplate(): IVideoItem {
  return {
    tag: [],
    thumbnail_loc: '',
    title: '',
    description: '',
  };
}

const imageTemplate: ISitemapImg = {
  url: '',
};

const linkTemplate: ILinkItem = {
  lang: '',
  url: '',
};

function newsTemplate(): INewsItem {
  return {
    publication: { name: '', language: '' },
    publication_date: '',
    title: '',
  };
}
export interface ISitemapStreamParseOpts
  extends TransformOptions,
    Pick<ISitemapOptions, 'level'> {}
const defaultStreamOpts: ISitemapStreamParseOpts = {};
/**
 * Takes a stream of xml and transforms it into a stream of ISitemapOptions
 * Use this to parse existing sitemaps into config options compatible with this library
 */
export class XMLToISitemapOptions extends Transform {
  level: ErrorLevel;
  saxStream: SAXStream;
  constructor(opts = defaultStreamOpts) {
    opts.objectMode = true;
    super(opts);
    this.saxStream = sax.createStream(true, {
      xmlns: true,
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      strictEntities: true,
      trim: true,
    });
    this.level = opts.level || ErrorLevel.WARN;
    let currentItem: SitemapItemOptions = tagTemplate();
    let currentTag: string;
    let currentVideo: IVideoItem = videoTemplate();
    let currentImage: ISitemapImg = { ...imageTemplate };
    let currentLink: ILinkItem = { ...linkTemplate };
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
          if (
            typeof tag.attributes.rel === 'string' ||
            typeof tag.attributes.href === 'string'
          ) {
            return;
          }
          if (
            tag.attributes.rel.value === 'alternate' &&
            tag.attributes.hreflang
          ) {
            currentLink.url = tag.attributes.href.value;
            if (typeof tag.attributes.hreflang === 'string') return;
            currentLink.lang = tag.attributes.hreflang.value as string;
          } else if (tag.attributes.rel.value === 'alternate') {
            dontpushCurrentLink = true;
            currentItem.androidLink = tag.attributes.href.value;
          } else if (tag.attributes.rel.value === 'amphtml') {
            dontpushCurrentLink = true;
            currentItem.ampLink = tag.attributes.href.value;
          } else {
            console.log('unhandled attr for xhtml:link', tag.attributes);
          }
        }
      } else {
        console.warn('unhandled tag', tag.name);
      }
    });

    this.saxStream.on('text', (text): void => {
      switch (currentTag) {
        case 'mobile:mobile':
          break;
        case 'loc':
          currentItem.url = text;
          break;
        case 'changefreq':
          if (isValidChangeFreq(text)) {
            currentItem.changefreq = text;
          }
          break;
        case 'priority':
          currentItem.priority = parseFloat(text);
          break;
        case 'lastmod':
          currentItem.lastmod = text;
          break;
        case 'video:thumbnail_loc':
          currentVideo.thumbnail_loc = text;
          break;
        case 'video:tag':
          currentVideo.tag.push(text);
          break;
        case 'video:duration':
          currentVideo.duration = parseInt(text, 10);
          break;
        case 'video:player_loc':
          currentVideo.player_loc = text;
          break;
        case 'video:requires_subscription':
          if (isValidYesNo(text)) {
            currentVideo.requires_subscription = text;
          }
          break;
        case 'video:publication_date':
          currentVideo.publication_date = text;
          break;
        case 'video:id':
          currentVideo.id = text;
          break;
        case 'video:restriction':
          currentVideo.restriction = text;
          break;
        case 'video:view_count':
          currentVideo.view_count = text;
          break;
        case 'video:uploader':
          currentVideo.uploader = text;
          break;
        case 'video:family_friendly':
          if (isValidYesNo(text)) {
            currentVideo.family_friendly = text;
          }
          break;
        case 'video:expiration_date':
          currentVideo.expiration_date = text;
          break;
        case 'video:platform':
          currentVideo.platform = text;
          break;
        case 'video:price':
          currentVideo.price = text;
          break;
        case 'video:rating':
          currentVideo.rating = parseFloat(text);
          break;
        case 'video:category':
          currentVideo.category = text;
          break;
        case 'video:live':
          if (isValidYesNo(text)) {
            currentVideo.live = text;
          }
          break;
        case 'video:gallery_loc':
          currentVideo.gallery_loc = text;
          break;
        case 'image:loc':
          currentImage.url = text;
          break;
        case 'image:geo_location':
          currentImage.geoLocation = text;
          break;
        case 'image:license':
          currentImage.license = text;
          break;
        case 'news:access':
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.access = text as INewsItem['access'];
          break;
        case 'news:genres':
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.genres = text;
          break;
        case 'news:publication_date':
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.publication_date = text;
          break;
        case 'news:keywords':
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.keywords = text;
          break;
        case 'news:stock_tickers':
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.stock_tickers = text;
          break;
        case 'news:language':
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.publication.language = text;
          break;
        case 'video:title':
          currentVideo.title += text;
          break;
        case 'video:description':
          currentVideo.description += text;
          break;
        case 'news:name':
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.publication.name += text;
          break;
        case 'news:title':
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.title += text;
          break;
        case 'image:caption':
          if (!currentImage.caption) {
            currentImage.caption = text;
          } else {
            currentImage.caption += text;
          }
          break;
        case 'image:title':
          if (!currentImage.title) {
            currentImage.title = text;
          } else {
            currentImage.title += text;
          }
          break;

        default:
          console.log('unhandled text for tag:', currentTag, `'${text}'`);
          break;
      }
    });

    this.saxStream.on('cdata', (text): void => {
      switch (currentTag) {
        case 'video:title':
          currentVideo.title += text;
          break;
        case 'video:description':
          currentVideo.description += text;
          break;
        case 'news:name':
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.publication.name += text;
          break;
        case 'news:title':
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.title += text;
          break;
        case 'image:caption':
          if (!currentImage.caption) {
            currentImage.caption = text;
          } else {
            currentImage.caption += text;
          }
          break;
        case 'image:title':
          if (!currentImage.title) {
            currentImage.title = text;
          } else {
            currentImage.title += text;
          }
          break;

        default:
          console.log('unhandled cdata for tag:', currentTag);
          break;
      }
    });

    this.saxStream.on('attribute', (attr): void => {
      switch (currentTag) {
        case 'urlset':
        case 'xhtml:link':
        case 'video:id':
          break;
        case 'video:restriction':
          if (attr.name === 'relationship') {
            currentVideo['restriction:relationship'] = attr.value;
          } else {
            console.log('unhandled attr', currentTag, attr.name);
          }
          break;
        case 'video:price':
          if (attr.name === 'type') {
            currentVideo['price:type'] = attr.value;
          } else if (attr.name === 'currency') {
            currentVideo['price:currency'] = attr.value;
          } else if (attr.name === 'resolution') {
            currentVideo['price:resolution'] = attr.value;
          } else {
            console.log('unhandled attr for video:price', attr.name);
          }
          break;
        case 'video:player_loc':
          if (attr.name === 'autoplay') {
            currentVideo['player_loc:autoplay'] = attr.value;
          } else {
            console.log('unhandled attr for video:player_loc', attr.name);
          }
          break;
        case 'video:platform':
          if (attr.name === 'relationship') {
            currentVideo['platform:relationship'] = attr.value as EnumAllowDeny;
          } else {
            console.log('unhandled attr for video:platform', attr.name);
          }
          break;
        case 'video:gallery_loc':
          if (attr.name === 'title') {
            currentVideo['gallery_loc:title'] = attr.value;
          } else {
            console.log('unhandled attr for video:galler_loc', attr.name);
          }
          break;
        default:
          console.log('unhandled attr', currentTag, attr.name);
      }
    });

    this.saxStream.on('closetag', (tag): void => {
      switch (tag) {
        case 'url':
          this.push(currentItem);
          currentItem = tagTemplate();
          break;
        case 'video:video':
          currentItem.video.push(currentVideo);
          currentVideo = videoTemplate();
          break;
        case 'image:image':
          currentItem.img.push(currentImage);
          currentImage = { ...imageTemplate };
          break;
        case 'xhtml:link':
          if (!dontpushCurrentLink) {
            currentItem.links.push(currentLink);
          }
          currentLink = { ...linkTemplate };
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
    this.saxStream.write(data, encoding);
    callback();
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
  @return {Promise<ISitemapOptions>} resolves with a valid config that can be
  passed to createSitemap. Rejects with an Error object.
 */
export async function parseSitemap(xml: Readable): Promise<ISitemapOptions> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  const urls: SitemapItemOptions[] = [];
  return new Promise((resolve, reject): void => {
    xml
      .pipe(new XMLToISitemapOptions())
      .on('data', (smi: SitemapItemOptions) => urls.push(smi))
      .on('end', (): void => {
        resolve({ urls });
      })
      .on('error', (error: Error): void => {
        reject(error);
      });
  });
}

export interface IObjectToStreamOpts extends TransformOptions {
  lineSeparated: boolean;
}

const defaultObjectStreamOpts: IObjectToStreamOpts = {
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
    chunk: SitemapItemOptions,
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
