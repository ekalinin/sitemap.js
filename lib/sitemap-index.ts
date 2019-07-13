import { statSync, createWriteStream } from 'fs';
import { create, XMLElement } from 'xmlbuilder';
import { Sitemap, createSitemap } from './sitemap'
import { ICallback } from './types';
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
 * @return  {String}    XML String of SitemapIndex
 */
export function buildSitemapIndex (conf: {
  urls: Sitemap["urls"];
  xslUrl?: string;
  xmlNs?: string;

  lastmodISO?: string;
  lastmodrealtime?: boolean;
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

  if (conf.lastmodISO) {
    lastmod = conf.lastmodISO;
  } else if (conf.lastmodrealtime) {
    lastmod = new Date().toISOString();
  } else if (conf.lastmod) {
    lastmod = new Date(conf.lastmod).toISOString();
  }


  conf.urls.forEach((url): void => {
    let lm = lastmod
    if (url instanceof Object && url.url) {
      if (url.lastmod) {
        lm = url.lastmod
      } else if (url.lastmodISO) {
        lm = url.lastmodISO
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

  hostname?: string;
  sitemapName: string;
  sitemapSize?: number
  xslUrl?: string
  sitemapId: number
  sitemaps: string[]
  targetFolder: string;
  urls: Sitemap["urls"]

  chunks: Sitemap["urls"][]
  callback?: ICallback<Error, boolean>
  cacheTime?: number

  xmlNs?: string


  /**
   * @param {String|Array}  urls
   * @param {String}        targetFolder
   * @param {String}        hostname      optional
   * @param {Number}        cacheTime     optional in milliseconds
   * @param {String}        sitemapName   optional
   * @param {Number}        sitemapSize   optional
   * @param {Number}        xslUrl                optional
   * @param {Boolean}       gzip          optional
   * @param {Function}      callback      optional
   */
  constructor (
    urls: Sitemap["urls"],
    targetFolder: string,
    hostname?: string,
    cacheTime?: number,
    sitemapName?: string,
    sitemapSize?: number,
    xslUrl?: string,
    gzip?: boolean,
    callback?: ICallback<Error, boolean>
  ) {
    // Base domain
    this.hostname = hostname;

    if (sitemapName === undefined) {
      this.sitemapName = 'sitemap';
    } else {
      this.sitemapName = sitemapName;
    }

    // This limit is defined by Google. See:
    // https://sitemaps.org/protocol.php#index
    this.sitemapSize = sitemapSize;

    this.xslUrl = xslUrl;

    this.sitemapId = 0;

    this.sitemaps = [];

    this.targetFolder = '.';

    try {
      if (!statSync(targetFolder).isDirectory()) {
        throw new UndefinedTargetFolder();
      }
    } catch (err) {
      throw new UndefinedTargetFolder();
    }

    this.targetFolder = targetFolder;

    // URL list for sitemap
    // @ts-ignore
    this.urls = urls || [];
    if (!Array.isArray(this.urls)) {
      // @ts-ignore
      this.urls = [this.urls]
    }

    this.chunks = chunk(this.urls, this.sitemapSize);

    this.callback = callback;

    let processesCount = this.chunks.length + 1;

    this.chunks.forEach((chunk: Sitemap["urls"], index: number): void => {
      const extension = '.xml' + (gzip ? '.gz' : '');
      const filename = this.sitemapName + '-' + this.sitemapId++ + extension;

      this.sitemaps.push(filename);

      let sitemap = createSitemap({
        hostname: this.hostname,
        cacheTime: this.cacheTime, // 600 sec - cache purge period
        urls: chunk,
        xslUrl: this.xslUrl
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

    let sitemapUrls = this.sitemaps.map((sitemap): string  => hostname + '/' + sitemap);
    let smConf = {urls: sitemapUrls, xslUrl: this.xslUrl, xmlNs: this.xmlNs};
    let xmlString = buildSitemapIndex(smConf);

    let stream = createWriteStream(targetFolder + '/' +
      this.sitemapName + '-index.xml');
    stream.once('open', (fd): void => {
      stream.write(xmlString);
      stream.end();
      processesCount--;
      if (processesCount === 0 && typeof this.callback === 'function') {
        this.callback(undefined, true);
      }
    });
  }
}
