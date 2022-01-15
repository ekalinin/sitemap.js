const { createWriteStream } = require('fs');
const { SitemapStream } = require('sitemap');

async function writeAsync(sitemap, chunk, encoding) {
  return new Promise((resolve, reject) => {
    const writeReturned = sitemap.write(chunk, encoding, (error) => {
      if (error !== undefined) {
        reject(error);
      } else {
        resolve(writeReturned);
      }
    });
  });
}

function rotateSitemap(basename, countSuffix) {
  // Creates a sitemap object given the input configuration with URLs
  let sitemap = new SitemapStream({
    hostname: 'http://example.com',
    byteLimit: 1360,
    countLimit: 10,
  });

  const writeStream = createWriteStream(`./${basename}-${countSuffix}.xml`);
  sitemap.pipe(writeStream);
  sitemap.on('error', (error) => {
    if (
      error.name === 'ByteLimitExceededError' ||
      error.name === 'CountLimitExceededError'
    ) {
      console.log(error.name);
    } else {
      console.log('error from sitemap stream', error.message);
    }
  });

  return sitemap;
}

async function example() {
  let count = 0;
  let sitemap = rotateSitemap('sitemap', count);
  count++;

  for (let i = 0; i < 100; i++) {
    const item = {
      url: `/page-${i}/`,
      changefreq: 'daily',
      priority: 0.3,
    };

    try {
      await writeAsync(sitemap, item);
    } catch (error) {
      if (
        error.name === 'ByteLimitExceededError' ||
        error.name === 'CountLimitExceededError'
      ) {
        // Create a new sitemap
        sitemap = rotateSitemap('sitemap', count);
        count++;

        // The current item needs to be written to the new sitemap
        // because it was not able to fit in the old sitemap
        await writeAsync(sitemap, item);
      } else {
        throw error;
      }
    }
  }

  sitemap.end();
}

example();
