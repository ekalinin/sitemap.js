import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { SitemapStream } from '../dist/index.js';
import { devNull, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  existsSync,
  unlinkSync,
  createWriteStream,
  createReadStream,
} from 'node:fs';
import {
  SitemapIndexStream,
  SitemapAndIndexStream,
} from '../dist/lib/sitemap-index-stream.js';
import { streamToPromise } from '../dist/lib/sitemap-stream.js';
import { finished as finishedCallback } from 'node:stream';
import { readFileSync, WriteStream } from 'node:fs';
import { promisify } from 'node:util';
import { ErrorLevel } from '../dist/lib/types.js';

const finished = promisify(finishedCallback);

function removeFilesArray(files: string[]): void {
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
  describe('validation', () => {
    it('should reject invalid URL in THROW mode', async () => {
      const smis = new SitemapIndexStream({ level: ErrorLevel.THROW });
      smis.write('not a url');
      smis.end();
      await assert.rejects(
        streamToPromise(smis),
        /Invalid URL in sitemap index/
      );
    });

    it('should skip invalid URL in WARN mode', async () => {
      const warnMock = mock.method(console, 'warn');
      const smis = new SitemapIndexStream({ level: ErrorLevel.WARN });
      smis.write('not a url');
      smis.write('https://test.com/valid.xml');
      smis.end();
      const result = await streamToPromise(smis);
      assert.ok(result.toString().includes('https://test.com/valid.xml'));
      assert.ok(!result.toString().includes('not a url'));
      assert.strictEqual(warnMock.mock.calls.length, 1);
      assert.ok(
        (warnMock.mock.calls[0].arguments[0] as string).includes('Invalid URL')
      );
    });

    it('should skip invalid URL in SILENT mode', async () => {
      const warnMock = mock.method(console, 'warn');
      const smis = new SitemapIndexStream({ level: ErrorLevel.SILENT });
      smis.write('not a url');
      smis.write('https://test.com/valid.xml');
      smis.end();
      const result = await streamToPromise(smis);
      assert.ok(result.toString().includes('https://test.com/valid.xml'));
      assert.ok(!result.toString().includes('not a url'));
      assert.strictEqual(warnMock.mock.calls.length, 0);
    });

    it('should reject empty URL in THROW mode', async () => {
      const smis = new SitemapIndexStream({ level: ErrorLevel.THROW });
      smis.write({ url: '' });
      smis.end();
      await assert.rejects(
        streamToPromise(smis),
        /URL must be a non-empty string/
      );
    });

    it('should reject null URL in THROW mode', async () => {
      const smis = new SitemapIndexStream({ level: ErrorLevel.THROW });
      smis.write({ url: null as unknown as string });
      smis.end();
      await assert.rejects(
        streamToPromise(smis),
        /URL must be a non-empty string/
      );
    });

    it('should reject invalid lastmod date in THROW mode', async () => {
      const smis = new SitemapIndexStream({ level: ErrorLevel.THROW });
      smis.write({ url: 'https://test.com/s1.xml', lastmod: 'invalid-date' });
      smis.end();
      await assert.rejects(streamToPromise(smis), /Invalid lastmod date/);
    });

    it('should skip invalid lastmod date in WARN mode and continue', async () => {
      const warnMock = mock.method(console, 'warn');
      const smis = new SitemapIndexStream({ level: ErrorLevel.WARN });
      smis.write({ url: 'https://test.com/s1.xml', lastmod: 'invalid-date' });
      smis.write({ url: 'https://test.com/s2.xml', lastmod: '2018-11-26' });
      smis.end();
      const result = await streamToPromise(smis);
      assert.ok(result.toString().includes('https://test.com/s1.xml'));
      assert.ok(result.toString().includes('https://test.com/s2.xml'));
      assert.ok(result.toString().includes('2018-11-26'));
      assert.strictEqual(warnMock.mock.calls.length, 1);
      assert.ok(
        (warnMock.mock.calls[0].arguments[0] as string).includes(
          'Invalid lastmod date'
        )
      );
    });

    it('should skip invalid lastmod date in SILENT mode without warning', async () => {
      const warnMock = mock.method(console, 'warn');
      const smis = new SitemapIndexStream({ level: ErrorLevel.SILENT });
      smis.write({ url: 'https://test.com/s1.xml', lastmod: 'invalid-date' });
      smis.write({ url: 'https://test.com/s2.xml' });
      smis.end();
      const result = await streamToPromise(smis);
      assert.ok(result.toString().includes('https://test.com/s1.xml'));
      assert.ok(result.toString().includes('https://test.com/s2.xml'));
      assert.strictEqual(warnMock.mock.calls.length, 0);
    });
  });

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

    assert.strictEqual(result.toString(), expectedResult);
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

    assert.strictEqual(result.toString(), expectedResult);
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

    assert.strictEqual(result.toString(), expectedResult);
  });
});

