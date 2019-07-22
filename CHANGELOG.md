# next
  - modernize docs
  - A new experimental CLI
    - stream in a list of urls stream out xml
    - validate your generated sitemap
  - Sitemap video item now supports id element
## breaking changes
  - Limit exports the default object of sitemap is very minimal now
  - Sitemap constructor now uses a object for its constructor
  - Sitemap no longer accepts a single string for its url
  - Drop support for node 6
  - Remove callback on toXML - This had no performance benefit
  - No longer support direct modification of urls property
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

