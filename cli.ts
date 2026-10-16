#!/usr/bin/env node
import {
  createReadStream,
  createWriteStream,
  WriteStream,
  readFileSync,
  existsSync,
} from 'node:fs';
import { Readable } from 'node:stream';
import { resolve, dirname } from 'node:path';
import { URL } from 'node:url';
import { createGzip, type Gzip } from 'node:zlib';
import { parseArgs } from 'node:util';

import { xmlLint } from './lib/xmllint.js';
import { XMLLintUnavailable } from './lib/errors.js';
import {
  ObjectStreamToJSON,
  XMLToSitemapItemStream,
} from './lib/sitemap-parser.js';
import {
  lineSeparatedURLsToSitemapOptions,
  pipeSitemapToFile,
} from './lib/utils.js';
import { SitemapStream } from './lib/sitemap-stream.js';
import { SitemapAndIndexStream } from './lib/sitemap-index-stream.js';
import { ErrorLevel } from './lib/types.js';

/**
 * Locate the package manifest by walking up from this module's directory.
 *
 * Resolving it at a hardcoded relative depth has broken twice already, because
 * the correct depth depends on the build's output layout (`dist/esm/cli.js`
 * needed `../../`, `dist/cli.js` needs `../`). Walking up finds it whichever
 * layout this file is running from, source or built.
 */
const findPackageJson = (): string => {
  let dir = import.meta.dirname;
  for (;;) {
    const candidate = resolve(dir, 'package.json');
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error('Could not locate package.json');
    }
    dir = parent;
  }
};

const packageJson = JSON.parse(readFileSync(findPackageJson(), 'utf8'));

const parseCliArgs = () => {
  try {
    return parseArgs({
      allowPositionals: true,
      options: {
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean' },
        validate: { type: 'boolean' },
        index: { type: 'boolean' },
        'index-base-url': { type: 'string' },
        limit: { type: 'string' },
        parse: { type: 'boolean' },
        'single-line-json': { type: 'boolean' },
        prepend: { type: 'string' },
        gzip: { type: 'boolean' },
      },
    });
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    console.error('Run `sitemap --help` for a list of options.');
    process.exit(2);
  }
};
const { values: argv, positionals } = parseCliArgs();

const pickStreamOrArg = (): Readable => {
  if (!positionals.length) {
    return process.stdin;
  } else {
    return createReadStream(positionals[0], { encoding: 'utf8' });
  }
};

function getStream(): Readable {
  if (positionals.length) {
    return createReadStream(positionals[0]);
  } else {
    console.warn(
      'Reading from stdin. If you are not piping anything in, this command is not doing anything'
    );
    return process.stdin;
  }
}
if (argv.version) {
  console.log(packageJson.version);
} else if (argv.help) {
  console.log(`
Turn a list of urls into a sitemap xml.
Options:
  --help                 Print this text
  --version              Print the version
  --validate             Ensure the passed in file is conforms to the sitemap spec
  --index                Create an index and stream that out. Writes out sitemaps along the way.
  --index-base-url       Base url the sitemaps will be hosted eg. https://example.com/sitemaps/
  --limit=45000          Set a custom limit to the items per sitemap
  --parse                Parse fed xml and spit out config
  --prepend=sitemap.xml  Prepend the streamed in sitemap configs to sitemap.xml
  --gzip                 Compress output
  --single-line-json     When used with parse, it spits out each entry as json rather than the whole json.

# examples

Generate a sitemap index file as well as sitemaps
  npx sitemap --gzip --index --index-base-url https://example.com/path/to/sitemaps/ < listofurls.txt > sitemap-index.xml.gz

Add to a sitemap
  npx sitemap --prepend sitemap.xml < listofurls.json

Turn an existing sitemap into configuration understood by the sitemap library
  npx sitemap --parse sitemap.xml

Use XMLLib to validate your sitemap (requires xmllib)
  npx sitemap --validate sitemap.xml
`);
} else if (argv.parse) {
  let oStream: ObjectStreamToJSON | Gzip = getStream()
    .pipe(new XMLToSitemapItemStream({ level: ErrorLevel.THROW }))
    .pipe(new ObjectStreamToJSON({ lineSeparated: !argv['single-line-json'] }));
  if (argv.gzip) {
    oStream = oStream.pipe(createGzip());
  }
  oStream.pipe(process.stdout);
} else if (argv.validate) {
  xmlLint(getStream())
    .then((): void => console.log('valid'))
    .catch(([error, stderr]: [Error | null, Buffer?]): void => {
      if (error instanceof XMLLintUnavailable || stderr === undefined) {
        // No xmllint output to show (xmllint missing, or the schema could
        // not be found), so report the error itself. Exit 2: validation
        // could not run, as distinct from a file that failed it.
        console.error(error?.message);
        process.exitCode = 2;
        return;
      } else {
        console.log(stderr);
        // Exit 1 so scripts and CI can detect an invalid sitemap
        process.exitCode = 1;
      }
    });
} else if (argv.index) {
  const limit = argv.limit === undefined ? undefined : Number(argv.limit);
  if (limit !== undefined && !Number.isInteger(limit)) {
    console.error(`--limit must be an integer, got "${argv.limit}"`);
    process.exit(2);
  }
  const baseURL = argv['index-base-url'];
  if (!baseURL) {
    throw new Error(
      "You must specify where the sitemaps will be hosted. use --index-base-url 'https://example.com/path'"
    );
  }
  const sms = new SitemapAndIndexStream({
    limit,
    getSitemapStream: (i: number): [string, SitemapStream, WriteStream] => {
      const sm = new SitemapStream();
      const path = `./sitemap-${i}.xml`;

      const ws: WriteStream = createWriteStream(path);
      // SitemapAndIndexStream watches ws; destroying it again here reports
      // any failure that comes after it stopped watching.
      pipeSitemapToFile(sm, ws, Boolean(argv.gzip), (err) => sms.destroy(err));
      return [new URL(path, baseURL).toString(), sm, ws];
    },
  });
  let oStream: SitemapAndIndexStream | Gzip =
    lineSeparatedURLsToSitemapOptions(pickStreamOrArg()).pipe(sms);
  if (argv.gzip) {
    oStream = oStream.pipe(createGzip());
  }
  oStream.pipe(process.stdout);
} else {
  const sms = new SitemapStream();

  if (argv.prepend) {
    createReadStream(argv.prepend).pipe(new XMLToSitemapItemStream()).pipe(sms);
  }
  const oStream: SitemapStream =
    lineSeparatedURLsToSitemapOptions(pickStreamOrArg()).pipe(sms);

  if (argv.gzip) {
    oStream.pipe(createGzip()).pipe(process.stdout);
  } else {
    oStream.pipe(process.stdout);
  }
}
