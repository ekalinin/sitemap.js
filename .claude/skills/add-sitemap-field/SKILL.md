---
name: add-sitemap-field
description: Steps for adding a new field to sitemap items in sitemap.js — which files to touch in order (types, item stream, parser, validation, constants, tests). Use when adding or extending a sitemap item field.
---

# Adding a new field to sitemap items

1. Add type to [lib/types.ts](../../../lib/types.ts) in both `SitemapItem` and `SitemapItemLoose` interfaces
2. Add XML generation logic in [lib/sitemap-item-stream.ts](../../../lib/sitemap-item-stream.ts) `_transform` method
3. Add parsing logic in [lib/sitemap-parser.ts](../../../lib/sitemap-parser.ts) SAX event handlers
4. Add validation in [lib/validation.ts](../../../lib/validation.ts) `validateSMIOptions` if needed
5. Add constants to [lib/constants.ts](../../../lib/constants.ts) if limits are needed
6. Write tests covering the new field
