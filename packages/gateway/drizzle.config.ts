import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.MIDNITE_DB_PATH ?? './.midnite/midnite.db',
  },
} satisfies Config;
