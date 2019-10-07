import { promisify } from 'util'
import { stat, createWriteStream } from 'fs';
import { create } from 'xmlbuilder';
import { ISitemapIndexItemOptions, ISitemapItemOptionsLoose } from './types';
import { UndefinedTargetFolder } from './errors';
import { chunk }  from './utils';
import { SitemapStream } from './sitemap-stream';
import { createGzip } from 'zlib';
import { Writable } from 'stream';
const statPromise = promisify(stat)

/**
 * Builds a sitemap index from urls
 *
 * @param   {Object}    conf
 * @param   {Array}     conf.urls
 * @param   {String}    conf.xslUrl
 * @param   {String}    conf.xmlNs
 * @param   {String}    conf.lastmod When the referenced sitemap was last modified
 * @return  {String}    XML String of SitemapIndex
 */
export function buildSitemapIndex (conf: {
  urls: (ISitemapIndexItemOptions|string)[];
  xmlNs?: string;

  lastmod?: number | string;
}): string {
  const root = create('sitemapindex', {encoding: 'UTF-8'});
  let lastmod = '';

  if (!conf.xmlNs) {
    conf.xmlNs = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
  }

  const ns = conf.xmlNs.split(' ')
  for (const attr of ns) {
    const [k, v] = attr.split('=')
    root.attribute(k, v.replace(/^['"]|['"]$/g, ''))
  }

  if (conf.lastmod) {
    lastmod = new Date(conf.lastmod).toISOString();
  }


  conf.urls.forEach((url): void => {
    let lm = lastmod
    if (url instanceof Object && url.url) {
      if (url.lastmod) {
        lm = new Date(url.lastmod).toISOString()
      }

      url = url.url;
    }
    const sm = root.element('sitemap');
    sm.element('loc', url);
    if (lm) {
      sm.element('lastmod', lm);
    }
  });

  return root.end();
}

/**
 * Shortcut for `new SitemapIndex (...)`.
 * Create several sitemaps and an index automatically from a list of urls
 *
 * @param   {Object}        conf
 * @param   {String|Array}  conf.urls
 * @param   {String}        conf.targetFolder where do you want the generated index and maps put
 * @param   {String}        conf.hostname required for index file, will also be used as base url for sitemap items
 * @param   {String}        conf.sitemapName what do you want to name the files it generats
 * @param   {Number}        conf.sitemapSize maximum number of entries a sitemap should have before being split
 * @param   {Boolean}       conf.gzip whether to gzip the files (defaults to true)
 * @return  {SitemapIndex}
 */
export async function createSitemapsAndIndex ({
  urls,
  targetFolder,
  hostname,
  sitemapName = 'sitemap',
  sitemapSize = 50000,
  gzip = true,
}: {
  urls: (string|ISitemapItemOptionsLoose)[];
  targetFolder: string;
  hostname?: string;
  sitemapName?: string;
  sitemapSize?: number;
  gzip?: boolean;
}): Promise<boolean> {
  let sitemapId = 0;
  const sitemapPaths: string[] = [];

  try {
    const stats = await statPromise(targetFolder)
    if (!stats.isDirectory()) {
      throw new UndefinedTargetFolder()
    }
  } catch (e) {
    throw new UndefinedTargetFolder()
  }

  const chunks = chunk(urls, sitemapSize);

  const smPromises = chunks.map((chunk: (string|ISitemapItemOptionsLoose)[]): Promise<boolean> => {
    return new Promise ((resolve, reject): void => {
      const extension = '.xml' + (gzip ? '.gz' : '');
      const filename = sitemapName + '-' + sitemapId++ + extension;

      sitemapPaths.push(filename);

      const ws = createWriteStream(targetFolder + '/' + filename);
      const sms = new SitemapStream({hostname})
      let pipe: Writable
      if (gzip) {
        pipe = sms.pipe(createGzip()).pipe(ws)
      } else {
        pipe = sms.pipe(ws)
      }
      chunk.forEach(smi => sms.write(smi))
      sms.end()
      pipe.on('finish', () => resolve(true))
      pipe.on('error', (e) => reject(e))
    })
  });

  const indexPromise: Promise<boolean> = new Promise((resolve, reject): void => {
    const indexWS = createWriteStream(
      targetFolder + "/" + sitemapName + "-index.xml"
    );
    indexWS.once('open', (fd): void => {
      indexWS.write(buildSitemapIndex({
        urls: sitemapPaths.map((smPath): string  => hostname + '/' + smPath)
      }));
      indexWS.end();
    });
    indexWS.on('finish', () => resolve(true))
    indexWS.on('error', (e) => reject(e))
  })
  return Promise.all([
    indexPromise,
    ...smPromises
  ]).then(() => true)
}
