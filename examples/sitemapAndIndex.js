import { /* createReadStream, */ createWriteStream } from 'fs';
import { resolve } from 'path';
import { createGzip } from 'zlib';
import {
  SitemapAndIndexStream,
  SitemapStream,
  // lineSeparatedURLsToSitemapOptions,
} from 'sitemap';

const sms = new SitemapAndIndexStream({
  limit: 10000, // defaults to 45k
  // SitemapAndIndexStream will call this user provided function every time
  // it needs to create a new sitemap file. You merely need to return a stream
  // for it to write the sitemap urls to and the expected url where that sitemap will be hosted
  getSitemapStream: (i) => {
    const sitemapStream = new SitemapStream({
      hostname: 'https://example.ru/',
    });
    const path = `./sitemap-${i}.xml`;

    const ws = createWriteStream(resolve(path + '.gz'));
    sitemapStream
      .pipe(createGzip()) // compress the output of the sitemap
      .pipe(ws); // write it to sitemap-NUMBER.xml

    return [
      new URL(path, 'https://example.com/subdir/').toString(),
      sitemapStream,
      ws,
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

const arrayOfSitemapItems = [
  { url: '/page-1/', changefreq: 'daily' },
  {
    url: '/docs',
    links: [
      { lang: 'ru', url: 'https://example.ru/docs' },
      { lang: 'en', url: 'https://example.com/docs' },
    ],
  },
];
arrayOfSitemapItems.forEach((item) => sms.write(item));
sms.end();
