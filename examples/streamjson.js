// Stream read a json file and print it as xml to the console
import { parser } from 'stream-json/parser.js';
import { streamArray } from 'stream-json/streamers/stream-array.js';
//import { streamValues } from 'stream-json/streamers/stream-values.js';
import fs from 'fs';
import map from 'through2-map';
import { SitemapStream } from 'sitemap';

// our data stream:
// {total: 123456789, meta: {...}, data: [...]}
// we are interested in 'data'
/*
  const pipeline = fs
    .createReadStream("./tests/mocks/perf-data.json.txt")
    .pipe(parser.asStream())
    .pipe(streamValues.asStream())
    .pipe(map.obj(chunk => chunk.value))
    .pipe(new SitemapStream());
    */

const pipeline = fs
  .createReadStream('../tests/mocks/perf-data.json')
  .pipe(parser.asStream())
  .pipe(streamArray.asStream())
  .pipe(map.obj((chunk) => chunk.value))
  .pipe(new SitemapStream());

pipeline.on('data', (data) => console.log(data));
