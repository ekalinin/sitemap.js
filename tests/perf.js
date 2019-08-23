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
const {clearLine, cursorTo} = require('readline')
const { createSitemap } = require('../dist/index')

const urls = require('./perf-data')
const { performance } = require('perf_hooks')
const stats = require('stats-lite')
let [ runs = 10, batchSize = 20 ] = process.argv.slice(2)

function printPerf (label, data) {
  resetLine()
  console.error(`========= ${label} =============`)
  console.error('median: %s±%s', stats.median(data).toFixed(1), stats.stdev(data).toFixed(1))
  console.error('99th percentile: %s\n', stats.percentile(data, 0.99).toFixed(1))
}
function resetLine () {
  clearLine(process.stderr, 0);
  cursorTo(process.stderr, 0);
}
function spinner (i, runNum, duration) {
  resetLine()
  process.stderr.write(`${["|", "/", "-", "\\"][i % 4]}, ${duration.toFixed()} ${runNum}`);
}

function delay (time) {
  return new Promise (resolve =>
    setTimeout(resolve, time)
  )
}

function batch (durations, runNum, fn) {
  for (let i = 0; i < batchSize; i++) {
    let start = performance.now()
    fn()
    const duration = performance.now() - start
    durations.push(duration)
    spinner(i, runNum, duration)
  }
}

async function run (durations, runNum, fn) {
  if (runNum < runs) {
    batch(durations, ++runNum, fn)
    resetLine()
    const batchStart = (runNum - 1) * batchSize
    process.stderr.write(
      `${stats
        .median(durations.slice(batchStart, batchStart + batchSize))
        .toFixed(0)} | ${stats.median(durations).toFixed(0)} sleeping`
    );
    await delay(1000)
    return run(durations, runNum, fn);
  } else {
    return durations
  }
}

async function testPerf (runs, batches) {
  console.error(`runs: ${runs} batches: ${batches} total: ${runs * batches} entries: ${urls.length}`)
  console.error('testing sitemap creation w/o printing')
  printPerf(
    "sitemap creation",
    await run([], 0, () =>
      createSitemap({
        hostname: "https://roosterteeth.com",
        urls
      })
    )
  );
  console.error("testing toString");
  let sitemap = createSitemap({
    hostname: "https://roosterteeth.com",
    urls
  });
  printPerf("toString", await run([], 0, () => sitemap.toString()));

  console.error("testing combined");
  printPerf("combined", await run([], 0, () => createSitemap({
    hostname: "https://roosterteeth.com",
    urls
  }).toString()));
}
testPerf(runs, batchSize)


// console.error('testing streaming')
// sitemap = createSitemap(process.stdout)
// let streamToString = []
// for (let i = 0; i < runs; i++) {
// let start = performance.now()
// sitemap.toString()
// streamToString.push(performance.now() - start)
// }
// printPerf('stream', streamToString)
