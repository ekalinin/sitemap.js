import { Sitemap } from './index'
import { createInterface } from 'readline';
import { Readable } from 'stream'
import { createReadStream } from 'fs'
console.warn('CLI is in new and likely to change quite a bit. Please send feature/bug requests to https://github.com/ekalinin/sitemap.js/issues')
/* eslint-disable-next-line @typescript-eslint/no-var-requires */
const arg = require('arg')

const sm = new Sitemap()
const parseJSON = (line: string): number => (
  sm.add(JSON.parse(line))
)
const parseLine = (line: string): number => sm.add(line)

async function processStreams (streams: Readable[], isJSON: boolean): Promise<string> {
  for (let stream of streams) {
    await new Promise((resolve): void => {
      const rl = createInterface({
        input: stream
      });
      rl.on('line', isJSON ? parseJSON : parseLine)
      rl.on('close', (): void => {
        resolve()
      })
    })
  }
  return sm.toString()
}
const argSpec = {
  '--help':    Boolean,
  '--version': Boolean,
  '--json': Boolean
}
const argv = arg(argSpec)
if (argv['--version']){
  /* eslint-disable-next-line @typescript-eslint/no-var-requires */
  const packagejson = require('../package.json')
  console.log(packagejson.version)
} else if (argv['--help']) {
  console.log('TODO')
} else {
  processStreams(
    argv._.map(
      (file: string): Readable => createReadStream(file, { encoding: 'utf8' }))
      .concat(process.stdin),
    argv['--json']
  )
}
