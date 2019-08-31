import 'babel-polyfill';
const util = require('util');
const fs = require('fs');
const path = require('path');
const exec = util.promisify(require('child_process').exec)
const execFileSync = require('child_process').execFileSync
const pkg = require('../package.json')
const nomralizedSample = require('./mocks/sampleconfig.normalized.json')
let hasXMLLint = true
try {
  execFileSync('which', ['xmllint'])
} catch {
  hasXMLLint = false
}
const txtxml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"><url><loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc></url><url><loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-endangered-species-walkthrough-</loc></url></urlset>'

const txtxml2 = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"><url><loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc></url><url><loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-endangered-species-walkthrough-</loc></url><url><loc>https://roosterteeth.com/episode/rouletsplay-2018-goldeneye-source</loc></url><url><loc>https://roosterteeth.com/episode/let-s-play-2018-minecraft-episode-310</loc></url></urlset>`

const jsonxml = fs.readFileSync(path.resolve(__dirname, './mocks/cli-urls.json.xml'), {encoding: 'utf8'})
/* eslint-env jest, jasmine */
describe('cli', () => {
  it('prints its version when asked', async () => {
    const { stdout } = await exec('node ./dist/cli.js --version', {encoding: 'utf8'})
    expect(stdout).toBe(pkg.version + '\n')
  })
  it('prints a help doc when asked', async () => {
    const { stdout } = await exec('node ./dist/cli.js --help', {encoding: 'utf8'})
    expect(stdout.length).toBeGreaterThan(1)
  })
  it('accepts line separated urls', async () => {
    const { stdout } = await exec('node ./dist/cli.js < ./tests/mocks/cli-urls.txt', {encoding: 'utf8'})
    expect(stdout).toBe(txtxml)
  })
  it('accepts line separated urls as file', async () => {
    const { stdout } = await exec('node ./dist/cli.js ./tests/mocks/cli-urls.txt', {encoding: 'utf8'})
    expect(stdout).toBe(txtxml)
  })
  it('accepts multiple line separated urls as file', async () => {
    const { stdout } = await exec('node ./dist/cli.js ./tests/mocks/cli-urls.txt ./tests/mocks/cli-urls-2.txt', {encoding: 'utf8'})
    expect(stdout).toBe(txtxml2)
  })
  it('accepts json line separated urls', async () => {
    const { stdout } = await exec('node ./dist/cli.js --json < ./tests/mocks/cli-urls.json.txt', {encoding: 'utf8'})
    expect(stdout + '\n').toBe(jsonxml)
  })

  it('parses xml piped in', (done) => {
    exec('node ./dist/cli.js --parse < ./tests/mocks/alltags.xml', {encoding: 'utf8'}).then(({stdout, stderr}) => {
      expect(JSON.parse(stdout).urls).toEqual(nomralizedSample.urls)
      done()
    })
  })

  it('parses xml specified as a file', (done) => {
    exec('node ./dist/cli.js --parse ./tests/mocks/alltags.xml', {encoding: 'utf8'}).then(({stdout, stderr}) => {
      expect(JSON.parse(stdout).urls).toEqual(nomralizedSample.urls)
      done()
    })
  })

  it('validates xml piped in', (done) => {
    if (hasXMLLint) {
      exec('node ./dist/cli.js --validate < ./tests/mocks/cli-urls.json.xml', {encoding: 'utf8'}).then(({stdout, stderr}) => {
        expect(stdout).toBe('valid\n')
        done()
      })
    } else {
      console.warn('xmlLint not installed. Skipping test')
      done()
    }
  }, 60000)

  it('validates xml specified as file', (done) => {
    if (hasXMLLint) {
      exec('node ./dist/cli.js --validate ./tests/mocks/cli-urls.json.xml', {encoding: 'utf8'}).then(({stdout, stderr}) => {
        expect(stdout).toBe('valid\n')
        done()
      }, (error: Error): void => {console.log(error); done()}).catch((e: Error): void => console.log(e))
    } else {
      console.warn('xmlLint not installed. Skipping test')
      done()
    }
  }, 60000)
})
