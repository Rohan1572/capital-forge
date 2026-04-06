# Launch Operations Runbook

This runbook covers the minimum production checks for backup safety, schema changes, and incident response.

It is intentionally aligned with [Privacy and Data Handling](privacy-and-data-handling.md), the monitoring route at `GET /api/monitoring`, and the operator summary at `GET /api/admin/monitoring`.

## Scope

- User-facing product data lives in `User`, `Session`, `Strategy`, `SimulationRun`, `AuditLog`, `AiResponseLog`, and `ShockEvent`.
- Monitoring data is aggregated only. It should not expose passwords, session tokens, raw prompts, or personal notes.
- The monitoring route is user-scoped and reports counts, latency, cost, token totals, threshold status, and alerts over a lookback window.
- The admin monitoring summary and cron check use the same alert thresholds across the whole product.

## Backup And Restore Validation

Run this before launch and any time the backup process changes.

1. Restore the latest production backup into a disposable Postgres database.
2. Point `RESTORED_DATABASE_URL` at that disposable database.
3. Run:

```bash
npm run ops:restore:check
```

This check verifies:

- Core tables exist.
- Prisma migration history is present.
- The current `SimulationRun` shape is readable.

If the check fails, do not promote the backup or reuse the database until the restore is corrected.

## Schema Migration Rehearsal

Run this before applying migrations in production.

1. Start from a clean checkout.
2. Confirm there is no schema drift:

```bash
npm run ops:schema:drift
```

3. Apply migrations in staging or a disposable copy of production:

```bash
npx prisma migrate deploy
```

4. Run the smoke path and a quick monitoring read after the deploy:

```bash
npm run test:e2e
```

If a migration fails, stop and repair migration history before retrying.

## Monitoring Check

Use the monitoring route to confirm the system is healthy without inspecting raw user data.

1. Sign in with an operator account.
2. Call:

```bash
curl -H "Cookie: <session-cookie>" "http://localhost:3000/api/monitoring?days=30"
```

3. Confirm:

- `simulationCount` is increasing as expected.
- `averageSimulationLatencyMs` stays within your service target.
- `totalAiEstimatedCostUsd` and `totalAiTokens` look reasonable.
- `aiResponseCountByKind` matches the current mix of strategy runs and reviews.
- `status` remains `healthy`, or at most `warning` for a known and explained regression.
- `alerts` is empty when the system is healthy.

Alert thresholds currently used by the app:

- `averageSimulationLatencyMs` warning at 1500ms and critical at 3000ms.
- `totalAiEstimatedCostUsd` warning at $1.00 and critical at $3.00 over the lookback window.

## Admin Monitoring Summary

Use the admin summary when you want the same report without relying on a browser session.

1. Call:

```bash
curl -H "x-admin-secret: <secret>" "http://localhost:3000/api/admin/monitoring?days=30"
```

2. Review the same fields as the user-scoped monitoring route.
3. Use this for operator dashboards, manual verification, or incident follow-up.

## Scheduled Monitoring

Use the cron route for a recurring health check.

1. Call:

```bash
curl -X POST -H "x-cron-secret: <secret>" "http://localhost:3000/api/cron/monitoring?days=30"
```

2. Treat any `critical` status as a paging-worthy regression.
3. Treat `warning` status as a triage item and review the alert messages before the next deploy.

## Incident Response

Use these steps when the app is degraded or data looks suspicious.

1. Freeze deploys.
2. Check `GET /api/monitoring?days=30` for a jump in latency, cost, or missing counts.
3. Review `alerts` and `status` in the monitoring response to identify the failing metric.
4. Review server logs for auth failures, Prisma errors, or AI route failures.
5. Verify database health with `npm run ops:restore:check` against the latest restored copy if one exists.
6. If a migration or restore is corrupted, roll back to the last known good backup and redeploy the last known good release.
7. After recovery, rerun:

```bash
npm run ops:schema:drift
npm run test:e2e
```

## Operator Notes

- Do not include passwords, session tokens, raw prompt text, or secrets in backups intended for support sharing.
- Keep incident notes limited to timestamps, affected routes, and aggregated metrics.
- If a support export is created later, redact PII by default.
