import { Readable } from 'stream'
import { execFile } from 'child_process'
export function xmlLint (xml: string|Readable): Promise<null> {
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
    if (xmllint.stdout) {
      xmllint.stdout.unpipe()
      if ((typeof xml !== 'string') && xml && xmllint.stdin) {
        xml.pipe(xmllint.stdin)
      }
    }
  })
}
