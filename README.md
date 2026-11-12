# TrackMyMoney AI

TrackMyMoney AI is a personal-finance project for recording income and expenses, organizing them by account and category, and viewing totals over time. The repository is a pnpm monorepo containing a NestJS REST API and a React/Vite web app.

> **Current status:** The API supports authentication, account/category/transaction management, and dashboard summaries. The web app is currently a small API health-status page; the full finance interface and AI-powered parsing/assistant features are not implemented yet.

## What it does

- Registers users and creates a default **Main account** plus starter income and expense categories.
- Authenticates users with short-lived access tokens and rotating refresh tokens.
- Supports multiple accounts and currencies.
- Creates and manages income/expense categories and transactions.
- Provides dashboard summaries, category breakdowns, monthly totals, and account balances.
- Restricts finance data to its owning user.
- Exposes health checks at `GET /health` and `GET /health/db`.

Transaction amounts are represented as integer cents (for example, `1234` means €12.34 when the account currency is EUR). Transaction dates use calendar-day values (`YYYY-MM-DD`).

## Technology

- **Web:** React 19, TypeScript, Vite
- **API:** NestJS 12, TypeScript
- **Database:** PostgreSQL with Prisma 7
- **Package manager:** pnpm 12.15.0
- **Node.js:** 24.11.0 (see [`.node-version`](./.node-version))

## Prerequisites

- Node.js 24.11.0
- pnpm 12.15.0
- A PostgreSQL database

## Run locally

From the repository root:

1. Install dependencies:

   ```sh
   pnpm install
   ```

2. Create the API environment file by copying `apps/api/.env.exemple` to `apps/api/.env`. Set:

   - `DATABASE_URL` to the PostgreSQL connection string used by the running API.
   - `DIRECT_URL` to a PostgreSQL connection string used by Prisma CLI migrations. For a local database, these can usually be the same.
   - `JWT_ACCESS_SECRET` to a long, randomly generated secret.
   - `CORS_ORIGIN` to the web app origin; the default is `http://localhost:5173`.
   - `REFRESH_TOKEN_TTL_DAYS` is optional and defaults to `7`.

   Keep `.env` files private and do not commit secrets.

3. Generate the Prisma client and apply the checked-in migrations:

   ```sh
   pnpm --filter api exec prisma generate
   pnpm --filter api exec prisma migrate deploy
   ```

4. In one terminal, start the API:

   ```sh
   pnpm dev:api
   ```

   It listens on `http://localhost:3000` by default.

5. In another terminal, start the web app:

   ```sh
   pnpm dev:web
   ```

   The Vite app is available at `http://localhost:5173`. Its `VITE_API_URL` setting defaults to `http://localhost:3000`; if you override it, use a base URL without a trailing slash.

The web page reports whether it can reach the API health endpoint. The finance API can be used directly at `http://localhost:3000`; protected endpoints require a bearer access token obtained from registration or login.

## API overview

All routes except `GET /health` and the authentication endpoints marked public require an access token.

| Area | Routes |
| --- | --- |
| Health | `GET /health` (public), `GET /health/db` |
| Authentication | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` (public); `GET /auth/me`, `DELETE /auth/me` |
| Accounts | `GET/POST /accounts`, `PATCH /accounts/:id`, `POST /accounts/:id/default`, `DELETE /accounts/:id` |
| Categories | `GET/POST /categories`, `PATCH /categories/:id`, `POST /categories/:id/archive`, `POST /categories/:id/unarchive`, `DELETE /categories/:id` |
| Transactions | `GET/POST /transactions`, `GET /transactions/:id`, `PATCH /transactions/:id`, `DELETE /transactions/:id` |
| Dashboard | `GET /dashboard/summary`, `GET /dashboard/by-category`, `GET /dashboard/monthly` |

Request bodies and query parameters are validated by the API. See the DTOs in `apps/api/src` for field requirements and filters.

## Development commands

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm dev:api` | Start the API in watch mode |
| `pnpm dev:web` | Start the Vite development server |
| `pnpm --filter api test` | Run API unit and HTTP tests |
| `pnpm --filter api test:e2e` | Run API end-to-end tests |
| `pnpm --filter api build` | Build the API |
| `pnpm --filter api lint` | Lint the API |
| `pnpm --filter web build` | Type-check and build the web app |
| `pnpm --filter web lint` | Lint the web app |

## Important notes

- AI-related transaction-source and usage values exist in the database schema, but there are currently no AI parsing or assistant API routes.
- The default account and starter categories are created for each new user during registration.
- Prisma migration commands use `DIRECT_URL`; the running API connects using `DATABASE_URL`.
- API requests are rate-limited, and CORS is restricted to the configured `CORS_ORIGIN`.
