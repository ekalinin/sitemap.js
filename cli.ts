#!/usr/bin/env node
import { Readable } from 'stream';
import { createReadStream } from 'fs';
import { xmlLint } from './lib/xmllint';
import { XMLLintUnavailable } from './lib/errors';
import {
  ObjectStreamToJSON,
  XMLToSitemapItemStream,
} from './lib/sitemap-parser';
import { lineSeparatedURLsToSitemapOptions, mergeStreams } from './lib/utils';
import { SitemapStream } from './lib/sitemap-stream';
/* eslint-disable-next-line @typescript-eslint/no-var-requires */
const arg = require('arg');

const argSpec = {
  '--help': Boolean,
  '--version': Boolean,
  '--validate': Boolean,
  '--parse': Boolean,
  '--single-line-json': Boolean,
  '--prepend': String,
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
  --parse          Parse fed xml and spit out config
  --prepend sitemap.xml < urlsToAdd.json
  --single-line-json         When used with parse, it spits out each entry as json rather
                   than the whole json.
`);
} else if (argv['--parse']) {
  getStream()
    .pipe(new XMLToSitemapItemStream())
    .pipe(
      new ObjectStreamToJSON({ lineSeparated: !argv['--single-line-json'] })
    )
    .pipe(process.stdout);
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
} else {
  let streams: Readable[];
  if (!argv._.length) {
    streams = [process.stdin];
  } else {
    streams = argv._.map(
      (file: string): Readable => createReadStream(file, { encoding: 'utf8' })
    );
  }
  const sms = new SitemapStream();

  if (argv['--prepend']) {
    createReadStream(argv['--prepend'])
      .pipe(new XMLToSitemapItemStream())
      .pipe(sms);
  }
  lineSeparatedURLsToSitemapOptions(mergeStreams(streams))
    .pipe(sms)
    .pipe(process.stdout);
}
