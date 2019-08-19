import 'babel-polyfill'
import defaultexport, {
  createSitemap,
  Sitemap,
  SitemapItem,
  buildSitemapIndex,
  createSitemapIndex,
  xmlLint,
  parseSitemap,

  InvalidNewsFormat,
  NoURLError,
  NoConfigError,
  ChangeFreqInvalidError,
  PriorityInvalidError,
  UndefinedTargetFolder,
  InvalidVideoFormat,
  InvalidVideoDuration,
  InvalidVideoDescription,
  InvalidAttrValue
} from '../index'

describe('sitemap shape', () => {
  it('exports a default with sitemap hanging off it', () => {
    expect(typeof defaultexport).toBe('function')
  })

  it('exports individually as well', () => {
    expect(createSitemap).toBeDefined()
    expect(Sitemap).toBeDefined()
    expect(NoURLError).toBeDefined()
    expect(InvalidNewsFormat).toBeDefined()
    expect(NoConfigError).toBeDefined()
    expect(ChangeFreqInvalidError).toBeDefined()
    expect(PriorityInvalidError).toBeDefined()
    expect(UndefinedTargetFolder).toBeDefined()
    expect(InvalidVideoFormat).toBeDefined()
    expect(InvalidVideoDuration).toBeDefined()
    expect(InvalidVideoDescription).toBeDefined()
    expect(InvalidAttrValue).toBeDefined()
    expect(SitemapItem).toBeDefined()
    expect(buildSitemapIndex).toBeDefined()
    expect(createSitemapIndex).toBeDefined()
    expect(parseSitemap).toBeDefined()
    expect(xmlLint).toBeDefined()
  })
})
