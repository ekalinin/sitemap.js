import util from 'util';
import fs from 'fs';
import path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const exec = util.promisify(require('child_process').exec);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const execFileSync = require('child_process').execFileSync;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const normalizedSample = require('./mocks/sampleconfig.normalized.json');
let hasXMLLint = true;
try {
  execFileSync('which', ['xmllint']);
} catch {
  hasXMLLint = false;
}
const txtxml =
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"><url><loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc></url><url><loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-endangered-species-walkthrough-</loc></url></urlset>';

const jsonxml = fs.readFileSync(
  path.resolve(__dirname, './mocks/cli-urls.json.xml'),
  { encoding: 'utf8' }
);
/* eslint-env jest, jasmine */
describe('cli', () => {
  it('prints its version when asked', async () => {
    const { stdout } = await exec('node ./dist/cli.js --version', {
      encoding: 'utf8',
    });
    expect(stdout).toBe(pkg.version + '\n');
  });

  it('prints a help doc when asked', async () => {
    const { stdout } = await exec('node ./dist/cli.js --help', {
      encoding: 'utf8',
    });
    expect(stdout.length).toBeGreaterThan(1);
  });

  it('accepts line separated urls', async () => {
    const { stdout } = await exec(
      'node ./dist/cli.js < ./tests/mocks/cli-urls.txt',
      {
        encoding: 'utf8',
      }
    );
    expect(stdout).toBe(txtxml);
  });

  it('prepends to existing xml', async () => {
    let threw = false;
    try {
      await exec(
        'echo "https://example.com/asdr32/" | node ./dist/cli.js --prepend ./tests/mocks/cli-urls.json.xml|grep \'https://example.com/asdr32/\''
      );
    } catch (e) {
      threw = true;
    }
    expect(threw).toBe(false);
  });

  it('accepts line separated urls as file', async () => {
    const { stdout } = await exec(
      'node ./dist/cli.js ./tests/mocks/cli-urls.txt',
      {
        encoding: 'utf8',
      }
    );
    expect(stdout).toBe(txtxml);
  });

  it('streams a index file and writes sitemaps', async () => {
    const { stdout } = await exec(
      'cat ./tests/mocks/short-list.txt | node ./dist/cli.js --index --limit 250 --index-base-url https://example.com/path/',
      {
        encoding: 'utf8',
      }
    );
    expect(stdout).toContain('https://example.com/path/sitemap-0.xml');
    expect(stdout).toContain('https://example.com/path/sitemap-1.xml');
    expect(stdout).toContain('https://example.com/path/sitemap-2.xml');
    expect(stdout).toContain('https://example.com/path/sitemap-3.xml');
    expect(stdout).not.toContain('https://example.com/path/sitemap-4.xml');
    try {
      fs.accessSync(path.resolve('./sitemap-0.xml'), fs.constants.R_OK);
      fs.accessSync(path.resolve('./sitemap-3.xml'), fs.constants.R_OK);
      expect('file exists').toBe('file exists');
    } catch (e) {
      expect('file to exist').toBe(e);
    }
    try {
      fs.accessSync(path.resolve('sitemap-4.xml'), fs.constants.R_OK);
      expect('file to not exist').toBe(true);
    } catch {
      expect('file does not exist').toBe('file does not exist');
    }
    fs.unlinkSync(path.resolve('./sitemap-0.xml'));
    fs.unlinkSync(path.resolve('./sitemap-1.xml'));
    fs.unlinkSync(path.resolve('./sitemap-2.xml'));
    fs.unlinkSync(path.resolve('./sitemap-3.xml'));
  }, 30000);

  it('accepts json line separated urls', async () => {
    const { stdout } = await exec(
      'node ./dist/cli.js < ./tests/mocks/cli-urls.json.txt',
      {
        encoding: 'utf8',
      }
    );
    expect(stdout + '\n').toBe(jsonxml);
  });

  it('parses xml piped in', async () => {
    let json;
    let threw = false;
    try {
      const { stdout } = await exec(
        'node ./dist/cli.js --parse --single-line-json < ./tests/mocks/alltags.xml',
        { encoding: 'utf8' }
      );
      json = JSON.parse(stdout);
    } catch (e) {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(json).toEqual(normalizedSample.urls);
  });

  it('parses xml specified as a file', async () => {
    let threw = false;
    let json;
    try {
      const { stdout } = await exec(
        'node ./dist/cli.js --parse --single-line-json ./tests/mocks/alltags.xml',
        { encoding: 'utf8' }
      );
      json = JSON.parse(stdout);
    } catch (e) {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(json).toEqual(normalizedSample.urls);
  });

  it('exits with an error while parsing a bad xml file', async () => {
    let threw = false;
    let json;
    try {
      const { stdout } = await exec(
        'node ./dist/cli.js --parse --single-line-json ./tests/mocks/bad-tag-sitemap.xml',
        { encoding: 'utf8' }
      );
      json = JSON.parse(stdout);
    } catch (e) {
      threw = true;
    }
    expect(threw).toBe(true);
    expect(json).toBeUndefined();
  });

  it('validates xml piped in', (done) => {
    if (hasXMLLint) {
      exec('node ./dist/cli.js --validate < ./tests/mocks/cli-urls.json.xml', {
        encoding: 'utf8',
      }).then(({ stdout, stderr }) => {
        expect(stdout).toBe('valid\n');
        done();
      });
    } else {
      console.warn('xmlLint not installed. Skipping test');
      done();
    }
  }, 60000);

  it('validates xml specified as file', (done) => {
    if (hasXMLLint) {
      exec('node ./dist/cli.js --validate ./tests/mocks/cli-urls.json.xml', {
        encoding: 'utf8',
      })
        .then(
          ({ stdout, stderr }) => {
            expect(stdout).toBe('valid\n');
            done();
          },
          (error: Error): void => {
            console.log(error);
            done();
          }
        )
        .catch((e: Error): void => console.log(e));
    } else {
      console.warn('xmlLint not installed. Skipping test');
      done();
    }
  }, 60000);
});
