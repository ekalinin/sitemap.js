import { SitemapItem, Sitemap } from './index'
import { createInterface } from 'readline';
import { Readable } from 'stream'
import { createReadStream } from 'fs'
import { execFile } from 'child_process'
console.warn('CLI is in new and likely to change quite a bit. Please send feature/bug requests to https://github.com/ekalinin/sitemap.js/issues')
/* eslint-disable-next-line @typescript-eslint/no-var-requires */
const arg = require('arg')

const preamble = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">'
const closetag = '</urlset>'
let first = true
const println = (line: string): void => {
  let prepend = ''
  if (first) {
    first = false
    prepend = preamble
  }
  process.stdout.write(prepend + SitemapItem.justItem(Sitemap.normalizeURL(line)))
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
  '--validate': Boolean
}
const argv = arg(argSpec)
if (argv['--version']){
  /* eslint-disable-next-line @typescript-eslint/no-var-requires */
  const packagejson = require('../package.json')
  console.log(packagejson.version)
} else if (argv['--help']) {
  console.log(`
Turn a list of urls into a sitemap xml.
Options:
  --help Print this text
  --version Print the version
  --json Parse each line as json and feed to Sitemap
`)
} else if (argv['--validate']) {
  let args = ['--schema', './schema/all.xsd', '--noout', '-']
  if (argv._ && argv._.length) {
    args[args.length - 1] = argv._[0]
  }
  let xmllint = execFile('xmllint', args, (error, stdout, stderr): void => {
    // @ts-ignore
    if (error && error.code) {
      console.log(stderr)
      return
    }
    console.log('valid')
  })
  if ((!argv._ || !argv._.length) && process.stdin && xmllint.stdin && xmllint.stdout && xmllint.stderr) {
    process.stdin.pipe(xmllint.stdin)
    xmllint.stderr.pipe(process.stderr)
  }
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
