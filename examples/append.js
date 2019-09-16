// node append.js < sitemap.xml > appended_sitemap.xml
// Slurp in an xml file append to it and pipe it back out
const { SitemapStream, XMLToISitemapOptions } = require('../dist/index')
const smStream = new SitemapStream()
const pipeline =
  process.stdin
  .pipe(new XMLToISitemapOptions())
  .pipe(smStream)
  .pipe(process.stdout);
  pipeline.on('finished', () => console.error('finished'))
  pipeline.on('error', e => e.code === 'EPIPE' || console.error(e))
smStream.write({url: 'http://example.com/foo/bir'})
smStream.write({url: 'http://example.com/foo/bar'})
