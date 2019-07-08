import { Sitemap } from './index'
import { createInterface } from 'readline';
console.warn('CLI is in new and likely to change quite a bit. Please send feature/bug requests to https://github.com/ekalinin/sitemap.js/issues')
const arg = require('arg')

const sm = new Sitemap()
const parseJSON = (line: string): number => (
  sm.add(JSON.parse(line))
)
const parseLine = (line: string): number => sm.add(line)
const argSpec = {
  '--help':    Boolean,
  '--version': Boolean,
  '--json': Boolean
}
const argv = arg(argSpec)
if (argv['--version']){
  const packagejson = require('../package.json')
  console.log(packagejson.version)
} else if (argv['--help']) {
  console.log('TODO')
} else {
  const rl = createInterface({
    input: process.stdin
  });
  rl.on('line', argv['--json'] ? parseJSON : parseLine)
  rl.on('close', (): void => {
    process.stdout.write(sm.toString())
  })
}
