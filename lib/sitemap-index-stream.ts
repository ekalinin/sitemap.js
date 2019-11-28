import { promisify } from 'util';
import { URL } from 'url';
import { stat, createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import {
  Transform,
  TransformOptions,
  TransformCallback,
  Writable,
} from 'stream';
import {
  SitemapIndexItemOptions,
  SitemapItemOptionsLoose,
  ErrorLevel,
} from './types';
import { UndefinedTargetFolder } from './errors';
import { chunk } from './utils';
import { SitemapStream } from './sitemap-stream';
import { element, otag, ctag } from './sitemap-xml';

export enum ValidIndexTagNames {
  sitemap = 'sitemap',
  loc = 'loc',
  lastmod = 'lastmod',
}

const statPromise = promisify(stat);
const preamble =
  '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
const closetag = '</sitemapindex>';
// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export interface SitemapIndexStreamOpts extends TransformOptions {
  level?: ErrorLevel;
}
const defaultStreamOpts: SitemapIndexStreamOpts = {};
export class SitemapIndexStream extends Transform {
  level: ErrorLevel;
  private hasHeadOutput: boolean;
  constructor(opts = defaultStreamOpts) {
    opts.objectMode = true;
    super(opts);
    this.hasHeadOutput = false;
    this.level = opts.level ?? ErrorLevel.WARN;
  }

  _transform(
    item: SitemapIndexItemOptions | string,
    encoding: string,
    callback: TransformCallback
  ): void {
    if (!this.hasHeadOutput) {
      this.hasHeadOutput = true;
      this.push(preamble);
    }
    this.push(otag(ValidIndexTagNames.sitemap));
    if (typeof item === 'string') {
      this.push(element(ValidIndexTagNames.loc, item));
    } else {
      this.push(element(ValidIndexTagNames.loc, item.url));
      if (item.lastmod) {
        this.push(
          element(
            ValidIndexTagNames.lastmod,
            new Date(item.lastmod).toISOString()
          )
        );
      }
    }
    this.push(ctag(ValidIndexTagNames.sitemap));
    callback();
  }

  _flush(cb: TransformCallback): void {
    this.push(closetag);
    cb();
  }
}

/**
 * Shortcut for `new SitemapIndex (...)`.
 * Create several sitemaps and an index automatically from a list of urls
 *
 * @param   {Object}        conf
 * @param   {String|Array}  conf.urls
 * @param   {String}        conf.targetFolder where do you want the generated index and maps put
 * @param   {String}        conf.hostname required for index file, will also be used as base url for sitemap items
 * @param   {String}        conf.sitemapName what do you want to name the files it generats
 * @param   {Number}        conf.sitemapSize maximum number of entries a sitemap should have before being split
 * @param   {Boolean}       conf.gzip whether to gzip the files (defaults to true)
 * @return  {SitemapIndex}
 */
export async function createSitemapsAndIndex({
  urls,
  targetFolder,
  hostname,
  sitemapName = 'sitemap',
  sitemapSize = 50000,
  gzip = true,
}: {
  urls: (string | SitemapItemOptionsLoose)[];
  targetFolder: string;
  hostname?: string;
  sitemapName?: string;
  sitemapSize?: number;
  gzip?: boolean;
}): Promise<boolean> {
  const indexStream = new SitemapIndexStream();

  try {
    const stats = await statPromise(targetFolder);
    if (!stats.isDirectory()) {
      throw new UndefinedTargetFolder();
    }
  } catch (e) {
    throw new UndefinedTargetFolder();
  }

  const indexWS = createWriteStream(
    targetFolder + '/' + sitemapName + '-index.xml'
  );
  indexStream.pipe(indexWS);
  const smPromises = chunk(urls, sitemapSize).map(
    (chunk: (string | SitemapItemOptionsLoose)[], idx): Promise<boolean> => {
      return new Promise((resolve, reject): void => {
        const extension = '.xml' + (gzip ? '.gz' : '');
        const filename = sitemapName + '-' + idx + extension;
        indexStream.write(new URL(filename, hostname).toString());

        const ws = createWriteStream(targetFolder + '/' + filename);
        const sms = new SitemapStream({ hostname });
        let pipe: Writable;
        if (gzip) {
          pipe = sms.pipe(createGzip()).pipe(ws);
        } else {
          pipe = sms.pipe(ws);
        }
        chunk.forEach(smi => sms.write(smi));
        sms.end();
        pipe.on('finish', () => resolve(true));
        pipe.on('error', e => reject(e));
      });
    }
  );
  indexWS.end();
  return Promise.all(smPromises).then(() => true);
}
