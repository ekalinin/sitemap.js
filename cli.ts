#!/usr/bin/env node
import { Readable, Transform } from 'stream'
import { createReadStream } from 'fs'
import { xmlLint } from './lib/xmllint'
import { XMLLintUnavailable } from './lib/errors'
import { ObjectStreamToJSON, XMLToISitemapOptions } from './lib/sitemap-parser'
import { lineSeparatedURLsToSitemapOptions, mergeStreams } from './lib/utils';
import { SitemapStream } from './lib/sitemap-stream'
console.warn('CLI is new and likely to change quite a bit. Please send feature/bug requests to https://github.com/ekalinin/sitemap.js/issues')
/* eslint-disable-next-line @typescript-eslint/no-var-requires */
const arg = require('arg')

const argSpec = {
  '--help':    Boolean,
  '--version': Boolean,
  '--json': Boolean,
  '--validate': Boolean,
  '--parse': Boolean,
  '--line-separated': Boolean
}
const argv = arg(argSpec)

function getStream (): Readable {
  if (argv._ && argv._.length) {
    return createReadStream(argv._[0])
  } else {
    console.warn('Reading from stdin. If you are not piping anything in, this command is not doing anything')
    return process.stdin
  }
}
if (argv['--version']){
  /* eslint-disable-next-line @typescript-eslint/no-var-requires */
  const packagejson = require('../package.json')
  console.log(packagejson.version)
} else if (argv['--help']) {
  // TODO stream a full JSON configuration in
  // TODO allow user to append entry to existing xml
  console.log(`
Turn a list of urls into a sitemap xml.
Options:
  --help           Print this text
  --version        Print the version
  --json           Parse each line as json and feed to Sitemap
  --parse          Parse fed xml and spit out config
  --line-separated When used with parse, it spits out each entry as json rather
                   than the whole json. This can be then consumed with --json by
                   the cli
`)
} else if (argv['--parse']) {
  let firstChunkWritten = false
  getStream()
    .pipe(new XMLToISitemapOptions())
    .pipe(new ObjectStreamToJSON({ lineSeparated: argv["--line-separated"] }))
    .pipe(new Transform({
      transform (chunk, encoding, cb): void {
        if (!firstChunkWritten && !argv["--line-separated"]) {
          firstChunkWritten = true
          this.push('{"urls":')
        }
        cb(undefined, chunk)
      },
      flush (cb): void {
        if (argv["--line-separated"]) {
          cb()
        } else {
          cb(undefined, '}')
        }
      }
    }))
    .pipe(process.stdout);
} else if (argv['--validate']) {
  xmlLint(getStream())
    .then((): void => console.log('valid'))
    .catch(([error, stderr]: [Error|null, Buffer]): void => {
      if (error instanceof XMLLintUnavailable) {
        console.error(error.message)
        return
      } else {
        console.log(stderr)
      }
    })
} else {
  let streams: Readable[]
  if (!argv._.length) {
    streams = [process.stdin]
  } else {
    streams = argv._.map(
      (file: string): Readable => createReadStream(file, { encoding: 'utf8' }))
  }
  lineSeparatedURLsToSitemapOptions(mergeStreams(streams), { isJSON: argv["--json"] })
    .pipe(new SitemapStream())
    .pipe(process.stdout);
}
