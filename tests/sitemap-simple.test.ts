import { simpleSitemapAndIndex, streamToPromise } from '../index.js';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { existsSync, unlinkSync, createReadStream } from 'node:fs';
import { createGunzip } from 'node:zlib';
function removeFilesArray(files: string[]): void {
  if (files && files.length) {
    files.forEach(function (file: string) {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    });
  }
}

describe('simpleSitemapAndIndex', () => {
  let targetFolder: string;

  beforeEach(() => {
    targetFolder = tmpdir();
    removeFilesArray([
      resolve(targetFolder, `./sitemap-index.xml.gz`),
      resolve(targetFolder, `./sitemap-0.xml.gz`),
      resolve(targetFolder, `./sitemap-1.xml.gz`),
      resolve(targetFolder, `./sitemap-2.xml.gz`),
      resolve(targetFolder, `./sitemap-3.xml.gz`),
    ]);
  });

  afterEach(() => {
    removeFilesArray([
      resolve(targetFolder, `./sitemap-index.xml.gz`),
      resolve(targetFolder, `./sitemap-0.xml.gz`),
      resolve(targetFolder, `./sitemap-1.xml.gz`),
      resolve(targetFolder, `./sitemap-2.xml.gz`),
      resolve(targetFolder, `./sitemap-3.xml.gz`),
    ]);
  });

  it('writes both a sitemap and index', async () => {
    const baseURL = 'https://example.com/sub/';

    await simpleSitemapAndIndex({
      hostname: baseURL,
      sourceData: [
        'https://1.example.com/a',
        'https://2.example.com/a',
        'https://3.example.com/a',
        'https://4.example.com/a',
      ],
      destinationDir: targetFolder,
      limit: 1,
    });

    const index = (
      await streamToPromise(
        createReadStream(resolve(targetFolder, `./sitemap-index.xml.gz`)).pipe(
          createGunzip()
        )
      )
    ).toString();
    expect(index).toContain(`${baseURL}sitemap-0`);
    expect(index).toContain(`${baseURL}sitemap-1`);
    expect(index).toContain(`${baseURL}sitemap-2`);
    expect(index).toContain(`${baseURL}sitemap-3`);
    expect(index).not.toContain(`${baseURL}sitemap-4`);
    expect(existsSync(resolve(targetFolder, `./sitemap-0.xml.gz`))).toBe(true);
    expect(existsSync(resolve(targetFolder, `./sitemap-1.xml.gz`))).toBe(true);
    expect(existsSync(resolve(targetFolder, `./sitemap-2.xml.gz`))).toBe(true);
    expect(existsSync(resolve(targetFolder, `./sitemap-3.xml.gz`))).toBe(true);
    expect(existsSync(resolve(targetFolder, `./sitemap-4.xml.gz`))).toBe(false);
    const xml = await streamToPromise(
      createReadStream(resolve(targetFolder, `./sitemap-0.xml.gz`)).pipe(
        createGunzip()
      )
    );
    expect(xml.toString()).toContain('https://1.example.com/a');
  });

  it('accepts sitemapItemLoose as a type', async () => {
    const baseURL = 'https://example.com/sub/';
    expect.assertions(3);

    await simpleSitemapAndIndex({
      hostname: baseURL,
      sourceData: [
        { url: 'https://1.example.com/a' },
        { url: 'https://2.example.com/a' },
        { url: 'https://3.example.com/a' },
        { url: 'https://4.example.com/a' },
      ],
      destinationDir: targetFolder,
    });

    const index = (
      await streamToPromise(
        createReadStream(resolve(targetFolder, './sitemap-index.xml.gz')).pipe(
          createGunzip()
        )
      )
    ).toString();
    expect(index).toContain(`${baseURL}sitemap-0`);
    expect(existsSync(resolve(targetFolder, './sitemap-0.xml.gz'))).toBe(true);
    const xml = await streamToPromise(
      createReadStream(resolve(targetFolder, './sitemap-0.xml.gz')).pipe(
        createGunzip()
      )
    );
    expect(xml.toString()).toContain('https://1.example.com/a');
  });

  it('accepts a filepath', async () => {
    const baseURL = 'http://example.com';
    await simpleSitemapAndIndex({
      hostname: baseURL,
      sourceData: './tests/mocks/cli-urls.txt',
      destinationDir: targetFolder,
    });
    const index = (
      await streamToPromise(
        createReadStream(resolve(targetFolder, `./sitemap-index.xml.gz`)).pipe(
          createGunzip()
        )
      )
    ).toString();
    expect(index).toContain(`${baseURL}/sitemap-0`);
    expect(existsSync(resolve(targetFolder, `./sitemap-0.xml.gz`))).toBe(true);
    const xml = await streamToPromise(
      createReadStream(resolve(targetFolder, `./sitemap-0.xml.gz`)).pipe(
        createGunzip()
      )
    );
    expect(xml.toString()).toContain('achievement');
  });

  it("creates the dest dir if it doesn't exist", async () => {
    const baseURL = 'http://example.com';
    const destinationDir = `${targetFolder}/non-existent/`;
    await simpleSitemapAndIndex({
      hostname: baseURL,
      sourceData: [
        'https://1.example.com/a',
        'https://2.example.com/a',
        'https://3.example.com/a',
        'https://4.example.com/a',
      ],
      destinationDir,
    });

    expect(existsSync(resolve(destinationDir, `./sitemap-0.xml.gz`))).toBe(
      true
    );
    const index = (
      await streamToPromise(
        createReadStream(
          resolve(destinationDir, `./sitemap-index.xml.gz`)
        ).pipe(createGunzip())
      )
    ).toString();
    expect(index).toContain(`${baseURL}/sitemap-0.xml.gz`);
    expect(existsSync(resolve(destinationDir, `./sitemap-0.xml.gz`))).toBe(
      true
    );
  });

  it('supports not gzipping', async () => {
    const baseURL = 'http://example.com';
    const destinationDir = `${targetFolder}/non-existent/`;
    await simpleSitemapAndIndex({
      hostname: baseURL,
      sourceData: [
        'https://1.example.com/a',
        'https://2.example.com/a',
        'https://3.example.com/a',
        'https://4.example.com/a',
      ],
      destinationDir,
      gzip: false,
    });

    expect(existsSync(resolve(destinationDir, `./sitemap-0.xml`))).toBe(true);
    const index = (
      await streamToPromise(
        createReadStream(resolve(destinationDir, `./sitemap-index.xml`))
      )
    ).toString();
    expect(index).toContain(`${baseURL}/sitemap-0`);
    expect(existsSync(resolve(destinationDir, `./sitemap-0.xml`))).toBe(true);
    const xml = await streamToPromise(
      createReadStream(resolve(destinationDir, `./sitemap-0.xml`))
    );
    expect(xml.toString()).toContain('1.example.com');
  });

  it('throws on bad data', async () => {
    const baseURL = 'http://example.com';
    const destinationDir = `${targetFolder}/non-existent/`;
    await expect(
      simpleSitemapAndIndex({
        hostname: baseURL,
        sourceData: {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          src: [
            'https://1.example.com/a',
            'https://2.example.com/a',
            'https://3.example.com/a',
            'https://4.example.com/a',
          ],
        },
        destinationDir,
        gzip: false,
      })
    ).rejects.toThrow();
  });

  it('supports non-root-based sitemap urls', async () => {
    const baseURL = 'http://example.com';
    const destinationDir = `${targetFolder}/non-existent/`;
    await simpleSitemapAndIndex({
      hostname: baseURL,
      sourceData: [
        'https://1.example.com/a',
        'https://2.example.com/a',
        'https://3.example.com/a',
        'https://4.example.com/a',
      ],
      destinationDir,
      publicBasePath: '/foo/bar/',
      gzip: false,
    });

    expect(existsSync(resolve(destinationDir, `./sitemap-0.xml`))).toBe(true);
    const index = (
      await streamToPromise(
        createReadStream(resolve(destinationDir, `./sitemap-index.xml`))
      )
    ).toString();
    expect(index).toContain(`${baseURL}/foo/bar/sitemap-0`);
    expect(existsSync(resolve(destinationDir, `./sitemap-0.xml`))).toBe(true);
    const xml = await streamToPromise(
      createReadStream(resolve(destinationDir, `./sitemap-0.xml`))
    );
    expect(xml.toString()).toContain('1.example.com');
  });

  it('supports non-root-based sitemap urls not ending in a /', async () => {
    const baseURL = 'http://example.com';
    const destinationDir = `${targetFolder}/non-existent/`;
    await simpleSitemapAndIndex({
      hostname: baseURL,
      sourceData: [
        'https://1.example.com/a',
        'https://2.example.com/a',
        'https://3.example.com/a',
        'https://4.example.com/a',
      ],
      destinationDir,
      publicBasePath: '/foo/bar',
      gzip: false,
    });

    expect(existsSync(resolve(destinationDir, `./sitemap-0.xml`))).toBe(true);
    const index = (
      await streamToPromise(
        createReadStream(resolve(destinationDir, `./sitemap-index.xml`))
      )
    ).toString();
    expect(index).toContain(`${baseURL}/foo/bar/sitemap-0`);
    expect(existsSync(resolve(destinationDir, `./sitemap-0.xml`))).toBe(true);
    const xml = await streamToPromise(
      createReadStream(resolve(destinationDir, `./sitemap-0.xml`))
    );
    expect(xml.toString()).toContain('1.example.com');
  });

  it('supports relative non-root-based sitemap urls', async () => {
    const baseURL = 'http://example.com/buzz/';
    const destinationDir = `${targetFolder}/non-existent/`;
    await simpleSitemapAndIndex({
      hostname: baseURL,
      sourceData: [
        'https://1.example.com/a',
        'https://2.example.com/a',
        'https://3.example.com/a',
        'https://4.example.com/a',
      ],
      destinationDir,
      publicBasePath: '/foo/bar/',
      gzip: false,
    });

    expect(existsSync(resolve(destinationDir, `./sitemap-0.xml`))).toBe(true);
    const index = (
      await streamToPromise(
        createReadStream(resolve(destinationDir, `./sitemap-index.xml`))
      )
    ).toString();
    expect(index).toContain(`http://example.com/foo/bar/sitemap-0`);
    expect(existsSync(resolve(destinationDir, `./sitemap-0.xml`))).toBe(true);
    const xml = await streamToPromise(
      createReadStream(resolve(destinationDir, `./sitemap-0.xml`))
    );
    expect(xml.toString()).toContain('1.example.com');
  });
});
