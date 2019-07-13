
var sm = require('../dist/index')

var config = require('./sampleconfig.json')
  console.log(sm.createSitemap(config).toString())
