/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

import {
  SitemapItemOptions,
  ErrorLevel,
  CHANGEFREQ,
  ISitemapItemOptionsLoose,
  EnumYesNo,
  ISitemapImg,
  ILinkItem,
  IVideoItem,
} from './types';
import {
  ChangeFreqInvalidError,
  InvalidAttrValue,
  InvalidNewsAccessValue,
  InvalidNewsFormat,
  InvalidVideoDescription,
  InvalidVideoDuration,
  InvalidVideoFormat,
  InvalidVideoRating,
  NoURLError,
  NoConfigError,
  PriorityInvalidError
} from './errors'
import { Readable, Transform, PassThrough, ReadableOptions } from 'stream'
import { createInterface, Interface } from 'readline';
import { URL } from 'url'
import { statSync } from 'fs';

const allowDeny = /^allow|deny$/
const validators: {[index: string]: RegExp} = {
  'price:currency': /^[A-Z]{3}$/,
  'price:type': /^rent|purchase|RENT|PURCHASE$/,
  'price:resolution': /^HD|hd|sd|SD$/,
  'platform:relationship': allowDeny,
  'restriction:relationship': allowDeny,
  'restriction': /^([A-Z]{2}( +[A-Z]{2})*)?$/,
  'platform': /^((web|mobile|tv)( (web|mobile|tv))*)?$/,
  'language': /^zh-cn|zh-tw|([a-z]{2,3})$/,
  'genres': /^(PressRelease|Satire|Blog|OpEd|Opinion|UserGenerated)(, *(PressRelease|Satire|Blog|OpEd|Opinion|UserGenerated))*$/,
  'stock_tickers': /^(\w+:\w+(, *\w+:\w+){0,4})?$/,
}

function validate(subject: object, name: string, url: string, level: ErrorLevel): void {
  Object.keys(subject).forEach((key): void => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    const val = subject[key]
    if (validators[key] && !validators[key].test(val)) {
      if (level === ErrorLevel.THROW) {
        throw new InvalidAttrValue(key, val, validators[key])
      } else {
        console.warn(`${url}: ${name} key ${key} has invalid value: ${val}`)
      }
    }
  })
}

export function validateSMIOptions (conf: SitemapItemOptions, level = ErrorLevel.WARN): SitemapItemOptions {
  if (!conf) {
    throw new NoConfigError()
  }

  if (level === ErrorLevel.SILENT) {
    return conf
  }

  const {
    url,
    changefreq,
    priority,
    news,
    video
  } = conf

  if (!url) {
    if (level === ErrorLevel.THROW) {
      throw new NoURLError()
    } else {
      console.warn('URL is required')
    }
  }

  if (changefreq) {
    if (CHANGEFREQ.indexOf(changefreq) === -1) {
      if (level === ErrorLevel.THROW) {
        throw new ChangeFreqInvalidError()
      } else {
        console.warn(`${url}: changefreq ${changefreq} is not valid`)
      }
    }
  }

  if (priority) {
    if (!(priority >= 0.0 && priority <= 1.0)) {
      if (level === ErrorLevel.THROW) {
        throw new PriorityInvalidError()
      } else {
        console.warn(`${url}: priority ${priority} is not valid`)
      }
    }
  }

  if (news) {

    if (
      news.access &&
      news.access !== 'Registration' &&
      news.access !== 'Subscription'
    ) {
      if (level === ErrorLevel.THROW) {
        throw new InvalidNewsAccessValue()
      } else {
        console.warn(`${url}: news access ${news.access} is invalid`)
      }
    }

    if (!news.publication ||
        !news.publication.name ||
        !news.publication.language ||
        !news.publication_date ||
        !news.title
    ) {
      if (level === ErrorLevel.THROW) {
        throw new InvalidNewsFormat()
      } else {
        console.warn(`${url}: missing required news property`)
      }
    }

    validate(news, 'news', url, level)
    validate(news.publication, 'publication', url, level)
  }

  if (video) {
    video.forEach((vid): void => {
      if (vid.duration !== undefined) {
        if (vid.duration < 0 || vid.duration > 28800) {
          if (level === ErrorLevel.THROW) {
            throw new InvalidVideoDuration()
          } else {
            console.warn(`${url}: video duration ${vid.duration} is invalid`)
          }
        }
      }
      if (vid.rating !== undefined && (vid.rating < 0 || vid.rating > 5)) {
        if (level === ErrorLevel.THROW) {
          throw new InvalidVideoRating()
        } else {
          console.warn(`${url}: video ${vid.title} rating ${vid.rating} must be between 0 and 5 inclusive`)
        }
      }

      if (typeof (vid) !== 'object' || !vid.thumbnail_loc || !vid.title || !vid.description) {
        // has to be an object and include required categories https://support.google.com/webmasters/answer/80471?hl=en&ref_topic=4581190
        if (level === ErrorLevel.THROW) {
          throw new InvalidVideoFormat()
        } else {
          console.warn(`${url}: missing required video property`)
        }
      }

      if (vid.description.length > 2048) {
        if (level === ErrorLevel.THROW) {
          throw new InvalidVideoDescription()
        } else {
          console.warn(`${url}: video description is too long`)
        }
      }

      validate(vid, 'video', url, level)
    })
  }

  return conf
}

