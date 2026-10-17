# sitemap.js

A library and CLI for generating and parsing sitemap XML compliant with the sitemaps.org protocol.

## Language

**Sitemap URL**:
The address carried by a `<loc>` element — of a page in a sitemap, or of a sitemap file in a sitemap index. Always absolute, http or https, at most 2,048 characters, and parseable as a URL. One definition, applied identically wherever a URL is read or written.
_Avoid_: loc string, link, location

**Sitemap rotation**:
What `SitemapAndIndexStream` does when the current sitemap reaches its item limit: it ends that sitemap, waits until the sitemap and its write stream have both finished, then starts the next sitemap and adds it to the sitemap index. The last sitemap is closed the same way when input ends. A sitemap that fails or is destroyed before finishing stops the whole stream.
_Avoid_: rollover, splitting, chunking
