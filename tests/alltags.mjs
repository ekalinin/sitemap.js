import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { SitemapStream } from '../dist/esm/index.js';
// external libs provided as example only
import Pick from 'stream-json/filters/Pick.js';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import map from 'through2-map';
import { pipeline } from 'node:stream/promises';

const { streamArray } = StreamArray;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  // parsing JSON file

  await pipeline(
    createReadStream(resolve(__dirname, 'mocks', 'sampleconfig.json')),
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
