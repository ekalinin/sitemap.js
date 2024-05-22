import { SitemapStream } from '../index';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import {
  existsSync,
  unlinkSync,
  createWriteStream,
  createReadStream,
} from 'fs';
import {
  SitemapIndexStream,
  SitemapAndIndexStream,
} from '../lib/sitemap-index-stream';
import { streamToPromise } from '../lib/sitemap-stream';
import { finished as finishedCallback } from 'stream';
import { readFileSync, WriteStream } from 'node:fs';
import { promisify } from 'util';

const finished = promisify(finishedCallback);

/* eslint-env jest, jasmine */
function removeFilesArray(files): void {
  if (files && files.length) {
    files.forEach(function (file) {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    });
  }
}

const xmlDef = '<?xml version="1.0" encoding="UTF-8"?>';
describe('sitemapIndex', () => {
  it('build sitemap index', async () => {
    const expectedResult =
      xmlDef +
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      '<sitemap>' +
      '<loc>https://test.com/s1.xml</loc>' +
      '</sitemap>' +
      '<sitemap>' +
      '<loc>https://test.com/s2.xml</loc>' +
      '</sitemap>' +
      '</sitemapindex>';
    const smis = new SitemapIndexStream();
    smis.write('https://test.com/s1.xml');
    smis.write('https://test.com/s2.xml');
    smis.end();
    const result = await streamToPromise(smis);

    expect(result.toString()).toBe(expectedResult);
  });

  it('build sitemap index with lastmodISO', async () => {
    const expectedResult =
      xmlDef +
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      '<sitemap>' +
      '<loc>https://test.com/s1.xml</loc>' +
      '<lastmod>2018-11-26T00:00:00.000Z</lastmod>' +
      '</sitemap>' +
      '<sitemap>' +
      '<loc>https://test.com/s2.xml</loc>' +
      '<lastmod>2018-11-27T00:00:00.000Z</lastmod>' +
      '</sitemap>' +
      '<sitemap>' +
      '<loc>https://test.com/s3.xml</loc>' +
      '</sitemap>' +
      '</sitemapindex>';
    const smis = new SitemapIndexStream();
    smis.write({
      url: 'https://test.com/s1.xml',
      lastmod: '2018-11-26',
    });

    smis.write({
      url: 'https://test.com/s2.xml',
      lastmod: '2018-11-27',
    });

    smis.write({
      url: 'https://test.com/s3.xml',
    });
    smis.end();
    const result = await streamToPromise(smis);

    expect(result.toString()).toBe(expectedResult);
  });

  it('build sitemap index with lastmodDateOnly', async () => {
    const expectedResult =
      xmlDef +
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      '<sitemap>' +
      '<loc>https://test.com/s1.xml</loc>' +
      '<lastmod>2018-11-26</lastmod>' +
      '</sitemap>' +
      '<sitemap>' +
      '<loc>https://test.com/s2.xml</loc>' +
      '<lastmod>2018-11-27</lastmod>' +
      '</sitemap>' +
      '<sitemap>' +
      '<loc>https://test.com/s3.xml</loc>' +
      '</sitemap>' +
      '</sitemapindex>';
    const smis = new SitemapIndexStream({ lastmodDateOnly: true });
    smis.write({
      url: 'https://test.com/s1.xml',
      lastmod: '2018-11-26T00:00:00.000Z',
    });

    smis.write({
      url: 'https://test.com/s2.xml',
      lastmod: '2018-11-27T00:00:00.000Z',
    });

    smis.write({
      url: 'https://test.com/s3.xml',
    });
    smis.end();
    const result = await streamToPromise(smis);

    expect(result.toString()).toBe(expectedResult);
  });
});

