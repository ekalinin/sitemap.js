const { parser } = require('stream-json/Parser');
const { streamArray } = require('stream-json/streamers/StreamArray');
//const {streamValues } = require('stream-json/streamers/StreamValues');
const fs = require('fs');
const map = require('through2-map');
const { SitemapStream } = require('./dist/index');

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

const pipeline = fs
  .createReadStream('../tests/mocks/perf-data.json')
  .pipe(parser())
  .pipe(streamArray())
  .pipe(map.obj(chunk => chunk.value))
  .pipe(new SitemapStream());

pipeline.on('data', data => console.log(data));
