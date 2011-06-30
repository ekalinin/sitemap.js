node-sitemap
============

node-sitemap is a high-level sitemap-generating framework that
makes creating [sitemap XML](http://www.sitemaps.org/) files easy.

Installation
------------

It's recommended to install via [npm](https://github.com/isaacs/npm/):

    npm install -g sitemap

Usage
-----

Here's an example of node-sitemap with [express](https://github.com/visionmedia/express):

    var express = require('express')
      , sm = require('sitemap');

    var app = express.createServer()
      , sitemap = sm.createSitemap ({
          hostname: 'http://example.com',
          urls: [
            { 'url': '/page-1/',  'changefreq': 'weekly', 'priority': 0.3 },
            { 'url': '/page-2/',  'changefreq': 'dayly',  'priority': 0.7 }
          ]
        });

    app.get('/sitemap.xml', function(req, res) {
      res.header('Content-Type', 'application/xml');
      res.send( sitemap.toXML() );
    });

    app.listen(3000);

License
-------

See [LICENSE](https://github.com/ekalinin/node-sitemap/blob/master/LICENSE) file.
