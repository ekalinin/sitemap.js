const { parser } = require('stream-json/Parser');
const { streamArray } = require('stream-json/streamers/StreamArray');
//const {streamValues } = require('stream-json/streamers/StreamValues');
const fs = require('fs');
const { resolve } = require('path');
const map = require('through2-map')
const { SitemapStream, XMLToISitemapOptions, ObjectStreamToJSON } = require('../dist/index')

// our data stream:
// {total: 123456789, meta: {...}, data: [...]}
// we are interested in 'data'
  /*
  const pipeline = fs
    .createReadStream("./tests/mocks/perf-data.json.txt")
    .pipe(parser())
    .pipe(streamValues())
    .pipe(map.obj(chunk => chunk.value))
    .pipe(new SitemapStream());
    */
const smStream = new SitemapStream()
const pipeline =
  process.stdin
  .pipe(parser())
  .pipe(streamArray())
  .pipe(map.obj(chunk => chunk.value))
  .pipe(new SitemapStream())
  .pipe(new XMLToISitemapOptions())
  .pipe(smStream)
  .pipe(new XMLToISitemapOptions())
  .pipe(new ObjectStreamToJSON())
  .pipe(process.stdout);
  pipeline.on('finished', () => console.log('finished'))
  pipeline.on('error', e => e.code === 'EPIPE' || console.error(e))
  // smStream.write({url: 'http://example.com/foo/bir'})
  // smStream.write({url: 'http://example.com/foo/bar'})
