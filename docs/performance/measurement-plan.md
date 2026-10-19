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

## Tools

The plan builds on two existing tools and keeps custom code to what they don't
cover.

- **[hyperfine](https://github.com/sharkdp/hyperfine)** runs each benchmark.
  It starts every run in a fresh process, supports warmup runs and parameter
  lists, and exports JSON with wall-clock time, user and system CPU time, and
  peak resident memory for every run. The plan requires hyperfine 2.0.0 or
  later, whose JSON schema (`schema_version` 2) the converter script reads.
- **[Bencher](https://bencher.dev)** stores results over time, detects
  regressions with statistical thresholds, charts history, and reports on pull
  requests as a GitHub check and comment.
- **Custom code** in `bench/`: one script per scenario, a fixture generator, a
  converter from hyperfine JSON to Bencher Metric Format (BMF), a local
  comparison script, and the bounded-memory check. Bencher's built-in
  `shell_hyperfine` adapter reads only wall-clock time, so the converter is
  what lets Bencher track memory and CPU time too.

hyperfine runs all runs of one command before starting the next, and it
doesn't measure inside a process or cap memory. The comparison script and the
bounded-memory check cover those gaps.

## Key metrics

The following table lists the metrics, in priority order. Metrics 1–3 are
required; 4–6 are diagnostic and help explain a change in the first three.

| # | Metric | Unit | Source | Why it matters |
|---|---|---|---|---|
| 1 | Throughput | items/s | hyperfine wall-clock time | What users experience when generating or parsing large sitemaps. |
| 2 | Memory growth with input size | MB of peak RSS per additional 100k items | hyperfine `memory_peak_resident` | Diagnostic: shows whether memory grows with input. Should be close to zero. The heap- and `Buffer`-capped check in [Bounded-memory check](#bounded-memory-check) is the pass/fail test. |
| 3 | Peak memory | MB of peak RSS above the startup baseline | hyperfine `memory_peak_resident` | Sizing for memory-constrained environments such as serverless functions. |
| 4 | CPU time per item | µs/item, user + system | hyperfine `time_user` + `time_system` | Less sensitive to scheduling noise than wall-clock time, so useful on shared CI runners. |
| 5 | Validation overhead | ratio of `WARN` to `SILENT` throughput | hyperfine parameter list | Shows the cost of [`lib/validation.ts`](../../lib/validation.ts), which the default error level runs. |
| 6 | Startup time | ms | hyperfine on the `startup` and `cli-startup` scenarios | Matters for short-lived processes and CLI users. |

### Metric definitions

Every scenario runs as a fresh process, so each measurement is a cold,
end-to-end run: Node.js startup, module loading, JIT warmup, and the library's
work. That matches how most people use the library, in one-off build scripts
and CLI calls. To keep startup a small share of the total, size each scenario
so that one run takes at least 1 second.

**Throughput.** The scenario's item count divided by
`median(scenario wall time) - median(startup wall time)`, where `startup` is a
scenario that imports the package and exits. Subtracting startup leaves the
library's own work.

**Memory growth with input size.** Run the scenario at 100,000 and 1,000,000
items and compute `(peakRss(1M) - peakRss(100k)) / 9`, using the median
`memory_peak_resident` at each size. A streaming pipeline should stay within a
few megabytes per 100k items.

**Peak memory.** The median `memory_peak_resident` of the scenario minus that
of the `startup` scenario. Because hyperfine reads peak memory from the
operating system when the process exits, anything the scenario process does
counts, including reading fixtures, so fixtures follow the rules in
[Fixtures](#fixtures). hyperfine doesn't report memory on Windows, so memory
metrics come from Linux and macOS only.

**CPU time per item.** The median of `time_user + time_system` per run, minus
the same for `startup`, divided by the item count.

**Validation overhead.** Run the generation scenarios with
`-L level silent,warn` and report the ratio of their throughputs. Use input
that passes validation so the measurement doesn't include logging.

**Startup time.** The median wall-clock time of the `startup` scenario, and of
`cli-startup`, which runs the CLI on a one-line input.

## Scenarios

Each scenario is a standalone script, `bench/scenarios/<name>.mjs`, that
exercises one public entry point. It takes `--size` and `--level` arguments,
runs the pipeline once, checks its own output, and exits. Scenario names are
stable identifiers; Bencher keys results by them.

| Scenario | Entry point | Input | Output |
|---|---|---|---|
| `startup` | `import('sitemap')` only | None | None |
| `cli-startup` | `sitemap` binary | One URL on stdin | `/dev/null` |
| `generate-urls` | `SitemapStream` | 1M generated URLs | `/dev/null` |
| `generate-rich` | `SitemapStream` | 100k items with video, image, news, and `hreflang` links | `/dev/null` |
| `generate-from-lines` | `lineSeparatedURLsToSitemapOptions` → `SitemapStream` | `perf-data.json.txt` (21,753 JSON lines) | `/dev/null` |
| `split-and-index` | `SitemapAndIndexStream` | 1M generated URLs, default 50,000 limit | Files in a temp directory |
| `simple-gzip` | `simpleSitemapAndIndex` | 1M generated URLs, gzip on | Files in a temp directory |
| `parse-xml` | `XMLToSitemapItemStream` | `perf-data.xml` (21,753 `<url>` entries) | Object sink that counts items |
| `parse-index` | `XMLToSitemapIndexStream` | Generated index with 50,000 entries (the protocol maximum) | Object sink that counts items |
| `round-trip` | `XMLToSitemapItemStream` → `SitemapStream` | `perf-data.xml` | `/dev/null` |
| `cli` | `sitemap` binary | 1M generated URLs on stdin | `/dev/null` |

Run each generation scenario except `cli`, which has no option to set the
error level, at both error levels to produce metric 5. Run `generate-urls`,
`split-and-index`, and `parse-xml` at 100k and 1M items to produce metric 2.
For `parse-xml` at 1M items, repeat the corpus with unique URLs.

Some scenarios run well under 1 second at the listed sizes, such as
`parse-xml`, `round-trip`, and `generate-from-lines` at 21,753 entries. Run
the pipeline several times inside one process for those, and divide by the
total item count, so that startup doesn't dominate.

### Fixtures

Generate synthetic inputs from a seeded pseudorandom generator instead of
committing large files. A seeded generator produces identical input on every
run, keeps the repository small, and makes it trivial to vary the item count.
Keep `perf-data.xml` and `perf-data.json.txt` as the realistic corpus,
because real-world text (long descriptions, entities, CDATA) exercises code
paths synthetic data misses.

Because peak memory covers the whole scenario process, keep fixture work out
of it:

- **Generated URLs:** generate them inside the scenario process from the
  seeded generator, one at a time through a `Readable`. Vary path depth and
  length, and include query strings with `&` and non-ASCII path segments, so
  the scenarios exercise XML escaping. Streaming generation holds one URL at a
  time, so it adds almost nothing to memory, and it keeps line parsing out of
  scenarios whose entry point isn't `lineSeparatedURLsToSitemapOptions`.
- **Other inputs under about 100 MB:** write them to a cache directory with
  hyperfine's `--setup` command, which runs once before each scenario's runs
  and isn't measured.
- **Larger inputs,** such as `parse-xml` at 1M items (about 1 GB): have the
  scenario spawn the generator as a child process and read its stdout, so the
  input never touches disk. Peak memory then covers the larger of the two
  processes, and the streaming generator stays well below the parser.

### Correctness guard

Every scenario checks its own output before exiting. It counts the items and
output bytes it produced, compares them with the expected values for its size,
and exits with a non-zero code on a mismatch or an error. hyperfine stops and
reports a failure when a command exits non-zero, so a broken pipeline can't
report as a speedup.

## Measurement method

### Running a scenario

`npm run bench` builds the package, then runs hyperfine once per scenario. For
example:

```bash
hyperfine --warmup 2 --runs 20 \
  --setup 'node bench/fixtures.mjs generate-urls' \
  -L size 100000,1000000 -L level silent,warn \
  --export-json results/generate-urls.json \
  'node bench/scenarios/generate-urls.mjs --size {size} --level {level}'
```

- **Warmup runs** fill the operating system's file cache. They don't warm the
  JIT, because every run is a new process.
- **20 runs** per parameter combination give 20 independent samples, because
  each sample is its own process.
- **The `startup` scenario** runs in the same `npm run bench` invocation, so
  every result file has a baseline from the same session.

After hyperfine finishes, `bench/to-bmf.mjs` converts the result files into
one BMF file with these measures per benchmark: `latency` (wall-clock),
`cpu-time`, `peak-rss`, and `throughput`. Each benchmark name combines the
scenario and its parameters, such as `generate-urls/size=1000000/level=warn`.
The converter rejects files whose `schema_version` isn't 2.

### Bounded-memory check

RSS growth (metric 2) also moves with lazy V8 heap growth and allocator
behavior, so it's a diagnostic, not a pass/fail check. To test bounded memory
directly, `npm run test:memory` runs `generate-urls`, `split-and-index`, and
`parse-xml` at 1M items, each under `node --max-old-space-size=64`, and
asserts that each completes. A pipeline that buffers JavaScript objects runs
out of heap; one that streams doesn't, on any platform.

The heap cap doesn't cover `Buffer` memory, which lives outside the V8 heap.
The scenario also samples `process.memoryUsage().external` plus
`arrayBuffers` during the run and exits non-zero if the peak exceeds a fixed
budget. That catches broken backpressure, where serialized output piles up in
a stream's internal buffer.

This check is a plain Node.js script, not a hyperfine run, because it asserts
rather than measures. At 1M items it's too slow for `npm test`, which the
pre-commit hook and every CI matrix leg run, because `parse-xml` parses about
1 GB of XML. It runs as its own CI job.

### Statistics and reporting

For every metric, report the median, the interquartile range (IQR), the
minimum, and the sample count. hyperfine's own summary has the median but not
the IQR; compute the IQR from the per-run measurements. Don't report p99;
with 20 samples it's the maximum.

Because every sample is a separate process, samples are independent, and
ordinary statistics apply. To compare two builds locally, report the relative
difference in medians and a 95% bootstrap confidence interval for that
difference. Call a result a regression only when the whole interval sits
above the noise threshold.

In CI, Bencher decides. It compares each new result with the stored history
for the same benchmark, measure, and testbed, using a t-test threshold with an
upper boundary of 0.99, and raises an alert when a result falls outside it.

### Noise threshold

Before trusting any comparison, measure the noise floor with an A/A run:
compare a build against itself. The widest confidence interval across
scenarios is the noise floor for that machine. Set the local regression
threshold above it, starting at 5%. Repeat the A/A run whenever the scenarios
or the machine change. In CI, Bencher's t-test thresholds adapt to the
measured variance, so they need no fixed percentage; review the first alerts
after setup and adjust the boundary if they're mostly noise.

### Comparing two builds locally

`npm run bench:compare -- <base-ref>` builds the base ref in a temporary
`git worktree` and the working tree in place, then passes both to hyperfine
as two commands per scenario.

hyperfine runs every run of the first command before the second, so thermal
throttling or background load during one block affects only that side. To
offset that, the script runs hyperfine 4 times with 5 runs per command,
swapping which build goes first each time, and merges the measurements. It
then prints a Markdown table with medians, relative differences, and
confidence intervals for each scenario and measure.

## Continuous benchmarking with Bencher

### Setup

- Create a Bencher project, and store its API key as the `BENCHER_API_KEY`
  repository secret.
- Use one testbed name per runner type, such as `ubuntu-latest`, matching the
  workflow's `runs-on`.
- Install a pinned hyperfine 2.x release binary in the workflow. Distribution
  packages may still ship hyperfine 1.x, whose JSON schema the converter
  doesn't read.

### Workflows

Bencher's GitHub Actions guide describes three workflows, which this plan
adopts.

1. **Base branch.** On every push to `master`, run `npm run bench`, convert to
   BMF, and record the results with
   `bencher run --branch master --testbed ubuntu-latest --adapter json`,
   `--threshold-test t_test`, `--threshold-upper-boundary 0.99`,
   `--thresholds-reset`, and `--error-on-alert`, with one threshold per
   measure. This builds the history every comparison uses. Needs
   `checks: write`.
2. **Pull requests from this repository.** On `pull_request`, run the same
   benchmarks and record them on the PR's branch with
   `--start-point master`, `--start-point-hash` set to the base commit,
   `--start-point-clone-thresholds`, `--start-point-reset`, and `--hash` set
   to the PR's head commit. Bencher compares against stored `master` history,
   so the job never builds `master` itself. `--github-actions` posts the
   result as a check and a PR comment. Needs `checks: write` and
   `pull-requests: write`.
3. **Pull requests from forks.** Fork PRs get no secrets and a read-only
   token, so split the work. A `pull_request` workflow runs the benchmarks
   with no secrets and uploads the BMF file and the event payload as
   artifacts. A second workflow, triggered by `workflow_run` when the first
   succeeds, downloads them and runs `bencher run` with the secret and
   `--ci-number` set to the PR number. Only the second workflow gets
   `checks: write` and `pull-requests: write`, and it never runs the PR's
   code.

To keep runner time down, workflows 2 and 3 run only on pull requests with a
`performance` label.

Workflows 1 and 2 run the same benchmarks on the same runner type, so Bencher
compares like with like. GitHub-hosted runners are shared virtual machines,
so expect more spread than on a local machine; CPU time varies less than
wall-clock time. If thresholds on those runners stay too noisy, run the
benchmarks on a dedicated self-hosted runner, or record hardware instruction
counts with hyperfine's `--metrics` option where the runner exposes them.

## Environment

For local comparisons:

- Install hyperfine 2.x, for example with `brew install hyperfine` or a
  release binary. `npm run bench` checks the version and stops with
  instructions if it's older.
- Plug a laptop into power and close other heavy applications.
- Use the same Node.js version for both sides; the comparison script checks
  this.
- Don't compare results from different machines.

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

### Phase 2: Add scenarios and the hyperfine runner

- Add `bench/scenarios/*.mjs`, one script per scenario, each with
  `--size` and `--level` arguments and the correctness guard.
- Add `bench/fixtures.mjs`, the seeded generator, with a streaming mode for
  in-process URLs and child-process input, and a cache mode for `--setup`.
- Add `bench/run.mjs`, which checks the hyperfine version, builds the
  hyperfine command for each scenario, and writes the JSON files to
  `bench/results/` (ignored by git).
- Add `bench/to-bmf.mjs`, which converts the JSON files into one BMF file and
  prints a summary table with median, IQR, and minimum per measure.
- Add an `npm run bench` script that builds first, then runs `bench/run.mjs`
  and the converter.

Done when: `npm run bench` produces hyperfine JSON for every scenario and one
BMF file that `bencher run --adapter json` accepts in a trial run against a
scratch Bencher project.

### Phase 3: Add the bounded-memory check

- Add `bench/memory-bound.mjs`, exposed as `npm run test:memory`, which runs
  `generate-urls`, `split-and-index`, and `parse-xml` at 1M items under a
  capped heap and asserts that each completes and that peak `Buffer` memory
  stays under budget.
- Add a CI job that runs `npm run test:memory` on one Linux runner, separate
  from the test matrix.

Done when: `npm run test:memory` fails if someone introduces buffering in
`SitemapStream`, `SitemapAndIndexStream`, or `XMLToSitemapItemStream`. Verify
twice: once by temporarily collecting items into an array inside the stream,
and once by temporarily ignoring the destination's backpressure so output
chunks pile up.

### Phase 4: Add local before-and-after comparison

- Add `bench/compare.mjs`, exposed as
  `npm run bench:compare -- <base-ref>`, which builds both sides, runs the
  alternating hyperfine rounds, and prints the comparison table.
- Document the workflow in `README.md` or a contributing guide.

Done when: a contributor can paste the comparison table into a pull request
description, an A/A run on a maintainer's machine shows a noise floor under
5%, and the Performance note in `CLAUDE.md` points to
`npm run bench:compare` for before-and-after comparisons.

### Phase 5: Track results with Bencher

- Create the Bencher project, the `BENCHER_API_KEY` secret, and the testbed.
- Add the base branch workflow, and let it record results from at least 10
  pushes to `master` before relying on its thresholds. To seed history
  sooner, run the workflow manually several times on the same commit.
- Add the pull request workflows for this repository and for forks, gated on
  the `performance` label.

Done when: Bencher shows `master` history for every benchmark and measure, a
labeled pull request gets a Bencher check and comment, and a pull request
from a fork gets the same through the `workflow_run` workflow.

### Phase 6: Retire the old harness

Remove `tests/perf.mjs`, the `test:perf` script, the `stats-lite` dev
dependency, and any fixture files the new scenarios don't use. Keep
`memorystream`, which `tests/sitemap-utils.test.ts` also uses. Keep
`test:perf` as an alias for `npm run bench` for one release if anyone depends
on it.

Done when: one performance tool remains, this document no longer refers to
`tests/perf.mjs` except for history, and the Performance note in `CLAUDE.md`
no longer mentions `npm run test:perf` and still points to
`npm run bench:compare` for before-and-after comparisons.

## Open questions

- **Hosted or self-hosted Bencher?** Bencher Cloud needs no maintenance but
  stores the results with an outside service. The results are benchmark
  numbers from a public repository, so the main trade-off is maintenance
  versus control.
- **Which Node.js version do the CI benchmarks pin?** The newest LTS line
  matches what most users run, but the oldest supported line catches
  regressions in the floor.
- **Which runner OS does the bounded-memory job use?** The heap cap and
  `Buffer` accounting behave the same on every platform, so Linux is the
  default for cost; the question is whether a second OS is worth the runner
  time.
