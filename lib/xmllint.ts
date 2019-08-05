import { Readable, Writable } from 'stream'
import { execFile } from 'child_process'
export function xmlLint (xml: string|Readable, errorStream: Writable): Promise<null> {
  let args = ['--schema', './schema/all.xsd', '--noout', '-']
  if (typeof xml === 'string') {
    args[args.length - 1] = xml
  }
  return new Promise((resolve, reject): void => {
    let xmllint = execFile('xmllint', args, (error, stdout, stderr): void => {
      // @ts-ignore
      if (error && error.code) {
        reject([error, stderr])
      }
      resolve()
    })
    if ((typeof xml !== 'string') && xml && xmllint.stdin && xmllint.stdout && xmllint.stderr) {
      xml.pipe(xmllint.stdin)
      xmllint.stdout.unpipe()
    }
  })
}
