# PayLanka — Smart Payroll Management for Sri Lankan Businesses

> 🚧 Work in progress. A full README (features, screenshots, payroll formulas,
> deployment) is written in Phase 6.

## Run locally

Requirements: Node.js 20.19+ (24 recommended).

```bash
npm install                                   # also generates the Prisma client
cp .env.example .env                          # then fill in the values (see below)

npx prisma dev --name paylanka --detach       # local Postgres; paste the printed URL into DATABASE_URL
npx auth secret                               # or put any random 32-byte base64 string in AUTH_SECRET

npm run db:migrate                            # create tables
npm run db:seed                               # demo company + 15 employees + 3 logins
npm run dev                                   # http://localhost:3000
```

Prefer Neon or Supabase? Put their connection string in `DATABASE_URL` and skip `prisma dev`.

## Demo logins (fake data)

| Role            | Email                    | Password    |
| --------------- | ------------------------ | ----------- |
| Admin           | admin@paylanka.test      | Demo@1234   |
| HR / Accountant | hr@paylanka.test         | Demo@1234   |
| Employee        | employee@paylanka.test   | Demo@1234   |

## Useful scripts

| Script              | What it does                                |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Start the dev server                        |
| `npm test`          | Run unit tests (Vitest)                     |
| `npm run typecheck` | TypeScript check                            |
| `npm run lint`      | ESLint                                      |
| `npm run db:seed`   | Reset the database to demo data             |
| `npm run db:studio` | Browse the database in Prisma Studio        |

All data in this project is fictional. EPF/ETF rates are configurable and should be
verified against current Sri Lankan regulations before real use.
