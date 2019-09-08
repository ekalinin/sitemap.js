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
    rs = Readable.from(sampleURLs)
    ws = new Writable();
    ws._write = function (chunk, enc, next) {
      drain += chunk
      next();
    };
  })

  it('pops out the preamble and closetag', async () => {
    await new Promise(resolve => {
      rs.pipe(new SitemapStream()).pipe(ws)
      rs.on('end', () => resolve())
    })
    expect(drain).toBe(preamble + `<url><loc>${sampleURLs[0]}/</loc></url>` + `<url><loc>${sampleURLs[1]}</loc></url>` + closetag)
  })

  it('normalizes passed in urls', async () => {
    await new Promise(resolve => {
      rs = Readable.from(['/', '/path'])
      rs.pipe(new SitemapStream({ hostname: 'https://example.com/'})).pipe(ws)
      rs.on('end', () => resolve())
    })
    expect(drain).toBe(preamble + `<url><loc>https://example.com/</loc></url>` + `<url><loc>https://example.com/path</loc></url>` + closetag)
  })
})
