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

var sm = require('../dist/index')

var urls = require('./perf-data')
const { performance } = require('perf_hooks')
var stats = require('stats-lite')
var [ runs = 20 ] = process.argv.slice(2)
console.log('runs:', runs)

function printPerf (label, data) {
  console.error('========= ', label, ' =============')
  console.error('mean: %s', stats.mean(data).toFixed(1))
  console.error('median: %s', stats.median(data).toFixed(1))
  console.error('variance: %s', stats.variance(data).toFixed(1))
  console.error('standard deviation: %s', stats.stdev(data).toFixed(1))
  console.error('90th percentile: %s', stats.percentile(data, 0.9).toFixed(1))
  console.error('99th percentile: %s', stats.percentile(data, 0.99).toFixed(1))
}

function createSitemap (stream) {
  return sm.createSitemap({
    hostname: 'https://roosterteeth.com',
    urls,
    stream
  })
}
console.error('testing sitemap creation w/o printing')
let durations = []
for (let i = 0; i < runs; i++) {
  let start = performance.now()
  createSitemap()
  durations.push(performance.now() - start)
}
printPerf('sitemap creation', durations)
console.error('testing toString')
let sitemap = createSitemap()

let syncToString = []
for (let i = 0; i < runs; i++) {
  let start = performance.now()
  sitemap.toString()
  syncToString.push(performance.now() - start)
}
printPerf('sync', syncToString)

// console.error('testing streaming')
// sitemap = createSitemap(process.stdout)
// let streamToString = []
// for (let i = 0; i < runs; i++) {
// let start = performance.now()
// sitemap.toString()
// streamToString.push(performance.now() - start)
// }
// printPerf('stream', streamToString)
