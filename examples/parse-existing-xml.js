const { createReadStream, createWriteStream } = require('fs');
const { XMLToSitemapItemStream, ObjectStreamToJSON } = require('sitemap');

createReadStream('./sitemap.xml')
  // turn the xml into sitemap option item options
  .pipe(new XMLToSitemapItemStream())
  // convert the object stream to JSON
  .pipe(new ObjectStreamToJSON())
  // write the library compatible options to disk
  .pipe(createWriteStream('./sitemapOptions.json'));
