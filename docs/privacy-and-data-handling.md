# Privacy and Data Handling

## PII Retention Policy

- We only store the minimum personal data needed to authenticate users and keep strategy history working.
- User accounts store email address, display name, and password hash.
- Session tokens are stored only to maintain login state and are removed when the session expires or logs out.
- Strategy records, simulation runs, and AI logs store portfolio data and monitoring metadata, not free-form personal notes.
- AI logs are retained to support auditability of model behavior, safety review, and cost monitoring.

## Retention Rules

- Password hashes are retained until the account is deleted.
- Session records expire automatically and are purged within 24 hours of expiry.
- AI response logs are retained for 90 days for auditability, safety review, and cost monitoring.
- Simulation history is retained for 180 days for product auditability and trend analysis.
- Operational audit logs are retained for 365 days and only store the minimum metadata needed to explain the action that occurred.
- When deleting a strategy, related access should be removed from active views, but historical audit records may remain for operational integrity unless a separate deletion request applies.

## Retention and Support Deletion

- Automated retention runs should delete expired sessions, stale AI response logs, stale simulation records, and audit logs that have passed the operational retention window.
- Support or admin deletions should use the explicit retention endpoint and should remove user- or strategy-linked sessions, simulation records, and AI logs while preserving a minimal audit entry for the deletion request.
- Support tooling should never export passwords, session tokens, or raw prompt text by default.

## Data Handling Rules

- Do not place sensitive personal data in allocation names, notes, or strategy metadata.
- Do not store raw secrets, API keys, or session tokens outside the authenticated session flow.
- AI prompts should only include the data required to produce the analysis.
- Monitoring should use aggregated counts, latency, and estimated cost fields rather than user content.
- If exports or support tooling are added later, they should exclude passwords, session tokens, and raw prompt text by default.
- Operational checks and incident response should rely on the monitoring summary route and restored-database validation, not direct inspection of raw personal data.