/**
 * Combines multiple streams into one
 * @param streams the streams to combine
 */
export function mergeStreams (streams: Readable[]): Readable {
  let pass = new PassThrough()
  let waiting = streams.length
  for (const stream of streams) {
    pass = stream.pipe(pass, {end: false})
    stream.once('end', () => --waiting === 0 && pass.emit('end'))
  }
  return pass
}

export interface IReadLineStreamOptions extends ReadableOptions {
  input: Readable;
}

/**
 * Wraps node's ReadLine in a stream
 */
export class ReadLineStream extends Readable {
  private _source: Interface
  constructor(options: IReadLineStreamOptions) {
    if (options.autoDestroy === undefined) {
      options.autoDestroy = true
    }
    options.objectMode = true
    super(options);

    this._source = createInterface({
      input: options.input,
      terminal: false,
      crlfDelay: Infinity
    });

    // Every time there's data, push it into the internal buffer.
    this._source.on('line', (chunk) => {
      // If push() returns false, then stop reading from source.
      if (!this.push(chunk))
        this._source.pause();
    });

    // When the source ends, push the EOF-signaling `null` chunk.
    this._source.on('close', () => {
      this.push(null);
    });
  }

  // _read() will be called when the stream wants to pull more data in.
  // The advisory size argument is ignored in this case.
  _read(size: number): void {
    this._source.resume();
  }
}

/**
 * Takes a stream likely from fs.createReadStream('./path') and returns a stream
 * of sitemap items
 * @param stream a stream of line separated urls.
 * @param opts
 * @param opts.isJSON is the stream line separated JSON. leave undefined to guess
 */
export function lineSeparatedURLsToSitemapOptions(
  stream: Readable,
  { isJSON }: { isJSON?: boolean } = {}
): Readable {
  return new ReadLineStream({ input: stream }).pipe(
    new Transform({
      objectMode: true,
      transform: (line, encoding, cb): void => {
        if (isJSON || (isJSON === undefined && line[0] === "{")) {
          cb(null, JSON.parse(line));
        } else {
          cb(null, line);
        }
      }
    })
  );
}

