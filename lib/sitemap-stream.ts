import {
  Transform,
  TransformOptions,
  TransformCallback,
  Readable,
  Writable,
} from 'stream';
import { SitemapItemLoose, ErrorLevel, ErrorHandler } from './types';
import { validateSMIOptions, normalizeURL } from './utils';
import { SitemapItemStream } from './sitemap-item-stream';
import { EmptyStream, EmptySitemap } from './errors';

const xmlDec = '<?xml version="1.0" encoding="UTF-8"?>';
export const stylesheetInclude = (url: string): string => {
  return `<?xml-stylesheet type="text/xsl" href="${url}"?>`;
};
const urlsetTagStart =
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

export interface NSArgs {
  news: boolean;
  video: boolean;
  xhtml: boolean;
  image: boolean;
  custom?: string[];
}
const getURLSetNs: (opts: NSArgs, xslURL?: string) => string = (
  { news, video, image, xhtml, custom },
  xslURL
) => {
  let ns = xmlDec;
  if (xslURL) {
    ns += stylesheetInclude(xslURL);
  }

  ns += urlsetTagStart;

  if (news) {
    ns += ' xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"';
  }

  if (xhtml) {
    ns += ' xmlns:xhtml="http://www.w3.org/1999/xhtml"';
  }

  if (image) {
    ns += ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
  }

  if (video) {
    ns += ' xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"';
  }

  if (custom) {
    ns += ' ' + custom.join(' ');
  }

  return ns + '>';
};

export const closetag = '</urlset>';
export interface SitemapStreamOptions extends TransformOptions {
  hostname?: string;
  level?: ErrorLevel;
  lastmodDateOnly?: boolean;
  xmlns?: NSArgs;
  xslUrl?: string;
  errorHandler?: ErrorHandler;
}
const defaultXMLNS: NSArgs = {
  news: true,
  xhtml: true,
  image: true,
  video: true,
};
const defaultStreamOpts: SitemapStreamOptions = {
  xmlns: defaultXMLNS,
};
/**
 * A [Transform](https://nodejs.org/api/stream.html#stream_implementing_a_transform_stream)
 * for turning a
 * [Readable stream](https://nodejs.org/api/stream.html#stream_readable_streams)
 * of either [SitemapItemOptions](#sitemap-item-options) or url strings into a
 * Sitemap. The readable stream it transforms **must** be in object mode.
 */
export class SitemapStream extends Transform {
  hostname?: string;
  level: ErrorLevel;
  hasHeadOutput: boolean;
  xmlNS: NSArgs;
  xslUrl?: string;
  errorHandler?: ErrorHandler;
  private smiStream: SitemapItemStream;
  lastmodDateOnly: boolean;
  constructor(opts = defaultStreamOpts) {
    opts.objectMode = true;
    super(opts);
    this.hasHeadOutput = false;
    this.hostname = opts.hostname;
    this.level = opts.level || ErrorLevel.WARN;
    this.errorHandler = opts.errorHandler;
    this.smiStream = new SitemapItemStream({ level: opts.level });
    this.smiStream.on('data', (data) => this.push(data));
    this.lastmodDateOnly = opts.lastmodDateOnly || false;
    this.xmlNS = opts.xmlns || defaultXMLNS;
    this.xslUrl = opts.xslUrl;
  }

  _transform(
    item: SitemapItemLoose,
    encoding: string,
    callback: TransformCallback
  ): void {
    if (!this.hasHeadOutput) {
      this.hasHeadOutput = true;
      this.push(getURLSetNs(this.xmlNS, this.xslUrl));
    }
    if (
      !this.smiStream.write(
        validateSMIOptions(
          normalizeURL(item, this.hostname, this.lastmodDateOnly),
          this.level,
          this.errorHandler
        )
      )
    ) {
      this.smiStream.once('drain', callback);
    } else {
      process.nextTick(callback);
    }
  }

  _flush(cb: TransformCallback): void {
    if (!this.hasHeadOutput) {
      cb(new EmptySitemap());
    } else {
      this.push(closetag);
      cb();
    }
  }
}

/**
 * Takes a stream returns a promise that resolves when stream emits finish
 * @param stream what you want wrapped in a promise
 */
export function streamToPromise(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject): void => {
    const drain: Buffer[] = [];
    stream
      .pipe(
        new Writable({
          write(chunk, enc, next): void {
            drain.push(chunk);
            next();
          },
        })
      )
      .on('error', reject)
      .on('finish', () => {
        if (!drain.length) {
          reject(new EmptyStream());
        } else {
          resolve(Buffer.concat(drain));
        }
      });
  });
}
