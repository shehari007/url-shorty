import { createApp } from '../src/app.js';

/**
 * Vercel serverless entry point.
 *
 * An Express app is a `(req, res)` function, which is exactly the signature
 * `@vercel/node` expects. So the app is exported directly with no adapter.
 * The app is built once per lambda instance and reused across warm invocations.
 */
const app = createApp();

export default app;
