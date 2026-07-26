import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'mysql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    host: process.env.DBHOST ?? 'localhost',
    port: Number(process.env.DBPORT ?? 3306),
    user: process.env.DBUSERNAME ?? 'root',
    password: process.env.DBPASS ?? '',
    database: process.env.DBNAME ?? 'shorty_db',
    ssl: process.env.DB_SSL === 'false' ? undefined : { rejectUnauthorized: true },
  },
  verbose: true,
  strict: true,
});
