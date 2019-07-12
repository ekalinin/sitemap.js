import 'babel-polyfill'
import sm, {
  createSitemap,
  Sitemap,
  SitemapItem,
  buildSitemapIndex,
  createSitemapIndex,

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
    expect(sm).toBeDefined()
    expect(sm.Sitemap).toBeDefined()
    expect(sm.createSitemap).toBeDefined()
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
  })
})
