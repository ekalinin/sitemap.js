# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

sitemap.js is a TypeScript library and CLI tool for generating sitemap XML files compliant with the sitemaps.org protocol. It supports streaming large datasets, handles sitemap indexes for >50k URLs, and includes parsers for reading existing sitemaps.

## Development Commands

### Building
```bash
npm run build                 # Compile TypeScript to dist/esm/ and dist/cjs/
npm run build:esm             # Build ESM only (dist/esm/)
npm run build:cjs             # Build CJS only (dist/cjs/)
```

### Testing
```bash
npm test                      # Run Jest tests with coverage
npm run test:full             # Run lint, build, Jest, and xmllint validation
npm run test:typecheck        # Type check only (tsc)
npm run test:perf             # Run performance tests (tests/perf.mjs)
npm run test:xmllint          # Validate XML schema (requires xmllint)
```

### Linting
```bash
npx eslint lib/* ./cli.ts     # Lint TypeScript files
npx eslint lib/* ./cli.ts --fix  # Auto-fix linting issues
```

### Running CLI Locally
```bash
node dist/esm/cli.js < urls.txt   # Run CLI from built dist
./dist/esm/cli.js --version       # Run directly (has shebang)
npm link && sitemap --version     # Link and test as global command
```

## Code Architecture

### Entry Points
- **[index.ts](index.ts)**: Main library entry point, exports all public APIs
- **[cli.ts](cli.ts)**: Command-line interface for generating/parsing sitemaps

### Core Streaming Architecture

The library is built on Node.js Transform streams for memory-efficient processing of large URL lists:

**Stream Chain Flow:**
```
Input → Transform Stream → Output
```

**Key Stream Classes:**

1. **SitemapStream** ([lib/sitemap-stream.ts](lib/sitemap-stream.ts))
   - Core Transform stream that converts `SitemapItemLoose` objects to sitemap XML
   - Handles single sitemaps (up to ~50k URLs)
   - Automatically generates XML namespaces for images, videos, news, xhtml
   - Uses `SitemapItemStream` internally for XML element generation

2. **SitemapAndIndexStream** ([lib/sitemap-index-stream.ts](lib/sitemap-index-stream.ts))
   - Higher-level stream for handling >50k URLs
   - Automatically splits into multiple sitemap files when limit reached
   - Generates sitemap index XML pointing to individual sitemaps
   - Requires `getSitemapStream` callback to create output files

3. **SitemapItemStream** ([lib/sitemap-item-stream.ts](lib/sitemap-item-stream.ts))
   - Low-level Transform stream that converts sitemap items to XML elements
   - Validates and normalizes URLs
   - Handles image, video, news, and link extensions

4. **XMLToSitemapItemStream** ([lib/sitemap-parser.ts](lib/sitemap-parser.ts))
   - Parser that converts sitemap XML back to `SitemapItem` objects
   - Built on SAX parser for streaming large XML files

5. **SitemapIndexStream** ([lib/sitemap-index-stream.ts](lib/sitemap-index-stream.ts))
   - Generates sitemap index XML from a list of sitemap URLs
   - Used for organizing multiple sitemaps

### Type System

**[lib/types.ts](lib/types.ts)** defines the core data structures:

- **SitemapItemLoose**: Flexible input type (accepts strings, objects, arrays for images/videos)
- **SitemapItem**: Strict normalized type (arrays only)
- **ErrorLevel**: Enum controlling validation behavior (SILENT, WARN, THROW)
- **NewsItem**, **Img**, **VideoItem**, **LinkItem**: Extension types for rich sitemap entries
- **IndexItem**: Structure for sitemap index entries

### Validation & Normalization

**[lib/utils.ts](lib/utils.ts)** contains:
- `normalizeURL()`: Converts `SitemapItemLoose` to `SitemapItem` with validation
- `validateSMIOptions()`: Validates sitemap item fields
- `lineSeparatedURLsToSitemapOptions()`: Stream transform for parsing line-delimited URLs
- `ReadlineStream`: Helper for reading line-by-line input

### XML Generation

**[lib/sitemap-xml.ts](lib/sitemap-xml.ts)** provides low-level XML building functions:
- Tag generation helpers (`otag`, `ctag`, `element`)
- Sitemap-specific element builders (images, videos, news, links)

### Error Handling

**[lib/errors.ts](lib/errors.ts)** defines custom error classes:
- `EmptyStream`, `EmptySitemap`: Stream validation errors
- `InvalidAttr`, `InvalidVideoFormat`, `InvalidNewsFormat`: Validation errors
- `XMLLintUnavailable`: External tool errors

## Testing Strategy

Tests are in [tests/](tests/) directory with Jest:
- `sitemap-stream.test.ts`: Core streaming functionality
- `sitemap-parser.test.ts`: XML parsing
- `sitemap-index.test.ts`: Index generation
- `sitemap-simple.test.ts`: High-level API
- `cli.test.ts`: CLI argument parsing

Coverage requirements (jest.config.cjs):
- Branches: 80%
- Functions: 90%
- Lines: 90%
- Statements: 90%

## TypeScript Configuration

The project uses a dual-build setup for ESM and CommonJS:

- **[tsconfig.json](tsconfig.json)**: ESM build (`module: "NodeNext"`, `moduleResolution: "NodeNext"`)
  - Outputs to `dist/esm/`
  - Includes both [index.ts](index.ts) and [cli.ts](cli.ts)
  - ES2023 target with strict null checks enabled

- **[tsconfig.cjs.json](tsconfig.cjs.json)**: CommonJS build (`module: "CommonJS"`)
  - Outputs to `dist/cjs/`
  - Excludes [cli.ts](cli.ts) (CLI is ESM-only)
  - Only includes [index.ts](index.ts) for library exports

**Important**: All relative imports must include `.js` extensions for ESM compatibility (e.g., `import { foo } from './types.js'`)

## Key Patterns

### Stream Creation
Always create a new stream instance per operation. Streams cannot be reused.

```typescript
const stream = new SitemapStream({ hostname: 'https://example.com' });
stream.write({ url: '/page' });
stream.end();
```

### Memory Management
For large datasets, use streaming patterns with `pipe()` rather than collecting all data in memory:

```typescript
// Good - streams through
lineSeparatedURLsToSitemapOptions(readStream).pipe(sitemapStream).pipe(outputStream);

// Bad - loads everything into memory
const allUrls = await readAllUrls();
allUrls.forEach(url => stream.write(url));
```

### Error Levels
Control validation strictness with `ErrorLevel`:
- `SILENT`: Skip validation (fastest, use in production if data is pre-validated)
- `WARN`: Log warnings (default, good for development)
- `THROW`: Throw on invalid data (strict mode, good for testing)

## Package Distribution

The package is distributed as a dual ESM/CommonJS package with `"type": "module"` in package.json:

- **ESM**: `dist/esm/index.js` (ES modules)
- **CJS**: `dist/cjs/index.js` (CommonJS, via conditional exports)
- **Types**: `dist/esm/index.d.ts` (TypeScript definitions)
- **Binary**: `dist/esm/cli.js` (ESM-only CLI, executable via `npx sitemap`)
- **Engines**: Node.js >=20.19.5, npm >=10.8.2

### Dual Package Exports

The `exports` field in package.json provides conditional exports:

```json
{
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    }
  }
}
```

This allows both:
```javascript
// ESM
import { SitemapStream } from 'sitemap'

// CommonJS
const { SitemapStream } = require('sitemap')
```

## Git Hooks

Husky pre-commit hooks run lint-staged which:
- Sorts package.json
- Runs eslint --fix on TypeScript files
- Runs prettier on TypeScript files
