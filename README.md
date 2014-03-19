sitemap.js
==========

**sitemap.js** is a high-level sitemap-generating framework that
makes creating [sitemap XML](http://www.sitemaps.org/) files easy.

Installation
------------

It's recommended to install via [npm](https://github.com/isaacs/npm/):

    npm install -g sitemap

Usage
-----

Here's an example of using sitemap.js with [express](https://github.com/visionmedia/express):

```javascript
var express = require('express')
  , sm = require('sitemap');
  
var app = express.createServer()
  , sitemap = sm.createSitemap ({
      hostname: 'http://example.com',
      cacheTime: 600000,        // 600 sec - cache purge period
      urls: [
        { url: '/page-1/',  changefreq: 'daily', priority: 0.3 },
        { url: '/page-2/',  changefreq: 'monthly',  priority: 0.7 },
        { url: '/page-3/' }     // changefreq: 'weekly',  priority: 0.5
      ]
    });

app.get('/sitemap.xml', function(req, res) {
  sitemap.toXML( function (xml) {
      res.header('Content-Type', 'application/xml');
      res.send( xml );
  });
});

app.listen(3000);
```

And here is an example of synchronous sitemap.js usage:

```javascript
var express = require('express')
  , sm = require('sitemap');

var app = express.createServer()
  , sitemap = sm.createSitemap ({
      hostname: 'http://example.com',
      cacheTime: 600000,  // 600 sec cache period
      urls: [
        { url: '/page-1/',  changefreq: 'daily', priority: 0.3 },
        { url: '/page-2/',  changefreq: 'monthly',  priority: 0.7 },
        { url: '/page-3/' } // changefreq: 'weekly',  priority: 0.5
      ]
    });

app.get('/sitemap.xml', function(req, res) {
  res.header('Content-Type', 'application/xml');
  res.send( sitemap.toString() );
});

app.listen(3000);
```

Example of dynamic page manipulations into sitemap:

```javascript
var sitemap = sm.createSitemap ({
      hostname: 'http://example.com',
      cacheTime: 600000
    });
sitemap.add({url: '/page-1/'});
sitemap.add({url: '/page-2/', changefreq: 'monthly', priority: 0.7});
sitemap.del({url: '/page-2/'});
sitemap.del('/page-1/');
```

License
-------

See [LICENSE](https://github.com/ekalinin/sitemap.js/blob/master/LICENSE)
file.
