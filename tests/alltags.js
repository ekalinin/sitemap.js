
var { createSitemap }= require('../dist/index')

var config = require('./sampleconfig.json')
  console.log(createSitemap(config).toString(true))
  /*
let urls = []
config.urls.forEach((smi) => {
  urls.push(Sitemap.normalizeURL(smi, undefined, 'https://roosterteeth.com'))
})
config.urls = urls
  console.log(JSON.stringify(config))
  */
