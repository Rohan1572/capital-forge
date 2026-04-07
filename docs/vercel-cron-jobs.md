# Vercel Cron Jobs

The production scheduler is defined in `vercel.json` and calls the cron routes directly.

## Required Secrets

- `CRON_SECRET` secures the scheduled cron routes.
- `ADMIN_TRIGGER_SECRET` secures the manual admin routes.

## Run Cadence

- `/api/cron/shocks/weekly` runs every Monday at `05:00 UTC`.
- `/api/cron/leaderboard/monthly` runs on the first day of the month at `05:10 UTC`.
- `/api/cron/monitoring` runs daily at `05:20 UTC`.
- `/api/cron/retention` runs daily at `05:30 UTC`.

## Notes

- Vercel sends `CRON_SECRET` as `Authorization: Bearer <secret>`.
- The cron routes still accept `x-cron-secret` for manual testing.
- The manual admin routes remain usable at `/api/admin/shocks/trigger`, `/api/admin/leaderboard/rollover`, `/api/admin/monitoring`, and `/api/admin/retention`.
