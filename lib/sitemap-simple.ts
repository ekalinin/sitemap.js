import { SitemapAndIndexStream } from './sitemap-index-stream.js';
import { SitemapStream } from './sitemap-stream.js';
import { lineSeparatedURLsToSitemapOptions } from './utils.js';
import { createGzip } from 'node:zlib';
import {
  createWriteStream,
  createReadStream,
  promises,
  WriteStream,
} from 'node:fs';
import { normalize, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { SitemapItemLoose } from './types.js';
import { URL } from 'node:url';
import {
  validateURL,
  validatePath,
  validateLimit,
  validatePublicBasePath,
  validateXSLUrl,
} from './validation.js';
/**
 * Options for the simpleSitemapAndIndex function
 */
export interface SimpleSitemapAndIndexOptions {
  /**
   * The hostname for all URLs
   * Must be a valid http:// or https:// URL
   */
  hostname: string;
  /**
   * The hostname for the sitemaps if different than hostname
   * Must be a valid http:// or https:// URL
   */
  sitemapHostname?: string;
  /**
   * The urls you want to make a sitemap out of.
   * Can be an array of items, a file path string, a Readable stream, or an array of strings
   */
  sourceData: SitemapItemLoose[] | string | Readable | string[];
  /**
   * Where to write the sitemaps and index
   * Must be a relative path without path traversal sequences
   */
  destinationDir: string;
  /**
   * Where the sitemaps are relative to the hostname. Defaults to root.
   * Must not contain path traversal sequences
   */
  publicBasePath?: string;
  /**
   * How many URLs to write before switching to a new file
   * Must be between 1 and 50,000 per sitemaps.org spec
   * @default 50000
   */
  limit?: number;
  /**
   * Whether to compress the written files
   * @default true
   */
  gzip?: boolean;
  /**
   * Optional URL to an XSL stylesheet
   * Must be a valid http:// or https:// URL
   */
  xslUrl?: string;
}

/**
 * A simpler interface for creating sitemaps and indexes.
 * Automatically handles splitting large datasets into multiple sitemap files.
 *
 * @param options - Configuration options
 * @returns A promise that resolves when all sitemaps and the index are written
 * @throws {InvalidHostnameError} If hostname or sitemapHostname is invalid
 * @throws {InvalidPathError} If destinationDir contains path traversal
 * @throws {InvalidPublicBasePathError} If publicBasePath is invalid
 * @throws {InvalidLimitError} If limit is out of range
 * @throws {InvalidXSLUrlError} If xslUrl is invalid
 * @throws {Error} If sourceData type is not supported
 */
export const simpleSitemapAndIndex = async ({
  hostname,
  sitemapHostname = hostname, // if different
  sourceData,
  destinationDir,
  limit = 50000,
  gzip = true,
  publicBasePath = './',
  xslUrl,
}: SimpleSitemapAndIndexOptions): Promise<void> => {
  // Validate all inputs upfront
  validateURL(hostname, 'hostname');
  validateURL(sitemapHostname, 'sitemapHostname');
  validatePath(destinationDir, 'destinationDir');
  validateLimit(limit);
  validatePublicBasePath(publicBasePath);
  if (xslUrl) {
    validateXSLUrl(xslUrl);
  }

  // Create destination directory with error context
  try {
    await promises.mkdir(destinationDir, { recursive: true });
  } catch (err) {
    throw new Error(
      `Failed to create destination directory "${destinationDir}": ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Normalize publicBasePath (don't mutate the parameter)
  const normalizedPublicBasePath = publicBasePath.endsWith('/')
    ? publicBasePath
    : publicBasePath + '/';

  const sitemapAndIndexStream = new SitemapAndIndexStream({
    limit,
    getSitemapStream: (i) => {
      const sitemapStream = new SitemapStream({
        hostname,
        xslUrl,
      });
      const path = `./sitemap-${i}.xml`;
      const writePath = resolve(destinationDir, path + (gzip ? '.gz' : ''));

      // Construct public path for the sitemap index
      const publicPath = normalize(normalizedPublicBasePath + path);

      // Construct the URL with proper error handling
      let sitemapUrl: string;
      try {
        sitemapUrl = new URL(
          `${publicPath}${gzip ? '.gz' : ''}`,
          sitemapHostname
        ).toString();
      } catch (err) {
        throw new Error(
          `Failed to construct sitemap URL for index ${i}: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      let writeStream: WriteStream;
      if (gzip) {
        writeStream = sitemapStream
          .pipe(createGzip()) // compress the output of the sitemap
          .pipe(createWriteStream(writePath)); // write it to sitemap-NUMBER.xml
      } else {
        writeStream = sitemapStream.pipe(createWriteStream(writePath)); // write it to sitemap-NUMBER.xml
      }

      return [sitemapUrl, sitemapStream, writeStream];
    },
  });
  // Handle different sourceData types with proper error handling
  let src: Readable;
  if (typeof sourceData === 'string') {
    try {
      src = lineSeparatedURLsToSitemapOptions(createReadStream(sourceData));
    } catch (err) {
      throw new Error(
        `Failed to read sourceData file "${sourceData}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
  } else if (sourceData instanceof Readable) {
    src = sourceData;
  } else if (Array.isArray(sourceData)) {
    src = Readable.from(sourceData);
  } else {
    throw new Error(
      `Invalid sourceData type: expected array, string (file path), or Readable stream, got ${typeof sourceData}`
    );
  }

  const writePath = resolve(
    destinationDir,
    `./sitemap-index.xml${gzip ? '.gz' : ''}`
  );

  try {
    if (gzip) {
      return await pipeline(
        src,
        sitemapAndIndexStream,
        createGzip(),
        createWriteStream(writePath)
      );
    } else {
      return await pipeline(
        src,
        sitemapAndIndexStream,
        createWriteStream(writePath)
      );
    }
  } catch (err) {
    throw new Error(
      `Failed to write sitemap files: ${err instanceof Error ? err.message : String(err)}`
    );
  }
};

export default simpleSitemapAndIndex;
