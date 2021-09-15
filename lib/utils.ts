/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
import { statSync } from 'fs';
import {
  Readable,
  Transform,
  PassThrough,
  ReadableOptions,
  TransformOptions,
} from 'stream';
import { createInterface, Interface } from 'readline';
import { URL } from 'url';
import {
  SitemapItem,
  ErrorLevel,
  SitemapItemLoose,
  EnumYesNo,
  Img,
  LinkItem,
  VideoItem,
  isValidChangeFreq,
  isValidYesNo,
  isAllowDeny,
  isPriceType,
  isResolution,
  NewsItem,
  ErrorHandler,
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
  PriorityInvalidError,
  InvalidVideoTitle,
  InvalidVideoViewCount,
  InvalidVideoTagCount,
  InvalidVideoCategory,
  InvalidVideoFamilyFriendly,
  InvalidVideoRestriction,
  InvalidVideoRestrictionRelationship,
  InvalidVideoPriceType,
  InvalidVideoResolution,
  InvalidVideoPriceCurrency,
} from './errors';
import { validators } from './types';

function validate(
  subject: NewsItem | VideoItem | NewsItem['publication'],
  name: string,
  url: string,
  level: ErrorLevel
): void {
  Object.keys(subject).forEach((key): void => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const val = subject[key];
    if (validators[key] && !validators[key].test(val)) {
      if (level === ErrorLevel.THROW) {
        throw new InvalidAttrValue(key, val, validators[key]);
      } else {
        console.warn(`${url}: ${name} key ${key} has invalid value: ${val}`);
      }
    }
  });
}

function handleError(error: Error, level: ErrorLevel): void {
  if (level === ErrorLevel.THROW) {
    throw error;
  } else if (level === ErrorLevel.WARN) {
    console.warn(error.name, error.message);
  }
}
/**
 * Verifies all data passed in will comply with sitemap spec.
 * @param conf Options to validate
 * @param level logging level
 * @param errorHandler error handling func
 */
