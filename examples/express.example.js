import express from 'express';
import fs from 'fs';
import { resolve } from 'path';
import { SitemapStream, streamToPromise } from 'sitemap';
// external libs provided as example only
import { parser } from 'stream-json/Parser';
import { streamArray } from 'stream-json/streamers/StreamArray';
import map from 'through2-map';
import { createGzip } from 'zlib';

const app = express();
let sitemap;

app.get('/sitemap.xml', function (req, res) {
  res.header('Content-Type', 'application/xml');
  res.header('Content-Encoding', 'gzip');
  // if we have a cached entry send it
  if (sitemap) {
    res.send(sitemap);
    return;
  }
  try {
    // this could just as easily be a db response
    const gzippedStream = fs
      // read our list of urls in
      .createReadStream(
        resolve(__dirname, '..', 'tests', 'mocks', 'perf-data.json')
      )
      // stream parse the json - this avoids having to pull the entire file into memory
      .pipe(parser())
      .pipe(streamArray()) // replace with streamValues for JSONStream
      .pipe(map.obj((chunk) => chunk.value))
      .pipe(new SitemapStream({ hostname: 'https://example.com/' }))
      .pipe(createGzip());

    // This takes the result and stores it in memory - > 50mb
    streamToPromise(gzippedStream).then((sm) => (sitemap = sm));
    // stream the response to the client at the same time
    gzippedStream.pipe(res).on('error', (e) => {
      throw e;
    });
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
});

app.listen(3000, async () => {
  console.log('pipeline done');
});
