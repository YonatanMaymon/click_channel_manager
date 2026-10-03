# click_channel_manager
a channel manager designed for zimmers in israel

- What we're building: [MVP Spec.md](MVP%20Spec.md)
- Technologies: [TECH_STACK.md](TECH_STACK.md)
- Build plan and progress: [PLAN.md](PLAN.md)

## Getting started

Needs Node.js 22.12+, pnpm 10 (`npm install -g pnpm@10`) and Docker Desktop.

```bash
pnpm install          # install packages
pnpm exec playwright install chromium  # browser for end-to-end tests (first time only)
cp .env.example .env  # local settings (first time only)
pnpm db:start         # start Postgres (Docker Desktop must be running)
pnpm db:migrate       # create or update the database tables
pnpm dev              # run the app at http://localhost:3000
pnpm worker:dev       # run background jobs (in a second terminal)
```

`pnpm db:start` runs two local Postgres databases in Docker:

- `click_dev` on port 5432, for development. Data is kept between restarts.
- `click_test` on port 5433, for automated tests. It lives in memory and starts empty every time; tests find it through [.env.test](.env.test).

Both come back up on their own after a reboot once Docker Desktop is running.

The worker is a separate process from the web app. It runs background jobs (iCal sync, reminders, retries) with pg-boss, which keeps its queue in its own `pgboss` schema in the same database. For now it runs one job, a heartbeat that logs `[heartbeat] worker alive at <time>` every minute.

## Tests

Unit tests (Vitest) sit next to the code they test, named `*.test.ts`. End-to-end tests (Playwright) live in [e2e/](e2e) and open the app in Chromium at 375 px wide, the size of a small phone.

## Useful commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run the app locally, reloading on every change |
| `pnpm build` | Build the production version (also catches errors) |
| `pnpm worker:dev` | Run the background worker locally, restarting when the code changes (restart it by hand after editing `.env`) |
| `pnpm worker:start` | Run the background worker without restarting on changes (Railway will run this) |
| `pnpm lint` | Check the code for common mistakes (ESLint) |
| `pnpm typecheck` | Check TypeScript types |
| `pnpm test` | Run the unit tests (Vitest); in a terminal it keeps watching and re-runs on changes |
| `pnpm test:e2e` | Run the end-to-end tests (Playwright) in a 375 px wide phone browser; starts the app if it isn't running |
| `pnpm format` | Format all code (Prettier) |
| `pnpm format:check` | Check formatting without changing files |
| `pnpm db:start` | Start the local Postgres databases |
| `pnpm db:stop` | Stop them (development data is kept) |
| `pnpm db:reset` | **Delete all local development data** and start with empty databases |
| `pnpm db:generate` | Create a migration from changes in `src/db/schema` |
| `pnpm db:migrate` | Apply new migrations to the development database |
| `pnpm db:studio` | Browse and edit the development database in the browser |
