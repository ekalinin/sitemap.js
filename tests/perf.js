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

var sm = require('../index')
  , sitemap = new sm.Sitemap();

console.time(' * generating test data');
for (var i=1; i<50000; i++) {
  sitemap.add({
    "url": '/test-url-'+i+'/',
    "safe": true
  });
}
console.timeEnd(' * generating test data');

console.time(' * test sitemap synco');
sitemap.toString();
console.timeEnd(' * test sitemap synco');

console.time(' * test sitemap async');
console.time(' * sitemap async done');
sitemap.toXML( function (xml) {
  console.timeEnd(' * sitemap async done');
});
console.timeEnd(' * test sitemap async');
