# CapitalForge

AI-powered strategic decision simulation platform. Users allocate capital across
assets, run Monte Carlo risk simulations, receive AI critique, and compete on a
seasonal leaderboard.

Built with Next.js (App Router), React 19, TypeScript, Prisma 7, Tailwind CSS 4,
Vitest, and Playwright.

## Requirements

- Node.js >= 20.9
- A PostgreSQL database
- An OpenAI API key (for the AI critique, debate, and risk routes)

## Getting Started

```bash
npm install          # also runs `prisma generate` via postinstall
cp .env.example .env # then fill in DATABASE_URL and OPENAI_API_KEY
npm run prisma:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Prisma Client is generated into `lib/generated/prisma` (git-ignored) and must be
regenerated after any `prisma/schema.prisma` change.

## Scripts

### Develop

| Script          | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Start the development server |
| `npm run build` | Production build             |
| `npm start`     | Serve the production build   |

### Quality

| Script                            | Description                                    |
| --------------------------------- | ---------------------------------------------- |
| `npm run verify`                  | `format:check` + `lint` + `typecheck` + `test` |
| `npm run typecheck`               | `tsc --noEmit`                                 |
| `npm run lint` / `lint:fix`       | ESLint (flat config)                           |
| `npm run format` / `format:check` | Prettier                                       |
| `npm run fix`                     | Format, lint-fix, build, typecheck, test       |

### Testing

| Script               | Description                              |
| -------------------- | ---------------------------------------- |
| `npm test`           | Unit and route tests (Vitest)            |
| `npm run test:watch` | Vitest in watch mode                     |
| `npm run test:smoke` | Operational maintenance route smoke test |
| `npm run test:e2e`   | End-to-end tests (Playwright)            |

E2E specs live in `tests/e2e` and are excluded from Vitest. Set
`PLAYWRIGHT_BASE_URL` to point at a non-local deployment.

### Database

| Script                    | Description                      |
| ------------------------- | -------------------------------- |
| `npm run prisma:generate` | Regenerate Prisma Client         |
| `npm run prisma:migrate`  | Create and apply a dev migration |
| `npm run prisma:studio`   | Open Prisma Studio               |

### Operations

These back the launch gates described in
[the launch operations runbook](docs/launch-operations-runbook.md).

| Script                         | Description                                         |
| ------------------------------ | --------------------------------------------------- |
| `npm run ops:preflight`        | Verify required operator secrets are set            |
| `npm run ops:preflight:strict` | Same, plus all optional variables                   |
| `npm run ops:schema:drift`     | Fail if migrations and the schema have drifted      |
| `npm run ops:restore:check`    | Validate a restored production backup               |
| `npm run ops:monitoring:check` | Smoke-test the monitoring route for critical alerts |

## Environment

All variables are documented in [`.env.example`](./.env.example). Required in
production: `DATABASE_URL`, `OPENAI_API_KEY`, `CRON_SECRET`,
`ADMIN_TRIGGER_SECRET`, and `RESET_TOKEN_SECRET`.

`RESET_TOKEN_SECRET` signs password-reset tokens. The app refuses to start
without it when `NODE_ENV=production`.

## Deployment

Deploy to Vercel. Scheduled jobs are defined in `vercel.json` and documented in
[the cron runbook](docs/vercel-cron-jobs.md).

Before promoting a release, run the launch gates: `ops:preflight`,
`ops:schema:drift`, `ops:restore:check`, and `ops:monitoring:check`.

## Further Reading

- [Next.js documentation](https://nextjs.org/docs)
- [Data handling and privacy](docs/privacy-and-data-handling.md)
