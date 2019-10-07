const { createSitemap, Sitemap, validateSMIOptions }= require('../dist/index')

const config = require('./mocks/sampleconfig.json')
console.log(createSitemap(config).toString(true))
/*
let urls = []
config.urls.forEach((smi) => {
  urls.push(validateSMIOptions(Sitemap.normalizeURL(smi, 'https://roosterteeth.com')))
})
config.urls = urls
  console.log(JSON.stringify(config, null, 2))
  */
