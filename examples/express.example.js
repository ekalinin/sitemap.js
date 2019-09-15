const express = require('express')
const fs = require('fs');
const { resolve } = require('path');
const { SitemapStream } = require('../dist/index')
// external libs provided as example only
const { parser } = require('stream-json/Parser');
const { streamArray } = require('stream-json/streamers/StreamArray');
const { streamValues } = require('stream-json/streamers/StreamValues');
const map = require('through2-map')
const { pipeline: pipe, Writable } = require('stream')
const pipeline = require('util').promisify(pipe)
const { createGzip } = require('zlib')

const app = express()
let sitemap

const fn = async () =>
  pipeline(
    // this could just as easily be a db response
    fs.createReadStream(resolve(__dirname, '..', 'tests', 'mocks', 'perf-data.json')),
    parser(),
    streamArray(), // replace with streamValues for JSONStream
    map.obj(chunk => chunk.value),
    new SitemapStream({ hostname: 'https://example.com/' }),
    createGzip(),
    new Writable({write (chunk, a, cb) {
      if (!sitemap) {
        sitemap = chunk
      } else {
        sitemap = Buffer.concat([sitemap, chunk]);
      }
      cb()
    }})
  )


app.get('/sitemap.xml', function(req, res) {
  try {
    res.header('Content-Type', 'application/xml');
    res.header('Content-Encoding', 'gzip');
    res.send( sitemap );
  } catch (e) {
    console.error(e)
    res.status(500).end()
  }
});

app.listen(3000, async () => {
   await fn().catch(console.error);
  console.log('pipeline done')
});
