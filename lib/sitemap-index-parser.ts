import sax from 'sax';
import type { SAXStream } from 'sax';
import {
  Readable,
  Transform,
  type TransformOptions,
  type TransformCallback,
} from 'node:stream';
import { type IndexItem, ErrorLevel, IndexTagNames } from './types.js';
import { getURLError, isValidISODate } from './validation.js';
import { createCharDataBuffer } from './utils.js';
import { LIMITS } from './constants.js';

function isValidTagName(tagName: string): tagName is IndexTagNames {
  // This only works because the enum name and value are the same
  return tagName in IndexTagNames;
}

function tagTemplate(): IndexItem {
  return {
    url: '',
  };
}

type Logger = (
  level: 'warn' | 'error' | 'info' | 'log',
  ...message: Parameters<Console['log']>
) => void;
export interface XMLToSitemapIndexItemStreamOptions extends TransformOptions {
  level?: ErrorLevel;
  logger?: Logger | false;
}
const defaultLogger: Logger = (level, ...message) => console[level](...message);
const defaultStreamOpts: XMLToSitemapIndexItemStreamOptions = {
  logger: defaultLogger,
};

/**
 * Takes a stream of xml and transforms it into a stream of IndexItems
 * Use this to parse existing sitemap indices into config options compatible with this library
 */
