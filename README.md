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

Project foundation only: product scope, architecture, task contract, and implementation milestones. No application, authentication, scheduler, integrations, or deployment has been implemented yet.

## Design direction

Reuse the established portfolio brand's visual language after extracting its actual typography, colors, and component conventions. Use TryPost as inspiration for calendar density and queue interaction, with original product design and implementation. Do not copy its branding or assets.

## Documents

- [Product scope](docs/product.md)
- [Architecture and integration contract](docs/architecture.md)
- [Implementation milestones](ROADMAP.md)
- [Synthetic task example](examples/task.json)

## Development

Use Node.js 24 LTS for the application implementation. Planned stack: TypeScript, React/Next.js, PostgreSQL, and an independent worker. These are initial implementation choices, not installed dependencies or functioning services.

Keep development in this checkout. Do not commit credentials, customer tasks, private agent conversations, real resumes, employer material, or execution logs.