describe('sitemapAndIndex', () => {
  let targetFolder: string;

  beforeEach(() => {
    targetFolder = tmpdir();
    removeFilesArray([
      resolve(targetFolder, `./sitemap-0.xml`),
      resolve(targetFolder, `./sitemap-1.xml`),
      resolve(targetFolder, `./sitemap-2.xml`),
      resolve(targetFolder, `./sitemap-3.xml`),
      resolve(targetFolder, `./sitemap-4.xml`),
      resolve(targetFolder, `./sitemap-index.xml`),
    ]);
  });

  afterEach(() => {
    removeFilesArray([
      resolve(targetFolder, `./sitemap-0.xml`),
      resolve(targetFolder, `./sitemap-1.xml`),
      resolve(targetFolder, `./sitemap-2.xml`),
      resolve(targetFolder, `./sitemap-3.xml`),
      resolve(targetFolder, `./sitemap-4.xml`),
      resolve(targetFolder, `./sitemap-index.xml`),
    ]);
  });

  it('writes both a sitemap and index', async () => {
    const baseURL = 'https://example.com/sub/';

    const sms = new SitemapAndIndexStream({
      limit: 1,
      getSitemapStream: (i: number): [string, SitemapStream, WriteStream] => {
        const sm = new SitemapStream();
        const path = `./sitemap-${i}.xml`;

        const outputStream = createWriteStream(resolve(targetFolder, path));

        // Streams do not automatically propagate errors
        // We must propagate this up to the SitemapStream
        outputStream.on('error', (err) => {
          sm.emit('error', err);
        });

        const ws = sm.pipe(outputStream);
        return [new URL(path, baseURL).toString(), sm, ws];
      },
    });
    sms.write('https://1.example.com/a');
    sms.write('https://2.example.com/a');
    sms.write('https://3.example.com/a');
    sms.write('https://4.example.com/a');
    sms.end();
    const index = (await streamToPromise(sms)).toString();
    expect(index).toContain(`${baseURL}sitemap-0`);
    expect(index).toContain(`${baseURL}sitemap-1`);
    expect(index).toContain(`${baseURL}sitemap-2`);
    expect(index).toContain(`${baseURL}sitemap-3`);
    expect(index).not.toContain(`${baseURL}sitemap-4`);
    expect(existsSync(resolve(targetFolder, `./sitemap-0.xml`))).toBe(true);
    expect(existsSync(resolve(targetFolder, `./sitemap-1.xml`))).toBe(true);
    expect(existsSync(resolve(targetFolder, `./sitemap-2.xml`))).toBe(true);
    expect(existsSync(resolve(targetFolder, `./sitemap-3.xml`))).toBe(true);
    expect(existsSync(resolve(targetFolder, `./sitemap-4.xml`))).toBe(false);
    const xml = await streamToPromise(
      createReadStream(resolve(targetFolder, `./sitemap-0.xml`))
    );
    expect(xml.toString()).toContain('https://1.example.com/a');
  });

  it('propagates error from sitemap stream that cannot be written', async () => {
    const baseURL = 'https://example.com/sub/';

    const sms = new SitemapAndIndexStream({
      limit: 1,
      getSitemapStream: (i: number): [string, SitemapStream, WriteStream] => {
        const sm = new SitemapStream();
        const path = `./sitemap-${i}.xml`;

        // This will not throw even though it will fail
        // `outputStream.writable === true`
        // `outputStream.closed === false`
        const outputStream = createWriteStream(
          resolve(join(targetFolder, 'does', 'not', 'exist'), path)
        );

        // Streams do not automatically propagate errors
        // We must propagate this up to the SitemapStream
        outputStream.on('error', (err) => {
          sm.emit('error', err);
        });

        const ws = sm.pipe(outputStream);
        return [new URL(path, baseURL).toString(), sm, ws];
      },
    });
    sms.write('https://1.example.com/a');
    sms.write('https://2.example.com/a');
    sms.write('https://3.example.com/a');
    sms.write('https://4.example.com/a');
    sms.end();
    await expect(finished(sms)).rejects.toThrow(
      'ENOENT: no such file or directory, open'
    );

    expect(
      existsSync(
        resolve(join(targetFolder, 'does', 'not', 'exist'), `./sitemap-0.xml`)
      )
    ).toBe(false);
  });

  it('writes to index file', async () => {
    const baseURL = 'https://example.com/sub/';

    const sms = new SitemapAndIndexStream({
      limit: 2,
      getSitemapStream: (i: number): [string, SitemapStream, WriteStream] => {
        const sm = new SitemapStream();
        const path = `./sitemap-${i}.xml`;

        // This will not throw even though it will fail
        // `outputStream.writable === true`
        // `outputStream.closed === false`
        const outputStream = createWriteStream(resolve(targetFolder, path));

        // Streams do not automatically propagate errors
        // We must propagate this up to the SitemapStream
        outputStream.on('error', (err) => {
          sm.emit('error', err);
        });

        const ws = sm.pipe(outputStream);
        return [new URL(path, baseURL).toString(), sm, ws];
      },
    });

    // Pipe the index stream to a file
    const indexStream = createWriteStream(
      resolve(targetFolder, `./sitemap-index.xml`)
    );
    sms.pipe(indexStream);
    await writeData(sms, 'https://1.example.com/a');
    await writeData(sms, 'https://2.example.com/a');
    await writeData(sms, 'https://3.example.com/a');
    sms.end();
    await expect(finished(sms)).resolves.toBeUndefined();

    await finished(indexStream);

    expect(existsSync(resolve(targetFolder, `./sitemap-index.xml`))).toBe(true);
    expect(existsSync(resolve(targetFolder, `./sitemap-0.xml`))).toBe(true);
    expect(existsSync(resolve(targetFolder, `./sitemap-1.xml`))).toBe(true);
    expect(existsSync(resolve(targetFolder, `./sitemap-2.xml`))).toBe(false);

    // Read the first sitemap to make sure it was written
    const sitemap0 = await streamToPromise(
      createReadStream(resolve(targetFolder, `./sitemap-0.xml`))
    );
    expect(sitemap0.toString()).toContain('https://1.example.com/a');

    // Read the last sitemap to make sure it was written
    const sitemap1 = await streamToPromise(
      createReadStream(resolve(targetFolder, `./sitemap-1.xml`))
    );
    expect(sitemap1.toString()).toContain('https://3.example.com/a');

    // Read the index to make sure it was written
    const indexText = readFileSync(
      resolve(targetFolder, `./sitemap-index.xml`),
      'utf-8'
    );
    expect(indexText).toContain(`${baseURL}sitemap-0`);
    expect(indexText).toContain(`${baseURL}sitemap-1`);
    expect(indexText).not.toContain(`${baseURL}sitemap-2`);
  });

  it('does not hang if last sitemap is filled', async () => {
    const baseURL = 'https://example.com/sub/';

    const sms = new SitemapAndIndexStream({
      limit: 2,
      getSitemapStream: (i: number): [string, SitemapStream, WriteStream] => {
        const sm = new SitemapStream();
        const path = `./sitemap-${i}.xml`;

        // This will not throw even though it will fail
        // `outputStream.writable === true`
        // `outputStream.closed === false`
        const outputStream = createWriteStream(resolve(targetFolder, path));

        // Streams do not automatically propagate errors
        // We must propagate this up to the SitemapStream
        outputStream.on('error', (err) => {
          sm.emit('error', err);
        });

        const ws = sm.pipe(outputStream);
        return [new URL(path, baseURL).toString(), sm, ws];
      },
    });

    // Pipe the index stream to a file
    const indexStream = createWriteStream(
      resolve(targetFolder, `./sitemap-index.xml`)
    );
    sms.pipe(indexStream);
    await writeData(sms, 'https://1.example.com/a');
    await writeData(sms, 'https://2.example.com/a');
    sms.end();
    await expect(finished(sms)).resolves.toBeUndefined();

    await finished(indexStream);

    expect(existsSync(resolve(targetFolder, `./sitemap-index.xml`))).toBe(true);
    expect(existsSync(resolve(targetFolder, `./sitemap-0.xml`))).toBe(true);
    expect(existsSync(resolve(targetFolder, `./sitemap-1.xml`))).toBe(false);

    const sitemap0Raw = readFileSync(
      resolve(targetFolder, `./sitemap-0.xml`),
      'utf-8'
    );
    expect(sitemap0Raw).toContain('https://1.example.com/a');
    expect(sitemap0Raw).toContain('https://2.example.com/a');
    expect(sitemap0Raw).not.toContain('https://3.example.com/a');

    // Read the first sitemap to make sure it was written
    const sitemap0 = await streamToPromise(
      createReadStream(resolve(targetFolder, `./sitemap-0.xml`))
    );
    expect(sitemap0.toString()).toContain('https://1.example.com/a');

    // Read the index to make sure it was written
    const indexText = readFileSync(
      resolve(targetFolder, `./sitemap-index.xml`),
      'utf-8'
    );
    expect(indexText).toContain(`${baseURL}sitemap-0`);
    expect(indexText).not.toContain(`${baseURL}sitemap-1`);
  });

  it('deterministically finishes writing each sitemap file before creating a new one', async () => {
    const baseURL = 'https://example.com/sub/';

    const sms = new SitemapAndIndexStream({
      limit: 5000,
      getSitemapStream: (i: number): [string, SitemapStream, WriteStream] => {
        const sm = new SitemapStream();
        const path = `./sitemap-${i}.xml`;

        // This will not throw even though it will fail
        // `outputStream.writable === true`
        // `outputStream.closed === false`
        const outputStream = createWriteStream(resolve(targetFolder, path));

        // Streams do not automatically propagate errors
        // We must propagate this up to the SitemapStream
        outputStream.on('error', (err) => {
          sm.emit('error', err);
        });

        const ws = sm.pipe(outputStream);
        return [new URL(path, baseURL).toString(), sm, ws];
      },
    });

    // Pipe the index stream to a file
    const indexStream = createWriteStream(
      resolve(targetFolder, `./sitemap-index.xml`)
    );
    sms.pipe(indexStream);
    for (let i = 0; i < 5000; i++) {
      // Intentionally write while ignoring back pressure to stress test
      // the rolling to new files
      sms.write(`https://1.example.com/a${i}`);
    }
    for (let i = 0; i < 5000; i++) {
      sms.write(`https://2.example.com/a${i}`);
    }
    for (let i = 0; i < 1; i++) {
      sms.write(`https://3.example.com/a${i}`);
    }
    sms.end();
    await expect(finished(sms)).resolves.toBeUndefined();

    await finished(indexStream);

    expect(existsSync(resolve(targetFolder, `./sitemap-index.xml`))).toBe(true);
    expect(existsSync(resolve(targetFolder, `./sitemap-0.xml`))).toBe(true);
    expect(existsSync(resolve(targetFolder, `./sitemap-1.xml`))).toBe(true);
    expect(existsSync(resolve(targetFolder, `./sitemap-2.xml`))).toBe(true);
    expect(existsSync(resolve(targetFolder, `./sitemap-3.xml`))).toBe(false);

    // Make sure the very first file is completed
    const sitemap0Raw = readFileSync(
      resolve(targetFolder, `./sitemap-0.xml`),
      'utf-8'
    );
    expect(sitemap0Raw).toContain('</urlset>');
    expect(sitemap0Raw).toContain('https://1.example.com/a0');
    expect(sitemap0Raw).toContain('https://1.example.com/a4999');
    expect(sitemap0Raw).toContain('</urlset>');

    // Make sure the first rolled file is completed
    const sitemap1Raw = readFileSync(
      resolve(targetFolder, `./sitemap-1.xml`),
      'utf-8'
    );
    expect(sitemap1Raw).toContain('</urlset>');
    expect(sitemap1Raw).toContain('https://2.example.com/a0');
    expect(sitemap1Raw).toContain('https://2.example.com/a4999');
    expect(sitemap1Raw).toContain('</urlset>');

    // Make sure the last file is completed
    const sitemap2Raw = readFileSync(
      resolve(targetFolder, `./sitemap-2.xml`),
      'utf-8'
    );
    expect(sitemap2Raw).toContain('</urlset>');
    expect(sitemap2Raw).toContain('https://3.example.com/a0');
    expect(sitemap2Raw).toContain('</urlset>');
    expect(sitemap2Raw).not.toContain('https://3.example.com/a1');

    // Read the index to make sure it was written
    const indexText = readFileSync(
      resolve(targetFolder, `./sitemap-index.xml`),
      'utf-8'
    );
    expect(indexText).toContain('<sitemapindex');
    expect(indexText).toContain(`${baseURL}sitemap-0`);
    expect(indexText).toContain(`${baseURL}sitemap-1`);
    expect(indexText).toContain(`${baseURL}sitemap-2`);
    expect(indexText).toContain('</sitemapindex>');
    expect(indexText).not.toContain(`${baseURL}sitemap-3`);
  });

  it('works if no items written at all', async () => {
    const baseURL = 'https://example.com/sub/';

    const sms = new SitemapAndIndexStream({
      limit: 2,
      getSitemapStream: (i: number): [string, SitemapStream, WriteStream] => {
        const sm = new SitemapStream();
        const path = `./sitemap-${i}.xml`;

        // This will not throw even though it will fail
        // `outputStream.writable === true`
        // `outputStream.closed === false`
        const outputStream = createWriteStream(resolve(targetFolder, path));

        // Streams do not automatically propagate errors
        // We must propagate this up to the SitemapStream
        outputStream.on('error', (err) => {
          sm.emit('error', err);
        });

        const ws = sm.pipe(outputStream);
        return [new URL(path, baseURL).toString(), sm, ws];
      },
    });

    // Pipe the index stream to a file
    const indexStream = createWriteStream(
      resolve(targetFolder, `./sitemap-index.xml`)
    );
    sms.pipe(indexStream);
    sms.end();
    await expect(finished(sms)).resolves.toBeUndefined();

    await finished(indexStream);

    expect(existsSync(resolve(targetFolder, `./sitemap-index.xml`))).toBe(true);
    expect(existsSync(resolve(targetFolder, `./sitemap-0.xml`))).toBe(false);

    // Read the index to make sure it was written
    const indexText = readFileSync(
      resolve(targetFolder, `./sitemap-index.xml`),
      'utf-8'
    );
    expect(indexText).toContain(`<sitemapindex `);
    expect(indexText).toContain(`${baseURL}sitemap-0`);
    expect(indexText).toContain(`${baseURL}sitemap-1`);
    expect(indexText).toContain(`</sitemapindex>`);
    expect(indexText).not.toContain(`${baseURL}sitemap-2`);
  });
});

function writeData(sms: SitemapStream, data: any): Promise<void> {
  if (!sms.write(data)) {
    return new Promise((resolve) => {
      sms.once('drain', resolve);
    });
  }
  return Promise.resolve();
}
