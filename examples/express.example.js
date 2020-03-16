const express = require('express');
const fs = require('fs');
const { resolve } = require('path');
const { SitemapStream, streamToPromise } = require('../dist/index');
// external libs provided as example only
const { parser } = require('stream-json/Parser');
const { streamArray } = require('stream-json/streamers/StreamArray');
const map = require('through2-map');
const { createGzip } = require('zlib');

const app = express();
let sitemap;

app.get('/sitemap.xml', function(req, res) {
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
      .pipe(map.obj(chunk => chunk.value))
      .pipe(new SitemapStream({ hostname: 'https://example.com/' }))
      .pipe(createGzip());

    // This takes the result and stores it in memory - > 50mb
    streamToPromise(gzippedStream).then(sm => (sitemap = sm));
    // stream the response to the client at the same time
    gzippedStream.pipe(res).on('error', e => {
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
