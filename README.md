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

Here's an example of using **sitemap.js** with [express](https://github.com/visionmedia/express):

    var express = require('express')
      , sm = require('sitemap');

    var app = express.createServer()
      , sitemap = sm.createSitemap ({
          hostname: 'http://example.com',
          cacheTime: 600000,        // 600 sec cache period
          url: [
            { url: '/page-1/',  changefreq: 'dayly', priority: 0.3 },
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

License
-------

See [LICENSE](https://github.com/ekalinin/sitemap.js/blob/master/LICENSE)
file.
