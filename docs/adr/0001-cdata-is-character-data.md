# CDATA is ordinary character data, and a Sitemap URL has one definition

`XMLToSitemapItemStream` used to handle SAX `text` and `cdata` events in two near-identical switch statements, where the `cdata` switch covered only the 8 tags patched for issue #445 — CDATA in any other tag was rejected as "unhandled". When collapsing the duplication (July 2026) we decided that CDATA sections are semantically ordinary character data per the XML spec, so both events route through one `handleCharData` and every tag accepts CDATA; and that `<loc>` is validated at the same strength everywhere via `validateURL` (length, protocol, *and* URL-parseability), matching what the sitemap index parser already did.

## Considered Options

- **Preserve the 8-tag CDATA list** behind a `text | cdata` source flag: zero behavior change, but the special-case list would survive as permanent interface complexity, and the #445 list was an incremental patch rather than a design decision.
- **Keep the weaker inline `loc` check** (length + protocol only): also zero behavior change, but it would leave two different definitions of "valid sitemap URL" living in `lib/validation.ts` — the scatter the refactor existed to remove.

## Consequences

- Parsing is slightly more permissive (CDATA anywhere) and slightly stricter (a `<loc>` that fails `new URL()` is now dropped with a warning). Both deltas shipped in 9.1.0.
- Invalid-`loc` warnings changed shape to the wrapped `Invalid URL in sitemap: …` form used by the index parser.
- `<loc>` keeps assign-last-wins semantics for multi-chunk character data; accumulating chunks and validating at closetag was considered and deliberately deferred.
