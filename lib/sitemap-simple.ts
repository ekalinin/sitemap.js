import {
  SitemapAndIndexStream,
  SitemapStream,
  lineSeparatedURLsToSitemapOptions,
} from '../index';
import { createGzip } from 'zlib';
import { createWriteStream, createReadStream, promises } from 'fs';
import { normalize, resolve } from 'path';
import { Readable, pipeline as pline } from 'stream';
import { SitemapItemLoose } from './types';
import { promisify } from 'util';
import { URL } from 'url';
import { WriteStream } from 'fs';

const pipeline = promisify(pline);

function defaultNameGenerator(index: number) {
  return `./sitemap-${index}.xml`;
}

/**
 *
 * @param {object} options -
 * @param {string} options.hostname - The hostname for all URLs
 * @param {string} [options.sitemapHostname] - The hostname for the sitemaps if different than hostname
 * @param {SitemapItemLoose[] | string | Readable | string[]} options.sourceData - The urls you want to make a sitemap out of.
 * @param {string} options.destinationDir - where to write the sitemaps and index
 * @param {string} [options.publicBasePath] - where the sitemaps are relative to the hostname. Defaults to root.
 * @param {number} [options.limit] - how many URLs to write before switching to a new file. Defaults to 50k
 * @param {boolean} [options.gzip] - whether to compress the written files. Defaults to true
 * @returns {Promise<void>} an empty promise that resolves when everything is done
 */
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
  publicBasePath = './',
  nameGenerator = defaultNameGenerator,
}: {
  hostname: string;
  sitemapHostname?: string;
  sourceData: SitemapItemLoose[] | string | Readable | string[];
  destinationDir: string;
  publicBasePath?: string;
  limit?: number;
  gzip?: boolean;
  nameGenerator?: (index: number) => string;
}): Promise<void> => {
  await promises.mkdir(destinationDir, { recursive: true });
  const sitemapAndIndexStream = new SitemapAndIndexStream({
    limit,
    getSitemapStream: (i) => {
      const sitemapStream = new SitemapStream({
        hostname,
      });
      const path = nameGenerator(i);
      const writePath = resolve(destinationDir, path + (gzip ? '.gz' : ''));
      if (!publicBasePath.endsWith('/')) {
        publicBasePath += '/';
      }
      const publicPath = normalize(publicBasePath + path);

      let pipeline: WriteStream;
      if (gzip) {
        pipeline = sitemapStream
          .pipe(createGzip()) // compress the output of the sitemap
          .pipe(createWriteStream(writePath)); // write it to sitemap-NUMBER.xml
      } else {
        pipeline = sitemapStream.pipe(createWriteStream(writePath)); // write it to sitemap-NUMBER.xml
      }

      return [
        new URL(
          `${publicPath}${gzip ? '.gz' : ''}`,
          sitemapHostname
        ).toString(),
        sitemapStream,
        pipeline,
      ];
    },
  });
  let src: Readable;
  if (typeof sourceData === 'string') {
    src = lineSeparatedURLsToSitemapOptions(createReadStream(sourceData));
  } else if (sourceData instanceof Readable) {
    src = sourceData;
  } else if (Array.isArray(sourceData)) {
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
