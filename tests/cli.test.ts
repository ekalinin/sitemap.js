import 'babel-polyfill';
const util = require('util');
const exec = util.promisify(require('child_process').exec)
const pkg = require('../package.json')
const txtxml = '<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:news=\"http://www.google.com/schemas/sitemap-news/0.9\" xmlns:xhtml=\"http://www.w3.org/1999/xhtml\" xmlns:mobile=\"http://www.google.com/schemas/sitemap-mobile/1.0\" xmlns:image=\"http://www.google.com/schemas/sitemap-image/1.1\" xmlns:video=\"http://www.google.com/schemas/sitemap-video/1.1\"><url><loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc></url><url><loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-endangered-species-walkthrough-</loc></url></urlset>'

const txtxml2 = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"><url><loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc></url><url><loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-endangered-species-walkthrough-</loc></url><url><loc>https://roosterteeth.com/episode/rouletsplay-2018-goldeneye-source</loc></url><url><loc>https://roosterteeth.com/episode/let-s-play-2018-minecraft-episode-310</loc></url></urlset>`

const jsonxml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:news=\"http://www.google.com/schemas/sitemap-news/0.9\" xmlns:xhtml=\"http://www.w3.org/1999/xhtml\" xmlns:mobile=\"http://www.google.com/schemas/sitemap-mobile/1.0\" xmlns:image=\"http://www.google.com/schemas/sitemap-image/1.1\" xmlns:video=\"http://www.google.com/schemas/sitemap-video/1.1\"><url><loc>https://roosterteeth.com/episode/rouletsplay-2018-goldeneye-source</loc><changefreq>weekly</changefreq><video:video><video:thumbnail_loc>https://rtv3-img-roosterteeth.akamaized.net/store/0e841100-289b-4184-ae30-b6a16736960a.jpg/sm/thumb3.jpg</video:thumbnail_loc><video:title><![CDATA[2018:E6 - GoldenEye: Source]]></video:title><video:description><![CDATA[We play gun game in GoldenEye: Source with a good friend of ours. His name is Gruchy. Dan Gruchy.]]></video:description><video:player_loc>https://roosterteeth.com/embed/rouletsplay-2018-goldeneye-source</video:player_loc><video:duration>1208</video:duration><video:publication_date>2018-04-27T17:00:00.000Z</video:publication_date><video:requires_subscription>no</video:requires_subscription></video:video></url><url><loc>https://roosterteeth.com/episode/let-s-play-2018-minecraft-episode-310</loc><changefreq>weekly</changefreq><video:video><video:thumbnail_loc>https://rtv3-img-roosterteeth.akamaized.net/store/f255cd83-3d69-4ee8-959a-ac01817fa204.jpg/sm/thumblpchompinglistv2.jpg</video:thumbnail_loc><video:title><![CDATA[2018:E90 - Minecraft - Episode 310 - Chomping List]]></video:title><video:description><![CDATA[Now that the gang's a bit more settled into Achievement Cove, it's time for a competition. Whoever collects the most unique food items by the end of the episode wins. The winner may even receive a certain golden tower.]]></video:description><video:player_loc>https://roosterteeth.com/embed/let-s-play-2018-minecraft-episode-310</video:player_loc><video:duration>3070</video:duration><video:publication_date>2018-04-27T14:00:00.000Z</video:publication_date><video:requires_subscription>no</video:requires_subscription></video:video></url></urlset>`
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
    expect(stdout).toBe(jsonxml)
  })
})
