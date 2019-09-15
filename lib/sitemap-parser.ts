import sax, { SAXStream } from 'sax'
import { Readable, Transform, TransformOptions, TransformCallback } from 'stream'
import {
  SitemapItemOptions,
  EnumChangefreq,
  IVideoItem,
  ISitemapImg,
  ILinkItem,
  EnumYesNo,
  EnumAllowDeny,
  INewsItem,
  ErrorLevel
} from "./types";
import { ISitemapOptions } from './sitemap'

function tagTemplate(): SitemapItemOptions {
  return {
    img: [],
    video: [],
    links: [],
    url: ''
  }
}

function videoTemplate(): IVideoItem {
  return {
    tag: [],
    // eslint-disable-next-line @typescript-eslint/camelcase
    thumbnail_loc: "",
    title: "",
    description: ""
  }
}

const imageTemplate: ISitemapImg = {
  url: ''
}

const linkTemplate: ILinkItem = {
  lang: '',
  url: ''
}

function newsTemplate (): INewsItem {
  return {
    publication: { name: "", language: "" },
    // eslint-disable-next-line @typescript-eslint/camelcase
    publication_date: "",
    title: ""
  };
}
export interface ISitemapStreamParseOpts extends TransformOptions, Pick<ISitemapOptions, 'level'> {
}
const defaultStreamOpts: ISitemapStreamParseOpts = {};
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
      trim: true
    });
    this.level = opts.level || ErrorLevel.WARN;
    let currentItem: SitemapItemOptions = tagTemplate()
    let currentTag: string
    let currentVideo: IVideoItem = videoTemplate()
    let currentImage: ISitemapImg = { ...imageTemplate }
    let currentLink: ILinkItem = { ...linkTemplate }
    let dontpushCurrentLink = false;
    this.saxStream.on('opentagstart', (tag): void => {
      currentTag = tag.name
      if (currentTag.startsWith('news:') && !currentItem.news) {
        currentItem.news = newsTemplate();
      }
    })

    this.saxStream.on('opentag', (tag): void => {
      switch (tag.name) {
        case "url":
        case "loc":
        case "urlset":
        case "lastmod":
        case "changefreq":
        case "priority":
        case "video:thumbnail_loc":
        case "video:video":
        case "video:title":
        case "video:description":
        case "video:tag":
        case "video:duration":
        case "video:player_loc":
        case "image:image":
        case "image:loc":
        case "image:geo_location":
        case "image:license":
        case "image:title":
        case "image:caption":
        case "video:requires_subscription":
        case "video:publication_date":
        case "video:id":
        case "video:restriction":
        case "video:family_friendly":
        case "video:view_count":
        case "video:uploader":
        case "video:expiration_date":
        case "video:platform":
        case "video:price":
        case "video:rating":
        case "video:category":
        case "video:live":
        case "video:gallery_loc":
        case "news:news":
        case "news:publication":
        case "news:name":
        case "news:access":
        case "news:genres":
        case "news:publication_date":
        case "news:title":
        case "news:keywords":
        case "news:stock_tickers":
        case "news:language":
          break;
        case "mobile:mobile":
          currentItem.mobile = true
          break;
        case 'xhtml:link':
          if (
            typeof tag.attributes.rel === "string" ||
            typeof tag.attributes.href === "string"
          ) {
            break;
          }
          if (tag.attributes.rel.value === 'alternate' && tag.attributes.hreflang) {
            currentLink.url = tag.attributes.href.value
            if (typeof tag.attributes.hreflang === 'string')
              break;
            currentLink.lang = tag.attributes.hreflang.value as string
          } else if (tag.attributes.rel.value === 'alternate') {
            dontpushCurrentLink = true
            currentItem.androidLink = tag.attributes.href.value
          } else if (tag.attributes.rel.value === 'amphtml') {
            dontpushCurrentLink = true
            currentItem.ampLink = tag.attributes.href.value
          } else {
            console.log('unhandled attr for xhtml:link', tag.attributes)
          }
          break;

        default:
          console.warn('unhandled tag', tag.name)
          break;
      }
    })

    this.saxStream.on('text', (text): void => {
      switch (currentTag) {
        case "mobile:mobile":
          break;
        case 'loc':
          currentItem.url = text
          break;
        case 'changefreq':
          currentItem.changefreq = text as EnumChangefreq
          break;
        case 'priority':
          currentItem.priority = parseFloat(text)
          break;
        case 'lastmod':
          currentItem.lastmod = text
          break;
        case "video:thumbnail_loc":
          // eslint-disable-next-line @typescript-eslint/camelcase
          currentVideo.thumbnail_loc = text
          break;
        case "video:tag":
          currentVideo.tag.push(text)
          break;
        case "video:duration":
          currentVideo.duration = parseInt(text, 10)
          break;
        case "video:player_loc":
          // eslint-disable-next-line @typescript-eslint/camelcase
          currentVideo.player_loc = text
          break;
        case "video:requires_subscription":
          // eslint-disable-next-line @typescript-eslint/camelcase
          currentVideo.requires_subscription = text as EnumYesNo
          break;
        case "video:publication_date":
          // eslint-disable-next-line @typescript-eslint/camelcase
          currentVideo.publication_date = text
          break;
        case "video:id":
          currentVideo.id = text
          break;
        case "video:restriction":
          currentVideo.restriction = text
          break;
        case "video:view_count":
          // eslint-disable-next-line @typescript-eslint/camelcase
          currentVideo.view_count = text
          break;
        case "video:uploader":
          currentVideo.uploader = text
          break;
        case "video:family_friendly":
          // eslint-disable-next-line @typescript-eslint/camelcase
          currentVideo.family_friendly = text as EnumYesNo
          break;
        case "video:expiration_date":
          // eslint-disable-next-line @typescript-eslint/camelcase
          currentVideo.expiration_date = text
          break;
        case "video:platform":
          currentVideo.platform = text
          break;
        case "video:price":
          currentVideo.price = text
          break;
        case "video:rating":
          currentVideo.rating = parseFloat(text)
          break;
        case "video:category":
          currentVideo.category = text
          break;
        case "video:live":
          currentVideo.live = text as EnumYesNo
          break;
        case "video:gallery_loc":
          // eslint-disable-next-line @typescript-eslint/camelcase
          currentVideo.gallery_loc = text
          break;
        case "image:loc":
          currentImage.url = text
          break;
        case "image:geo_location":
          currentImage.geoLocation = text
          break;
        case "image:license":
          currentImage.license = text
          break;
        case "news:access":
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.access = text as INewsItem["access"]
          break;
        case "news:genres":
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.genres = text
          break;
        case "news:publication_date":
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          // eslint-disable-next-line @typescript-eslint/camelcase
          currentItem.news.publication_date = text
          break;
        case "news:keywords":
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.keywords = text
          break;
        case "news:stock_tickers":
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          // eslint-disable-next-line @typescript-eslint/camelcase
          currentItem.news.stock_tickers = text
          break;
        case "news:language":
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.publication.language = text
          break;

        default:
          console.log('unhandled text for tag:', currentTag, `'${text}'`)
          break;
      }
    })

    this.saxStream.on('cdata', (text): void => {
      switch (currentTag) {
        case "video:title":
          currentVideo.title += text
          break;
        case "video:description":
          currentVideo.description += text
          break;
        case "news:name":
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.publication.name += text
          break;
        case "news:title":
          if (!currentItem.news) {
            currentItem.news = newsTemplate();
          }
          currentItem.news.title += text
          break;
        case "image:caption":
          if (!currentImage.caption) {
            currentImage.caption = text;
          } else {
            currentImage.caption += text;
          }
          break;
        case "image:title":
          if (!currentImage.title) {
            currentImage.title = text;
          } else {
            currentImage.title += text;
          }
          break;

        default:
          console.log('unhandled cdata for tag:', currentTag)
          break;
      }
    })

    this.saxStream.on('attribute', (attr): void => {
      switch (currentTag) {
        case "urlset":
        case "xhtml:link":
        case "video:id":
          break;
        case "video:restriction":
          if (attr.name === 'relationship') {
            currentVideo["restriction:relationship"] = attr.value
          } else {
            console.log("unhandled attr", currentTag, attr.name);
          }
          break;
        case "video:price":
          if (attr.name === 'type') {
            currentVideo["price:type"] = attr.value
          } else if (attr.name === 'currency') {
            currentVideo["price:currency"] = attr.value
          } else if (attr.name === 'resolution') {
            currentVideo["price:resolution"] = attr.value
          } else {
            console.log('unhandled attr for video:price', attr.name)
          }
          break;
        case "video:player_loc":
          if (attr.name === 'autoplay') {
            currentVideo["player_loc:autoplay"] = attr.value
          } else {
            console.log('unhandled attr for video:player_loc', attr.name)
          }
          break;
        case "video:platform":
          if (attr.name === 'relationship') {
            currentVideo["platform:relationship"] = attr.value as EnumAllowDeny
          } else {
            console.log('unhandled attr for video:platform', attr.name)
          }
          break;
        case "video:gallery_loc":
          if (attr.name === 'title') {
            currentVideo["gallery_loc:title"] = attr.value
          } else {
            console.log('unhandled attr for video:galler_loc', attr.name)
          }
          break;
        default:
          console.log('unhandled attr', currentTag, attr.name)
      }
    })

    this.saxStream.on('closetag', (tag): void => {
      switch (tag) {
        case 'url':
          this.push(currentItem)
          currentItem = tagTemplate()
          break;
        case "video:video":
          currentItem.video.push(currentVideo)
          currentVideo = videoTemplate()
          break;
        case "image:image":
          currentItem.img.push(currentImage)
          currentImage = { ...imageTemplate };
          break;
        case "xhtml:link":
          if (!dontpushCurrentLink) {
            currentItem.links.push(currentLink);
          }
          currentLink = { ...linkTemplate };
          break;

        default:
          break;
      }
    })
  }

  _transform(data: string, encoding: string, callback: TransformCallback): void {
    this.saxStream.write(data, encoding)
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
export async function parseSitemap (xml: Readable): Promise<ISitemapOptions> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  const urls: SitemapItemOptions[] = []
  return new Promise((resolve, reject): void => {
    xml
      .pipe(new XMLToISitemapOptions())
      .on("data", (smi: SitemapItemOptions) => urls.push(smi))
      .on("end", (): void => {
        resolve({ urls });
      })
      .on("error", (error: Error): void => {
        reject(error);
      });
  })
}

export interface IObjectToStreamOpts extends TransformOptions {
  lineSeparated: boolean;
}

const defaultObjectStreamOpts: IObjectToStreamOpts = {
  lineSeparated: false
};
export class ObjectStreamToJSON extends Transform {
  lineSeparated: boolean;
  firstWritten: boolean;

  constructor (opts = defaultObjectStreamOpts) {
    opts.writableObjectMode = true
    super(opts)
    this.lineSeparated = opts.lineSeparated
    this.firstWritten = false;
  }

  _transform(chunk: SitemapItemOptions, encoding: string, cb: TransformCallback): void {
    if (!this.firstWritten) {
      this.firstWritten = true
      this.push('[')
    } else if(this.lineSeparated) {
      this.push('\n');
    } else {
      this.push(',')
    }
    if (chunk) {
      this.push(JSON.stringify(chunk));
    }
    cb();
  }

  _flush(cb: TransformCallback): void {
    if (!this.lineSeparated) {
      this.push(']')
    }
    cb();
  }
}
