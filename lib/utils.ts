/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
import {
  createWriteStream,
  existsSync,
  statSync,
  type WriteStream,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  pipeline,
  Readable,
  Transform,
  PassThrough,
  type ReadableOptions,
  type TransformOptions,
  type Writable,
} from 'node:stream';
import { createInterface, Interface } from 'node:readline';
import { createGzip } from 'node:zlib';
import { URL } from 'node:url';
import type {
  SitemapItem,
  SitemapItemLoose,
  Img,
  LinkItem,
  VideoItem,
  CharDataBuffer,
  CharDataHandlers,
  SitemapFileOptions,
} from './types.js';
import { EnumYesNo } from './types.js';
import { LIMITS } from './constants.js';
import { validateURL } from './validation.js';

/**
 * Per ADR 0001, CDATA sections are ordinary character data: wire both the SAX
 * `text` and `cdata` events to `append`. Character data is joined, trimmed and
 * handed to `onText` once at the next tag boundary, attributed to the innermost
 * open element (which is not the last opened tag once a child has closed).
 * An element whose character data exceeds LIMITS.MAX_PARSER_CHAR_DATA_LENGTH is
 * dropped and reported through `onOverflow` to bound memory use.
 */
export function createCharDataBuffer({
  onText,
  onOverflow,
}: CharDataHandlers): CharDataBuffer {
  let charData = '';
  let overflow = false;
  const openTags: string[] = [];

  const flush = (): void => {
    const tag = openTags[openTags.length - 1];
    const text = charData.trim();
    charData = '';
    if (overflow) {
      overflow = false;
      onOverflow(
        `character data for ${tag} exceeds max length of ${LIMITS.MAX_PARSER_CHAR_DATA_LENGTH}`
      );
    } else if (text) {
      onText(tag, text);
    }
  };

  return {
    openTag(name: string): void {
      flush();
      openTags.push(name);
    },
    append(text: string): void {
      if (overflow) {
        return;
      }
      if (charData.length + text.length > LIMITS.MAX_PARSER_CHAR_DATA_LENGTH) {
        overflow = true;
        charData = '';
        return;
      }
      charData += text;
    },
    closeTag(): void {
      flush();
      openTags.pop();
    },
  };
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
 * Returns `err` if it is an Error, or wraps it in one, for passing a caught
 * value to a stream callback
 */
export function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

function boolToYESNO(bool?: boolean | EnumYesNo): EnumYesNo | undefined {
  if (bool === undefined) {
    return undefined;
  }
  if (typeof bool === 'boolean') {
    return bool ? EnumYesNo.yes : EnumYesNo.no;
  }
  return bool;
}

/**
 * Converts a numeric string priority, such as `'0.5'`, to a number. Returns
 * any other value unchanged, for validateSMIOptions to report.
 */
function toPriority(priority: number | string): number {
  if (
    typeof priority === 'string' &&
    LIMITS.PRIORITY_STRING_REGEX.test(priority)
  ) {
    return Number(priority);
  }
  // Not a number: passed through so validation reports it at WARN and THROW
  return priority as number;
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
  const smi: SitemapItem = {
    img: [],
    video: [],
    links: [],
    url: '',
  };

  if (typeof elem === 'string') {
    smi.url = new URL(elem, hostname).toString();
    return smi;
  }

  const {
    url,
    img,
    links,
    video,
    lastmodfile,
    lastmodISO,
    lastmod,
    priority,
    ...other
  } = elem;

  Object.assign(smi, other);

  if (priority !== undefined) {
    smi.priority = toPriority(priority);
  }

  smi.url = new URL(url, hostname).toString();

  if (img) {
    // prepend hostname to all image urls
    smi.img = (Array.isArray(img) ? img : [img]).map((el): Img =>
      typeof el === 'string'
        ? { url: new URL(el, hostname).toString() }
        : { ...el, url: new URL(el.url, hostname).toString() }
    );
  }

  if (links) {
    smi.links = links.map((link: LinkItem) => ({
      ...link,
      url: new URL(link.url, hostname).toString(),
    }));
  }

  if (video) {
    smi.video = (Array.isArray(video) ? video : [video]).map(
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
            const parsedRating = parseFloat(video.rating);
            // Validate parsed rating is a valid number
            if (Number.isNaN(parsedRating)) {
              throw new Error(
                `Invalid video rating "${video.rating}" for URL "${elem.url}": must be a valid number`
              );
            }
            nv.rating = parsedRating;
          } else {
            nv.rating = video.rating;
          }
        }

        if (typeof video.view_count === 'string') {
          const parsedViewCount = parseInt(video.view_count, 10);
          // Validate parsed view count is a valid non-negative integer
          if (Number.isNaN(parsedViewCount)) {
            throw new Error(
              `Invalid video view_count "${video.view_count}" for URL "${elem.url}": must be a valid number`
            );
          }
          if (parsedViewCount < 0) {
            throw new Error(
              `Invalid video view_count "${video.view_count}" for URL "${elem.url}": cannot be negative`
            );
          }
          nv.view_count = parsedViewCount;
        } else if (typeof video.view_count === 'number') {
          nv.view_count = video.view_count;
        }
        return nv;
      }
    );
  }

  // If given a file to use for last modified date
  if (lastmodfile) {
    const { mtime } = statSync(lastmodfile);
    const lastmodDate = new Date(mtime);

    // Validate date is valid
    if (Number.isNaN(lastmodDate.getTime())) {
      throw new Error(
        `Invalid date from file stats for URL "${smi.url}": file modification time is invalid`
      );
    }

    smi.lastmod = lastmodDate.toISOString();

    // The date of last modification (YYYY-MM-DD)
  } else if (lastmodISO) {
    const lastmodDate = new Date(lastmodISO);

    // Validate date is valid
    if (Number.isNaN(lastmodDate.getTime())) {
      throw new Error(
        `Invalid lastmodISO "${lastmodISO}" for URL "${smi.url}": must be a valid date string`
      );
    }

    smi.lastmod = lastmodDate.toISOString();
  } else if (lastmod) {
    const lastmodDate = new Date(lastmod);

    // Validate date is valid
    if (Number.isNaN(lastmodDate.getTime())) {
      throw new Error(
        `Invalid lastmod "${lastmod}" for URL "${smi.url}": must be a valid date string`
      );
    }

    smi.lastmod = lastmodDate.toISOString();
  }

  if (lastmodDateOnly && smi.lastmod) {
    smi.lastmod = smi.lastmod.slice(0, 10);
  }

  return smi;
}

