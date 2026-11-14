# Relay Planner

An open-source, calendar-first time tracker for teams working with people and agents.

Employees plan work, record what they actually did, and submit weekly timesheets for review. Managers review project hours and outcomes. Agent execution is tracked separately from employee labor so automated work is never presented as hours a person worked.

## Current implementation

Interactive browser-local calendar prototype: week/month views, phone agenda, task editing and rescheduling, unscheduled queue, human/agent assignments, simulated task review, undo and local saving. All sample content is synthetic.

Time entry, timers, timesheet submission, approvals and exports are **planned, not implemented**. The Netlify build adds personal account sign-in and cloud schedule storage; deployment verification is still pending. The original demo remains browser-local. The current review queue reviews task outcomes, not timesheets.

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

## Hosted accounts (Netlify build)

The account build now includes email signup/login/recovery, private per-account schedule storage, and conflict checks for multiple devices. `npm run build:netlify` builds it; `netlify.toml` supplies deployment settings. The original `npm run build` remains a synthetic local-storage demo. Netlify Identity must be enabled on the deployed project. See [deployment and verification](docs/netlify-deployment.md).

This first hosted slice manages personal schedules, not shared team permissions. Production account-flow validation is pending. Time entries, timers, timesheets and external agent execution remain planned.

Live account app: https://relay-planner.netlify.app/ — Netlify Identity enabled with required email confirmation. Ten automated checks pass and anonymous schedule requests are rejected. Live signed-in saving followed by a full browser reload is verified. Owner confirmed the same task appears on the phone after signing into the same account and refreshing. This is the account app; the earlier private Sites address remains the synthetic demo.
