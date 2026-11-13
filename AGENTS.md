# Working on Relay Planner

- Read README.md, docs/product.md, docs/architecture.md and ROADMAP.md first.
- Build a generic product for multiple customers. Use fictional projects and synthetic data in demos, tests and screenshots.
- Keep private customer planning separate from the portfolio demo. Never commit real tasks, private artifacts, credentials, agent transcripts, resumes or employer data.
- The current repository is a foundation, not a running product. State implementation and validation status accurately.
- Use the existing brand after inspecting its real source tokens; do not invent a match or copy another product's branding.
- Keep the calendar compact and accessible on mobile. Provide keyboard actions for operations that support dragging.
- API, MCP and UI use the same authorization and task-state rules. Never bypass approval through an integration.
- Distinguish planned time from actual start, heartbeat and completion timestamps.
- Use atomic task claims, expiring leases and idempotent mutations before introducing agent dispatch.
- Respect workspace authorization on every read and write. An agent connection is scoped to one workspace and its allowed operations.
- Do not automatically retry external side effects after an interrupted execution. Require evidence reconciliation and an explicit recovery policy.
- Prefer a small tested vertical slice over broad unfinished integrations. No paid model calls in tests.