/**
 * Connects a sitemap to the stream that writes its file, through gzip when
 * `gzip` is true. Uses `pipeline()`, which destroys every stream when one
 * fails, so a gzip failure also fails `writeStream`, which
 * `SitemapAndIndexStream` watches.
 *
 * @param onError - Called with the error if the pipeline fails.
 */
export function pipeSitemapToFile(
  sitemap: Readable,
  writeStream: Writable,
  gzip: boolean,
  onError: (err: Error) => void
): void {
  const streams = gzip
    ? [sitemap, createGzip(), writeStream]
    : [sitemap, writeStream];
  pipeline(streams, (err) => {
    if (err) {
      onError(err);
    }
  });
}

/**
 * Walks up from `fromDir` to the filesystem root and returns the first path
 * where `relativePath` exists, or undefined if there is none.
 *
 * Used to find files that ship with the package (`package.json`, the schema)
 * from a module's own directory, whatever the build's output layout.
 */
export function findUp(
  relativePath: string,
  fromDir: string
): string | undefined {
  let dir = fromDir;
  for (;;) {
    const candidate = resolve(dir, relativePath);
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

/**
 * Opens sitemap number `index` as a file, for a `SitemapAndIndexStream`
 * `getSitemapStream` callback: names it `sitemap-N.xml` (`.xml.gz` when
 * gzipped), builds its URL, checks the URL before creating the file so a URL
 * the index would reject leaves no empty file behind, and pipes `sitemap` into
 * it.
 *
 * @returns the `[url, sitemap, writeStream]` tuple `getSitemapStream` returns
 */
export function openSitemapFile<S extends Readable>(
  index: number,
  sitemap: S,
  { destinationDir, gzip, toURL, urlParamName, onError }: SitemapFileOptions
): [string, S, WriteStream] {
  const fileName = `sitemap-${index}.xml${gzip ? '.gz' : ''}`;
  const url = toURL(fileName);
  validateURL(url, urlParamName);

  const writeStream = createWriteStream(resolve(destinationDir, fileName));
  // SitemapAndIndexStream watches writeStream; onError reports any failure
  // that comes after it stopped watching.
  pipeSitemapToFile(sitemap, writeStream, gzip, onError);
  return [url, sitemap, writeStream];
}

/**
 * Message text of a caught value, for embedding in a wrapping error's message.
 * @param err - anything caught by a `catch` clause
 */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
