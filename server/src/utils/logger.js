// Simple serverless-friendly logger - no dependencies, no file writes
// Uses console.log directly to avoid any issues with winston in serverless

const ENABLE_LOGGING = process.env.ENABLE_LOGGING === 'true';

const noop = () => {};

const logger = ENABLE_LOGGING ? {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  debug: (...args) => console.log('[DEBUG]', ...args),
  verbose: (...args) => console.log('[VERBOSE]', ...args),
  silly: (...args) => console.log('[SILLY]', ...args),
  log: (...args) => console.log(...args),
} : {
  info: noop,
  error: noop,
  warn: noop,
  debug: noop,
  verbose: noop,
  silly: noop,
  log: noop,
};

module.exports = logger;
