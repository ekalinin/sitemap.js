/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
import { createSitemap } from './lib/sitemap'
export * from './lib/sitemap'
export * from './lib/sitemap-item'
export * from './lib/sitemap-index'
export * from './lib/sitemap-stream'
export * from './lib/errors'
export * from './lib/types'
export { lineSeparatedURLsToSitemapOptions, mergeStreams } from './lib/utils'
export { xmlLint } from './lib/xmllint'
export { parseSitemap, XMLToISitemapOptions, ObjectStreamToJSON } from './lib/sitemap-parser'

export default createSitemap
