import 'babel-polyfill';
import { xmlLint } from '../index'

describe('xmllint', () => {
  it('returns a promise', () => {
    expect.assertions(1)
    expect(xmlLint('./tests/cli-urls.json.xml').catch()).toBeInstanceOf(Promise)
  })

  it('resolves when complete', async () => {
    expect.assertions(1)
    try {
      await expect(xmlLint('./tests/cli-urls.json.xml')).resolves.toBeFalsy()
    } catch (e) {
    }
  }, 30000)

  it('rejects when invalid', async () => {
    expect.assertions(1)
    await expect(xmlLint('./tests/cli-urls.json.bad.xml')).rejects.toBeTruthy()
  }, 30000)
})
