# Implementation roadmap

## Implemented: calendar prototype

- Week/month calendar and compact phone agenda.
- Task editing, rescheduling, unscheduled queue and local saving.
- Synthetic human/agent task review and undo.
- Four automated tests and desktop/phone screenshots.

## Next: employee time-tracking prototype

- Manual time entries with project, date, integer-minute duration and work summary.
- Start/stop timer, interruption recovery and explicit duration review.
- Weekly totals by day and project, separated from planned work.
- CSV export with spreadsheet-formula protection.
- Tests for totals, week boundaries, validation and persisted timer recovery.

## Shared workspace

- Authentication, membership, tenant isolation and durable storage.
- Employee/manager permissions and explicit review assignments.
- Draft, submitted, returned and approved timesheet versions.
- Server-enforced edit locks, review decisions and audit history.
- Tests for cross-tenant access, self-approval and concurrent edits.

## Agent integrations

- Separate execution records and runtime from employee labor.
- Scoped runner connections, atomic claims, leases and idempotency.
- Human review of results; no automatic employee time creation.
- Recurring plans and additional runner adapters after one flow is reliable.

## Open-source release quality

- Synthetic examples and clear current-feature documentation.
- Contributor guide, license selection and continuous integration.
- Accessibility checks and complete keyboard interaction verification.
- A separate, isolated demonstration; no customer records in Git history.
