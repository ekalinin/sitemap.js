const { SitemapStream, streamToPromise } = require('../dist/index');
// Creates a sitemap object given the input configuration with URLs
const sitemap = new SitemapStream({ hostname: 'http://example.com' });
sitemap.write({ url: '/page-1/', changefreq: 'daily', priority: 0.3 });
sitemap.write('/page-2');
sitemap.end();

// Resolves to a string containing the XML data
// ```xml
// <?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"><url><loc>http://example.com/page-1/</loc><changefreq>daily</changefreq><priority>0.3</priority></url><url><loc>http://example.com/page-2</loc></url></urlset>
// ```
streamToPromise(sitemap)
  .then(sm => console.log(sm.toString()))
  .catch(console.error);