export function validateSMIOptions(
  conf: SitemapItem,
  level = ErrorLevel.WARN,
  errorHandler: ErrorHandler = handleError
): SitemapItem {
  if (!conf) {
    throw new NoConfigError();
  }

  if (level === ErrorLevel.SILENT) {
    return conf;
  }

  const { url, changefreq, priority, news, video } = conf;

  if (!url) {
    errorHandler(new NoURLError(), level);
  }

  if (changefreq) {
    if (!isValidChangeFreq(changefreq)) {
      errorHandler(new ChangeFreqInvalidError(url, changefreq), level);
    }
  }

  if (priority) {
    if (!(priority >= 0.0 && priority <= 1.0)) {
      errorHandler(new PriorityInvalidError(url, priority), level);
    }
  }

  if (news) {
    if (
      news.access &&
      news.access !== 'Registration' &&
      news.access !== 'Subscription'
    ) {
      errorHandler(new InvalidNewsAccessValue(url, news.access), level);
    }

    if (
      !news.publication ||
      !news.publication.name ||
      !news.publication.language ||
      !news.publication_date ||
      !news.title
    ) {
      errorHandler(new InvalidNewsFormat(url), level);
    }

    validate(news, 'news', url, level);
    validate(news.publication, 'publication', url, level);
  }

  if (video) {
    video.forEach((vid): void => {
      if (vid.duration !== undefined) {
        if (vid.duration < 0 || vid.duration > 28800) {
          errorHandler(new InvalidVideoDuration(url, vid.duration), level);
        }
      }
      if (vid.rating !== undefined && (vid.rating < 0 || vid.rating > 5)) {
        errorHandler(new InvalidVideoRating(url, vid.title, vid.rating), level);
      }

      if (
        typeof vid !== 'object' ||
        !vid.thumbnail_loc ||
        !vid.title ||
        !vid.description
      ) {
        // has to be an object and include required categories https://support.google.com/webmasters/answer/80471?hl=en&ref_topic=4581190
        errorHandler(new InvalidVideoFormat(url), level);
      }

      if (vid.title.length > 100) {
        errorHandler(new InvalidVideoTitle(url, vid.title.length), level);
      }

      if (vid.description.length > 2048) {
        errorHandler(
          new InvalidVideoDescription(url, vid.description.length),
          level
        );
      }

      if (vid.view_count !== undefined && vid.view_count < 0) {
        errorHandler(new InvalidVideoViewCount(url, vid.view_count), level);
      }

      if (vid.tag.length > 32) {
        errorHandler(new InvalidVideoTagCount(url, vid.tag.length), level);
      }

      if (vid.category !== undefined && vid.category?.length > 256) {
        errorHandler(new InvalidVideoCategory(url, vid.category.length), level);
      }

      if (
        vid.family_friendly !== undefined &&
        !isValidYesNo(vid.family_friendly)
      ) {
        errorHandler(
          new InvalidVideoFamilyFriendly(url, vid.family_friendly),
          level
        );
      }

      if (vid.restriction) {
        if (!validators.restriction.test(vid.restriction)) {
          errorHandler(
            new InvalidVideoRestriction(url, vid.restriction),
            level
          );
        }
        if (
          !vid['restriction:relationship'] ||
          !isAllowDeny(vid['restriction:relationship'])
        ) {
          errorHandler(
            new InvalidVideoRestrictionRelationship(
              url,
              vid['restriction:relationship']
            ),
            level
          );
        }
      }

      // TODO price element should be unbounded
      if (
        (vid.price === '' && vid['price:type'] === undefined) ||
        (vid['price:type'] !== undefined && !isPriceType(vid['price:type']))
      ) {
        errorHandler(
          new InvalidVideoPriceType(url, vid['price:type'], vid.price),
          level
        );
      }
      if (
        vid['price:resolution'] !== undefined &&
        !isResolution(vid['price:resolution'])
      ) {
        errorHandler(
          new InvalidVideoResolution(url, vid['price:resolution']),
          level
        );
      }

      if (
        vid['price:currency'] !== undefined &&
        !validators['price:currency'].test(vid['price:currency'])
      ) {
        errorHandler(
          new InvalidVideoPriceCurrency(url, vid['price:currency']),
          level
        );
      }

      validate(vid, 'video', url, level);
    });
  }

  return conf;
}

/**
 * Combines multiple streams into one
 * @param streams the streams to combine
 */
export function mergeStreams(
  streams: Readable[],
  options?: TransformOptions
): Readable {
  let pass = new PassThrough(options);
  let waiting = streams.length;
  for (const stream of streams) {
    pass = stream.pipe(pass, { end: false });
    stream.once('end', () => --waiting === 0 && pass.emit('end'));
  }
  return pass;
}

export interface ReadlineStreamOptions extends ReadableOptions {
  input: Readable;
}

/**
 * Wraps node's ReadLine in a stream
 */
