sitemap.js
==========

**sitemap.js** is a high-level sitemap-generating framework that
makes creating [sitemap XML](http://www.sitemaps.org/) files easy.

Installation
------------

It's recommended to install via [npm](https://github.com/isaacs/npm/):

    npm install --save sitemap

Usage
-----
The main functions you want to use in the sitemap module are

```javascript
var sm = require('sitemap')
var sitemap = sm.createSitemap({ options }); //Creates a sitemap object given the input configuration with URLs
sitemap.toXML( function(xml){ console.log(xml) });) //Generates XML with a callback function
var xml = sitemap.toString(); //Gives you a string containing the XML data
```

###Example of using sitemap.js with [express](https://github.com/visionmedia/express):

```javascript
var express = require('express')
  , sm = require('sitemap');
  
var app = express()
  , sitemap = sm.createSitemap ({
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
  sitemap.toXML( function (xml) {
      res.header('Content-Type', 'application/xml');
      res.send( xml );
  });
});

app.listen(3000);
```

###Example of synchronous sitemap.js usage:

```javascript
var express = require('express')
  , sm = require('sitemap');

var app = express()
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

###Example of dynamic page manipulations into sitemap:

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



###Example of pre-generating sitemap based on existing static files:

```javascript
var sm = require('sitemap')
    , fs = require('fs');

var sitemap = sm.createSitemap({
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

License
-------

See [LICENSE](https://github.com/ekalinin/sitemap.js/blob/master/LICENSE)
file.
