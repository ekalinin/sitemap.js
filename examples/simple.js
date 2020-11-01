const { createReadStream } = require('fs');
const {
  simpleSitemapAndIndex,
  lineSeparatedURLsToSitemapOptions,
} = require('../dist/index');

// writes sitemaps and index out to the destination you provide.
simpleSitemapAndIndex({
  hostname: 'https://example.com',
  destinationDir: './',
  sourceData: lineSeparatedURLsToSitemapOptions(
    createReadStream('./tests/mocks/cli-urls.json.xml')
  ),
});
