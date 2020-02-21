#!/usr/bin/env node
import { Readable } from 'stream';
import { createReadStream, createWriteStream } from 'fs';
import { xmlLint } from './lib/xmllint';
import { XMLLintUnavailable } from './lib/errors';
import {
  ObjectStreamToJSON,
  XMLToSitemapItemStream,
} from './lib/sitemap-parser';
import { lineSeparatedURLsToSitemapOptions } from './lib/utils';
import { SitemapStream } from './lib/sitemap-stream';
import { SitemapAndIndexStream } from './lib/sitemap-index-stream';
import { URL } from 'url';
import { createGzip, Gzip } from 'zlib';
/* eslint-disable-next-line @typescript-eslint/no-var-requires */
const arg = require('arg');

const pickStreamOrArg = (argv: { _: string[] }): Readable => {
  if (!argv._.length) {
    return process.stdin;
  } else {
    return createReadStream(argv._[0], { encoding: 'utf8' });
  }
};

const argSpec = {
  '--help': Boolean,
  '--version': Boolean,
  '--validate': Boolean,
  '--index': Boolean,
  '--index-base-url': String,
  '--limit': Number,
  '--parse': Boolean,
  '--single-line-json': Boolean,
  '--prepend': String,
  '--gzip': Boolean,
  '--h': '--help',
};
const argv = arg(argSpec);

function getStream(): Readable {
  if (argv._ && argv._.length) {
    return createReadStream(argv._[0]);
  } else {
    console.warn(
      'Reading from stdin. If you are not piping anything in, this command is not doing anything'
    );
    return process.stdin;
  }
}
if (argv['--version']) {
  /* eslint-disable-next-line @typescript-eslint/no-var-requires */
  const packagejson = require('../package.json');
  console.log(packagejson.version);
} else if (argv['--help']) {
  console.log(`
Turn a list of urls into a sitemap xml.
Options:
  --help           Print this text
  --version        Print the version
  --validate       ensure the passed in file is conforms to the sitemap spec
  --index          create an index and stream that out, write out sitemaps along the way
  --index-base-url base url the sitemaps will be hosted eg. https://example.com/sitemaps/
  --limit=45000    set a custom limit to the items per sitemap
  --parse          Parse fed xml and spit out config
  --prepend sitemap.xml < urlsToAdd.json
  --gzip           compress output
  --single-line-json         When used with parse, it spits out each entry as json rather
                   than the whole json.
`);
} else if (argv['--parse']) {
  let oStream: ObjectStreamToJSON | Gzip = getStream()
    .pipe(new XMLToSitemapItemStream())
    .pipe(
      new ObjectStreamToJSON({ lineSeparated: !argv['--single-line-json'] })
    );
  if (argv['--gzip']) {
    oStream = oStream.pipe(createGzip());
  }
  oStream.pipe(process.stdout);
} else if (argv['--validate']) {
  xmlLint(getStream())
    .then((): void => console.log('valid'))
    .catch(([error, stderr]: [Error | null, Buffer]): void => {
      if (error instanceof XMLLintUnavailable) {
        console.error(error.message);
        return;
      } else {
        console.log(stderr);
      }
    });
} else if (argv['--index']) {
  const limit: number = argv['--limit'];
  const baseURL: string = argv['--index-base-url'];
  if (!baseURL) {
    throw new Error(
      "You must specify where the sitemaps will be hosted. use --index-base-url 'https://example.com/path'"
    );
  }
  const sms = new SitemapAndIndexStream({
    limit,
    getSitemapStream: (i: number): [string, SitemapStream] => {
      const sm = new SitemapStream();
      const path = `./sitemap-${i}.xml`;

      if (argv['--gzip']) {
        sm.pipe(createGzip()).pipe(createWriteStream(path));
      } else {
        sm.pipe(createWriteStream(path));
      }
      return [new URL(path, baseURL).toString(), sm];
    },
  });
  let oStream: SitemapAndIndexStream | Gzip = lineSeparatedURLsToSitemapOptions(
    pickStreamOrArg(argv)
  ).pipe(sms);
  if (argv['--gzip']) {
    oStream = oStream.pipe(createGzip());
  }
  oStream.pipe(process.stdout);
} else {
  const sms = new SitemapStream();

  if (argv['--prepend']) {
    createReadStream(argv['--prepend'])
      .pipe(new XMLToSitemapItemStream())
      .pipe(sms);
  }
  const oStream: SitemapStream = lineSeparatedURLsToSitemapOptions(
    pickStreamOrArg(argv)
  ).pipe(sms);

  if (argv['--gzip']) {
    oStream.pipe(createGzip()).pipe(process.stdout);
  } else {
    oStream.pipe(process.stdout);
  }
}
