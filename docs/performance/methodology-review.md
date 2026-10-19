# Review of the performance measurement methodology

Reviewed: 2026-10-19, against release 10.0.0.

This document reviews how the project measures performance with
[`tests/perf.mjs`](../../tests/perf.mjs), the only performance harness in the
repository. For the metrics and harness that replace it, see
[Performance measurement plan](measurement-plan.md).

## Summary

The harness produces numbers that aren't reliable enough to compare two
versions of the library. Memory mode reports a lifetime high-water mark instead
of a per-run value, the CPU metric omits system time and wall-clock time, and
several argument and error paths fail without a warning. Nothing runs the
harness in CI, stores its results, or compares them against a baseline.

## How the harness works

You run the harness with the following command:

```bash
npm run test:perf -- [runs] [batchSize] [testName] [measureMemory]
```

The harness runs one scenario `runs × batchSize` times in a single Node.js
process (100 iterations by default). Each iteration builds a stream pipeline
from a fixture file in `tests/mocks/` and records one of two values:

- The user-mode CPU time the iteration consumed, from
  `process.resourceUsage().userCPUTime`.
- The process's `maxRSS`, when the fourth argument is set.

The harness sleeps for 2 seconds after each batch. At the end, it prints the
median, the standard deviation, and the 99th percentile of all samples.

The scenarios are `stream` (default), `promise`, `stream-2`, `xmlstream`,
`parseSitemap`, `parseSitemapStreamWrite`, `parseSitemapLoopWrite`, and
`parseSitemapWithMerge`. Every scenario sets `ErrorLevel.SILENT`.

## Issues

The issues are grouped by impact. Issues 1–4 produce wrong numbers and are the
most urgent. The two argument-parsing bugs (issues 1 and 2) and the monotonic
memory readings (issue 3) were confirmed by running the harness; the rest come
from reading the code.

### Bugs that produce wrong results

1. **Passing `false` enables memory mode.** Arguments arrive as strings, and
   the string `"false"` is truthy, so `measureMemory` is on
   ([`perf.mjs:38-40`](../../tests/perf.mjs)). Running
   `node tests/perf.mjs 1 3 stream false` reports results in `mb`.
2. **An unknown test name runs the `stream` scenario without a warning.** The
   `default:` branch catches every unrecognized name
   ([`perf.mjs:289-290`](../../tests/perf.mjs)). The usage text also lists a
   `combined` scenario that doesn't exist.
3. **Memory mode reports a lifetime peak, not per-run usage.** `maxRSS` is the
   process's high-water mark and never decreases
   ([`perf.mjs:95`](../../tests/perf.mjs)). A three-iteration run produced
   87, 104, and 107 MB. After the first few iterations, every sample repeats
   the same peak, so the median and standard deviation carry no information.
   The value also includes the Node.js baseline, the harness, and, in the
   `parseSitemap*` scenarios, the fully materialized item array. Those reflect
   how the scenario is written, not how the library behaves.
4. **Failed iterations still count as samples.** Each iteration catches and
   logs errors, then records a duration anyway
   ([`perf.mjs:88-92`](../../tests/perf.mjs)). An iteration that throws early
   looks fast and pulls the median down. Output goes to `/dev/null` with no
   item or byte count, so a pipeline that emits nothing also passes.

### What gets measured

5. **The metric is user-mode CPU time only.** It ignores `systemCPUTime` and
   wall-clock time ([`perf.mjs:87,97`](../../tests/perf.mjs)). File reads,
   decompression, and writes are largely system time, and time spent waiting
   on backpressure isn't CPU time at all. A change that adds stream stalls or
   extra event-loop turns can look neutral or faster.
6. **CPU time covers the whole process, including other threads.** That
   includes garbage collector threads and the libuv thread pool, so collector
   work left over from one iteration lands in the next.
7. **Samples are truncated to whole units.** The `| 0` drops the fractional
   part ([`perf.mjs:95,97`](../../tests/perf.mjs)). That's coarse for
   iterations of about 100 ms and biases every sample downward.
8. **Validation is never measured.** Every scenario sets
   `ErrorLevel.SILENT`, but the default is `ErrorLevel.WARN`. The harness
   can't detect a slowdown in [`lib/validation.ts`](../../lib/validation.ts),
   the path most users run.
9. **The `promise` scenario also measures buffering.** `streamToPromise`
   collects the whole output in memory, while the other scenarios write to
   `/dev/null`, so its numbers aren't comparable with the others.

### Statistics

10. **The harness pairs the median with the standard deviation.** "median ±
    stdev" combines a robust measure of the center with a spread measure that
    outliers inflate. Use median with the interquartile range (IQR) or median
    absolute deviation (MAD), or mean with standard deviation. The harness
    reports no confidence interval.
11. **The 99th percentile is effectively the maximum.** With 100 samples, p99
    is the worst or second-worst sample, which mostly measures noise.
12. **Warmup iterations count as samples.** The first iterations run before
    the JIT compiler optimizes the code, and the harness keeps them. The
    2-second sleep between batches lets the CPU change frequency and caches
    go cold, which adds variance between batches. Nothing triggers garbage
    collection between iterations.
13. **All iterations share one process.** JIT state, heap size, and the file
    system cache carry over between iterations, so samples aren't independent
    and the reported spread understates real variance.

### Reproducibility and process

14. **No baseline, regression check, or history.** CI doesn't run the
    harness, it saves no results, and it can't compare two commits. Output is
    console text mixed with spinner frames.
15. **The harness measures whatever is in `dist/`.** It doesn't build first
    ([`perf.mjs:26`](../../tests/perf.mjs)), so a stale build gives stale
    numbers.
16. **No environment metadata.** The output omits the Node.js version, CPU
    model, operating system, commit, and fixture, so results from different
    machines or dates can't be compared.
17. **The fixtures cover a narrow slice of usage.** The realistic corpus is
    one site's video sitemap with 21,753 URLs. `long-list.txt.gz` adds a
    million bare URLs, but nothing covers images, news, `hreflang` links,
    sitemap indexes, splitting at the 50,000-URL limit, gzip output, or the
    CLI.

## Recommendation

Fix issues 1–4 first. They're small changes, and they stop the harness from
producing wrong numbers. Then replace the harness as described in
[Performance measurement plan](measurement-plan.md), which addresses the
remaining issues.
