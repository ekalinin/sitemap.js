import 'babel-polyfill'
import sm, { errors, Sitemap, version, InvalidNewsFormat } from '../index'

describe('sitemap shape', () => {
  it('exports a default with sitemap hanging off it', () => {
    expect(sm).toBeDefined()
    expect(sm.Sitemap).toBeDefined()
    expect(sm.errors).toBeDefined()
    expect(sm.errors.InvalidNewsFormat).toBeDefined()
    expect(sm.version).toBeDefined()
  })

  it('exports individually as well', () => {
    expect(Sitemap).toBeDefined()
    expect(errors).toBeDefined()
    expect(errors.InvalidNewsFormat).toBeDefined()
    expect(version).toBeDefined()
  })
})
