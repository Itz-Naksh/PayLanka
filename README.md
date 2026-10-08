# PayLanka — Smart Payroll Management for Sri Lankan Businesses

> 🚧 Work in progress. A full README (features, screenshots, payroll formulas,
> deployment) is written in Phase 6.

## Run locally

Requirements: Node.js 20.19+ (24 recommended).

```bash
npm install                                   # also generates the Prisma client
cp .env.example .env                          # then fill in the values (see below)

npx prisma dev --name paylanka --detach       # local Postgres; `npx prisma dev ls` shows its URLs
#   DATABASE_URL        = the TCP url it prints
#   SHADOW_DATABASE_URL = same url with the next port number (used by migrations)
npx auth secret                               # or put any random 32-byte base64 string in AUTH_SECRET

npm run db:migrate                            # create tables
npm run db:seed                               # first Admin + demo company, 15 employees, demo logins
npm run dev                                   # http://localhost:3000
```

Prefer Neon or Supabase? Put their connection string in `DATABASE_URL` and skip `prisma dev`.

> After changing `prisma/schema.prisma` (or pulling a change to it), run the
> migration and **restart `npm run dev`** — the running server keeps the old
> Prisma client in memory.

## Signing in

There is **no public sign-up**. Accounts are created in three ways:

1. **First Admin** — created by `npm run db:seed` from `SEED_ADMIN_EMAIL` and
   `SEED_ADMIN_PASSWORD` in `.env`. The seed refuses to run without them.
2. **Everyone else** — an Admin adds them in **Settings → Users** with a temporary
   password. On first sign-in they must choose their own password before they can
   do anything else.
3. **Demo visitors** — when `DEMO_MODE="true"`, the sign-in page shows one-click
   **Try as Admin / HR / Employee** buttons. Demo accounts can't change passwords or
   manage users, so the demo stays usable for the next visitor.

Passwords are stored only as bcrypt hashes and are never logged.

### Demo accounts (fictional data)

| Role            | Email                    | Password    |
| --------------- | ------------------------ | ----------- |
| Admin           | admin@paylanka.test      | Demo@1234   |
| HR / Accountant | hr@paylanka.test         | Demo@1234   |
| Employee        | employee@paylanka.test   | Demo@1234   |

Never set `DEMO_MODE="true"` for a real company — anyone could sign in as Admin.

## Useful scripts

| Script              | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Start the dev server                                 |
| `npm test`          | Run unit tests (Vitest)                              |
| `npm run typecheck` | TypeScript check                                     |
| `npm run lint`      | ESLint                                               |
| `npm run db:seed`   | **Wipe** the database and reload demo data           |
| `npm run db:studio` | Browse the database in Prisma Studio                 |

All data in this project is fictional. EPF/ETF rates are configurable and should be
verified against current Sri Lankan regulations before real use.