export class XMLToSitemapIndexStream extends Transform {
  level: ErrorLevel;
  logger: Logger;
  error: Error | null;
  /** Number of `<sitemap>` entries seen, including any past the cap */
  entryCount: number;
  saxStream: SAXStream;
  constructor(opts = defaultStreamOpts) {
    opts.objectMode = true;
    super(opts);
    this.error = null;
    this.entryCount = 0;
    this.saxStream = sax.createStream(true, {
      xmlns: true,

      // @ts-expect-error - SAX types don't include strictEntities option
      strictEntities: true,
      trim: true,
    });
    this.level = opts.level || ErrorLevel.WARN;
    if (this.level !== ErrorLevel.SILENT && opts.logger !== false) {
      this.logger = opts.logger ?? defaultLogger;
    } else {
      this.logger = () => undefined;
    }
    let currentItem: IndexItem = tagTemplate();
    let currentTag: string;
    this.saxStream.on('opentagstart', (tag): void => {
      charData.openTag(tag.name);
      currentTag = tag.name;
    });

    this.saxStream.on('opentag', (tag): void => {
      if (!isValidTagName(tag.name)) {
        this.logger('warn', 'unhandled tag', tag.name);
        this.err(`unhandled tag: ${tag.name}`);
      }
    });

    // Per ADR 0001, CDATA sections are ordinary character data: both SAX
    // events append to one buffer, which hands the joined value for an
    // element to this handler.
    const handleCharData = (tag: string, text: string): void => {
      switch (tag) {
        case IndexTagNames.loc:
          // Validate URL for security: prevents protocol injection, checks length limits
          {
            const errMsg = getURLError(text, 'Sitemap index URL');
            if (errMsg) {
              this.logger('warn', 'Invalid URL in sitemap index:', errMsg);
              this.err(`Invalid URL in sitemap index: ${errMsg}`);
            } else {
              currentItem.url = text;
            }
          }
          break;
        case IndexTagNames.lastmod:
          // Validate date format for security and spec compliance
          if (!isValidISODate(text)) {
            this.logger(
              'warn',
              'Invalid lastmod date format in sitemap index:',
              text
            );
            this.err(`Invalid lastmod date format: ${text}`);
          } else {
            currentItem.lastmod = text;
          }
          break;
        default:
          this.logger('log', 'unhandled text for tag:', tag, `'${text}'`);
          this.err(`unhandled text for tag: ${tag} '${text}'`);
          break;
      }
    };

    const charData = createCharDataBuffer({
      onText: handleCharData,
      onOverflow: (msg): void => {
        this.logger('warn', msg);
        this.err(msg);
      },
    });
    this.saxStream.on('text', charData.append);
    this.saxStream.on('cdata', charData.append);

    this.saxStream.on('attribute', (attr): void => {
      switch (currentTag) {
        case IndexTagNames.sitemapindex:
          break;
        default:
          this.logger('log', 'unhandled attr', currentTag, attr.name);
          this.err(`unhandled attr: ${currentTag} ${attr.name}`);
      }
    });

    this.saxStream.on('closetag', (tag): void => {
      charData.closeTag();
      switch (tag) {
        case IndexTagNames.sitemap:
          this.entryCount++;
          if (this.entryCount > LIMITS.MAX_SITEMAP_ITEM_LIMIT) {
            const msg = `Sitemap index exceeds maximum of ${LIMITS.MAX_SITEMAP_ITEM_LIMIT} entries`;
            this.logger('error', msg);
            this.err(msg);
          } else if (currentItem.url) {
            // Only push items with valid URLs (non-empty after validation)
            this.push(currentItem);
          }
          currentItem = tagTemplate();
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
        callback(this.level === ErrorLevel.THROW ? this.error : null);
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
    if (!this.error) this.error = new Error(msg);
  }
}

/**
  Read xml and resolve with the configuration that would produce it or reject with
  an error
  ```
  const { createReadStream } = require('fs')
  const { parseSitemapIndex, createSitemap } = require('sitemap')
  parseSitemapIndex(createReadStream('./example-index.xml')).then(
    // produces the same xml
    // you can, of course, more practically modify it or store it
    (xmlConfig) => console.log(createSitemap(xmlConfig).toString()),
    (err) => console.log(err)
  )
  ```
  @param {Readable} xml what to parse
  @param {number} maxEntries Maximum number of sitemap entries to parse (default: 50,000 per sitemaps.org spec).
    Values above 50,000 have no effect: the spec caps a sitemap index at 50,000 entries, and larger sets must be split.
  @return {Promise<IndexItem[]>} resolves with list of index items that can be fed into a SitemapIndexStream. Rejects with an Error object.
 */
export async function parseSitemapIndex(
  xml: Readable,
  maxEntries: number = LIMITS.MAX_SITEMAP_ITEM_LIMIT
): Promise<IndexItem[]> {
  const urls: IndexItem[] = [];
  return new Promise((resolve, reject): void => {
    let settled = false;

    const parser = new XMLToSitemapIndexStream();

    // Handle source stream errors (prevents unhandled error events on xml)
    xml.on('error', (error: Error): void => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });

    xml
      .pipe(parser)
      .on('data', (smi: IndexItem) => {
        if (settled) return;
        // Security: Prevent memory exhaustion by limiting number of entries
        if (urls.length >= maxEntries) {
          settled = true;
          reject(
            new Error(
              `Sitemap index exceeds maximum allowed entries (${maxEntries})`
            )
          );
          // Immediately destroy both streams to stop further processing (BB-05)
          parser.destroy();
          xml.destroy();
          return;
        }
        urls.push(smi);
      })
      .on('end', (): void => {
        if (settled) return;
        settled = true;
        // The stream drops entries past the spec limit instead of pushing them,
        // so the count above never sees them.
        if (parser.entryCount > LIMITS.MAX_SITEMAP_ITEM_LIMIT) {
          reject(
            new Error(
              `Sitemap index exceeds maximum allowed entries (${Math.min(maxEntries, LIMITS.MAX_SITEMAP_ITEM_LIMIT)})`
            )
          );
          return;
        }
        resolve(urls);
      })
      .on('error', (error: Error): void => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      });
  });
}

export interface IndexObjectStreamToJSONOptions extends TransformOptions {
  lineSeparated: boolean;
}

const defaultObjectStreamOpts: IndexObjectStreamToJSONOptions = {
  lineSeparated: false,
};
/**
 * A Transform that converts a stream of objects into a JSON Array or a line
 * separated stringified JSON
 * @param [lineSeparated=false] whether to separate entries by a new line or comma
 */
export class IndexObjectStreamToJSON extends Transform {
  lineSeparated: boolean;
  firstWritten: boolean;

  constructor(opts = defaultObjectStreamOpts) {
    opts.writableObjectMode = true;
    super(opts);
    this.lineSeparated = opts.lineSeparated;
    this.firstWritten = false;
  }

  _transform(chunk: IndexItem, encoding: string, cb: TransformCallback): void {
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
