#!/usr/bin/env node
import { createReadStream, readFileSync } from 'node:fs';
import { Readable, pipeline, type Writable } from 'node:stream';
import { URL } from 'node:url';
import { createGzip } from 'node:zlib';
import { parseArgs } from 'node:util';

import { xmlLint } from './lib/xmllint.js';
import { InvalidLimitError, XMLLintUnavailable } from './lib/errors.js';
import {
  ObjectStreamToJSON,
  XMLToSitemapItemStream,
} from './lib/sitemap-parser.js';
import {
  findUp,
  lineSeparatedURLsToSitemapOptions,
  openSitemapFile,
} from './lib/utils.js';
import { SitemapStream } from './lib/sitemap-stream.js';
import { SitemapAndIndexStream } from './lib/sitemap-index-stream.js';
import { ErrorLevel } from './lib/types.js';
import { validateLimit } from './lib/validation.js';

/**
 * Locate the package manifest by walking up from this module's directory.
 *
 * Resolving it at a hardcoded relative depth has broken twice already, because
 * the correct depth depends on the build's output layout (`dist/esm/cli.js`
 * needed `../../`, `dist/cli.js` needs `../`). Walking up finds it whichever
 * layout this file is running from, source or built.
 */
const findPackageJson = (): string => {
  const packageJson = findUp('package.json', import.meta.dirname);
  if (!packageJson) {
    throw new Error('Could not locate package.json');
  }
  return packageJson;
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

/**
 * Pipe `streams` together and write the result to stdout. On failure, print
 * the error message (not an unhandled-error stack trace) and exit with 1.
 *
 * With `quietEPIPE`, a reader that closes stdout early (such as `| head`) is
 * not a failure. Leave it off when the pipeline writes files as it goes, since
 * stopping early leaves them incomplete.
 */
function pipeToStdout(
  streams: [Readable, ...Writable[]],
  { quietEPIPE }: { quietEPIPE: boolean }
): void {
  pipeline([...streams, process.stdout], (err) => {
    if (
      !err ||
      (quietEPIPE && (err as NodeJS.ErrnoException).code === 'EPIPE')
    ) {
      return;
    }
    console.error(err.message);
    process.exitCode = 1;
  });
}

/**
 * Yield every item of each source in turn, so later sources start only after
 * earlier ones have ended
 */
async function* concatSources(
  ...sources: (() => Readable)[]
): AsyncGenerator<unknown> {
  for (const source of sources) {
    yield* source();
  }
}

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
  --gzip                 Compress output. With --index, also gzips each sitemap
                         and names it sitemap-N.xml.gz
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
  const streams: [Readable, ...Writable[]] = [
    getStream(),
    new XMLToSitemapItemStream({ level: ErrorLevel.THROW }),
    new ObjectStreamToJSON({ lineSeparated: !argv['single-line-json'] }),
  ];
  if (argv.gzip) {
    streams.push(createGzip());
  }
  pipeToStdout(streams, { quietEPIPE: true });
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
  // Decimal digits only: Number() alone would also accept forms such as
  // "1e3", "0x10" or " 250 ". Anything else becomes NaN, which fails below.
  const limit =
    argv.limit === undefined
      ? undefined
      : /^\d+$/.test(argv.limit)
        ? Number(argv.limit)
        : NaN;
  try {
    if (limit !== undefined) {
      validateLimit(limit);
    }
  } catch {
    // Report the value as typed, rather than the NaN it parsed to
    console.error(`--limit: ${new InvalidLimitError(argv.limit).message}`);
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
    getSitemapStream: (i) =>
      // Gzipped files are named .xml.gz, as simpleSitemapAndIndex names them
      openSitemapFile(i, new SitemapStream(), {
        destinationDir: '.',
        gzip: Boolean(argv.gzip),
        toURL: (fileName) => new URL(fileName, baseURL).toString(),
        urlParamName: '--index-base-url',
        onError: (err) => sms.destroy(err),
      }),
  });
  const streams: [Readable, ...Writable[]] = [
    lineSeparatedURLsToSitemapOptions(pickStreamOrArg()),
    sms,
  ];
  if (argv.gzip) {
    streams.push(createGzip());
  }
  // sitemap files are written as the index streams out, so a reader that
  // stops early leaves them incomplete: report it
  pipeToStdout(streams, { quietEPIPE: false });
} else {
  const sources: (() => Readable)[] = [];
  const prepend = argv.prepend;
  if (prepend) {
    // Read the existing sitemap to the end before the new URLs, so its
    // entries come first and one source ending can't end the sitemap early
    sources.push(() => {
      const parser = new XMLToSitemapItemStream();
      // Past the cap the parser drops entries and only logs it, which would
      // write a truncated sitemap and exit 0. Fail instead: the output can't
      // hold more than a sitemap may.
      parser.once('maxEntriesExceeded', (max: number) => {
        parser.destroy(
          new Error(
            `--prepend file ${prepend} has more than ${max} URLs, the most a sitemap may hold`
          )
        );
      });
      // pipeline() destroys both streams if either fails, and fails the
      // parser with the error, which concatSources then rethrows. The
      // callback has nothing to add.
      return pipeline(createReadStream(prepend), parser, () => {});
    });
  }
  sources.push(() => lineSeparatedURLsToSitemapOptions(pickStreamOrArg()));

  const streams: [Readable, ...Writable[]] = [
    Readable.from(concatSources(...sources)),
    new SitemapStream(),
  ];
  if (argv.gzip) {
    streams.push(createGzip());
  }
  pipeToStdout(streams, { quietEPIPE: true });
}
