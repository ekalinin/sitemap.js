import { simpleSitemapAndIndex, streamToPromise } from '../index';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { existsSync, unlinkSync, createReadStream } from 'fs';
import { createGunzip } from 'zlib';
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

describe('simpleSitemapAndIndex', () => {
  let targetFolder: string;

  beforeEach(() => {
    targetFolder = tmpdir();
    removeFilesArray([
      resolve(targetFolder, `./sitemap-0.xml.gz`),
      resolve(targetFolder, `./sitemap-1.xml.gz`),
      resolve(targetFolder, `./sitemap-2.xml.gz`),
      resolve(targetFolder, `./sitemap-3.xml.gz`),
    ]);
  });

  afterEach(() => {
    removeFilesArray([
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
});
