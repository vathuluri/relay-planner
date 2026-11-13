# Relay Planner

An open-source, calendar-first time tracker for teams working with people and agents.

Employees plan work, record what they actually did, and submit weekly timesheets for review. Managers review project hours and outcomes. Agent execution is tracked separately from employee labor so automated work is never presented as hours a person worked.

## Current implementation

Interactive browser-local calendar prototype: week/month views, phone agenda, task editing and rescheduling, unscheduled queue, human/agent assignments, simulated task review, undo and local saving. All sample content is synthetic.

Time entry, timers, timesheet submission, manager approval, exports, authentication and shared persistence are **planned, not implemented**. The current review queue reviews task outcomes, not timesheets. Do not use this prototype for real employee records.

## Product workflow

1. Plan tasks in the calendar and assign a person or agent.
2. Record actual employee time with a timer or manual duration, project and work summary.
3. Review the weekly timesheet, resolve missing descriptions and submit.
4. A manager approves or returns it with feedback.
5. Export approved project hours and work summaries.

Planned schedules do not automatically become time entries. Agent runtime and employee time are separate measures. The product reports declared work; it does not monitor screens, keystrokes or employee activity.

## Development

Use Node.js 24 LTS.

```sh
npm ci
npm run dev   # http://localhost:3210
npm test
npm run build
```

The prototype uses HTML, CSS and browser modules. The planned shared application uses TypeScript, React/Next.js, PostgreSQL and an independent worker. Brand: Poppins, primary #2563eb, neutral surfaces and compact responsive layouts.

## Documentation

- [Product scope](docs/product.md)
- [Architecture](docs/architecture.md)
- [Roadmap](ROADMAP.md)
- [Desktop screenshot](docs/screenshots/desktop.jpg)
- [Phone screenshot](docs/screenshots/mobile.jpg)

Private hosted prototype: https://relay-planner-demo.beefymerit10.chatgpt.site

Four automated tests cover calendar dates, rescheduling and DOM interactions. Layout checked at 1440 × 1000 and 390 × 844. Drag gestures and native date controls still need manual verification. The screenshots show the calendar prototype before time tracking is added.

Keep customer records, employee timesheets, credentials and employer material out of this repository.