export class ReadlineStream extends Readable {
  private _source: Interface;
  constructor(options: ReadlineStreamOptions) {
    if (options.autoDestroy === undefined) {
      options.autoDestroy = true;
    }
    options.objectMode = true;
    super(options);

    this._source = createInterface({
      input: options.input,
      terminal: false,
      crlfDelay: Infinity,
    });

    // Every time there's data, push it into the internal buffer.
    this._source.on('line', (chunk) => {
      // If push() returns false, then stop reading from source.
      if (!this.push(chunk)) this._source.pause();
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
 * @param opts.isJSON is the stream line separated JSON. leave undefined to guess
 */
export function lineSeparatedURLsToSitemapOptions(
  stream: Readable,
  { isJSON }: { isJSON?: boolean } = {}
): Readable {
  return new ReadlineStream({ input: stream }).pipe(
    new Transform({
      objectMode: true,
      // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
      transform: (line, encoding, cb): void => {
        if (isJSON || (isJSON === undefined && line[0] === '{')) {
          cb(null, JSON.parse(line));
        } else {
          cb(null, line);
        }
      },
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
export function chunk(array: any[], size = 1): any[] {
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

function boolToYESNO(bool?: boolean | EnumYesNo): EnumYesNo | undefined {
  if (bool === undefined) {
    return bool;
  }
  if (typeof bool === 'boolean') {
    return bool ? EnumYesNo.yes : EnumYesNo.no;
  }
  return bool;
}

/**
 * Converts the passed in sitemap entry into one capable of being consumed by SitemapItem
 * @param {string | SitemapItemLoose} elem the string or object to be converted
 * @param {string} hostname
 * @returns SitemapItemOptions a strict sitemap item option
 */
export function normalizeURL(
  elem: string | SitemapItemLoose,
  hostname?: string,
  lastmodDateOnly = false
): SitemapItem {
  // SitemapItem
  // create object with url property
  let smi: SitemapItem = {
    img: [],
    video: [],
    links: [],
    url: '',
  };
  let smiLoose: SitemapItemLoose;
  if (typeof elem === 'string') {
    smi.url = elem;
    smiLoose = { url: elem };
  } else {
    smiLoose = elem;
  }

  smi.url = new URL(smiLoose.url, hostname).toString();

  let img: Img[] = [];
  if (smiLoose.img) {
    if (typeof smiLoose.img === 'string') {
      // string -> array of objects
      smiLoose.img = [{ url: smiLoose.img }];
    } else if (!Array.isArray(smiLoose.img)) {
      // object -> array of objects
      smiLoose.img = [smiLoose.img];
    }

    img = smiLoose.img.map(
      (el): Img => (typeof el === 'string' ? { url: el } : el)
    );
  }
  // prepend hostname to all image urls
  smi.img = img.map(
    (el: Img): Img => ({
      ...el,
      url: new URL(el.url, hostname).toString(),
    })
  );

  let links: LinkItem[] = [];
  if (smiLoose.links) {
    links = smiLoose.links;
  }
  smi.links = links.map(
    (link): LinkItem => {
      return { ...link, url: new URL(link.url, hostname).toString() };
    }
  );

  if (smiLoose.video) {
    if (!Array.isArray(smiLoose.video)) {
      // make it an array
      smiLoose.video = [smiLoose.video];
    }
    smi.video = smiLoose.video.map(
      (video): VideoItem => {
        const nv: VideoItem = {
          ...video,
          family_friendly: boolToYESNO(video.family_friendly),
          live: boolToYESNO(video.live),
          requires_subscription: boolToYESNO(video.requires_subscription),
          tag: [],
          rating: undefined,
        };

        if (video.tag !== undefined) {
          nv.tag = !Array.isArray(video.tag) ? [video.tag] : video.tag;
        }

        if (video.rating !== undefined) {
          if (typeof video.rating === 'string') {
            nv.rating = parseFloat(video.rating);
          } else {
            nv.rating = video.rating;
          }
        }

        if (typeof video.view_count === 'string') {
          nv.view_count = parseInt(video.view_count, 10);
        } else if (typeof video.view_count === 'number') {
          nv.view_count = video.view_count;
        }
        return nv;
      }
    );
  }

  // If given a file to use for last modified date
  if (smiLoose.lastmodfile) {
    const { mtime } = statSync(smiLoose.lastmodfile);

    smi.lastmod = new Date(mtime).toISOString();

    // The date of last modification (YYYY-MM-DD)
  } else if (smiLoose.lastmodISO) {
    smi.lastmod = new Date(smiLoose.lastmodISO).toISOString();
  } else if (smiLoose.lastmod) {
    smi.lastmod = new Date(smiLoose.lastmod).toISOString();
  }

  if (lastmodDateOnly && smi.lastmod) {
    smi.lastmod = smi.lastmod.slice(0, 10);
  }
  delete smiLoose.lastmodfile;
  delete smiLoose.lastmodISO;

  smi = { ...smiLoose, ...smi };
  return smi;
}
