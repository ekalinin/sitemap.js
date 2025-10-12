import { createReadStream, createWriteStream } from 'fs';
import {
  XMLToSitemapItemStream,
  ObjectStreamToJSON,
  ErrorLevel,
} from 'sitemap';

createReadStream('./sitemap.xml')
  // turn the xml into sitemap option item options
  .pipe(
    new XMLToSitemapItemStream({
      // Optional: pass a logger of your own.
      // by default it uses built in console.log/warn
      logger: (level, ...message) => console.log(...message),
      // Optional, passing SILENT overrides logger
      level: ErrorLevel.WARN,
    })
  )
  // convert the object stream to JSON
  .pipe(new ObjectStreamToJSON())
  // write the library compatible options to disk
  .pipe(createWriteStream('./sitemapOptions.json'));
