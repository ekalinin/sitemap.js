import { SitemapStream } from '../index.js';
import { tmpdir } from 'node:os';
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
} from '../lib/sitemap-index-stream.js';
import { streamToPromise } from '../lib/sitemap-stream.js';
import { finished as finishedCallback } from 'node:stream';
import { readFileSync, WriteStream } from 'node:fs';
import { promisify } from 'node:util';

const finished = promisify(finishedCallback);

/* eslint-env jest, jasmine */
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
      const { ErrorLevel } = await import('../lib/types');
      const smis = new SitemapIndexStream({ level: ErrorLevel.THROW });
      smis.write('not a url');
      smis.end();
      await expect(streamToPromise(smis)).rejects.toThrow(
        'Invalid URL in sitemap index'
      );
    });

    it('should skip invalid URL in WARN mode', async () => {
      const { ErrorLevel } = await import('../lib/types');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const smis = new SitemapIndexStream({ level: ErrorLevel.WARN });
      smis.write('not a url');
      smis.write('https://test.com/valid.xml');
      smis.end();
      const result = await streamToPromise(smis);
      expect(result.toString()).toContain('https://test.com/valid.xml');
      expect(result.toString()).not.toContain('not a url');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid URL')
      );
      consoleSpy.mockRestore();
    });

    it('should skip invalid URL in SILENT mode', async () => {
      const { ErrorLevel } = await import('../lib/types');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const smis = new SitemapIndexStream({ level: ErrorLevel.SILENT });
      smis.write('not a url');
      smis.write('https://test.com/valid.xml');
      smis.end();
      const result = await streamToPromise(smis);
      expect(result.toString()).toContain('https://test.com/valid.xml');
      expect(result.toString()).not.toContain('not a url');
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should reject empty URL in THROW mode', async () => {
      const { ErrorLevel } = await import('../lib/types');
      const smis = new SitemapIndexStream({ level: ErrorLevel.THROW });
      smis.write({ url: '' });
      smis.end();
      await expect(streamToPromise(smis)).rejects.toThrow(
        'URL must be a non-empty string'
      );
    });

    it('should reject null URL in THROW mode', async () => {
      const { ErrorLevel } = await import('../lib/types');
      const smis = new SitemapIndexStream({ level: ErrorLevel.THROW });
      smis.write({ url: null as unknown as string });
      smis.end();
      await expect(streamToPromise(smis)).rejects.toThrow(
        'URL must be a non-empty string'
      );
    });

    it('should reject invalid lastmod date in THROW mode', async () => {
      const { ErrorLevel } = await import('../lib/types');
      const smis = new SitemapIndexStream({ level: ErrorLevel.THROW });
      smis.write({ url: 'https://test.com/s1.xml', lastmod: 'invalid-date' });
      smis.end();
      await expect(streamToPromise(smis)).rejects.toThrow(
        'Invalid lastmod date'
      );
    });

    it('should skip invalid lastmod date in WARN mode and continue', async () => {
      const { ErrorLevel } = await import('../lib/types');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const smis = new SitemapIndexStream({ level: ErrorLevel.WARN });
      smis.write({ url: 'https://test.com/s1.xml', lastmod: 'invalid-date' });
      smis.write({ url: 'https://test.com/s2.xml', lastmod: '2018-11-26' });
      smis.end();
      const result = await streamToPromise(smis);
      expect(result.toString()).toContain('https://test.com/s1.xml');
      expect(result.toString()).toContain('https://test.com/s2.xml');
      expect(result.toString()).toContain('2018-11-26');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid lastmod date')
      );
      consoleSpy.mockRestore();
    });

    it('should skip invalid lastmod date in SILENT mode without warning', async () => {
      const { ErrorLevel } = await import('../lib/types');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const smis = new SitemapIndexStream({ level: ErrorLevel.SILENT });
      smis.write({ url: 'https://test.com/s1.xml', lastmod: 'invalid-date' });
      smis.write({ url: 'https://test.com/s2.xml' });
      smis.end();
      const result = await streamToPromise(smis);
      expect(result.toString()).toContain('https://test.com/s1.xml');
      expect(result.toString()).toContain('https://test.com/s2.xml');
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
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
  describe('validation', () => {
    it('should throw error if limit is below minimum', () => {
      expect(() => {
        new SitemapAndIndexStream({
          limit: 0,
          getSitemapStream: () => {
            const sm = new SitemapStream();
            const ws = createWriteStream('/dev/null');
            sm.pipe(ws);
            return ['https://example.com/sitemap.xml', sm, ws];
          },
        });
      }).toThrow('limit must be between 1 and 50000');
    });

    it('should throw error if limit is above maximum', () => {
      expect(() => {
        new SitemapAndIndexStream({
          limit: 50001,
          getSitemapStream: () => {
            const sm = new SitemapStream();
            const ws = createWriteStream('/dev/null');
            sm.pipe(ws);
            return ['https://example.com/sitemap.xml', sm, ws];
          },
        });
      }).toThrow('limit must be between 1 and 50000');
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
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain(
        'must return a 3-element array'
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
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain(
        'must return a 3-element array'
      );
    });

    it('should emit error if getSitemapStream returns invalid IndexItem', async () => {
      const sms = new SitemapAndIndexStream({
        limit: 1,
        getSitemapStream: () => {
          const sm = new SitemapStream();
          const ws = createWriteStream('/dev/null');
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
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain(
        'IndexItem or string as the first element'
      );
    });

    it('should emit error if getSitemapStream returns invalid SitemapStream', async () => {
      const sms = new SitemapAndIndexStream({
        limit: 1,
        getSitemapStream: () => {
          const ws = createWriteStream('/dev/null');
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
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain(
        'SitemapStream as the second element'
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
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain(
        'WriteStream or undefined as the third element'
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
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain(
        'getSitemapStream callback threw an error'
      );
      expect((error as Error).message).toContain('callback error');
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

  it('writes index if no items written at all', async () => {
    const baseURL = 'https://example.com/sub/';

    const sms = new SitemapAndIndexStream({
      limit: 2,
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
    expect(indexText).not.toContain(`${baseURL}sitemap-0`);
    expect(indexText).not.toContain(`${baseURL}sitemap-1`);
    expect(indexText).toContain(`</sitemapindex>`);
    expect(indexText).not.toContain(`${baseURL}sitemap-2`);
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
