import { createReadStream } from 'fs';
import {
  simpleSitemapAndIndex,
  lineSeparatedURLsToSitemapOptions,
} from 'sitemap';

// writes sitemaps and index out to the destination you provide.
simpleSitemapAndIndex({
  hostname: 'https://example.com',
  destinationDir: './',
  sourceData: lineSeparatedURLsToSitemapOptions(
    createReadStream('./tests/mocks/cli-urls.json.xml')
  ),
});
