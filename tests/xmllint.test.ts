import 'babel-polyfill';
import { xmlLint } from '../index'
import { XMLLintUnavailable } from '../lib/errors'
const lintCheck = xmlLint('').catch(([e]: [Error]) => {
  return !(e instanceof XMLLintUnavailable)
})
describe('xmllint', () => {
  it('returns a promise', async () => {
    if (await lintCheck) {
      expect(xmlLint('./tests/cli-urls.json.xml').catch()).toBeInstanceOf(Promise)
    } else {
      console.warn('skipping xmlLint test, not installed')
      expect(true).toBe(true)
    }
  })

  it('resolves when complete', async () => {
    expect.assertions(1)
    try {
      const result = await xmlLint('./tests/cli-urls.json.xml')
      await expect(result).toBeFalsy()
    } catch (e) {
      if (Array.isArray(e) && e[0] instanceof XMLLintUnavailable) {
        console.warn('skipping xmlLint test, not installed')
        expect(true).toBe(true)
      } else {
        console.log(e)
        expect(true).toBe(false)
      }
    }
  }, 30000)

  it('rejects when invalid', async () => {
    expect.assertions(1)
    if (await lintCheck) {
      await expect(xmlLint('./tests/cli-urls.json.bad.xml')).rejects.toBeTruthy()
    } else {
      console.warn('skipping xmlLint test, not installed')
      expect(true).toBe(true)
    }
  }, 30000)
})
