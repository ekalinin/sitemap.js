# sitemap.js

A library and CLI for generating and parsing sitemap XML compliant with the sitemaps.org protocol.

## Language

**Sitemap URL**:
The address carried by a `<loc>` element — of a page in a sitemap, or of a sitemap file in a sitemap index. Always absolute, http or https, at most 2,048 characters, and parseable as a URL. One definition, applied identically wherever a URL is read or written.
_Avoid_: loc string, link, location

**Entry**:
One `<url>` element in a sitemap, or one `<sitemap>` element in a sitemap index: the unit a parser stream emits as an item.
_Avoid_: record, row, item (when meaning the XML element)

**Entry cap**:
The most entries a parser stream emits (`maxEntries`, default 50,000 per sitemaps.org). Entries past it are counted and dropped, and the overflow is reported once.
_Avoid_: URL limit, item limit (those mean `SitemapAndIndexStream`'s per-file `limit`)
