import sax from 'sax';
import type { QualifiedAttribute, QualifiedTag, SAXStream } from 'sax';
import { Transform, type TransformCallback } from 'node:stream';
import {
  type Logger,
  type SaxParserStreamOptions,
  ErrorLevel,
} from './types.js';
import { isValidMaxEntries } from './validation.js';
import { LIMITS } from './constants.js';
import { createCharDataBuffer, resolveLogger } from './utils.js';

/**
 * What a parser subclass tells the shared SaxParserStream base. Declared here
 * rather than in types.ts so it stays out of the public API: this module is
 * not re-exported from index.ts.
 */
export interface SaxParserStreamConfig {
  /** Whether a tag belongs to the parsed format; others are reported */
  isKnownTag: (name: string) => boolean;
  /** Error text for the first entry past the entry cap */
  overflowMessage: (maxEntries: number) => string;
}

/**
 * Shared plumbing for the XML parser streams: sax setup, character-data
 * buffering, error collection, backpressure, and the entry cap. Subclasses
 * supply tag semantics through the `on*` hooks and hand each finished
 * entry to `emitEntry`.
 *
 * Emits `'maxEntriesExceeded'` (with the cap) once, when the first entry past
 * `maxEntries` is seen. If nothing listens for that event, the stream logs the
 * overflow through its logger instead.
 */
export abstract class SaxParserStream<T> extends Transform {
  level: ErrorLevel;
  logger: Logger;
  /**
   * Errors encountered during parsing, capped at LIMITS.MAX_PARSER_ERRORS entries
   * to prevent memory DoS from malformed XML (BB-03).
   * Use errorCount for the total number of errors regardless of the cap.
   */
  errors: Error[];
  /** Total number of errors seen, including those beyond the stored cap. */
  errorCount: number;
  /** Number of entries seen, including any past `maxEntries` */
  entryCount: number;
  saxStream: SAXStream;
  private maxEntries: number;
  private overflowMessage: (maxEntries: number) => string;

  constructor(opts: SaxParserStreamOptions, config: SaxParserStreamConfig) {
    super({ ...opts, objectMode: true });
    this.errors = [];
    this.errorCount = 0;
    this.entryCount = 0;
    this.overflowMessage = config.overflowMessage;
    this.maxEntries = opts.maxEntries ?? LIMITS.MAX_SITEMAP_ITEM_LIMIT;
    if (!isValidMaxEntries(this.maxEntries)) {
      throw new Error(
        `maxEntries must be a non-negative integer or Infinity, got ${this.maxEntries}`
      );
    }
    this.level = opts.level || ErrorLevel.WARN;
    this.logger = resolveLogger(this.level, opts.logger);
    this.saxStream = sax.createStream(true, {
      xmlns: true,
      // @ts-expect-error - SAX types don't include strictEntities option
      strictEntities: true,
      // No sax trim: it trims each text chunk separately, dropping whitespace
      // between text and CDATA. The char-data buffer trims the joined value.
      trim: false,
    });

    // Per ADR 0001, CDATA sections are ordinary character data: both SAX
    // events append to one buffer, which hands the joined value for an
    // element to onCharData.
    const charData = createCharDataBuffer({
      onText: (tag, text): void => this.onCharData(tag, text),
      onOverflow: (msg): void => {
        this.report('warn', msg);
      },
    });
    let currentTag = '';

    this.saxStream.on('opentagstart', (tag): void => {
      charData.openTag(tag.name);
      currentTag = tag.name;
    });

    this.saxStream.on('opentag', (tag): void => {
      if (!config.isKnownTag(tag.name)) {
        this.logger('warn', 'unhandled tag', tag.name);
        this.err(`unhandled tag: ${tag.name}`);
      }
      this.onOpenTag(tag as QualifiedTag);
    });
    this.saxStream.on('text', charData.append);
    this.saxStream.on('cdata', charData.append);
    this.saxStream.on('attribute', (attr): void => {
      this.onAttribute(currentTag, attr as QualifiedAttribute);
    });

    this.saxStream.on('closetag', (tag): void => {
      charData.closeTag();
      this.onCloseTag(tag);
    });
  }

  /** The first parse error, or null if there has been none */
  get error(): Error | null {
    return this.errors[0] ?? null;
  }

  /** Called for every opening tag, after unknown tags have been reported */
  protected onOpenTag(tag: QualifiedTag): void {}
  /** Called once per element with its joined, trimmed character data */
  protected abstract onCharData(tag: string, text: string): void;
  /** Called for each attribute of the tag currently being opened */
  protected abstract onAttribute(tag: string, attr: QualifiedAttribute): void;
  /** Called for every closing tag, after its character data is handled */
  protected abstract onCloseTag(tag: string): void;

  /**
   * Count a finished entry and push it, unless it is null or past the entry
   * cap. Pass null for an entry that should count but not be emitted.
   */
  protected emitEntry(item: T | null): void {
    this.entryCount++;
    if (this.entryCount > this.maxEntries) {
      // Report once rather than for every dropped entry
      if (this.entryCount === this.maxEntries + 1) {
        const msg = this.overflowMessage(this.maxEntries);
        this.err(msg);
        // A listener (such as parseSitemapIndex) handles the overflow
        // itself; only log when nobody is listening
        if (!this.emit('maxEntriesExceeded', this.maxEntries)) {
          this.logger('error', msg);
        }
      }
    } else if (item) {
      this.push(item);
    }
  }

  _transform(
    data: string,
    encoding: string,
    callback: TransformCallback
  ): void {
    try {
      const cb = () =>
        callback(this.level === ErrorLevel.THROW ? this.error : null);
      // correcting the type here can be done without making it a breaking change
      // TODO fix this
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (!this.saxStream.write(data, encoding)) {
        this.saxStream.once('drain', cb);
      } else {
        process.nextTick(cb);
      }
    } catch (error) {
      callback(error as Error);
    }
  }

  /** Log a message and record it as a parse error, with the same text */
  protected report(level: Parameters<Logger>[0], msg: string): void {
    this.logger(level, msg);
    this.err(msg);
  }

  /** Record a parse error, keeping at most LIMITS.MAX_PARSER_ERRORS */
  protected err(msg: string): void {
    this.errorCount++;
    if (this.errors.length < LIMITS.MAX_PARSER_ERRORS) {
      this.errors.push(new Error(msg));
    }
  }
}
