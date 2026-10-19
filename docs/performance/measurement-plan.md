# Performance measurement plan

Drafted: 2026-10-19.

This document defines the performance metrics sitemap.js tracks, how to
measure each one, and the steps to build the tooling. It replaces the approach
in [`tests/perf.mjs`](../../tests/perf.mjs); for the problems with that
approach, see
[Review of the performance measurement methodology](methodology-review.md).

## Goals

The measurement setup must answer three questions:

- **Did this change make the library slower or hungrier?** A pull request
  author needs a trustworthy before-and-after comparison on their own machine.
- **Does streaming still use bounded memory?** The library's central promise
  is that it handles arbitrarily large inputs with roughly constant memory.
  That property must be checked automatically in CI.
- **Has performance drifted over time?** Maintainers need a history of results
  from a consistent environment.

Out of scope: microbenchmarks of individual helper functions, and comparisons
with other sitemap libraries.

## Key metrics

The following table lists the metrics, in priority order. Metrics 1–3 are
required; 4–6 are diagnostic and help explain a change in the first three.

| # | Metric | Unit | Why it matters |
|---|---|---|---|
| 1 | Throughput | items/s, and output MB/s | What users experience when generating or parsing large sitemaps. |
| 2 | Memory growth with input size | MB of peak RSS per additional 100k items | Diagnostic: shows whether memory grows with input. Should be close to zero. The heap- and RSS-capped run in [Memory](#memory) is the pass/fail check. |
| 3 | Peak memory | MB of peak RSS above the post-import baseline | Sizing for memory-constrained environments such as serverless functions. |
| 4 | CPU time per item | µs/item, user + system | Less sensitive to scheduling noise than wall-clock time, so useful on shared CI runners. |
| 5 | Validation overhead | ratio of `WARN` to `SILENT` throughput | Shows the cost of [`lib/validation.ts`](../../lib/validation.ts), which the default error level runs. |
| 6 | Startup time | ms to import the package; ms for a minimal CLI run | Matters for short-lived processes and CLI users. |

### Metric definitions

**Throughput.** Items processed divided by wall-clock time, from pipeline
creation until the destination stream emits `finish`. Measure with
`process.hrtime.bigint()`. Report output bytes per second alongside items per
second, because rich items (video, images) produce far more XML per item than
bare URLs.

**Memory growth with input size.** Run the same scenario at 100,000 and
1,000,000 items, each in a fresh process, and compute
`(peakRss(1M) - peakRss(100k)) / 9`. A streaming pipeline should stay within
a few megabytes per 100k items; anything approaching the size of the data
means something is buffering.

**Peak memory.** In a fresh child process, record `maxRSS` after imports and
before any fixture setup (the baseline), run the scenario once, then record
`maxRSS` again. Report the difference. Because `maxRSS` never decreases, any
setup that runs in the child must stay below the scenario's peak, or it masks
the scenario; generate fixtures in a separate process, and have the child
read them from disk or a pipe. Each process yields exactly one sample. For
finer detail when investigating, also sample
`process.memoryUsage().heapUsed` every 50 ms and report its maximum.

**CPU time per item.** The sum of `userCPUTime` and `systemCPUTime` from
`process.resourceUsage()` across the timed region, divided by item count.

**Validation overhead.** Run the generation scenarios at both
`ErrorLevel.SILENT` and `ErrorLevel.WARN` and report the throughput ratio.
Use input that passes validation so the measurement doesn't include logging.

**Startup time.** Wall-clock time of
`node -e "await import('sitemap')"` and of the CLI processing a one-line
input, each measured over 20 fresh processes.

## Scenarios

Each scenario exercises one public entry point with a fixed input. Scenario
names are stable identifiers; results are keyed by them.

| Scenario | Entry point | Input | Output |
|---|---|---|---|
| `generate-urls` | `SitemapStream` | 1M bare URL strings | `/dev/null` |
| `generate-rich` | `SitemapStream` | 100k items with video, image, news, and `hreflang` links | `/dev/null` |
| `generate-from-lines` | `lineSeparatedURLsToSitemapOptions` → `SitemapStream` | `perf-data.json.txt` (21,753 JSON lines) | `/dev/null` |
| `split-and-index` | `SitemapAndIndexStream` | 1M bare URLs, default 50,000 limit | Files in a temp directory |
| `simple-gzip` | `simpleSitemapAndIndex` | 1M bare URLs, gzip on | Files in a temp directory |
| `parse-xml` | `XMLToSitemapItemStream` | `perf-data.xml` (21,753 `<url>` entries) | Object sink that counts items |
| `parse-index` | `XMLToSitemapIndexStream` | Generated index with 50,000 entries (the protocol maximum) | Object sink that counts items |
| `round-trip` | `XMLToSitemapItemStream` → `SitemapStream` | `perf-data.xml` | `/dev/null` |
| `cli` | `sitemap` binary | 1M bare URLs on stdin | `/dev/null` |

Run each generation scenario except `cli`, which has no option to set the
error level, at both error levels to produce metric 5. Run
`generate-urls`, `split-and-index`, and `parse-xml` at 100k and 1M items to
produce metric 2; for `parse-xml`, generate the larger input by repeating the
corpus with unique URLs, and stream it from a generator process instead of
writing it to disk (at 1M entries it's about 1 GB).

### Fixtures

Generate synthetic inputs at run time from a seeded pseudorandom generator
instead of committing large files. A seeded generator produces identical input
on every run, keeps the repository small, and makes it trivial to vary the
item count. Keep `perf-data.xml` and `perf-data.json.txt` as the realistic
corpus, because real-world text (long descriptions, entities, CDATA) exercises
code paths synthetic data misses.

Generate fixtures in a separate process, never in the measured process, and
time only the library's work. Write inputs under about 100 MB to a cache
directory before the run. Pipe larger inputs from a generator process into
the measured process's stdin, so they never touch disk.

### Correctness guard

Every sample must verify its own output before it counts. The scenario
returns an item count and an output byte count, and the runner checks both
against the expected values. A sample that throws or produces the wrong
count fails the whole run with a non-zero exit code. That prevents a broken
pipeline from reporting as a speedup.

## Measurement method

### Throughput and CPU time

For each scenario:

1. Run the scenario 3 times as warmup and discard the results, so the JIT
   compiler optimizes the hot paths before timing starts.
2. Run the scenario 5 times, recording wall-clock and CPU time for each run.
   Call `global.gc()` (requires `--expose-gc`) before each timed run so one
   run's garbage isn't collected during the next.
3. Repeat steps 1 and 2 in 10 separate Node.js processes. Variation between
   processes (memory layout, JIT decisions) is often larger than variation
   within one, and a single process hides it.

That gives 50 samples per scenario. Don't sleep between runs.

A dedicated macro-benchmark runner fits this workload better than a
microbenchmark library: each run lasts hundreds of milliseconds to seconds, so
per-call overhead doesn't matter, and process isolation does. Write a small
runner in `bench/` rather than adopting `tinybench` or `mitata`, whose
in-process designs don't cover steps 3 or the memory method that follows.

### Memory

Run each memory sample in its own child process, because `maxRSS` only grows.
Spawn the child with `--expose-gc`, let it record the baseline after imports
and before reading any fixture, run the scenario once, and print a JSON line
with both readings. Take 5 samples per scenario and size, and report the
median.

RSS growth (metric 2) also moves with lazy V8 heap growth and allocator
behavior, so treat it as a diagnostic, not a pass/fail check. To test bounded
memory directly, run the 1M-item scenario with a capped heap, such as
`--max-old-space-size=64`, and assert that it completes. A pipeline that
buffers JavaScript objects runs out of heap; one that streams doesn't, on any
platform. The cap doesn't cover `Buffer` memory, which lives outside the V8
heap, so also sample `process.memoryUsage().external` plus `arrayBuffers`
during the run and assert that its peak stays under a fixed budget. That
catches broken backpressure, where serialized output piles up in a stream's
internal buffer.

At 1M items this check takes too long for `npm test`, which the pre-commit
hook and every CI matrix leg run: a 1M-entry `parse-xml` input is about 1 GB.
Run it from its own script and its own CI job instead.

### Statistics and reporting

For every metric, report the median, the IQR, the minimum, and the sample
count. Don't report p99; with 50 samples it's the maximum.

To compare two commits, report the relative difference in medians and a 95%
confidence interval for that difference, computed by bootstrap resampling at
the process level: resample whole processes, then samples within them. Samples
from one process share its JIT and memory-layout effects, so resampling
individual samples as if independent makes the interval too narrow. This
needs at least 10 processes per side; with fewer, the bootstrap has too few
distinct resamples and its interval is still too narrow.
Call a result a regression only when the whole interval sits above the noise
threshold.

The runner writes one JSON file per run. The file records:

- Results per scenario and metric, including raw samples.
- Commit SHA, and whether the working tree had uncommitted changes.
- Node.js version, V8 version, operating system, CPU model, core count, and
  total memory.
- Fixture seed and item counts.

A separate script renders a JSON file, or a pair of them, as a Markdown table.

### Noise threshold

Before trusting any comparison, measure the noise floor with an A/A run:
compare a commit against itself. The widest confidence interval across
scenarios is the noise floor for that machine. Set the regression threshold
above it, starting at 5% for local runs and 15% for CI. Repeat the A/A run
whenever the runner, the scenarios, or the CI machine type changes.

### Comparing two commits

The comparison script builds the base commit in a temporary `git worktree`,
builds the working tree, and runs both on the same machine in the same
session. It alternates processes (base, head, base, head) instead of running
all of one then all of the other, so thermal throttling and background load
affect both sides equally.

## Environment

For local comparisons:

- Plug a laptop into power and close other heavy applications.
- Use the same Node.js version for both sides; the comparison script checks
  this.
- Don't compare results from different machines.

For CI, GitHub-hosted runners are shared virtual machines and their timing
varies between runs. Use them for the memory checks, which don't depend on
timing, and for CPU time per item, which varies less than wall-clock time.
Treat CI throughput as a coarse trend signal, not a gate. If CI throughput
proves too noisy to be useful, consider an instruction-counting service such
as CodSpeed, which measures under a CPU simulator and is largely immune to
runner noise.

## Implementation plan

Each phase is independently useful and can land as its own pull request.

### Phase 1: Fix the existing harness

Fix the bugs that produce wrong numbers, plus the CPU-metric issues in the
same code, so `npm run test:perf` stops producing wrong numbers until it's
replaced. Its statistics and single-process design (issues 6 and 8–17) stay,
so it still isn't fit for before-and-after comparisons.

- Parse `measureMemory` as a boolean, and reject unknown scenario names.
- Fail the run when an iteration throws, instead of recording it.
- Measure user + system CPU time, and stop truncating to whole units.
- Remove memory mode, which can only report a lifetime peak.

Done when: the review's issues 1–5 and 7 are fixed, and the Performance note
in `CLAUDE.md` says the harness's flag and error bugs are fixed but that it
still isn't fit for before-and-after comparisons.

### Phase 2: Build the benchmark runner

Create a `bench/` directory with the runner, scenarios, and fixture generator.

- `bench/run.mjs` takes scenario names, error levels, and item counts, and
  orchestrates the warmup, timed runs, and processes described in
  [Throughput and CPU time](#throughput-and-cpu-time).
- `bench/scenarios/*.mjs` holds one module per scenario, each exporting
  `setup`, `run`, and the expected item and byte counts.
- `bench/fixtures.mjs` generates seeded inputs and caches them.
- Add an `npm run bench` script that builds first, then runs the runner.

Done when: `npm run bench` produces a JSON results file for the generation
and parsing scenarios, and an A/A run on a maintainer's machine shows a noise
floor under 5%.

### Phase 3: Add memory measurement and the bounded-memory test

- Add the child-process memory method to the runner.
- Add `bench/memory-bound.mjs`, exposed as `npm run test:memory`, which runs
  `generate-urls` and `parse-xml` at 1M items under a capped heap and asserts
  that both complete and that peak `Buffer` memory stays under budget. Pipe
  both inputs from a generator process, as described in [Fixtures](#fixtures),
  so the check writes no 1 GB fixture and generator allocations don't count
  against the budget.
- Add a CI job that runs `npm run test:memory` on one runner, separate from
  the test matrix.

Done when: `npm run test:memory` fails if someone introduces buffering in
`SitemapStream` or `XMLToSitemapItemStream`. Verify twice: once by
temporarily collecting items into an array inside the stream, and once by
temporarily ignoring the destination's backpressure so output chunks pile up.

### Phase 4: Add before-and-after comparison

- Add `bench/compare.mjs`, exposed as
  `npm run bench:compare -- <base-ref>`, which builds both sides, interleaves
  their processes, and prints a Markdown table with medians, relative
  differences, and confidence intervals.
- Document the workflow in `README.md` or a contributing guide.

Done when: a contributor can paste the comparison table into a pull request
description, and the Performance note in `CLAUDE.md` points to
`npm run bench:compare` for before-and-after comparisons.

### Phase 5: Run benchmarks in CI

- Add a workflow that runs `npm run bench` nightly and on pull requests with a
  `performance` label, on a single fixed runner type and Node.js version.
- Upload the JSON results as workflow artifacts so maintainers can chart
  trends.
- Run the A/A calibration on that runner and record the noise floor in this
  document.

Done when: nightly results accumulate as artifacts, and the labeled pull
request job posts a comparison against `master`.

### Phase 6: Retire the old harness

Remove `tests/perf.mjs`, the `test:perf` script, the `stats-lite` dev
dependency, and any fixture files the new scenarios don't use. Keep
`memorystream`, which `tests/sitemap-utils.test.ts` also uses. Keep
`test:perf` as an alias for `npm run bench` for one release if anyone depends
on it.

Done when: one performance tool remains, this document no longer refers to
`tests/perf.mjs` except for history, and the Performance note in `CLAUDE.md`
points to `npm run bench` instead of `npm run test:perf`.

## Open questions

- Which Node.js version do the CI benchmarks pin? The newest LTS line matches
  what most users run, but the oldest supported line catches regressions in
  the floor.
- Should the bounded-memory test run on every platform in the CI matrix, or
  only on Linux? RSS accounting differs between operating systems, so a
  Linux-only test with a tighter budget may be more useful than a loose
  cross-platform one.
