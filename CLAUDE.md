# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

sitemap.js is a TypeScript library and CLI tool for generating sitemap XML files compliant with the sitemaps.org protocol. It supports streaming large datasets, handles sitemap indexes for >50k URLs, and includes parsers for reading existing sitemaps.

## When Making Changes

### Where to Add New Code

- **New type or interface?** → Add to [lib/types.ts](lib/types.ts)
- **New constant or limit?** → Add to [lib/constants.ts](lib/constants.ts) (import from here everywhere)
- **New validation function or type guard?** → Add to [lib/validation.ts](lib/validation.ts)
- **New utility function?** → Add to [lib/utils.ts](lib/utils.ts)
- **New error class?** → Add to [lib/errors.ts](lib/errors.ts)
- **New public API?** → Export from [index.ts](index.ts)

### Common Pitfalls to Avoid

1. **DON'T duplicate constants** - Always import from [lib/constants.ts](lib/constants.ts)
2. **DON'T define types in implementation files** - Put them in [lib/types.ts](lib/types.ts)
3. **DON'T scatter validation logic** - Keep it all in [lib/validation.ts](lib/validation.ts)
4. **DON'T break backward compatibility** - Use re-exports if moving code between files
5. **DO update [index.ts](index.ts)** if adding new public API functions

To add a new field to sitemap items, see the `add-sitemap-field` skill.

## TypeScript / ESM

**Important**: All relative imports must include `.js` extensions for ESM compatibility (e.g., `import { foo } from './types.js'`).

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

The package is ESM-only, with `"type": "module"` in package.json. There is no
CommonJS build: `require('sitemap')` works only on Node versions with built-in
`require(esm)` support, which is why the engines floor is 22.12.

- **ESM**: `dist/index.js` (ES modules)
- **Types**: `dist/index.d.ts` (TypeScript definitions)
- **Binary**: `dist/cli.js` (ESM-only CLI, executable via `npx sitemap`)
- **Engines**: Node.js >=22.12, npm >=10.8.2

## Architecture Decisions

### Why This File Structure?

The codebase is organized around **separation of concerns** and **single source of truth** principles:

1. **Types in [lib/types.ts](lib/types.ts)**: All interfaces and enums live here, with NO implementation code. This makes types easy to find and prevents circular dependencies.

2. **Constants in [lib/constants.ts](lib/constants.ts)**: All shared constants (limits, regexes) defined once. This prevents inconsistencies where different files use different values.

3. **Validation in [lib/validation.ts](lib/validation.ts)**: All validation logic centralized. Easy to find, test, and maintain security rules.

4. **Clear file boundaries**: Each file has ONE responsibility. You know exactly where to look for specific functionality.

### Key Principles

- **Single Source of Truth**: Constants and validation logic exist in exactly one place
- **No Duplication**: Import shared code rather than copying it
- **Backward Compatibility**: Use re-exports when moving code between files to avoid breaking changes
- **Types Separate from Implementation**: [lib/types.ts](lib/types.ts) contains only type definitions
- **Security First**: All validation and limits are centralized for consistent security enforcement

### Benefits of This Organization

- **Discoverability**: Developers know exactly where to look for types, constants, or validation
- **Maintainability**: Changes to limits or validation only require editing one file
- **Consistency**: Importing from a single source prevents different parts of the code using different limits
- **Testing**: Centralized validation makes it easy to write comprehensive security tests
- **Refactoring**: Clear boundaries make it safe to refactor without affecting other modules

## Agent skills

### Issue tracker

Issues live in [ekalinin/sitemap.js](https://github.com/ekalinin/sitemap.js) GitHub Issues, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
