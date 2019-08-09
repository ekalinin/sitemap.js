import { statSync, createWriteStream } from 'fs';
import { create } from 'xmlbuilder';
import { createSitemap } from './sitemap'
import { ICallback, ISitemapIndexItemOptions, SitemapItemOptions } from './types';
import { UndefinedTargetFolder } from './errors';
import { chunk }  from './utils';

/**
 * Shortcut for `new SitemapIndex (...)`.
 *
 * @param   {Object}        conf
 * @param   {String|Array}  conf.urls
 * @param   {String}        conf.targetFolder
 * @param   {String}        conf.hostname
 * @param   {Number}        conf.cacheTime
 * @param   {String}        conf.sitemapName
 * @param   {Number}        conf.sitemapSize
 * @param   {String}        conf.xslUrl
 * @return  {SitemapIndex}
 */
export function createSitemapIndex (conf: {
  urls: SitemapIndex["urls"];
  targetFolder: SitemapIndex["targetFolder"];
  hostname?: SitemapIndex["hostname"];
  cacheTime?: SitemapIndex["cacheTime"];
  sitemapName?: SitemapIndex["sitemapName"];
  sitemapSize?: SitemapIndex["sitemapSize"];
  xslUrl?: SitemapIndex["xslUrl"];
  gzip?: boolean;
  callback?: SitemapIndex["callback"];
}): SitemapIndex {
  // cleaner diff
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return new SitemapIndex(conf.urls,
    conf.targetFolder,
    conf.hostname,
    conf.cacheTime,
    conf.sitemapName,
    conf.sitemapSize,
    conf.xslUrl,
    conf.gzip,
    conf.callback);
}

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
  xslUrl?: string;
  xmlNs?: string;

  lastmod?: number | string;
}): string {
  const root = create('sitemapindex', {encoding: 'UTF-8'});
  let lastmod = '';

  if (conf.xslUrl) {
    root.instructionBefore('xml-stylesheet', `type="text/xsl" href="${conf.xslUrl}"`);
  }

  if (!conf.xmlNs) {
    conf.xmlNs = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
  }

  const ns = conf.xmlNs.split(' ')
  for (let attr of ns) {
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
 * Sitemap index (for several sitemaps)
 */
class SitemapIndex {
  sitemapName: string;
  sitemapId: number
  sitemaps: string[]

  chunks: (string|SitemapItemOptions)[][]
  cacheTime?: number

  /**
   * @param {String|Array}  urls
   * @param {String}        targetFolder
   * @param {String}        hostname      optional
   * @param {Number}        cacheTime     optional in milliseconds
   * @param {String}        sitemapName   optional
   * @param {Number}        sitemapSize   optional This limit is defined by Google. See: https://sitemaps.org/protocol.php#index
   * @param {Number}        xslUrl                optional
   * @param {Boolean}       gzip          optional
   * @param {Function}      callback      optional
   */
  constructor (
    public urls: (string|SitemapItemOptions)[] = [],
    public targetFolder = '.',
    public hostname?: string,
    cacheTime?: number,
    sitemapName?: string,
    public sitemapSize?: number,
    public xslUrl?: string,
    gzip = false,
    public callback?: ICallback<Error, boolean>
  ) {
    if (sitemapName === undefined) {
      this.sitemapName = 'sitemap';
    } else {
      this.sitemapName = sitemapName;
    }

    this.sitemapId = 0;

    this.sitemaps = [];

    try {
      if (!statSync(targetFolder).isDirectory()) {
        throw new UndefinedTargetFolder();
      }
    } catch (e) {
      throw new UndefinedTargetFolder();
    }

    this.chunks = chunk(urls, this.sitemapSize);

    let processesCount = this.chunks.length + 1;

    this.chunks.forEach((chunk: (string|SitemapItemOptions)[], index: number): void => {
      const extension = '.xml' + (gzip ? '.gz' : '');
      const filename = this.sitemapName + '-' + this.sitemapId++ + extension;

      this.sitemaps.push(filename);

      let sitemap = createSitemap({
        hostname,
        cacheTime, // 600 sec - cache purge period
        urls: chunk,
        xslUrl
      });

      let stream = createWriteStream(targetFolder + '/' + filename);
      stream.once('open', (fd): void => {
        stream.write(gzip ? sitemap.toGzip() : sitemap.toString());
        stream.end();
        processesCount--;
        if (processesCount === 0 && typeof this.callback === 'function') {
          this.callback(undefined, true);
        }
      });

    });

    const stream = createWriteStream(targetFolder + '/' +
      this.sitemapName + '-index.xml');
    stream.once('open', (fd): void => {
      stream.write(buildSitemapIndex({
        urls: this.sitemaps.map((sitemap): string  => hostname + '/' + sitemap),
        xslUrl
      }));
      stream.end();
      processesCount--;
      if (processesCount === 0 && typeof this.callback === 'function') {
        this.callback(undefined, true);
      }
    });
  }
}
