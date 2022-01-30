/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const { resolve } = require('path');
const { SitemapStream } = require('../dist/index');
// external libs provided as example only
const Pick = require('stream-json/filters/Pick');
const { streamArray } = require('stream-json/streamers/StreamArray');
const map = require('through2-map');
const { pipeline } = require('stream/promises');

async function run() {
  // parsing JSON file

  await pipeline(
    fs.createReadStream(resolve(__dirname, 'mocks', 'sampleconfig.json')),
    Pick.withParser({ filter: 'urls' }),
    streamArray(),
    map.obj((chunk) => chunk.value),
    // SitemapStream does the heavy lifting
    // You must provide it with an object stream
    new SitemapStream({ hostname: 'https://roosterteeth.com?&><\'"' }),
    process.stdout
  );
}
run();
/*
let urls = []
config.urls.forEach((smi) => {
  urls.push(validateSMIOptions(Sitemap.normalizeURL(smi, 'https://roosterteeth.com')))
})
config.urls = urls
  console.log(JSON.stringify(config, null, 2))
  */
