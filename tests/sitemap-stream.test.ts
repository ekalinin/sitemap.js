import 'babel-polyfill'
import { SitemapStream, preamble, closetag, streamToPromise } from '../lib/sitemap-stream'
describe('sitemap stream', () => {
  const sampleURLs = ['http://example.com', 'http://example.com/path']

  it('pops out the preamble and closetag', async () => {
    const sms = new SitemapStream()
    sms.write(sampleURLs[0])
    sms.write(sampleURLs[1])
    sms.end()
    expect((await streamToPromise(sms)).toString()).toBe(preamble + `<url><loc>${sampleURLs[0]}/</loc></url>` + `<url><loc>${sampleURLs[1]}</loc></url>` + closetag)
  })

  it('normalizes passed in urls', async () => {
    const source = ['/', '/path']
    const sms = new SitemapStream({ hostname: 'https://example.com/'})
    sms.write(source[0])
    sms.write(source[1])
    sms.end()
    expect((await streamToPromise(sms)).toString()).toBe(preamble + `<url><loc>https://example.com/</loc></url>` + `<url><loc>https://example.com/path</loc></url>` + closetag)
  })
})
