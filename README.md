sitemap.js [![Build Status](https://travis-ci.org/ekalinin/sitemap.js.svg?branch=master)](https://travis-ci.org/ekalinin/sitemap.js)
==========

**sitemap.js** is a high-level sitemap-generating library/cli that
makes creating [sitemap XML](http://www.sitemaps.org/) files easy.

Maintainers
-----------

- [@ekalinin](https://github.com/ekalinin)
- [@derduher](https://github.com/derduher)


Table of Contents
=================

  * [Installation](#installation)
  * [Usage](#usage)
    * [CLI](#cli)
    * [Example of using sitemap.js with <a href="https://expressjs.com/">express</a>:](#example-of-using-sitemapjs-with-express)
    * [Example of dynamic page manipulations into sitemap:](#example-of-dynamic-page-manipulations-into-sitemap)
    * [Example of most of the options you can use for sitemap](#example-of-most-of-the-options-you-can-use-for-sitemap)
    * [Building just the sitemap index file](#building-just-the-sitemap-index-file)
    * [Auto creating sitemap and index files from one large list](#auto-creating-sitemap-and-index-files-from-one-large-list)
  * [API](#api)
    * [Create Sitemap](#create-sitemap)
    * [Sitemap](#sitemap)
    * [buildSitemapIndex](#buildsitemapindex)
    * [createSitemapIndex](#createsitemapindex)
    * [xmlLint](#xmllint)
    * [parseSitemap](#parsesitemap)
    * [Sitemap Item Options](#sitemap-item-options)
    * [ISitemapImage](#isitemapimage)
    * [IVideoItem](#ivideoitem)
    * [ILinkItem](#ilinkitem)
    * [INewsItem](#inewsitem)
  * [License](#license)

Installation
------------

    npm install --save sitemap

Usage
-----

## CLI

Just feed the list of urls into sitemap

    npx sitemap < listofurls.txt

Also supports line separated JSON for full configuration

    npx sitemap --json < listofurls.txt

Or verify an existing sitemap

    npx sitemap --verify sitemap.xml

## As a library

```javascript
const { createSitemap } = require('sitemap')
// Creates a sitemap object given the input configuration with URLs
const sitemap = createSitemap({ options });
// Gives you a string containing the XML data
const xml = sitemap.toString();
```

### Example of using sitemap.js with [express](https://github.com/visionmedia/express):

```javascript
const express = require('express')
const { createSitemap } = require('sitemap');

const app = express()
const sitemap = createSitemap({
  hostname: 'http://example.com',
  cacheTime: 600000,        // 600 sec - cache purge period
  urls: [
    { url: '/page-1/',  changefreq: 'daily', priority: 0.3 },
    { url: '/page-2/',  changefreq: 'monthly',  priority: 0.7 },
    { url: '/page-3/'},    // changefreq: 'weekly',  priority: 0.5
    { url: '/page-4/',   img: "http://urlTest.com" }
  ]
});

app.get('/sitemap.xml', function(req, res) {
  try {
    const xml = sitemap.toXML()
    res.header('Content-Type', 'application/xml');
    res.send( xml );
  } catch (e) {
    console.error(e)
    res.status(500).end()
  }
  });
});

app.listen(3000);
```

### Example of dynamic page manipulations into sitemap:

```javascript
const sitemap = createSitemap ({
  hostname: 'http://example.com',
  cacheTime: 600000
});
sitemap.add({url: '/page-1/'});
sitemap.add({url: '/page-2/', changefreq: 'monthly', priority: 0.7});
sitemap.del({url: '/page-2/'});
sitemap.del('/page-1/');
```



### Example of most of the options you can use for sitemap

```javascript
const { createSitemap } = require('sitemap');

const sitemap = createSitemap({
  hostname: 'http://www.mywebsite.com',
  level: 'warn', // default WARN about bad data
  urls: [
    {
      url: '/page1',
      changefreq: 'weekly',
      priority: 0.8,
      lastmodfile: 'app/assets/page1.html'
    },
    {
      url: '/page2',
      changefreq: 'weekly',
      priority: 0.8,
      /* useful to monitor template content files instead of generated static files */
      lastmodfile: 'app/templates/page2.hbs'
    },
    // each sitemap entry supports many options
    // See [Sitemap Item Options](#sitemap-item-options) below for details
    {
      url: 'http://test.com/page-1/',
      img: [
        {
          url: 'http://test.com/img1.jpg',
          caption: 'An image',
          title: 'The Title of Image One',
          geoLocation: 'London, United Kingdom',
          license: 'https://creativecommons.org/licenses/by/4.0/'
        },
        {
          url: 'http://test.com/img2.jpg',
          caption: 'Another image',
          title: 'The Title of Image Two',
          geoLocation: 'London, United Kingdom',
          license: 'https://creativecommons.org/licenses/by/4.0/'
        }
      ],
      video: [
        {
          thumbnail_loc: 'http://test.com/tmbn1.jpg',
          title: 'A video title',
          description: 'This is a video'
        },
        {
          thumbnail_loc: 'http://test.com/tmbn2.jpg',
          title: 'A video with an attribute',
          description: 'This is another video',
          'player_loc': 'http://www.example.com/videoplayer.mp4?video=123',
          'player_loc:autoplay': 'ap=1'
        }
      ],
      links: [
        { lang: 'en', url: 'http://test.com/page-1/' },
        { lang: 'ja', url: 'http://test.com/page-1/ja/' }
      ],
      androidLink: 'android-app://com.company.test/page-1/',
      news: {
        publication: {
          name: 'The Example Times',
          language: 'en'
        },
        genres: 'PressRelease, Blog',
        publication_date: '2008-12-23',
        title: 'Companies A, B in Merger Talks',
        keywords: 'business, merger, acquisition, A, B',
        stock_tickers: 'NASDAQ:A, NASDAQ:B'
      }
    }
  ]
});
```

### Building just the sitemap index file
The sitemap index file merely points to other sitemaps

```javascript
const { buildSitemapIndex } = require('sitemap')
const smi = buildSitemapIndex({
  urls: ['https://example.com/sitemap1.xml', 'https://example.com/sitemap2.xml'],
  xslUrl: 'https://example.com/style.xsl' // optional
});
```

### Auto creating sitemap and index files from one large list

```javascript
const { createSitemapIndex } = require('sitemap')
const smi = createSitemapIndex({
  cacheTime: 600000,
  hostname: 'http://www.sitemap.org',
  sitemapName: 'sm-test',
  sitemapSize: 1,
  targetFolder: require('os').tmpdir(),
  urls: ['http://ya.ru', 'http://ya2.ru']
  // optional:
  // callback: function(err, result) {}
});
```
## API 


### Sitemap

```
const { Sitemap } = require('sitemap')
const smi = new Sitemap({
    urls: [{url: '/path'}],
    hostname: 'http://example.com',
    cacheTime: 0, // default
    level: 'warn' // default warns if it encounters bad data 
})
sm.toString() // returns the xml as a string
```
  
__toString__
  ```
  smi.toString(true)
  ```
  Converts the urls stored in an instance of Sitemap to a valid sitemap xml document as a string. Accepts a boolean as its first argument to designate on whether to pretty print. Defaults to false.
  
__toXML__
alias for toString

__toGzip__
  ```
  smi.toGzip ((xmlGzippedBuffer) => console.log(xmlGzippedBuffer));
  smi.toGzip();
  ```
  like toString, it builds the xmlDocument, then it runs gzip on the resulting string and returns it as a Buffer via callback or direct invokation
  
__clearCache__
  ```
  smi.clearCache()
  ```
  cache will be emptied and will be bipassed until set again
  
__isCacheValid__
  ```
  smi.isCacheValid()
  ```
  returns true if it has been less than cacheTimeout ms since cache was set
  
__setCache__
  ```
  smi.setCache('...xmlDoc')
  ```
  stores the passed in string on the instance to be used when toString is called within the configured cacheTimeout
  returns the passed in string unaltered
  
__add__
  ```
  smi.add('/path', 'warn')
  ```
  adds the provided url to the sitemap instance
  takes an optional parameter level for whether to print a console warning in the event of bad data 'warn' (default), throw an exception 'throw', or quietly ignore bad data 'silent'
  returns the number of locations currently in the sitemap instance
  
__contains__
  ```
  smi.contains('/path')
  ```
  Returns true if path is already a part of the sitemap instance, false otherwise. 
  
__del__
  ```
  smi.del('/path')
  ```
  removes the provided url or url option from the sitemap instance

__normalizeURL__
  ```
  Sitemap.normalizeURL('/', undefined, 'http://example.com')
  ```
  static function that returns the stricter form of a options passed to SitemapItem
  
__normalizeURLs__
  ```
  Sitemap.normalizeURLs(['http://example.com', {url: 'http://example.com'}])
  ```
  static function that takes an array of urls and returns a Map of their resolved url to the strict form of SitemapItemOptions

### buildSitemapIndex
Build a sitemap index file
```
const { buildSitemapIndex } = require('sitemap')
const index =   buildSitemapIndex({
  urls: [{url: 'http://example.com/sitemap-1.xml', lastmod: '2019-07-01'}, 'http://example.com/sitemap-2.xml'],
  lastmod: '2019-07-29'
})
```

### createSitemapIndex
Create several sitemaps and an index automatically from a list of urls
```
const { createSitemapIndex } = require('sitemap')
createSitemapIndex({
  urls: [/* list of urls */],
  targetFolder: 'absolute path to target folder',
  hostname: 'http://example.com',
  cacheTime: 600,
  sitemapName: 'sitemap',
  sitemapSize: 50000, // number of urls to allow in each sitemap
  xslUrl: '',// custom xsl url
  gzip: false, // whether to gzip the files
  callback: // called when complete;
})
```

### xmlLint
Resolve or reject depending on whether the passed in xml is a valid sitemap.
This is just a wrapper around the xmllint command line tool and thus requires
xmllint.
```
const { createReadStream } = require('fs')
const { xmlLint } = require('sitemap')
xmlLint(createReadStream('./example.xml')).then(
  () => console.log('xml is valid'),
  ([err, stderr]) => console.error('xml is invalid', stderr)
)
```

### parseSitemap
Read xml and resolve with the configuration that would produce it or reject with
an error
```
const { createReadStream } = require('fs')
const { parseSitemap, createSitemap } = require('sitemap')
parseSitemap(createReadStream('./example.xml')).then(
  // produces the same xml
  // you can, of course, more practically modify it or store it
  (xmlConfig) => console.log(createSitemap(xmlConfig).toString()),
  (err) => console.log(err)
)
```

### Sitemap Item Options

|Option|Type|eg|Description|
|------|----|--|-----------|
|url|string|http://example.com/some/path|The only required property for every sitemap entry|
|lastmod|string|'2019-07-29' or '2019-07-22T05:58:37.037Z'|When the page we as last modified use the W3C Datetime ISO8601 subset  https://www.sitemaps.org/protocol.html#xmlTagDefinitions|
|changefreq|string|'weekly'|How frequently the page is likely to change. This value provides general information to search engines and may not correlate exactly to how often they crawl the page. Please note that the value of this tag is considered a hint and not a command. See https://www.sitemaps.org/protocol.html#xmlTagDefinitions for the acceptable values|
|priority|number|0.6|The priority of this URL relative to other URLs on your site. Valid values range from 0.0 to 1.0. This value does not affect how your pages are compared to pages on other sites—it only lets the search engines know which pages you deem most important for the crawlers. The default priority of a page is 0.5. https://www.sitemaps.org/protocol.html#xmlTagDefinitions|
|img|object[]|see [#ISitemapImage](#ISitemapImage)|https://support.google.com/webmasters/answer/178636?hl=en&ref_topic=4581190|
|video|object[]|see [#IVideoItem](#IVideoItem)|https://support.google.com/webmasters/answer/80471?hl=en&ref_topic=4581190|
|links|object[]|see [#ILinkItem](#ILinkItem)|Tell search engines about localized versions https://support.google.com/webmasters/answer/189077|
|news|object|see [#INewsItem](#INewsItem)|https://support.google.com/webmasters/answer/74288?hl=en&ref_topic=4581190|
|ampLink|string|'http://ampproject.org/article.amp.html'||
|mobile|boolean or string|||
|cdata|boolean|true|wrap url in cdata xml escape|

### ISitemapImage

Sitemap image
https://support.google.com/webmasters/answer/178636?hl=en&ref_topic=4581190

|Option|Type|eg|Description|
|------|----|--|-----------|
|url|string|'http://example.com/image.jpg'|The URL of the image.|
|caption|string - optional|'Here we did the stuff'|The caption of the image.|
|title|string - optional|'Star Wars EP IV'|The title of the image.|
|geoLocation|string - optional|'Limerick, Ireland'|The geographic location of the image.|
|license|string - optional|'http://example.com/license.txt'|A URL to the license of the image.|

### IVideoItem

Sitemap video. https://support.google.com/webmasters/answer/80471?hl=en&ref_topic=4581190

|Option|Type|eg|Description|
|------|----|--|-----------|
|thumbnail_loc|string|"https://rtv3-img-roosterteeth.akamaized.net/store/0e841100-289b-4184-ae30-b6a16736960a.jpg/sm/thumb3.jpg"|A URL pointing to the video thumbnail image file|
|title|string|'2018:E6 - GoldenEye: Source'|The title of the video. |
|description|string|'We play gun game in GoldenEye: Source with a good friend of ours. His name is Gruchy. Dan Gruchy.'|A description of the video. Maximum 2048 characters. |
|content_loc|string - optional|"http://streamserver.example.com/video123.mp4"|A URL pointing to the actual video media file. Should be one of the supported formats.HTML is not a supported format. Flash is allowed, but no longer supported on most mobile platforms, and so may be indexed less well. Must not be the same as the <loc> URL.|
|player_loc|string - optional|"https://roosterteeth.com/embed/rouletsplay-2018-goldeneye-source"|A URL pointing to a player for a specific video. Usually this is the information in the src element of an <embed> tag. Must not be the same as the <loc> URL|
|'player_loc:autoplay'|string - optional|'ap=1'|a string the search engine can append as a query param to enable automatic playback|
|duration|number - optional| 600| duration of video in seconds|
|expiration_date| string - optional|"2012-07-16T19:20:30+08:00"|The date after which the video will no longer be available|
|view_count|string - optional|'21000000000'|The number of times the video has been viewed.|
|publication_date| string - optional|"2018-04-27T17:00:00.000Z"|The date the video was first published, in W3C format.|
|category|string - optional|"Baking"|A short description of the broad category that the video belongs to. This is a string no longer than 256 characters.|
|restriction|string - optional|"IE GB US CA"|Whether to show or hide your video in search results from specific countries.|
|restriction:relationship| string - optional|"deny"||
|gallery_loc| string - optional|"https://roosterteeth.com/series/awhu"|Currently not used.|
|gallery_loc:title|string - optional|"awhu series page"|Currently not used.|
|price|string - optional|"1.99"|The price to download or view the video. Omit this tag for free videos.|
|price:resolution|string - optional|"HD"|Specifies the resolution of the purchased version. Supported values are hd and sd.|
|price:currency| string - optional|"USD"|currency [Required] Specifies the currency in ISO 4217 format.|
|price:type|string - optional|"rent"|type [Optional] Specifies the purchase option. Supported values are rent and own. |
|uploader|string - optional|"GrillyMcGrillerson"|The video uploader's name. Only one <video:uploader> is allowed per video. String value, max 255 charactersc.|
|platform|string - optional|"tv"|Whether to show or hide your video in search results on  specified platform types. This is a list of space-delimited platform types. See https://support.google.com/webmasters/answer/80471?hl=en&ref_topic=4581190 for more detail|
|platform:relationship|string 'Allow'\|'Deny' - optional|'Allow'||
|id|string - optional|||
|tag|string[] - optional|['Baking']|An arbitrary string tag describing the video. Tags are generally very short descriptions of key concepts associated with a video or piece of content.|
|rating|number - optional|2.5|The rating of the video. Supported values are float numbers i|
|family_friendly|string 'YES'\|'NO' - optional|'YES'||
|requires_subscription|string 'YES'\|'NO' - optional|'YES'|Indicates whether a subscription (either paid or free) is required to view the video. Allowed values are yes or no.|
|live|string 'YES'\|'NO' - optional|'NO'|Indicates whether the video is a live stream. Supported values are yes or no.|

### ILinkItem

https://support.google.com/webmasters/answer/189077

|Option|Type|eg|Description|
|------|----|--|-----------|
|lang|string|'en'||
|url|string|'http://example.com/en/'||

### INewsItem

https://support.google.com/webmasters/answer/74288?hl=en&ref_topic=4581190

|Option|Type|eg|Description|
|------|----|--|-----------|
|access|string - 'Registration' \| 'Subscription'| 'Registration'  - optional||
|publication| object|see following options||
|publication['name']| string|'The Example Times'|The <name> is the name of the news publication. It must exactly match the name as it appears on your articles on news.google.com, except for anything in parentheses.|
|publication['language']|string|'en'|he <language> is the language of your publication. Use an ISO 639 language code (2 or 3 letters).|
|genres|string - optional|'PressRelease, Blog'||
|publication_date|string|'2008-12-23'|Article publication date in W3C format, using either the "complete date" (YYYY-MM-DD) format or the "complete date plus hours, minutes, and seconds"|
|title|string|'Companies A, B in Merger Talks'|The title of the news article.|
|keywords|string - optional|"business, merger, acquisition, A, B"||
|stock_tickers|string - optional|"NASDAQ:A, NASDAQ:B"||

License
-------

See [LICENSE](https://github.com/ekalinin/sitemap.js/blob/master/LICENSE)
file.
