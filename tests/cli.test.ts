import 'babel-polyfill';
const util = require('util');
const fs = require('fs');
const path = require('path');
const exec = util.promisify(require('child_process').exec)
const pkg = require('../package.json')
const txtxml = '<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:news=\"http://www.google.com/schemas/sitemap-news/0.9\" xmlns:xhtml=\"http://www.w3.org/1999/xhtml\" xmlns:mobile=\"http://www.google.com/schemas/sitemap-mobile/1.0\" xmlns:image=\"http://www.google.com/schemas/sitemap-image/1.1\" xmlns:video=\"http://www.google.com/schemas/sitemap-video/1.1\"><url><loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc></url><url><loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-endangered-species-walkthrough-</loc></url></urlset>'

const txtxml2 = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"><url><loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc></url><url><loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-endangered-species-walkthrough-</loc></url><url><loc>https://roosterteeth.com/episode/rouletsplay-2018-goldeneye-source</loc></url><url><loc>https://roosterteeth.com/episode/let-s-play-2018-minecraft-episode-310</loc></url></urlset>`

const jsonxml = fs.readFileSync(path.resolve(__dirname, './cli-urls.json.xml'), {encoding: 'utf8'})
/* eslint-env jest, jasmine */
describe('cli', () => {
  it('prints its version when asked', async () => {
    const { stdout } = await exec('node ./dist/cli.js --version', {encoding: 'utf8'})
    expect(stdout).toBe(pkg.version + '\n')
  })
  it('prints a help doc when asked', async () => {
    const { stdout } = await exec('node ./dist/cli.js --help', {encoding: 'utf8'})
    expect(stdout).toBe('TODO\n')
  })
  it('accepts line separated urls', async () => {
    const { stdout } = await exec('node ./dist/cli.js < ./tests/cli-urls.txt', {encoding: 'utf8'})
    expect(stdout).toBe(txtxml)
  })
  it('accepts line separated urls as file', async () => {
    const { stdout } = await exec('node ./dist/cli.js ./tests/cli-urls.txt', {encoding: 'utf8'})
    expect(stdout).toBe(txtxml)
  })
  it('accepts multiple line separated urls as file', async () => {
    const { stdout } = await exec('node ./dist/cli.js ./tests/cli-urls.txt ./tests/cli-urls-2.txt', {encoding: 'utf8'})
    expect(stdout).toBe(txtxml2)
  })
  it('accepts json line separated urls', async () => {
    const { stdout } = await exec('node ./dist/cli.js --json < ./tests/cli-urls.json.txt', {encoding: 'utf8'})
    expect(stdout + '\n').toBe(jsonxml)
  })

  it('validates xml piped in', (done) => {
    exec('node ./dist/cli.js --validate < ./tests/cli-urls.json.xml', {encoding: 'utf8'}).then(({stdout, stderr}) => {
      expect(stdout).toBe('valid\n')
      done()
    })
  }, 30000)

  it('validates xml specified as file', (done) => {
    exec('node ./dist/cli.js --validate ./tests/cli-urls.json.xml', {encoding: 'utf8'}).then(({stdout, stderr}) => {
      expect(stdout).toBe('valid\n')
      done()
    }, (error) => {console.log(error); done()}).catch(e => console.log(e))
  }, 30000)
})
