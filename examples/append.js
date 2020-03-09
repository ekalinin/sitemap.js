// Slurp in an xml file append to it and pipe it back out
const { createReadStream, createWriteStream, copyFile, unlink } = require('fs');
const { resolve } = require('path');
const { Transform } = require('stream');
const { SitemapStream, XMLToSitemapItemStream } = require('../dist/index');
const { tmpdir } = require('os');

// Sample data that is a list of all dbUpdates.
// we'll use this to update data as it passes through the stream.
const dbUpdates = {
  'https://roosterteeth.com/episode/let-s-play-2018-minecraft-episode-310': {
    url:
      'https://roosterteeth.com/episode/let-s-play-2018-minecraft-episode-310',
    changefreq: 'weekly',
    video: [
      {
        title: '2018:E90 - Minecraft - Episode 310 - Chomping List',
        description:
          "Now that the gang's a bit more settled into Achievement Cove, it's time for a competition. Whoever collects the most unique food items by the end of the episode wins. The winner may even receive a certain golden tower.",
        player_loc:
          'https://roosterteeth.com/embed/let-s-play-2018-minecraft-episode-310',
        thumbnail_loc:
          'https://rtv3-img-roosterteeth.akamaized.net/store/f255cd83-3d69-4ee8-959a-ac01817fa204.jpg/sm/thumblpchompinglistv2.jpg',
        duration: 3070,
        publication_date: '2018-04-27T14:00:00.000Z',
        requires_subscription: true,
      },
    ],
  },
};

const smStream = new SitemapStream();
const smPath = resolve('./sitemap.xml');
const tmpPath = resolve(tmpdir(), './sitemap.xml');

// our updater stream
const updateEntries = new Transform({
  objectMode: true,
  transform(chunk, encoding, callback) {
    // single hard-coded item example
    if (
      chunk.url ===
      'https://roosterteeth.com/episode/rouletsplay-2018-goldeneye-source'
    ) {
      callback(undefined, { ...chunk, changefreq: 'daily' });
    } else if (chunk.url in dbUpdates) {
      // replaces entry as it passes through the stream
      callback(undefined, dbUpdates[chunk.url]);
    } else {
      // not somethine we're looking to update
      callback(undefined, chunk);
    }
  },
});

const pipeline = createReadStream(smPath)
  // this parses the xml and turns it into a stream of objects
  // suitable for SitemapAndIndexStream or SitemapStream
  .pipe(new XMLToSitemapItemStream())
  .pipe(updateEntries)
  .pipe(smStream) // turns options back into xml
  .pipe(createWriteStream(tmpPath));
pipeline.on('finish', () =>
  // overwrite original with temp file
  copyFile(tmpPath, smPath, error => {
    // delete temp file
    unlink(tmpPath, () => {});
  })
);
pipeline.on('error', e => e.code === 'EPIPE' || console.error(e));
// Here is where the sitemap items get appended to the stream.
smStream.write({ url: 'http://example.com/foo/bir' });
smStream.write({ url: 'http://example.com/foo/bar' });
