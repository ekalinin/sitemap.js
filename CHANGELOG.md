# master
Nothing yet

# 4.1.1
Add a pretty print option to `toString(false)`
pass true pretty print

Add an xmlparser that will output a config that would generate that same file

  cli:
    use --parser to output the complete config --line-separated to print out line
    separated config compatible with the --json input option for cli
  
  lib: import parseSitemap and pass it a stream

# 4.0.2
Fix npx script error - needs the shebang

# 4.0.1
Validation functions which depend on xmllint will now warn if you do not have xmllint installed.

# 4.0.0

This release is geared around overhauling the public api for this library. Many 
options have been introduced over the years and this has lead to some inconsistencies
that make the library hard to use. Most have been cleaned up but a couple notable
items remain, including the confusing names of buildSitemapIndex and createSitemapIndex

  - A new experimental CLI
    - stream in a list of urls stream out xml
    - validate your generated sitemap
  - Sitemap video item now supports id element
  - Several schema errors have been cleaned up.
  - Docs have been updated and streamlined.
## breaking changes
  - lastmod option parses all ISO8601 date-only strings as being in UTC rather than local time
    - lastmodISO is deprecated as it is equivalent to lastmod
    - lastmodfile now includes the file's time as well
    - lastmodrealtime is no longer necessary
  - The default export of sitemap lib is now just createSitemap
  - Sitemap constructor now uses a object for its constructor
  ```
    const { Sitemap } = require('sitemap');
    const siteMap = new Sitemap({
      urls = [],
      hostname: 'https://example.com', // optional
      cacheTime = 0,
      xslUrl,
      xmlNs,
      level = 'warn'
    })
  ```
  - Sitemap no longer accepts a single string for its url
  - Drop support for node 6
  - Remove callback on toXML - This had no performance benefit
  - Direct modification of urls property on Sitemap has been dropped. Use add/remove/contains
  - When a Sitemap item is generated with invalid options it no longer throws by default
    - instead it console warns.
    - if you'd like to pre-verify your data the `validateSMIOptions` function is
    now available
    - To get the previous behavior pass level `createSitemap({...otheropts, level: 'throw' }) // ErrorLevel.THROW for TS users`
# 3.2.2
  - revert https everywhere added in 3.2.0. xmlns is not url.
  - adds alias for lastmod in the form of lastmodiso
  - fixes bug in lastmod option for buildSitemapIndex where option would be overwritten if a lastmod option was provided with a single url
  - fixes #201, fixes #203
# 3.2.1
  - no really fixes ts errors for real this time
  - fixes #193 in PR #198
# 3.2.0
  - fixes #192, fixes #193 typescript errors
  - correct types on player:loc and restriction:relationship types
  - use https urls in xmlns
# 3.1.0
 - fixes #187, #188 typescript errors
 - adds support for full precision priority #176
# 3.0.0
 - Converted project to typescript
 - properly encode URLs #179
 - updated core dependency
## breaking changes
 This will likely not break anyone's code but we're bumping to be safe
 - root domain URLs are now suffixed with / (eg. https://www.ya.ru -> https://www.ya.ru/) This is a side-effect of properly encoding passed in URLs

