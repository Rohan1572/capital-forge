This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — production build
- `npm run typecheck` — run the TypeScript compiler
- `npm run test` — run unit and integration tests (Vitest)
- `npm run test:e2e` — run end-to-end tests (Playwright)
- `npm run lint` / `npm run format` — ESLint and Prettier
- `npm run prisma:generate` / `npm run prisma:migrate` — Prisma Client and migrations

Environment variables are documented in [`.env.example`](./.env.example); copy it to `.env` and fill in the values before running the app. Prisma Client is generated into `lib/generated/prisma` by the `postinstall` script.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Data Handling

- [Privacy and data handling policy](docs/privacy-and-data-handling.md)
- [Launch operations runbook](docs/launch-operations-runbook.md)

## Code Review Graph

Use these npm scripts to build, inspect, or serve the local code-review graph:

```bash
npm run graph:build
npm run graph:status
npm run graph:serve
```

The graph database lives in [`.code-review-graph/graph.db`](./.code-review-graph/graph.db) and is excluded from version control.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
