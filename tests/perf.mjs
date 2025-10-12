/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-var-requires */
/*!
 * Sitemap performance test
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createReadStream, createWriteStream } from 'node:fs';
import { clearLine, cursorTo } from 'node:readline';
import { finished, Readable } from 'node:stream';
import { promisify } from 'node:util';
import { createGunzip } from 'node:zlib';
import MemoryStream from 'memorystream';
import {
  lineSeparatedURLsToSitemapOptions,
  SitemapStream,
  ErrorLevel,
  streamToPromise,
  XMLToSitemapItemStream,
  parseSitemap,
  mergeStreams,
} from '../dist/esm/index.js';
import stats from 'stats-lite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const finishedP = promisify(finished);

const [
  runs = 10,
  batchSize = 10,
  testName = 'stream',
  measureMemory = false,
] = process.argv.slice(2);
const unit = measureMemory ? 'mb' : 'ms';
console.log(
  'npm run test:perf -- [number of runs = 10] [batch size = 10] [stream(default)|combined] [measure peak memory = false]'
);

function resetLine() {
  clearLine(process.stderr, 0);
  cursorTo(process.stderr, 0);
}

function printPerf(label, data) {
  resetLine();
  console.log(`========= ${label} =============`);
  console.log(
    `median: %s±%s${unit}`,
    stats.median(data).toFixed(1),
    stats.stdev(data).toFixed(1)
  );

  console.log(
    `99th percentile: %s${unit}\n`,
    stats.percentile(data, 0.99).toFixed(1)
  );
}
function spinner(i, runNum, duration) {
  resetLine();
  process.stdout.write(
    `${['|', '/', '-', '\\'][i % 4]}, ${duration.toFixed()}${unit} ${runNum}`
  );
}

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

function normalizedRss() {
  const nodeVersion = Number(process.version.match(/^v(\d+\.\d+)/)[1]);
  const isMac = process.platform === 'darwin';
  // Node 20.3.0 included libuv 1.45.0, which fixes
  // Mac reporting of `maxRSS` to be `KB` insteead of `bytes`.
  // All other platforms were returning `KB` before.
  const divisor = isMac && nodeVersion < 20.3 ? 1024 ** 2 : 1024;
  return process.resourceUsage().maxRSS / divisor;
}

async function batch(durations, runNum, fn) {
  for (let i = 0; i < batchSize; i++) {
    const start = process.resourceUsage().userCPUTime;
    try {
      await fn();
    } catch (error) {
      console.error(error);
    }
    let duration;
    if (measureMemory) {
      duration = normalizedRss() | 0;
    } else {
      duration = ((process.resourceUsage().userCPUTime - start) / 1e3) | 0;
    }
    durations.push(duration);
    spinner(i, runNum, duration);
  }
}

async function run(durations, runNum, fn) {
  if (runNum < runs) {
    try {
      await batch(durations, ++runNum, fn);
    } catch (error) {
      console.error(error);
    }
    resetLine();
    const batchStart = (runNum - 1) * batchSize;
    process.stdout.write(
      `${stats
        .median(durations.slice(batchStart, batchStart + batchSize))
        .toFixed(0)}${unit} | ${stats
        .median(durations)
        .toFixed(0)}${unit} sleeping`
    );
    await delay(2000);
    return run(durations, runNum, fn);
  } else {
    return durations;
  }
}

async function testPerf(runs, batches, testName) {
  console.log(`runs: ${runs} batches: ${batches} total: ${runs * batches}`);
  switch (testName) {
    case 'promise':
      console.log('testing promise JSON read');
      printPerf(
        testName,
        await run([], 0, async () => {
          const rs = createReadStream(
            resolve(__dirname, 'mocks', 'perf-data.json.txt')
          );
          const ws = new SitemapStream({ level: ErrorLevel.SILENT });
          lineSeparatedURLsToSitemapOptions(rs).pipe(ws);
          return streamToPromise(ws);
        })
      );
      break;
    case 'stream-2':
      console.log('testing lots of data');
      printPerf(
        testName,
        await run([], 0, async () => {
          const ws = createWriteStream('/dev/null');
          const rs = createReadStream(
            resolve(__dirname, 'mocks', 'long-list.txt.gz')
          );
          lineSeparatedURLsToSitemapOptions(rs.pipe(createGunzip()))
            .pipe(new SitemapStream({ level: ErrorLevel.SILENT }))
            .pipe(ws);
          return finishedP(ws);
        })
      );
      break;
    case 'xmlstream':
      console.log('testing XML ingest stream');
      printPerf(
        testName,
        await run([], 0, async () => {
          const sms = new SitemapStream({ level: ErrorLevel.SILENT });
          const ws = createWriteStream('/dev/null');
          const rs = createReadStream(
            resolve(__dirname, 'mocks', 'perf-data.xml')
          );
          rs.pipe(new XMLToSitemapItemStream({ level: ErrorLevel.SILENT }))
            .pipe(sms)
            .pipe(ws);
          return finishedP(ws);
        })
      );
      break;
    case 'parseSitemap':
      console.log(
        'testing XML ingest with parseSitemap / load into SitemapStream memory'
      );

      printPerf(
        testName,
        await run([], 0, async () => {
          const rs = createReadStream(
            resolve(__dirname, 'mocks', 'perf-data.xml')
          );
          const items = await parseSitemap(rs);
          const sms = new SitemapStream({ level: ErrorLevel.SILENT });
          const rsItems = Readable.from(items, { objectMode: true });
          rsItems.pipe(sms);
          return streamToPromise(sms);
        })
      );
      break;
    case 'parseSitemapStreamWrite':
      console.log(
        'testing XML ingest with parseSitemap / writing to /dev/null with stream'
      );

      printPerf(
        testName,
        await run([], 0, async () => {
          const rs = createReadStream(
            resolve(__dirname, 'mocks', 'perf-data.xml')
          );
          const ws = createWriteStream('/dev/null');
          const items = await parseSitemap(rs);

          const sms = new SitemapStream({ level: ErrorLevel.SILENT });
          const rsItems = Readable.from(items, { objectMode: true });
          rsItems.pipe(sms).pipe(ws);

          return finishedP(ws);
        })
      );
      break;
    case 'parseSitemapLoopWrite':
      console.log(
        'testing XML ingest with parseSitemap / writing to /dev/null with await loop'
      );

      printPerf(
        testName,
        await run([], 0, async () => {
          const sms = new SitemapStream({ level: ErrorLevel.SILENT });
          const ws = createWriteStream('/dev/null');
          const rs = createReadStream(
            resolve(__dirname, 'mocks', 'perf-data.xml')
          );
          const items = await parseSitemap(rs);

          sms.pipe(ws);
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            await (async () =>
              new Promise((resolve, reject) => {
                sms.write(item, (error) => {
                  if (error !== undefined && error !== null) {
                    reject(error);
                  } else {
                    resolve();
                  }
                });
              }))();
          }

          // End the input stream
          sms.end();
          return finishedP(ws);
        })
      );
      break;
    case 'parseSitemapWithMerge':
      console.log(
        'testing XML ingest with parseSitemap / load into SitemapStream memory / merge with another input'
      );

      printPerf(
        testName,
        await run([], 0, async () => {
          const rs = createReadStream(
            resolve(__dirname, 'mocks', 'perf-data.json.txt')
          );
          const rsItems = lineSeparatedURLsToSitemapOptions(rs);
          const ws = createWriteStream('/dev/null');
          const moreItemsStream = new MemoryStream(undefined, {
            objectMode: true,
          });
          const sms = new SitemapStream({ level: ErrorLevel.SILENT });
          mergeStreams([rsItems, moreItemsStream], { objectMode: true })
            .pipe(sms)
            .pipe(ws);

          // Write another item to the memorystream, which should get piped into the SitemapStream
          moreItemsStream.write(
            {
              url: 'https://roosterteeth.com/some/fake/path',
            },
            () => {
              moreItemsStream.end();
            }
          );

          return finishedP(ws);
        })
      );
      break;
    case 'stream':
    default:
      console.log('testing stream');
      printPerf(
        // Hard-code the test label for the default case only
        'stream',
        await run([], 0, async () => {
          const ws = createWriteStream('/dev/null');
          const rs = createReadStream(
            resolve(__dirname, 'mocks', 'perf-data.json.txt')
          );
          lineSeparatedURLsToSitemapOptions(rs)
            .pipe(new SitemapStream({ level: ErrorLevel.SILENT }))
            .pipe(ws);
          await finishedP(ws);
        })
      );
  }
}
testPerf(runs, batchSize, testName);
