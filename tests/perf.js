/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-var-requires */
/*!
 * Sitemap performance test
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

'use strict';
const { resolve } = require('path');
const { createReadStream, createWriteStream } = require('fs');
const { clearLine, cursorTo } = require('readline');
const { finished } = require('stream');
const { promisify } = require('util');
const { createGunzip } = require('zlib');
const {
  lineSeparatedURLsToSitemapOptions,
  SitemapStream,
  ErrorLevel,
} = require('../dist/index');
const finishedP = promisify(finished);

const stats = require('stats-lite');
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
  return new Promise(resolve => setTimeout(resolve, time));
}

async function batch(durations, runNum, fn) {
  for (let i = 0; i < batchSize; i++) {
    const start = process.resourceUsage().userCPUTime;
    await fn();
    let duration;
    if (measureMemory) {
      duration = (process.resourceUsage().maxRSS / 1024 ** 2) | 0;
    } else {
      duration = ((process.resourceUsage().userCPUTime - start) / 1e3) | 0;
    }
    durations.push(duration);
    spinner(i, runNum, duration);
  }
}

async function run(durations, runNum, fn) {
  if (runNum < runs) {
    await batch(durations, ++runNum, fn);
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
    case 'stream-2':
      console.log('testing lots of data');
      printPerf(
        'stream',
        await run([], 0, () => {
          const ws = createWriteStream('/dev/null');
          const rs = createReadStream(
            resolve(__dirname, 'mocks', 'long-list.txt.gz')
          );
          lineSeparatedURLsToSitemapOptions(rs.pipe(createGunzip()))
            .pipe(new SitemapStream({ level: ErrorLevel.SILENT }))
            .pipe(ws);
          return finishedP(rs);
        })
      );
      break;
    case 'stream':
    default:
      console.log('testing stream');
      printPerf(
        'stream',
        await run([], 0, () => {
          const ws = createWriteStream('/dev/null');
          const rs = createReadStream(
            resolve(__dirname, 'mocks', 'perf-data.json.txt')
          );
          lineSeparatedURLsToSitemapOptions(rs)
            .pipe(new SitemapStream({ level: ErrorLevel.SILENT }))
            .pipe(ws);
          return finishedP(rs);
        })
      );
  }
}
testPerf(runs, batchSize, testName);
