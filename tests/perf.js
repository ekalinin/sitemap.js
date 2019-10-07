/*!
 * Sitemap performance test
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

/*
 * string realisation:
 *  $ node tests/perf-test.js
 *    * generating test data: 15ms
 *    * test sitemap: 183836ms
 *
 *  (183836 / 1000) / 60 = 3.06 min
 *
 * array realisation:
 *  $ node tests/perf.js
 *    * generating test data: 20ms
 *    * test sitemap: 217ms
 *
 */
'use strict'
const { resolve } = require('path')
const { createReadStream, readFileSync, createWriteStream } = require('fs')
const {clearLine, cursorTo} = require('readline')
const { finished } = require('stream')
const { promisify } = require('util')
const { createSitemap, lineSeparatedURLsToSitemapOptions, SitemapStream } = require('../dist/index')
const finishedP = promisify(finished)


const stats = require('stats-lite')
let [ runs = 10, batchSize = 10, testName = 'stream', measureMemory = false ] = process.argv.slice(2)
const unit = measureMemory ? "mb" : "ms";
console.log('npm run test:perf -- [number of runs = 10] [batch size = 10] [stream(default)|combined] [measure peak memory = false]')

function printPerf (label, data) {
  resetLine()
  console.log(`========= ${label} =============`)
  console.log(`median: %s±%s${unit}`, stats.median(data).toFixed(1), stats.stdev(data).toFixed(1))
  console.log(`99th percentile: %s${unit}\n`, stats.percentile(data, 0.99).toFixed(1))
}
function resetLine () {
  clearLine(process.stderr, 0);
  cursorTo(process.stderr, 0);
}
function spinner (i, runNum, duration) {
  resetLine()
  process.stdout.write(`${["|", "/", "-", "\\"][i % 4]}, ${duration.toFixed()}${unit} ${runNum}`);
}

function delay (time) {
  return new Promise (resolve =>
    setTimeout(resolve, time)
  )
}

async function batch (durations, runNum, fn) {
  for (let i = 0; i < batchSize; i++) {
    let start = process.resourceUsage().userCPUTime
    await fn()
    let duration
    if (measureMemory) {
      duration = (process.resourceUsage().maxRSS / (1024 ** 2)) | 0
    } else {
      duration = ((process.resourceUsage().userCPUTime - start) / 1e3) | 0
    }
    durations.push(duration);
    spinner(i, runNum, duration)
  }
}

async function run (durations, runNum, fn) {
  if (runNum < runs) {
    await batch(durations, ++runNum, fn)
    resetLine()
    const batchStart = (runNum - 1) * batchSize
    process.stdout.write(
      `${stats
        .median(durations.slice(batchStart, batchStart + batchSize))
        .toFixed(0)}${unit} | ${stats.median(durations).toFixed(0)}${unit} sleeping`
    );
    await delay(2000)
    return run(durations, runNum, fn);
  } else {
    return durations
  }
}

async function testPerf (runs, batches, testName) {
  console.log(`runs: ${runs} batches: ${batches} total: ${runs * batches}`)
  switch (testName) {
    case 'creation':
      console.log('testing sitemap creation w/o printing')
      printPerf(
        "sitemap creation",
        await run([], 0, () =>
          createSitemap({
            hostname: "https://roosterteeth.com",
            urls: JSON.parse(readFileSync(resolve( __dirname, 'mocks', 'perf-data.json'), { encoding: 'utf8'}))
          })
        )
      );
      break;
    case 'toString':
      console.log("testing toString");
      let sitemap = createSitemap({
        hostname: "https://roosterteeth.com",
        urls: JSON.parse(readFileSync(resolve( __dirname, 'mocks', 'perf-data.json'), { encoding: 'utf8'}))
      });
      printPerf("toString", await run([], 0, () => sitemap.toString()));
      break;
    case 'combined':
      console.log("testing combined");
      printPerf("combined", await run([], 0, () => createSitemap({
        hostname: "https://roosterteeth.com",
        urls: JSON.parse(readFileSync(resolve( __dirname, 'mocks', 'perf-data.json'), { encoding: 'utf8'}))
      }).toString()));
      break;
    case 'stream':
    default:
      console.log("testing stream");
      printPerf(
        "stream",
        await run([], 0, () => {
          const ws = createWriteStream('/dev/null')
          const rs = createReadStream(resolve(__dirname, 'mocks', 'perf-data.json.txt'))
          lineSeparatedURLsToSitemapOptions(rs)
            .pipe(new SitemapStream())
            .pipe(ws);
          return finishedP(rs)
        })
      );
  }
}
testPerf(runs, batchSize, testName)
