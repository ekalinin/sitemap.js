import 'babel-polyfill'
import { Readable, Writable } from 'stream'
import { SitemapStream, preamble, closetag } from '../lib/sitemap-stream'
describe('sitemap stream', () => {
  let rs: Readable
  let ws: Writable
  let drain: string
  const sampleURLs = ['http://example.com', 'http://example.com/path']
  beforeEach(() => {
    drain = ''
    ws = new Writable();
    ws._write = function (chunk, enc, next) {
      drain += chunk
      next();
    };
  })

  it('pops out the preamble and closetag', async () => {
    await new Promise(resolve => {
      const sms = new SitemapStream()
      sms.pipe(ws)
      sms.on('end', () => resolve())
      sms.write(sampleURLs[0])
      sms.write(sampleURLs[1])
      sms.end()
    })
    expect(drain).toBe(preamble + `<url><loc>${sampleURLs[0]}/</loc></url>` + `<url><loc>${sampleURLs[1]}</loc></url>` + closetag)
  })

  it('normalizes passed in urls', async () => {
    await new Promise(resolve => {
      const source = ['/', '/path']
      const sms = new SitemapStream({ hostname: 'https://example.com/'})
      sms.pipe(ws)
      sms.on('end', () => resolve())
      sms.write(source[0])
      sms.write(source[1])
      sms.end()
    })
    expect(drain).toBe(preamble + `<url><loc>https://example.com/</loc></url>` + `<url><loc>https://example.com/path</loc></url>` + closetag)
  })
})
