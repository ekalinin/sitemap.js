/**
 * The logger helpers every stream shares. Kept apart from utils.ts so
 * validation.ts can use them without importing utils.ts, which imports
 * validation.ts.
 */
import type { ErrorHandler, Logger } from './types.js';
import { ErrorLevel } from './types.js';

/**
 * The logger streams use when none is given: forwards to the console
 */
export const defaultLogger: Logger = (level, ...message) =>
  console[level](...message);

const noopLogger: Logger = () => undefined;

/**
 * An ErrorHandler for validateSMIOptions that throws at ErrorLevel.THROW and
 * sends warnings to the given logger at ErrorLevel.WARN
 */
export function loggingErrorHandler(logger: Logger): ErrorHandler {
  return (error, level) => {
    if (level === ErrorLevel.THROW) {
      throw error;
    } else if (level === ErrorLevel.WARN) {
      logger('warn', error.name, error.message);
    }
  };
}

/**
 * Pick the logger a stream should use: a no-op when the level is SILENT or the
 * caller passed `false`, otherwise the caller's logger or the console.
 */
export function resolveLogger(
  level: ErrorLevel,
  logger: Logger | false | undefined
): Logger {
  if (level === ErrorLevel.SILENT || logger === false) {
    return noopLogger;
  }
  return logger ?? defaultLogger;
}
