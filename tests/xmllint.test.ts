import { xmlLint } from '../lib/xmllint.js';
import { execFileSync } from 'node:child_process';
import { readFileSync, createReadStream } from 'node:fs';

let hasXMLLint = true;
try {
  execFileSync('which', ['xmllint']);
} catch {
  hasXMLLint = false;
}

describe('xmllint', () => {
  it('returns a promise', async () => {
    if (hasXMLLint) {
      const xmlContent = readFileSync(
        './tests/mocks/cli-urls.json.xml',
        'utf8'
      );
      expect(xmlLint(xmlContent).catch()).toBeInstanceOf(Promise);
    } else {
      console.warn('skipping xmlLint test, not installed');
      expect(true).toBe(true);
    }
  }, 10000);

  it('resolves when complete with string content', async () => {
    expect.assertions(1);
    if (hasXMLLint) {
      try {
        const xmlContent = readFileSync(
          './tests/mocks/cli-urls.json.xml',
          'utf8'
        );
        const result = await xmlLint(xmlContent);
        await expect(result).toBeFalsy();
      } catch (e) {
        console.log(e);
        expect(true).toBe(false);
      }
    } else {
      console.warn('skipping xmlLint test, not installed');
      expect(true).toBe(true);
    }
  }, 60000);

  it('resolves when complete with stream content', async () => {
    expect.assertions(1);
    if (hasXMLLint) {
      try {
        const xmlStream = createReadStream('./tests/mocks/cli-urls.json.xml');
        const result = await xmlLint(xmlStream);
        await expect(result).toBeFalsy();
      } catch (e) {
        console.log(e);
        expect(true).toBe(false);
      }
    } else {
      console.warn('skipping xmlLint test, not installed');
      expect(true).toBe(true);
    }
  }, 60000);

  it('rejects when invalid', async () => {
    expect.assertions(1);
    if (hasXMLLint) {
      const xmlContent = readFileSync(
        './tests/mocks/cli-urls.json.bad.xml',
        'utf8'
      );
      await expect(xmlLint(xmlContent)).rejects.toBeTruthy();
    } else {
      console.warn('skipping xmlLint test, not installed');
      expect(true).toBe(true);
    }
  }, 60000);
});
