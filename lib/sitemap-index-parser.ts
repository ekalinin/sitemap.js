import type { QualifiedAttribute } from 'sax';
import {
  Readable,
  Transform,
  type TransformOptions,
  type TransformCallback,
} from 'node:stream';
import {
  type IndexItem,
  type XMLToSitemapIndexItemStreamOptions,
  IndexTagNames,
} from './types.js';
import {
  getURLError,
  isValidISODate,
  isValidMaxEntries,
} from './validation.js';
import { LIMITS } from './constants.js';
import { SaxParserStream, collectEntries } from './sax-parser-stream.js';

function isValidTagName(tagName: string): tagName is IndexTagNames {
  // This only works because the enum name and value are the same
  return tagName in IndexTagNames;
}

function tagTemplate(): IndexItem {
  return {
    url: '',
  };
}

export type { XMLToSitemapIndexItemStreamOptions };
const defaultStreamOpts: XMLToSitemapIndexItemStreamOptions = {};

/**
 * Takes a stream of xml and transforms it into a stream of IndexItems
 * Use this to parse existing sitemap indices into config options compatible with this library
 *
 * Emits `'maxEntriesExceeded'` (with the cap) once, when the first entry past
 * `maxEntries` is seen. If nothing listens for that event, the stream logs the
 * overflow through its logger instead.
 */
export class XMLToSitemapIndexStream extends SaxParserStream<IndexItem> {
  private currentItem: IndexItem = tagTemplate();

  constructor(opts = defaultStreamOpts) {
    super(opts, {
      isKnownTag: isValidTagName,
      overflowMessage: (max) =>
        `Sitemap index exceeds maximum of ${max} entries`,
    });
  }

  protected onCharData(tag: string, text: string): void {
    switch (tag) {
      case IndexTagNames.loc:
        // Validate URL for security: prevents protocol injection, checks length limits
        {
          const errMsg = getURLError(text, 'Sitemap index URL');
          if (errMsg) {
            this.report('warn', `Invalid URL in sitemap index: ${errMsg}`);
          } else {
            this.currentItem.url = text;
          }
        }
        break;
      case IndexTagNames.lastmod:
        // Validate date format for security and spec compliance
        if (!isValidISODate(text)) {
          this.report(
            'warn',
            `Invalid lastmod date format in sitemap index: ${text}`
          );
        } else {
          this.currentItem.lastmod = text;
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
      case IndexTagNames.sitemapindex:
        break;
      default:
        this.logger('log', 'unhandled attr', currentTag, attr.name);
        this.err(`unhandled attr: ${currentTag} ${attr.name}`);
    }
  }

  protected onCloseTag(tag: string): void {
    if (tag === IndexTagNames.sitemap) {
      // Only emit items with valid URLs (non-empty after validation). Invalid
      // ones were already reported and don't count toward maxEntries.
      if (this.currentItem.url) {
        this.emitEntry(this.currentItem);
      }
      this.currentItem = tagTemplate();
    }
  }
}

/**
  Read xml and resolve with the configuration that would produce it or reject with
  an error
  ```
  import { createReadStream } from 'fs'
  import { Readable } from 'stream'
  import { parseSitemapIndex, SitemapIndexStream, streamToPromise } from 'sitemap'
  const items = await parseSitemapIndex(createReadStream('./example-index.xml'))
  // produces the same xml
  // you can, of course, more practically modify it or store it
  const smis = new SitemapIndexStream()
  Readable.from(items).pipe(smis)
  console.log((await streamToPromise(smis)).toString())
  ```
  @param {Readable} xml what to parse
  @param {number} maxEntries Maximum number of sitemap entries to parse (default: 50,000 per sitemaps.org spec).
    Values above 50,000 have no effect: the spec caps a sitemap index at 50,000 entries, and larger sets must be split.
    0 rejects on the first entry. Anything other than a non-negative integer or Infinity rejects immediately.
  @return {Promise<IndexItem[]>} resolves with list of index items that can be fed into a SitemapIndexStream. Rejects with an Error object.
 */
export async function parseSitemapIndex(
  xml: Readable,
  maxEntries: number = LIMITS.MAX_SITEMAP_ITEM_LIMIT
): Promise<IndexItem[]> {
  if (!isValidMaxEntries(maxEntries)) {
    // Release the source before rejecting; nothing else will read it
    xml.destroy();
    throw new Error(
      `maxEntries must be a non-negative integer or Infinity, got ${maxEntries}`
    );
  }

  // The spec caps an index at 50,000 entries, so a larger maxEntries has no
  // effect. The stream drops entries past this cap instead of pushing them.
  const cap = Math.min(maxEntries, LIMITS.MAX_SITEMAP_ITEM_LIMIT);
  // Listening for the overflow also stops the parser logging it, since this
  // rejection already reports it.
  return collectEntries(
    xml,
    new XMLToSitemapIndexStream({ maxEntries: cap }),
    (): Error =>
      new Error(`Sitemap index exceeds maximum allowed entries (${cap})`)
  );
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
