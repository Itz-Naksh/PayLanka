import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Read lazily (not via env()) so `prisma generate` still works on a fresh
    // clone or CI build before DATABASE_URL is set.
    url: process.env["DATABASE_URL"],
    // Scratch database used by `prisma migrate dev` to diff migrations. Only
    // needed for the local `prisma dev` server; hosted Postgres creates its own.
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});
