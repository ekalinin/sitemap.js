import 'babel-polyfill';
import { createReadStream } from 'fs'
import { resolve } from 'path'
import { parseSitemap } from '../lib/sitemap-parser'
const normalizedSample = require('./sampleconfig.normalized.json')
describe('sitemap-parser', () => {
  it('parses xml into sitemap-item-options', async () => {
    const config = await parseSitemap(
      createReadStream(resolve(__dirname, "./alltags.xml"), {
        encoding: "utf8"
      })
    );
    expect(config.urls).toEqual(normalizedSample.urls);
  })
})
