# Privacy and Data Handling

## PII Retention Policy

- We only store the minimum personal data needed to authenticate users and keep strategy history working.
- User accounts store email address, display name, and password hash.
- Session tokens are stored only to maintain login state and are removed when the session expires or logs out.
- Strategy records, simulation runs, and AI logs store portfolio data and monitoring metadata, not free-form personal notes.
- AI logs are retained to support auditability of model behavior, safety review, and cost monitoring.

## Retention Rules

- Password hashes are retained until the account is deleted.
- Session records expire automatically and should be deleted when no longer valid.
- Simulation history and AI logs are retained for product auditability and trend analysis.
- When deleting a strategy, related access should be removed from active views, but historical audit records may remain for operational integrity unless a separate deletion request applies.

## Data Handling Rules

- Do not place sensitive personal data in allocation names, notes, or strategy metadata.
- Do not store raw secrets, API keys, or session tokens outside the authenticated session flow.
- AI prompts should only include the data required to produce the analysis.
- Monitoring should use aggregated counts, latency, and estimated cost fields rather than user content.
- If exports or support tooling are added later, they should exclude passwords, session tokens, and raw prompt text by default.
