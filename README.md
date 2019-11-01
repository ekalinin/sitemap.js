# sitemap.js [![Build Status](https://travis-ci.org/ekalinin/sitemap.js.svg?branch=master)](https://travis-ci.org/ekalinin/sitemap.js)

**sitemap.js** is a high-level sitemap-generating library/CLI that
makes creating [sitemap XML](http://www.sitemaps.org/) files easy.

## Maintainers

- [@ekalinin](https://github.com/ekalinin)
- [@derduher](https://github.com/derduher)

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
  - [CLI](#cli)
  - [Example of using sitemap.js with <a href="https://expressjs.com/">express</a>](#example-of-using-sitemapjs-with-express)
  - [Stream writing a sitemap](#stream-writing-a-sitemap)
  - [Example of most of the options you can use for sitemap](#example-of-most-of-the-options-you-can-use-for-sitemap)
  - [Building just the sitemap index file](#building-just-the-sitemap-index-file)
  - [Auto creating sitemap and index files from one large list](#auto-creating-sitemap-and-index-files-from-one-large-list)
- [API](#api)
  - [Sitemap (deprecated)](#sitemap---deprecated)
  - [buildSitemapIndex](#buildsitemapindex)
  - [createSitemapsAndIndex](#createsitemapsandindex)
  - [xmlLint](#xmllint)
  - [parseSitemap](#parsesitemap)
  - [SitemapStream](#sitemapstream)
  - [XMLToISitemapOptions](#XMLToISitemapOptions)
  - [lineSeparatedURLsToSitemapOptions](#lineseparatedurlstositemapoptions)
  - [streamToPromise](#streamtopromise)
  - [ObjectStreamToJSON](#objectstreamtojson)
  - [Sitemap Item Options](#sitemap-item-options)
  - [ISitemapImage](#isitemapimage)
  - [IVideoItem](#ivideoitem)
  - [ILinkItem](#ilinkitem)
  - [INewsItem](#inewsitem)
- [License](#license)

## Installation

```sh
npm install --save sitemap
```

## Usage

## CLI

Just feed the list of urls into sitemap

```sh
npx sitemap < listofurls.txt
```

Or validate an existing sitemap (requires libxml)

```sh
npx sitemap --validate sitemap.xml
```

Or take an existing sitemap and turn it into options that can be fed into the libary

```sh
npx sitemap --parse sitemap.xml
```

Or prepend some new urls to an existing sitemap

```sh
npx sitemap --prepend sitemap.xml < listofurls.json # or txt
```

## As a library

```js
const { SitemapStream, streamToPromise } = require('../dist/index')
// Creates a sitemap object given the input configuration with URLs
const sitemap = new SitemapStream({ hostname: 'http://example.com' });
sitemap.write({ url: '/page-1/', changefreq: 'daily', priority: 0.3 })
sitemap.write('/page-2')
sitemap.end()

streamToPromise(sitemap)
  .then(sm => console.log(sm.toString()))
  .catch(console.error);
```

Resolves to a string containing the XML data

```xml
 <?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"><url><loc>http://example.com/page-1/</loc><changefreq>daily</changefreq><priority>0.3</priority></url><url><loc>http://example.com/page-2</loc></url></urlset>
```

### Example of using sitemap.js with [express](https://expressjs.com/)

```js
const express = require('express')
const { SitemapStream, streamToPromise } = require('sitemap')
const { createGzip } = require('zlib')

const app = express()
let sitemap

app.get('/sitemap.xml', function(req, res) {
  res.header('Content-Type', 'application/xml');
  res.header('Content-Encoding', 'gzip');
  // if we have a cached entry send it
  if (sitemap) {
    res.send(sitemap)
    return
  }
  try {
    const smStream = new SitemapStream({ hostname: 'https://example.com/' })
    const pipeline = smStream.pipe(createGzip())

    smStream.write({ url: '/page-1/',  changefreq: 'daily', priority: 0.3 })
    smStream.write({ url: '/page-2/',  changefreq: 'monthly',  priority: 0.7 })
    smStream.write({ url: '/page-3/'})    // changefreq: 'weekly',  priority: 0.5
    smStream.write({ url: '/page-4/',   img: "http://urlTest.com" })
    smStream.end()

    // cache the response
    streamToPromise(pipeline).then(sm => sitemap = sm)
    // stream the response
    pipeline.pipe(res).on('error', (e) => {throw e})
  } catch (e) {
    console.error(e)
    res.status(500).end()
  }
})

app.listen(3000, () => {
  console.log('listening')
});
```

### Stream writing a sitemap

The sitemap stream is around 20% faster and only uses ~10% the memory of the traditional interface

```javascript
const fs = require('fs');
const { SitemapStream } = require('sitemap')
// external libs provided as example only
const { parser } = require('stream-json/Parser');
const { streamArray } = require('stream-json/streamers/StreamArray');
const { streamValues } = require('stream-json/streamers/StreamValues');
const map = require('through2-map')
const { createGzip } = require('zlib')

// parsing line separated json or JSONStream
const pipeline = fs
  .createReadStream("./tests/mocks/perf-data.json.txt"),
  .pipe(parser())
  .pipe(streamValues())
  .pipe(map.obj(chunk => chunk.value))
  // SitemapStream does the heavy lifting
  // You must provide it with an object stream
  .pipe(new SitemapStream());

// parsing JSON file
const pipeline = fs
  .createReadStream("./tests/mocks/perf-data.json")
  .pipe(parser())
  .pipe(streamArray())
  .pipe(map.obj(chunk => chunk.value))
  // SitemapStream does the heavy lifting
  // You must provide it with an object stream
  .pipe(new SitemapStream({ hostname: 'https://example.com/' }))
  .pipe(process.stdout)

//
// coalesce into value for caching
//
  let cachedXML
  streamToPromise(
    fs.createReadStream("./tests/mocks/perf-data.json")
    .pipe(parser())
    .pipe(streamArray())
    .pipe(map.obj(chunk => chunk.value))
    .pipe(new SitemapStream({ hostname: 'https://example.com/' }))
    .pipe(createGzip())
  ).then(xmlBuffer => cachedXML = xmlBuffer)
```

### Example of most of the options you can use for sitemap

```js
const { SitemapStream, streamToPromise } = require('sitemap');
const smStream = new SitemapStream({ hostname: 'http://www.mywebsite.com' })
// coalesce stream to value
// alternatively you can pipe to another stream
streamToPromise(smStream).then(console.log)

smStream.write({
  url: '/page1',
  changefreq: 'weekly',
  priority: 0.8,
  lastmodfile: 'app/assets/page1.html'
})

smStream.write({
  url: '/page2',
  changefreq: 'weekly',
  priority: 0.8,
  /* useful to monitor template content files instead of generated static files */
  lastmodfile: 'app/templates/page2.hbs'
})

// each sitemap entry supports many options
// See [Sitemap Item Options](#sitemap-item-options) below for details
smStream.write({
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
})
// indicate there is nothing left to write
smStream.end()
```

### Building just the sitemap index file

The sitemap index file merely points to other sitemaps

```js
const { buildSitemapIndex } = require('sitemap')
const smi = buildSitemapIndex({
  urls: ['https://example.com/sitemap1.xml', 'https://example.com/sitemap2.xml'],
  xslUrl: 'https://example.com/style.xsl' // optional
})
```

### Auto creating sitemap and index files from one large list

```js
const { createSitemapsAndIndex } = require('sitemap')
const smi = createSitemapsAndIndex({
  hostname: 'http://www.sitemap.org',
  sitemapName: 'sm-test',
  sitemapSize: 1,
  targetFolder: require('os').tmpdir(),
  urls: ['http://ya.ru', 'http://ya2.ru']
})
```

## API

### Sitemap - __deprecated__

```js
const { Sitemap } = require('sitemap')
const sm = new Sitemap({
    urls: [{ url: '/path' }],
    hostname: 'http://example.com',
    cacheTime: 0, // default
    level: 'warn', // default warns if it encounters bad data
    lastmodDateOnly: false // relevant for baidu
})
sm.toString() // returns the xml as a string
```
  
#### toString

```js
sm.toString(true)
```

  Converts the urls stored in an instance of Sitemap to a valid sitemap xml document as a string. Accepts a boolean as its first argument to designate on whether to pretty print. Defaults to false.
  
#### toXML

alias for toString

#### toGzip

```js
sm.toGzip ((xmlGzippedBuffer) => console.log(xmlGzippedBuffer))
sm.toGzip()
```

Like toString, it builds the xmlDocument, then it runs gzip on the resulting string and returns it as a Buffer via callback or direct invocation

#### clearCache

```js
sm.clearCache()
```

Cache will be emptied and will be bypassed until set again
  
#### isCacheValid

```js
sm.isCacheValid()
```

Returns true if it has been less than cacheTimeout ms since cache was set
  
#### setCache

```js
sm.setCache('...xmlDoc')
```

Stores the passed in string on the instance to be used when toString is called within the configured cacheTimeout returns the passed in string unaltered
  
#### add

```js
sm.add('/path', 'warn')
```

Adds the provided url to the sitemap instance
takes an optional parameter level for whether to print a console warning in the event of bad data 'warn' (default),
throw an exception 'throw', or quietly ignore bad data 'silent'
returns the number of locations currently in the sitemap instance
  
#### contains

```js
sm.contains('/path')
```

Returns true if path is already a part of the sitemap instance, false otherwise.
  
#### del

```js
sm.del('/path')
```

Removes the provided url or url option from the sitemap instance

#### normalizeURL

```js
Sitemap.normalizeURL('/', 'http://example.com', false)
```

Static function that returns the stricter form of a options passed to SitemapItem. The third argument is whether to use date-only varient of lastmod. For baidu.
  
#### normalizeURLs

```js
Sitemap.normalizeURLs(['http://example.com', {url: '/'}], 'http://example.com', false)
```

Static function that takes an array of urls and returns a Map of their resolved url to the strict form of SitemapItemOptions

### buildSitemapIndex

Build a sitemap index file

```js
const { buildSitemapIndex } = require('sitemap')
const index = buildSitemapIndex({
  urls: [{ url: 'http://example.com/sitemap-1.xml', lastmod: '2019-07-01' }, 'http://example.com/sitemap-2.xml'],
  lastmod: '2019-07-29'
})
```

### createSitemapsAndIndex

Create several sitemaps and an index automatically from a list of urls

```js
const { createSitemapsAndIndex } = require('sitemap')
createSitemapsAndIndex({
  urls: [/* list of urls */],
  targetFolder: 'absolute path to target folder',
  hostname: 'http://example.com',
  cacheTime: 600,
  sitemapName: 'sitemap',
  sitemapSize: 50000, // number of urls to allow in each sitemap
  gzip: true, // whether to gzip the files
})
```

### xmlLint

Resolve or reject depending on whether the passed in xml is a valid sitemap.
This is just a wrapper around the xmlLint command line tool and thus requires
xmlLint.

```js
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

```js
const { createReadStream } = require('fs')
const { parseSitemap, createSitemap } = require('sitemap')
parseSitemap(createReadStream('./example.xml')).then(
  // produces the same xml
  // you can, of course, more practically modify it or store it
  (xmlConfig) => console.log(createSitemap(xmlConfig).toString()),
  (err) => console.log(err)
)
```

### SitemapStream

A [Transform](https://nodejs.org/api/stream.html#stream_implementing_a_transform_stream) for turning a [Readable stream](https://nodejs.org/api/stream.html#stream_readable_streams) of either [SitemapItemOptions](#sitemap-item-options) or url strings into a Sitemap. The readable stream it transforms **must** be in object mode.

```javascript
const { SitemapStream } = require('sitemap')
const sms = new SitemapStream({
  hostname: 'https://example.com', // optional only necessary if your paths are relative
  lastmodDateOnly: false // defaults to false, flip to true for baidu
})
const readable = // a readable stream of objects
readable.pipe(sms).pipe(process.stdout)
```

### XMLToISitemapOptions

Takes a stream of xml and transforms it into a stream of ISitemapOptions.
Use this to parse existing sitemaps into config options compatible with this library

```javascript
const { createReadStream, createWriteStream } = require('fs');
const { XMLToISitemapOptions, ObjectStreamToJSON } = require('sitemap');

createReadStream('./some/sitemap.xml')
// turn the xml into sitemap option item options
.pipe(new XMLToISitemapOptions())
// convert the object stream to JSON
.pipe(new ObjectStreamToJSON())
// write the library compatible options to disk
.pipe(createWriteStream('./sitemapOptions.json'))
```

### lineSeparatedURLsToSitemapOptions

Takes a stream of urls or sitemapoptions likely from fs.createReadStream('./path') and returns an object stream of sitemap items.

### streamToPromise

Takes a stream returns a promise that resolves when stream emits finish.

```javascript
const { streamToPromise, SitemapStream } = require('sitemap')
const sitemap = new SitemapStream({ hostname: 'http://example.com' });
sitemap.write({ url: '/page-1/', changefreq: 'daily', priority: 0.3 })
sitemap.end()
streamToPromise(sitemap).then(buffer => console.log(buffer.toString())) // emits the full sitemap
```

### ObjectStreamToJSON

A Transform that converts a stream of objects into a JSON Array or a line separated stringified JSON.

- @param [lineSeparated=false] whether to separate entries by a new line or comma

```javascript
const stream = Readable.from([{a: 'b'}])
  .pipe(new ObjectStreamToJSON())
  .pipe(process.stdout)
stream.end()
// prints {"a":"b"}
```

### Sitemap Item Options

|Option|Type|eg|Description|
|------|----|--|-----------|
|url|string|`http://example.com/some/path`|The only required property for every sitemap entry|
|lastmod|string|'2019-07-29' or '2019-07-22T05:58:37.037Z'|When the page we as last modified use the W3C Datetime ISO8601 subset <https://www.sitemaps.org/protocol.html#xmlTagDefinitions>|
|changefreq|string|'weekly'|How frequently the page is likely to change. This value provides general information to search engines and may not correlate exactly to how often they crawl the page. Please note that the value of this tag is considered a hint and not a command. See <https://www.sitemaps.org/protocol.html#xmlTagDefinitions> for the acceptable values|
|priority|number|0.6|The priority of this URL relative to other URLs on your site. Valid values range from 0.0 to 1.0. This value does not affect how your pages are compared to pages on other sites—it only lets the search engines know which pages you deem most important for the crawlers. The default priority of a page is 0.5. <https://www.sitemaps.org/protocol.html#xmlTagDefinitions>|
|img|object[]|see [#ISitemapImage](#ISitemapImage)|<https://support.google.com/webmasters/answer/178636?hl=en&ref_topic=4581190>|
|video|object[]|see [#IVideoItem](#IVideoItem)|<https://support.google.com/webmasters/answer/80471?hl=en&ref_topic=4581190>|
|links|object[]|see [#ILinkItem](#ILinkItem)|Tell search engines about localized versions <https://support.google.com/webmasters/answer/189077>|
|news|object|see [#INewsItem](#INewsItem)|<https://support.google.com/webmasters/answer/74288?hl=en&ref_topic=4581190>|
|ampLink|string|`http://ampproject.org/article.amp.html`||
|cdata|boolean|true|wrap url in cdata xml escape|

### ISitemapImage

Sitemap image
<https://support.google.com/webmasters/answer/178636?hl=en&ref_topic=4581190>

|Option|Type|eg|Description|
|------|----|--|-----------|
|url|string|`http://example.com/image.jpg`|The URL of the image.|
|caption|string - optional|'Here we did the stuff'|The caption of the image.|
|title|string - optional|'Star Wars EP IV'|The title of the image.|
|geoLocation|string - optional|'Limerick, Ireland'|The geographic location of the image.|
|license|string - optional|`http://example.com/license.txt`|A URL to the license of the image.|

### IVideoItem

Sitemap video. <https://support.google.com/webmasters/answer/80471?hl=en&ref_topic=4581190>

|Option|Type|eg|Description|
|------|----|--|-----------|
|thumbnail_loc|string|`"https://rtv3-img-roosterteeth.akamaized.net/store/0e841100-289b-4184-ae30-b6a16736960a.jpg/sm/thumb3.jpg"`|A URL pointing to the video thumbnail image file|
|title|string|'2018:E6 - GoldenEye: Source'|The title of the video. |
|description|string|'We play gun game in GoldenEye: Source with a good friend of ours. His name is Gruchy. Dan Gruchy.'|A description of the video. Maximum 2048 characters. |
|content_loc|string - optional|`"http://streamserver.example.com/video123.mp4"`|A URL pointing to the actual video media file. Should be one of the supported formats.HTML is not a supported format. Flash is allowed, but no longer supported on most mobile platforms, and so may be indexed less well. Must not be the same as the `<loc>` URL.|
|player_loc|string - optional|`"https://roosterteeth.com/embed/rouletsplay-2018-goldeneye-source"`|A URL pointing to a player for a specific video. Usually this is the information in the src element of an `<embed>` tag. Must not be the same as the `<loc>` URL|
|'player_loc:autoplay'|string - optional|'ap=1'|a string the search engine can append as a query param to enable automatic playback|
|duration|number - optional| 600| duration of video in seconds|
|expiration_date| string - optional|"2012-07-16T19:20:30+08:00"|The date after which the video will no longer be available|
|view_count|string - optional|'21000000000'|The number of times the video has been viewed.|
|publication_date| string - optional|"2018-04-27T17:00:00.000Z"|The date the video was first published, in W3C format.|
|category|string - optional|"Baking"|A short description of the broad category that the video belongs to. This is a string no longer than 256 characters.|
|restriction|string - optional|"IE GB US CA"|Whether to show or hide your video in search results from specific countries.|
|restriction:relationship| string - optional|"deny"||
|gallery_loc| string - optional|`"https://roosterteeth.com/series/awhu"`|Currently not used.|
|gallery_loc:title|string - optional|"awhu series page"|Currently not used.|
|price|string - optional|"1.99"|The price to download or view the video. Omit this tag for free videos.|
|price:resolution|string - optional|"HD"|Specifies the resolution of the purchased version. Supported values are hd and sd.|
|price:currency| string - optional|"USD"|currency [Required] Specifies the currency in ISO 4217 format.|
|price:type|string - optional|"rent"|type [Optional] Specifies the purchase option. Supported values are rent and own. |
|uploader|string - optional|"GrillyMcGrillerson"|The video uploader's name. Only one <video:uploader> is allowed per video. String value, max 255 characters.|
|platform|string - optional|"tv"|Whether to show or hide your video in search results on specified platform types. This is a list of space-delimited platform types. See <https://support.google.com/webmasters/answer/80471?hl=en&ref_topic=4581190> for more detail|
|platform:relationship|string 'Allow'\|'Deny' - optional|'Allow'||
|id|string - optional|||
|tag|string[] - optional|['Baking']|An arbitrary string tag describing the video. Tags are generally very short descriptions of key concepts associated with a video or piece of content.|
|rating|number - optional|2.5|The rating of the video. Supported values are float numbers i|
|family_friendly|string 'YES'\|'NO' - optional|'YES'||
|requires_subscription|string 'YES'\|'NO' - optional|'YES'|Indicates whether a subscription (either paid or free) is required to view the video. Allowed values are yes or no.|
|live|string 'YES'\|'NO' - optional|'NO'|Indicates whether the video is a live stream. Supported values are yes or no.|

### ILinkItem

<https://support.google.com/webmasters/answer/189077>

|Option|Type|eg|Description|
|------|----|--|-----------|
|lang|string|'en'||
|url|string|`'http://example.com/en/'`||

### INewsItem

<https://support.google.com/webmasters/answer/74288?hl=en&ref_topic=4581190>

|Option|Type|eg|Description|
|------|----|--|-----------|
|access|string - 'Registration' \| 'Subscription'| 'Registration' - optional||
|publication| object|see following options||
|publication['name']| string|'The Example Times'|The `<name>` is the name of the news publication. It must exactly match the name as it appears on your articles on news.google.com, except for anything in parentheses.|
|publication['language']|string|'en'|he `<language>` is the language of your publication. Use an ISO 639 language code (2 or 3 letters).|
|genres|string - optional|'PressRelease, Blog'||
|publication_date|string|'2008-12-23'|Article publication date in W3C format, using either the "complete date" (YYYY-MM-DD) format or the "complete date plus hours, minutes, and seconds"|
|title|string|'Companies A, B in Merger Talks'|The title of the news article.|
|keywords|string - optional|"business, merger, acquisition, A, B"||
|stock_tickers|string - optional|"NASDAQ:A, NASDAQ:B"||

## License

See [LICENSE](https://github.com/ekalinin/sitemap.js/blob/master/LICENSE) file.
