# Implementation milestones

## 1. Calendar prototype

- Extract actual brand tokens and reusable layout conventions.
- Build a compact week/month calendar and mobile agenda using synthetic data.
- Add task creation, editing, rescheduling and an unscheduled queue.
- Verify keyboard interaction, phone layouts and timezone display.

## 2. Private workspace

- Add authentication, workspace membership and PostgreSQL migrations.
- Persist tasks, owners, projects and activity events.
- Verify tenant isolation before using real customer data.

## 3. One human-agent handoff

- Implement API claims, lease heartbeats, idempotency and result submission.
- Add Needs review, reviewer decisions and Needs attention recovery.
- Prove concurrency and recovery with an offline fake runner.
- Connect one real runner with restricted credentials.

## 4. Recurrence and agent interoperability

- Add timezone-aware recurring plans and occurrence materialization.
- Add an MCP adapter with the same authorization rules.
- Integrate additional runners without duplicating lifecycle logic.

## 5. Portfolio release

- Publish an isolated demo with fictional customer content.
- Document architecture, actual validation and limitations.
- Add screenshots and a deployment walkthrough after the product works.