/**
 * Based on lodash's implementation of chunk.
 *
 * Copyright JS Foundation and other contributors <https://js.foundation/>
 *
 * Based on Underscore.js, copyright Jeremy Ashkenas,
 * DocumentCloud and Investigative Reporters & Editors <http://underscorejs.org/>
 *
 * This software consists of voluntary contributions made by many
 * individuals. For exact contribution history, see the revision history
 * available at https://github.com/lodash/lodash
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function chunk (array: any[], size = 1): any[] {
  size = Math.max(Math.trunc(size), 0);

  const length = array ? array.length : 0;
  if (!length || size < 1) {
    return [];
  }
  const result = Array(Math.ceil(length / size));
  let index = 0,
    resIndex = 0;

  while (index < length) {
    result[resIndex++] = array.slice(index, (index += size));
  }
  return result;
}

function boolToYESNO (bool?: boolean | EnumYesNo): EnumYesNo|undefined {
  if (bool === undefined) {
    return bool
  }
  if (typeof bool === 'boolean') {
    return bool ? EnumYesNo.yes : EnumYesNo.no
  }
  return bool
}

/**
 * Converts the passed in sitemap entry into one capable of being consumed by SitemapItem
 * @param {string | ISitemapItemOptionsLoose} elem the string or object to be converted
 * @param {string} hostname
 * @returns SitemapItemOptions a strict sitemap item option
 */
export function normalizeURL (elem: string | ISitemapItemOptionsLoose, hostname?: string): SitemapItemOptions {
  // SitemapItem
  // create object with url property
  let smi: SitemapItemOptions = {
    img: [],
    video: [],
    links: [],
    url: ''
  }
  let smiLoose: ISitemapItemOptionsLoose
  if (typeof elem === 'string') {
    smi.url = elem
    smiLoose = {url: elem}
  } else {
    smiLoose = elem
  }

  smi.url = (new URL(smiLoose.url, hostname)).toString();

  let img: ISitemapImg[] = []
  if (smiLoose.img) {
    if (typeof smiLoose.img === 'string') {
      // string -> array of objects
      smiLoose.img = [{ url: smiLoose.img }];
    } else if (!Array.isArray(smiLoose.img)) {
      // object -> array of objects
      smiLoose.img = [smiLoose.img];
    }

    img = smiLoose.img.map((el): ISitemapImg => typeof el === 'string' ? {url: el} : el);
  }
  // prepend hostname to all image urls
  smi.img = img.map((el: ISitemapImg): ISitemapImg => (
    {...el, url: (new URL(el.url, hostname)).toString()}
  ));

  let links: ILinkItem[] = []
  if (smiLoose.links) {
    links = smiLoose.links
  }
  smi.links = links.map((link): ILinkItem => {
    return {...link, url: (new URL(link.url, hostname)).toString()};
  });

  if (smiLoose.video) {
    if (!Array.isArray(smiLoose.video)) {
      // make it an array
      smiLoose.video = [smiLoose.video]
    }
    smi.video = smiLoose.video.map((video): IVideoItem => {
      const nv: IVideoItem = {
        ...video,
        /* eslint-disable-next-line @typescript-eslint/camelcase */
        family_friendly: boolToYESNO(video.family_friendly),
        live: boolToYESNO(video.live),
        /* eslint-disable-next-line @typescript-eslint/camelcase */
        requires_subscription: boolToYESNO(video.requires_subscription),
        tag: [],
        rating: undefined
      }

      if (video.tag !== undefined) {
        nv.tag = !Array.isArray(video.tag) ? [video.tag] : video.tag
      }

      if (video.rating !== undefined) {
        if (typeof video.rating === 'string') {
          nv.rating = parseFloat(video.rating)
        } else {
          nv.rating = video.rating
        }
      }

      if (video.view_count !== undefined) {
        /* eslint-disable-next-line @typescript-eslint/camelcase */
        nv.view_count = '' + video.view_count
      }
      return nv
    })
  }

  // If given a file to use for last modified date
  if (smiLoose.lastmodfile) {
    const { mtime } = statSync(smiLoose.lastmodfile)

    smi.lastmod = (new Date(mtime)).toISOString()

    // The date of last modification (YYYY-MM-DD)
  } else if (smiLoose.lastmodISO) {
    smi.lastmod = (new Date(smiLoose.lastmodISO)).toISOString()
  } else if (smiLoose.lastmod) {
    smi.lastmod = (new Date(smiLoose.lastmod)).toISOString()
  }
  delete smiLoose.lastmodfile
  delete smiLoose.lastmodISO

  smi = {...smiLoose, ...smi}
  return smi
}
