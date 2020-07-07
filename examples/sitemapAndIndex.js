const { /* createReadStream, */ createWriteStream } = require('fs');
const { resolve } = require('path');
const { createGzip } = require('zlib');
const {
  SitemapAndIndexStream,
  SitemapStream,
  // lineSeparatedURLsToSitemapOptions,
} = require('sitemap');

const sms = new SitemapAndIndexStream({
  limit: 10000, // defaults to 45k
  // SitemapAndIndexStream will call this user provided function every time
  // it needs to create a new sitemap file. You merely need to return a stream
  // for it to write the sitemap urls to and the expected url where that sitemap will be hosted
  getSitemapStream: (i) => {
    const sitemapStream = new SitemapStream({
      hostname: 'https://example.com',
    });
    const path = `./sitemap-${i}.xml`;

    sitemapStream
      .pipe(createGzip()) // compress the output of the sitemap
      .pipe(createWriteStream(resolve(path + '.gz'))); // write it to sitemap-NUMBER.xml

    return [
      new URL(path, 'https://example.com/subdir/').toString(),
      sitemapStream,
    ];
  },
});

// // when reading from a file
// lineSeparatedURLsToSitemapOptions(createReadStream('./your-data.json.txt'))
//   .pipe(sms)
//   .pipe(createGzip())
//   .pipe(createWriteStream(resolve('./sitemap-index.xml.gz')));

// or reading straight from an in-memory array
sms
  .pipe(createGzip())
  .pipe(createWriteStream(resolve('./sitemap-index.xml.gz')));

const arrayOfSitemapItems = [{ url: '/page-1/', changefreq: 'daily' }];
arrayOfSitemapItems.forEach((item) => sms.write(item));
sms.end();
