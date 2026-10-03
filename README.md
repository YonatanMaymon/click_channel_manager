# click_channel_manager
a channel manager designed for zimmers in israel

- What we're building: [MVP Spec.md](MVP%20Spec.md)
- Technologies: [TECH_STACK.md](TECH_STACK.md)
- Build plan and progress: [PLAN.md](PLAN.md)

## Getting started

Needs Node.js 20.9+, pnpm 10 (`npm install -g pnpm@10`) and Docker Desktop.

```bash
pnpm install          # install packages
cp .env.example .env  # local settings (first time only)
pnpm db:start         # start Postgres (Docker Desktop must be running)
pnpm dev              # run the app at http://localhost:3000
```

`pnpm db:start` runs two local Postgres databases in Docker:

- `click_dev` on port 5432, for development. Data is kept between restarts.
- `click_test` on port 5433, for automated tests. It lives in memory and starts empty every time; tests find it through [.env.test](.env.test).

Both come back up on their own after a reboot once Docker Desktop is running.

## Useful commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run the app locally, reloading on every change |
| `pnpm build` | Build the production version (also catches errors) |
| `pnpm lint` | Check the code for common mistakes (ESLint) |
| `pnpm typecheck` | Check TypeScript types |
| `pnpm format` | Format all code (Prettier) |
| `pnpm format:check` | Check formatting without changing files |
| `pnpm db:start` | Start the local Postgres databases |
| `pnpm db:stop` | Stop them (development data is kept) |
| `pnpm db:reset` | **Delete all local development data** and start with empty databases |
