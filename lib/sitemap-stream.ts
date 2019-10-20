import { ISitemapItemOptionsLoose, ErrorLevel, ISitemapOptions } from './types';
import {
  Transform,
  TransformOptions,
  TransformCallback,
  Readable,
  Writable,
} from 'stream';
import { validateSMIOptions, normalizeURL } from './utils';
import { SitemapItemStream } from './sitemap-item';
export const preamble =
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">';
export const closetag = '</urlset>';
export interface ISitemapStreamOpts
  extends TransformOptions,
    Pick<ISitemapOptions, 'hostname' | 'level'> {}
export class SitemapStream extends Transform {
  hostname?: string;
  level: ErrorLevel;
  hasHeadOutput: boolean;
  private smiStream: SitemapItemStream;
  constructor(opts: ISitemapStreamOpts = {}) {
    opts.objectMode = true;
    super(opts);
    this.hasHeadOutput = false;
    this.hostname = opts.hostname;
    this.level = opts.level || ErrorLevel.WARN;
    this.smiStream = new SitemapItemStream({ level: opts.level });
    this.smiStream.on('data', data => this.push(data));
  }

  _transform(
    item: ISitemapItemOptionsLoose,
    encoding: string,
    callback: TransformCallback
  ): void {
    if (!this.hasHeadOutput) {
      this.hasHeadOutput = true;
      this.push(preamble);
    }
    this.smiStream.write(
      validateSMIOptions(normalizeURL(item, this.hostname)),
      this.level
    );
    callback();
  }

  _flush(cb: TransformCallback): void {
    this.push(closetag);
    cb();
  }
}

/**
 * Takes a stream returns a promise that resolves when stream emits finish
 * @param stream what you want wrapped in a promise
 */
export function streamToPromise(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject): void => {
    let drain: Buffer;
    stream
      .pipe(
        new Writable({
          write(chunk, enc, next): void {
            if (!drain) {
              drain = chunk;
            } else {
              drain = Buffer.concat([drain, chunk]);
            }
            next();
          },
        })
      )
      .on('error', reject)
      .on('finish', () => resolve(drain));
  });
}
