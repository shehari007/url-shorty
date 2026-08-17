import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    /**
     * `config/env.ts` validates at import and throws when anything required is
     * missing, so anything that transitively imports it needs these present
     * before the first module executes.
     *
     * SHORTURLDEF deliberately uses a real public TLD: `.test` and `.local` are
     * in RESERVED_TLDS, so a short base on one of those would make the module
     * under test treat its own origin as a private host.
     */
    env: {
      NODE_ENV: 'test',
      DBHOST: 'localhost',
      DBUSERNAME: 'shorty_test',
      DBNAME: 'shorty_test',
      SHORTURLDEF: 'https://short.example.com/',
      ADMIN_JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    },
  },
});
