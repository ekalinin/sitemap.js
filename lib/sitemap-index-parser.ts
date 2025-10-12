import * as sax from 'sax';
import { SAXStream } from 'sax';
import {
  Readable,
  Transform,
  TransformOptions,
  TransformCallback,
} from 'node:stream';
import { IndexItem, ErrorLevel, IndexTagNames } from './types';

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
  saxStream: SAXStream;
  constructor(opts = defaultStreamOpts) {
    opts.objectMode = true;
    super(opts);
    this.error = null;
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
      currentTag = tag.name;
    });

    this.saxStream.on('opentag', (tag): void => {
      if (!isValidTagName(tag.name)) {
        this.logger('warn', 'unhandled tag', tag.name);
        this.err(`unhandled tag: ${tag.name}`);
      }
    });

    this.saxStream.on('text', (text): void => {
      switch (currentTag) {
        case IndexTagNames.loc:
          currentItem.url = text;
          break;
        case IndexTagNames.lastmod:
          currentItem.lastmod = text;
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
        case IndexTagNames.loc:
          currentItem.url = text;
          break;
        case IndexTagNames.lastmod:
          currentItem.lastmod = text;
          break;
        default:
          this.logger('log', 'unhandled cdata for tag:', currentTag);
          this.err(`unhandled cdata for tag: ${currentTag}`);
          break;
      }
    });

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
      switch (tag) {
        case IndexTagNames.sitemap:
          this.push(currentItem);
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
  @return {Promise<IndexItem[]>} resolves with list of index items that can be fed into a SitemapIndexStream. Rejects with an Error object.
 */
export async function parseSitemapIndex(xml: Readable): Promise<IndexItem[]> {
  const urls: IndexItem[] = [];
  return new Promise((resolve, reject): void => {
    xml
      .pipe(new XMLToSitemapIndexStream())
      .on('data', (smi: IndexItem) => urls.push(smi))
      .on('end', (): void => {
        resolve(urls);
      })
      .on('error', (error: Error): void => {
        reject(error);
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