describe('sitemapAndIndex', () => {
  describe('validation', () => {
    it('should throw error if limit is below minimum', () => {
      assert.throws(() => {
        new SitemapAndIndexStream({
          limit: 0,
          getSitemapStream: () => {
            const sm = new SitemapStream();
            const ws = createWriteStream(devNull);
            sm.pipe(ws);
            return ['https://example.com/sitemap.xml', sm, ws];
          },
        });
      }, /limit must be between 1 and 50000/);
    });

    it('should throw error if limit is above maximum', () => {
      assert.throws(() => {
        new SitemapAndIndexStream({
          limit: 50001,
          getSitemapStream: () => {
            const sm = new SitemapStream();
            const ws = createWriteStream(devNull);
            sm.pipe(ws);
            return ['https://example.com/sitemap.xml', sm, ws];
          },
        });
      }, /limit must be between 1 and 50000/);
    });

    it('should emit error if getSitemapStream returns non-array', async () => {
      const sms = new SitemapAndIndexStream({
        limit: 1,
        getSitemapStream: () => {
          return 'not an array' as unknown as [
            string,
            SitemapStream,
            WriteStream,
          ];
        },
      });

      const errorPromise = new Promise((resolve) => {
        sms.on('error', resolve);
      });

      sms.write('https://1.example.com/a');
      sms.end();

      const error = await errorPromise;
      assert.ok(error instanceof Error);
      assert.ok(
        (error as Error).message.includes('must return a 3-element array')
      );
    });

    it('should emit error if getSitemapStream returns wrong array length', async () => {
      const sms = new SitemapAndIndexStream({
        limit: 1,
        getSitemapStream: () => {
          return [
            'https://example.com/sitemap.xml',
            new SitemapStream(),
          ] as unknown as [string, SitemapStream, WriteStream];
        },
      });

      const errorPromise = new Promise((resolve) => {
        sms.on('error', resolve);
      });

      sms.write('https://1.example.com/a');
      sms.end();

      const error = await errorPromise;
      assert.ok(error instanceof Error);
      assert.ok(
        (error as Error).message.includes('must return a 3-element array')
      );
    });

    it('should emit error if getSitemapStream returns invalid IndexItem', async () => {
      const sms = new SitemapAndIndexStream({
        limit: 1,
        getSitemapStream: () => {
          const sm = new SitemapStream();
          const ws = createWriteStream(devNull);
          sm.pipe(ws);
          return [null as unknown as string, sm, ws];
        },
      });

      const errorPromise = new Promise((resolve) => {
        sms.on('error', resolve);
      });

      sms.write('https://1.example.com/a');
      sms.end();

      const error = await errorPromise;
      assert.ok(error instanceof Error);
      assert.ok(
        (error as Error).message.includes(
          'IndexItem or string as the first element'
        )
      );
    });

    it('should emit error if getSitemapStream returns invalid SitemapStream', async () => {
      const sms = new SitemapAndIndexStream({
        limit: 1,
        getSitemapStream: () => {
          const ws = createWriteStream(devNull);
          return [
            'https://example.com/sitemap.xml',
            null as unknown as SitemapStream,
            ws,
          ];
        },
      });

      const errorPromise = new Promise((resolve) => {
        sms.on('error', resolve);
      });

      sms.write('https://1.example.com/a');
      sms.end();

      const error = await errorPromise;
      assert.ok(error instanceof Error);
      assert.ok(
        (error as Error).message.includes('SitemapStream as the second element')
      );
    });

    it('should emit error if getSitemapStream returns invalid WriteStream', async () => {
      const sms = new SitemapAndIndexStream({
        limit: 1,
        getSitemapStream: () => {
          const sm = new SitemapStream();
          return [
            'https://example.com/sitemap.xml',
            sm,
            'not a stream' as unknown as WriteStream,
          ];
        },
      });

      const errorPromise = new Promise((resolve) => {
        sms.on('error', resolve);
      });

      sms.write('https://1.example.com/a');
      sms.end();

      const error = await errorPromise;
      assert.ok(error instanceof Error);
      assert.ok(
        (error as Error).message.includes(
          'WriteStream or undefined as the third element'
        )
      );
    });

    it('should emit error if getSitemapStream throws', async () => {
      const sms = new SitemapAndIndexStream({
        limit: 1,
        getSitemapStream: () => {
          throw new Error('callback error');
        },
      });

      const errorPromise = new Promise((resolve) => {
        sms.on('error', resolve);
      });

      sms.write('https://1.example.com/a');
      sms.end();

      const error = await errorPromise;
      assert.ok(error instanceof Error);
      assert.ok(
        (error as Error).message.includes(
          'getSitemapStream callback threw an error'
        )
      );
      assert.ok((error as Error).message.includes('callback error'));
    });
  });

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
    assert.ok(index.includes(`${baseURL}sitemap-0`));
    assert.ok(index.includes(`${baseURL}sitemap-1`));
    assert.ok(index.includes(`${baseURL}sitemap-2`));
    assert.ok(index.includes(`${baseURL}sitemap-3`));
    assert.ok(!index.includes(`${baseURL}sitemap-4`));
    assert.ok(existsSync(resolve(targetFolder, `./sitemap-0.xml`)));
    assert.ok(existsSync(resolve(targetFolder, `./sitemap-1.xml`)));
    assert.ok(existsSync(resolve(targetFolder, `./sitemap-2.xml`)));
    assert.ok(existsSync(resolve(targetFolder, `./sitemap-3.xml`)));
    assert.ok(!existsSync(resolve(targetFolder, `./sitemap-4.xml`)));
    const xml = await streamToPromise(
      createReadStream(resolve(targetFolder, `./sitemap-0.xml`))
    );
    assert.ok(xml.toString().includes('https://1.example.com/a'));
  });

  it('propagates error from sitemap stream that cannot be written', async () => {
    const baseURL = 'https://example.com/sub/';

    const sms = new SitemapAndIndexStream({
      limit: 1,
      getSitemapStream: (i: number): [string, SitemapStream, WriteStream] => {
        const sm = new SitemapStream();
        const path = `./sitemap-${i}.xml`;

        const outputStream = createWriteStream(
          resolve(join(targetFolder, 'does', 'not', 'exist'), path)
        );

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
    await assert.rejects(
      finished(sms),
      /ENOENT: no such file or directory, open/
    );

    assert.ok(
      !existsSync(
        resolve(join(targetFolder, 'does', 'not', 'exist'), `./sitemap-0.xml`)
      )
    );
  });

  it('writes to index file', async () => {
    const baseURL = 'https://example.com/sub/';

    const sms = new SitemapAndIndexStream({
      limit: 2,
      getSitemapStream: (i: number): [string, SitemapStream, WriteStream] => {
        const sm = new SitemapStream();
        const path = `./sitemap-${i}.xml`;

        const outputStream = createWriteStream(resolve(targetFolder, path));

        outputStream.on('error', (err) => {
          sm.emit('error', err);
        });

        const ws = sm.pipe(outputStream);
        return [new URL(path, baseURL).toString(), sm, ws];
      },
    });

    const indexStream = createWriteStream(
      resolve(targetFolder, `./sitemap-index.xml`)
    );
    sms.pipe(indexStream);
    await writeData(sms, 'https://1.example.com/a');
    await writeData(sms, 'https://2.example.com/a');
    await writeData(sms, 'https://3.example.com/a');
    sms.end();
    await finished(sms);
    await finished(indexStream);

    assert.ok(existsSync(resolve(targetFolder, `./sitemap-index.xml`)));
    assert.ok(existsSync(resolve(targetFolder, `./sitemap-0.xml`)));
    assert.ok(existsSync(resolve(targetFolder, `./sitemap-1.xml`)));
    assert.ok(!existsSync(resolve(targetFolder, `./sitemap-2.xml`)));

    const sitemap0 = await streamToPromise(
      createReadStream(resolve(targetFolder, `./sitemap-0.xml`))
    );
    assert.ok(sitemap0.toString().includes('https://1.example.com/a'));

    const sitemap1 = await streamToPromise(
      createReadStream(resolve(targetFolder, `./sitemap-1.xml`))
    );
    assert.ok(sitemap1.toString().includes('https://3.example.com/a'));

    const indexText = readFileSync(
      resolve(targetFolder, `./sitemap-index.xml`),
      'utf-8'
    );
    assert.ok(indexText.includes(`${baseURL}sitemap-0`));
    assert.ok(indexText.includes(`${baseURL}sitemap-1`));
    assert.ok(!indexText.includes(`${baseURL}sitemap-2`));
  });

  it('does not hang if last sitemap is filled', async () => {
    const baseURL = 'https://example.com/sub/';

    const sms = new SitemapAndIndexStream({
      limit: 2,
      getSitemapStream: (i: number): [string, SitemapStream, WriteStream] => {
        const sm = new SitemapStream();
        const path = `./sitemap-${i}.xml`;

        const outputStream = createWriteStream(resolve(targetFolder, path));

        outputStream.on('error', (err) => {
          sm.emit('error', err);
        });

        const ws = sm.pipe(outputStream);
        return [new URL(path, baseURL).toString(), sm, ws];
      },
    });

    const indexStream = createWriteStream(
      resolve(targetFolder, `./sitemap-index.xml`)
    );
    sms.pipe(indexStream);
    await writeData(sms, 'https://1.example.com/a');
    await writeData(sms, 'https://2.example.com/a');
    sms.end();
    await finished(sms);
    await finished(indexStream);

    assert.ok(existsSync(resolve(targetFolder, `./sitemap-index.xml`)));
    assert.ok(existsSync(resolve(targetFolder, `./sitemap-0.xml`)));
    assert.ok(!existsSync(resolve(targetFolder, `./sitemap-1.xml`)));

    const sitemap0Raw = readFileSync(
      resolve(targetFolder, `./sitemap-0.xml`),
      'utf-8'
    );
    assert.ok(sitemap0Raw.includes('https://1.example.com/a'));
    assert.ok(sitemap0Raw.includes('https://2.example.com/a'));
    assert.ok(!sitemap0Raw.includes('https://3.example.com/a'));

    const sitemap0 = await streamToPromise(
      createReadStream(resolve(targetFolder, `./sitemap-0.xml`))
    );
    assert.ok(sitemap0.toString().includes('https://1.example.com/a'));

    const indexText = readFileSync(
      resolve(targetFolder, `./sitemap-index.xml`),
      'utf-8'
    );
    assert.ok(indexText.includes(`${baseURL}sitemap-0`));
    assert.ok(!indexText.includes(`${baseURL}sitemap-1`));
  });

  it('deterministically finishes writing each sitemap file before creating a new one', async () => {
    const baseURL = 'https://example.com/sub/';

    const sms = new SitemapAndIndexStream({
      limit: 5000,
      getSitemapStream: (i: number): [string, SitemapStream, WriteStream] => {
        const sm = new SitemapStream();
        const path = `./sitemap-${i}.xml`;

        const outputStream = createWriteStream(resolve(targetFolder, path));

        outputStream.on('error', (err) => {
          sm.emit('error', err);
        });

        const ws = sm.pipe(outputStream);
        return [new URL(path, baseURL).toString(), sm, ws];
      },
    });

    const indexStream = createWriteStream(
      resolve(targetFolder, `./sitemap-index.xml`)
    );
    sms.pipe(indexStream);
    for (let i = 0; i < 5000; i++) {
      sms.write(`https://1.example.com/a${i}`);
    }
    for (let i = 0; i < 5000; i++) {
      sms.write(`https://2.example.com/a${i}`);
    }
    for (let i = 0; i < 1; i++) {
      sms.write(`https://3.example.com/a${i}`);
    }
    sms.end();
    await finished(sms);
    await finished(indexStream);

    assert.ok(existsSync(resolve(targetFolder, `./sitemap-index.xml`)));
    assert.ok(existsSync(resolve(targetFolder, `./sitemap-0.xml`)));
    assert.ok(existsSync(resolve(targetFolder, `./sitemap-1.xml`)));
    assert.ok(existsSync(resolve(targetFolder, `./sitemap-2.xml`)));
    assert.ok(!existsSync(resolve(targetFolder, `./sitemap-3.xml`)));

    const sitemap0Raw = readFileSync(
      resolve(targetFolder, `./sitemap-0.xml`),
      'utf-8'
    );
    assert.ok(sitemap0Raw.includes('</urlset>'));
    assert.ok(sitemap0Raw.includes('https://1.example.com/a0'));
    assert.ok(sitemap0Raw.includes('https://1.example.com/a4999'));
    assert.ok(sitemap0Raw.includes('</urlset>'));

    const sitemap1Raw = readFileSync(
      resolve(targetFolder, `./sitemap-1.xml`),
      'utf-8'
    );
    assert.ok(sitemap1Raw.includes('</urlset>'));
    assert.ok(sitemap1Raw.includes('https://2.example.com/a0'));
    assert.ok(sitemap1Raw.includes('https://2.example.com/a4999'));
    assert.ok(sitemap1Raw.includes('</urlset>'));

    const sitemap2Raw = readFileSync(
      resolve(targetFolder, `./sitemap-2.xml`),
      'utf-8'
    );
    assert.ok(sitemap2Raw.includes('</urlset>'));
    assert.ok(sitemap2Raw.includes('https://3.example.com/a0'));
    assert.ok(sitemap2Raw.includes('</urlset>'));
    assert.ok(!sitemap2Raw.includes('https://3.example.com/a1'));

    const indexText = readFileSync(
      resolve(targetFolder, `./sitemap-index.xml`),
      'utf-8'
    );
    assert.ok(indexText.includes('<sitemapindex'));
    assert.ok(indexText.includes(`${baseURL}sitemap-0`));
    assert.ok(indexText.includes(`${baseURL}sitemap-1`));
    assert.ok(indexText.includes(`${baseURL}sitemap-2`));
    assert.ok(indexText.includes('</sitemapindex>'));
    assert.ok(!indexText.includes(`${baseURL}sitemap-3`));
  });

  it('writes index if no items written at all', async () => {
    const baseURL = 'https://example.com/sub/';

    const sms = new SitemapAndIndexStream({
      limit: 2,
      getSitemapStream: (i: number): [string, SitemapStream, WriteStream] => {
        const sm = new SitemapStream();
        const path = `./sitemap-${i}.xml`;

        const outputStream = createWriteStream(resolve(targetFolder, path));

        outputStream.on('error', (err) => {
          sm.emit('error', err);
        });

        const ws = sm.pipe(outputStream);
        return [new URL(path, baseURL).toString(), sm, ws];
      },
    });

    const indexStream = createWriteStream(
      resolve(targetFolder, `./sitemap-index.xml`)
    );
    sms.pipe(indexStream);
    sms.end();
    await finished(sms);
    await finished(indexStream);

    assert.ok(existsSync(resolve(targetFolder, `./sitemap-index.xml`)));
    assert.ok(!existsSync(resolve(targetFolder, `./sitemap-0.xml`)));

    const indexText = readFileSync(
      resolve(targetFolder, `./sitemap-index.xml`),
      'utf-8'
    );
    assert.ok(indexText.includes(`<sitemapindex `));
    assert.ok(!indexText.includes(`${baseURL}sitemap-0`));
    assert.ok(!indexText.includes(`${baseURL}sitemap-1`));
    assert.ok(indexText.includes(`</sitemapindex>`));
    assert.ok(!indexText.includes(`${baseURL}sitemap-2`));
  });
});

function writeData(
  sms: SitemapStream | SitemapAndIndexStream,
  data: string
): Promise<void> {
  if (!sms.write(data)) {
    return new Promise((resolve) => {
      sms.once('drain', resolve);
    });
  }
  return Promise.resolve();
}
