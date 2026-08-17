/**
 * The API's released version, reported by `GET /health`.
 *
 * Kept as a constant rather than imported from `package.json`: `tsconfig.build.json`
 * sets `rootDir: "src"`, so a JSON import from outside `src/` would restructure
 * `dist/` and break the `main` entry point.
 *
 * Bump this together with `server/package.json`.
 */
export const APP_VERSION = '3.0.1';
