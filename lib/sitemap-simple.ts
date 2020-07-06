import {
  SitemapAndIndexStream,
  SitemapStream,
  lineSeparatedURLsToSitemapOptions,
} from '../index';
import { createGzip } from 'zlib';
import { createWriteStream, createReadStream } from 'fs';
import { resolve } from 'path';
import { Readable, pipeline as pline } from 'stream';
import { SitemapItemLoose } from './types';
import { promisify } from 'util';
import { URL } from 'url';

const pipeline = promisify(pline);
export const simpleSitemapAndIndex = ({
  hostname,
  sitemapHostname = hostname, // if different
  /**
   * Pass a line separated list of sitemap items or a stream or an array
   */
  sourceData,
  destinationDir,
  limit = 50000,
}: {
  hostname: string;
  sitemapHostname?: string;
  sourceData: SitemapItemLoose | string | Readable | string[];
  destinationDir: string;
  limit?: number;
}): Promise<void> => {
  const sitemapAndIndexStream = new SitemapAndIndexStream({
    limit,
    getSitemapStream: (i) => {
      const sitemapStream = new SitemapStream({
        hostname,
      });
      const path = `./sitemap-${i}.xml`;

      sitemapStream
        .pipe(createGzip()) // compress the output of the sitemap
        .pipe(createWriteStream(resolve(destinationDir, path + '.gz'))); // write it to sitemap-NUMBER.xml

      return [new URL(path, sitemapHostname).toString(), sitemapStream];
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
  return pipeline(
    src,
    sitemapAndIndexStream,
    createGzip(),
    createWriteStream(resolve(destinationDir, './sitemap-index.xml.gz'))
  );
};

export default simpleSitemapAndIndex;
