# Relay Planner

Working title for a shared planning calendar for people and agents.

Plan work, assign a human or agent owner, follow execution, and review the result in one workspace. This is a standalone product; the public demo will use fictional projects and synthetic tasks. Real customer planning stays private.

## First release

- Week and month calendar, with a compact day agenda on phones.
- Unscheduled task queue and drag-to-reschedule.
- Human and agent assignments, recurring tasks, and workspace timezones.
- Review queue, attached results, and an activity history.
- API for external agents, followed by an MCP adapter using the same operations.

The calendar is the planning surface. Existing agent runners continue executing tasks; the first integration reports work into Relay before dispatch is added.

## Repository status

The first interactive calendar prototype is implemented: week/month views, a phone agenda, an unscheduled queue, task editing and rescheduling, human/agent assignments, a simulated review queue, undo, and browser-local saving. All sample content is synthetic.

This is a frontend demo, not an agent runner. No authentication, shared database, recurring scheduler, external agent connection or real approval enforcement is implemented. Changes stay in the current browser. A private hosted preview does not turn local storage into a private multi-user workspace.

## Design direction

Reuse the established portfolio brand's visual language after extracting its actual typography, colors, and component conventions. Use TryPost as inspiration for calendar density and queue interaction, with original product design and implementation. Do not copy its branding or assets.

## Documents

- [Product scope](docs/product.md)
- [Architecture and integration contract](docs/architecture.md)
- [Implementation milestones](ROADMAP.md)
- [Synthetic task example](examples/task.json)

## Development

Use Node.js 24 LTS. This first visual/interaction prototype uses dependency-free HTML, CSS and browser modules. The later application architecture remains TypeScript, React/Next.js, PostgreSQL and an independent worker.

```sh
npm run dev   # http://localhost:3210
npm test      # date and rescheduling tests
npm run build # static output in dist/
```

Brand tokens reference the existing portfolio: Poppins, primary #2563eb, secondary #1e40af, text #1f2937, muted #6b7280, surfaces #ffffff / #f9fafb and borders #e5e7eb.

Keep development in this checkout. Do not commit credentials, customer tasks, private agent conversations, real resumes, employer material, or execution logs.
