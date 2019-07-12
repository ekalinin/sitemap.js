sitemap.js
==========

**sitemap.js** is a high-level sitemap-generating framework that
makes creating [sitemap XML](http://www.sitemaps.org/) files easy.

Maintainers
-----------

- [@ekalinin](https://github.com/ekalinin)
- [@derduher](https://github.com/derduher)

[![Build Status](https://travis-ci.org/ekalinin/sitemap.js.svg?branch=master)](https://travis-ci.org/ekalinin/sitemap.js)

Table of Contents
=================

  * [sitemap.js](#sitemapjs)
  * [Table of Contents](#table-of-contents)
    * [Installation](#installation)
    * [Usage](#usage)
      * [Example of using sitemap.js with <a href="https://github.com/visionmedia/express">express</a>:](#example-of-using-sitemapjs-with-express)
      * [Example of synchronous sitemap.js usage:](#example-of-synchronous-sitemapjs-usage)
      * [Example of dynamic page manipulations into sitemap:](#example-of-dynamic-page-manipulations-into-sitemap)
      * [Example of pre-generating sitemap based on existing static files:](#example-of-pre-generating-sitemap-based-on-existing-static-files)
      * [Example of images with captions:](#example-of-images-with-captions)
      * [Example of indicating alternate language pages:](#example-of-indicating-alternate-language-pages)
      * [Example of indicating Android app deep linking:](#example-of-indicating-android-app-deep-linking)
      * [Example of Sitemap Styling](#example-of-sitemap-styling)
      * [Example of mobile URL](#example-of-mobile-url)
      * [Example of using HH:MM:SS in lastmod](#example-of-using-hhmmss-in-lastmod)
      * [Example of Sitemap Index as String](#example-of-sitemap-index-as-string)
      * [Example of Sitemap Index](#example-of-sitemap-index)
      * [Example of overriding default xmlns* attributes in urlset element](#example-of-overriding-default-xmlns-attributes-in-urlset-element)
      * [Example of news usage](#example-of-news)
    * [Testing](#testing)
    * [License](#license)

TOC created by [gh-md-toc](https://github.com/ekalinin/github-markdown-toc)

Installation
------------

It's recommended to install via [npm](https://github.com/isaacs/npm/):

    npm install --save sitemap

Usage
-----
The main functions you want to use in the sitemap module are

```javascript
const { createSitemap } = require('sitemap')
// Creates a sitemap object given the input configuration with URLs
const sitemap = createSitemap({ options });
// Generates XML with a callback function
sitemap.toXML( function(err, xml){ if (!err){ console.log(xml) } });
// Gives you a string containing the XML data
const xml = sitemap.toString();
```

### Example of using sitemap.js with [express](https://github.com/visionmedia/express):

```javascript
const express = require('express')
const { createSitemap } = require('sitemap');

const app = express()
const sitemap = createSitemap ({
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



### Example of pre-generating sitemap based on existing static files:

```javascript
const { createSitemap } = require('sitemap');
const fs = require('fs');

const sitemap = sm.createSitemap({
  hostname: 'http://www.mywebsite.com',
  cacheTime: 600000,  //600 sec (10 min) cache purge period
  urls: [
      { url: '/' , changefreq: 'weekly', priority: 0.8, lastmodrealtime: true, lastmodfile: 'app/assets/index.html' },
      { url: '/page1', changefreq: 'weekly', priority: 0.8, lastmodrealtime: true, lastmodfile: 'app/assets/page1.html' },
      { url: '/page2'    , changefreq: 'weekly', priority: 0.8, lastmodrealtime: true, lastmodfile: 'app/templates/page2.hbs' } /* useful to monitor template content files instead of generated static files */
  ]
});

fs.writeFileSync("app/assets/sitemap.xml", sitemap.toString());
```

### Example of images with captions:

```javascript
const sitemap = createSitemap({
  urls: [{
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
    ]
  }]
});
```

### Example of videos:

[Description](https://support.google.com/webmasters/answer/80471?hl=en&ref_topic=4581190) specifications. Required fields are thumbnail_loc, title, and description.

```javascript
const sitemap = createSitemap({
  urls: [{
    url: 'http://test.com/page-1/',
    video: [
      { thumbnail_loc: 'http://test.com/tmbn1.jpg', title: 'A video title', description: 'This is a video' },
      {
        thumbnail_loc: 'http://test.com/tmbn2.jpg',
        title: 'A video with an attribute',
        description: 'This is another video',
        'player_loc': 'http://www.example.com/videoplayer.mp4?video=123',
        'player_loc:autoplay': 'ap=1'
      }
    ]
  }]
});
```


### Example of indicating alternate language pages:

[Description](https://support.google.com/webmasters/answer/2620865?hl=en) in
the google's Search Console Help.

```javascript
const sitemap = createSitemap({
  urls: [{
    url: 'http://test.com/page-1/',
    changefreq: 'weekly',
    priority: 0.3,
    links: [
      { lang: 'en', url: 'http://test.com/page-1/', },
      { lang: 'ja', url: 'http://test.com/page-1/ja/', },
    ]
  }]
});
```


### Example of indicating Android app deep linking:

[Description](https://developer.android.com/training/app-indexing/enabling-app-indexing.html#sitemap) in
the google's Search Console Help.

```javascript
const sitemap = createSitemap({
  urls: [{
    url: 'http://test.com/page-1/',
    changefreq: 'weekly',
    priority: 0.3,
    androidLink: 'android-app://com.company.test/page-1/'
  }]
});
```

### Example of Sitemap Styling

```javascript
const sitemap = createSitemap({
  urls: [{
    url: 'http://test.com/page-1/',
    changefreq: 'weekly',
    priority: 0.3,
    links: [
      { lang: 'en', url: 'http://test.com/page-1/', },
      { lang: 'ja', url: 'http://test.com/page-1/ja/', },
    ]
  },],
  xslUrl: 'sitemap.xsl'
});
```

### Example of mobile URL

[Description](https://support.google.com/webmasters/answer/34648?hl=en) in
the google's Search Console Help.

```javascript
const sitemap = createSitemap({
  urls: [{
    url: 'http://mobile.test.com/page-1/',
    changefreq: 'weekly',
    priority: 0.3,
    mobile: true
  },],
  xslUrl: 'sitemap.xsl'
});
```

### Example of using HH:MM:SS in lastmod

```javascript
const { createSitemap } = require('sitemap')
const sitemap = createSitemap({
  hostname: 'http://www.mywebsite.com',
  urls: [{
    url: 'http://mobile.test.com/page-1/',
    lastmodISO: '2015-06-27T15:30:00.000Z',
    changefreq: 'weekly',
    priority: 0.3
  }]
});
```

### Example of Sitemap Index as String

```javascript
const { buildSitemapIndex } = require('sitemap')
const smi = sm.buildSitemapIndex({
  urls: ['https://example.com/sitemap1.xml', 'https://example.com/sitemap2.xml'],
  xslUrl: 'https://example.com/style.xsl' // optional
});
```

### Example of Sitemap Index

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

### Example of overriding default xmlns* attributes in urlset element

Also see 'simple sitemap with dynamic xmlNs' test in [tests/sitemap.js](https://github.com/ekalinin/sitemap.js/blob/master/tests/sitemap.test.js)

```javascript
const sitemap = createSitemapIndex({
  xmlns: 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
});
```

### Example of news

```javascript
const { createSitemap } = require('sitemap')
const smi = createSitemap({
  urls: [{
    url: 'http://www.example.org/business/article55.html',
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
  }]
})
```

Testing
-------

```bash
➥ git clone https://github.com/ekalinin/sitemap.js.git
➥ cd sitemap.js
➥ make env
➥ . env/bin/activate
(env) ➥ make test
./node_modules/expresso/bin/expresso ./tests/sitemap.test.js

   100% 33 tests

```

License
-------

See [LICENSE](https://github.com/ekalinin/sitemap.js/blob/master/LICENSE)
file.
