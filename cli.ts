#!/usr/bin/env node
import { SitemapItem, Sitemap, ISitemapItemOptionsLoose } from './index'
import { createInterface } from 'readline';
import { Readable } from 'stream'
import { createReadStream } from 'fs'
import { xmlLint } from './lib/xmllint'
import { XMLLintUnavailable } from './lib/errors'
import { parseSitemap } from './lib/sitemap-parser'
console.warn('CLI is new and likely to change quite a bit. Please send feature/bug requests to https://github.com/ekalinin/sitemap.js/issues')
/* eslint-disable-next-line @typescript-eslint/no-var-requires */
const arg = require('arg')

const preamble = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">'
const closetag = '</urlset>'
let first = true
const println = (line: string|ISitemapItemOptionsLoose): void => {
  if (first) {
    first = false
    process.stdout.write(preamble)
  }
  process.stdout.write(SitemapItem.justItem(Sitemap.normalizeURL(line)))
}

async function processStreams (streams: Readable[], isJSON = false): Promise<boolean> {
  for (let stream of streams) {
    await new Promise((resolve): void => {
      const rl = createInterface({
        input: stream
      });
      rl.on('line', (line): void => println(isJSON ? JSON.parse(line): line))
      rl.on('close', (): void => {
        resolve()
      })
    })
  }
  process.stdout.write(closetag)
  return true
}
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
  parseSitemap(getStream()).then((items): void => {
    if (argv['--line-separated'] && items.urls) {
      items.urls.forEach((url): void => {
        console.log(JSON.stringify(url))
      })
    } else {
      console.log(JSON.stringify(items))
    }
  })
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
  processStreams(streams, argv['--json'])
}
