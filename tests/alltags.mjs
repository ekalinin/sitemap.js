import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { SitemapStream } from '../dist/index.js';
// external libs provided as example only
import { pick } from 'stream-json/filters/pick.js';
import { streamArray } from 'stream-json/streamers/stream-array.js';
import map from 'through2-map';
import { pipeline } from 'node:stream/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  // parsing JSON file

  await pipeline(
    createReadStream(resolve(__dirname, 'mocks', 'sampleconfig.json')),
    pick.withParserAsStream({ filter: 'urls' }),
    streamArray.asStream(),
    map.obj((chunk) => chunk.value),
    // SitemapStream does the heavy lifting
    // You must provide it with an object stream
    new SitemapStream({ hostname: 'https://roosterteeth.com?&><\'"' }),
    process.stdout
  );
}
run();
