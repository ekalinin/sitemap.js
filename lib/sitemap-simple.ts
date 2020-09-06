import {
  SitemapAndIndexStream,
  SitemapStream,
  lineSeparatedURLsToSitemapOptions,
} from '../index';
import { createGzip } from 'zlib';
import { createWriteStream, createReadStream, promises } from 'fs';
import { resolve } from 'path';
import { Readable, pipeline as pline } from 'stream';
import { SitemapItemLoose } from './types';
import { promisify } from 'util';
import { URL } from 'url';

const isIterable = <T>(thing: unknown): thing is Iterable<T> =>
  typeof thing === 'object' &&
  thing !== null &&
  Symbol.iterator in thing &&
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  typeof thing[Symbol.iterator] === 'function';

const isAsyncIterable = <t>(thing: unknown): thing is AsyncIterable<t> =>
  typeof thing === 'object' &&
  thing !== null &&
  Symbol.asyncIterator in thing &&
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  typeof thing[Symbol.asyncIterator] === 'function';

// TODO explore async iterators
const pipeline = promisify(pline);
export const simpleSitemapAndIndex = async ({
  hostname,
  sitemapHostname = hostname, // if different
  /**
   * Pass a line separated list of sitemap items or a stream or an array
   */
  sourceData,
  destinationDir,
  limit = 50000,
  gzip = true,
}: {
  hostname: string;
  sitemapHostname?: string;
  sourceData:
    | string
    | Readable
    | Iterable<string | SitemapItemLoose>
    | AsyncIterable<string | SitemapItemLoose>;
  destinationDir: string;
  limit?: number;
  gzip?: boolean;
}): Promise<void> => {
  await promises.mkdir(destinationDir, { recursive: true });
  const sitemapAndIndexStream = new SitemapAndIndexStream({
    limit,
    getSitemapStream: (i) => {
      const sitemapStream = new SitemapStream({
        hostname,
      });
      const path = `./sitemap-${i}.xml`;
      const writePath = resolve(destinationDir, path + (gzip ? '.gz' : ''));

      if (gzip) {
        sitemapStream
          .pipe(createGzip()) // compress the output of the sitemap
          .pipe(createWriteStream(writePath)); // write it to sitemap-NUMBER.xml
      } else {
        sitemapStream.pipe(createWriteStream(writePath)); // write it to sitemap-NUMBER.xml
      }

      return [new URL(path, sitemapHostname).toString(), sitemapStream];
    },
  });
  let src: Readable;
  if (typeof sourceData === 'string') {
    src = lineSeparatedURLsToSitemapOptions(createReadStream(sourceData));
  } else if (sourceData instanceof Readable) {
    src = sourceData;
  } else if (isIterable(sourceData) || isAsyncIterable(sourceData)) {
    src = Readable.from(sourceData);
  } else {
    throw new Error(
      "unhandled source type. You've passed in data that is not supported"
    );
  }

  const writePath = resolve(
    destinationDir,
    `./sitemap-index.xml${gzip ? '.gz' : ''}`
  );
  if (gzip) {
    return pipeline(
      src,
      sitemapAndIndexStream,
      createGzip(),
      createWriteStream(writePath)
    );
  } else {
    return pipeline(src, sitemapAndIndexStream, createWriteStream(writePath));
  }
};

export default simpleSitemapAndIndex;
