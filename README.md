# Relay Planner

An open-source, calendar-first time tracker for teams working with people and agents.

Employees plan work, record what they actually did, and submit weekly timesheets for review. Managers review project hours and outcomes. Agent execution is tracked separately from employee labor so automated work is never presented as hours a person worked.

## Current implementation

Week and Day views group work into 24 hourly blocks. Each card shows its planned time or recorded finish time in the receipt's timezone. Tasks without a time appear separately. Blocks expand for simultaneous reports; card height represents neither duration nor employee hours. The plus button in an hour preselects that date and time. Month and Agenda views remain available.

Imported activity cards support private display-title edits. The owner can rename a card for later review; its original result, agent and execution timestamps remain unchanged. The display title is stored inside the encrypted schedule, separately from the append-only encrypted receipt.

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

## Encrypted account storage

The Netlify account build encrypts schedules and agent receipts on the originating device before upload. Existing accounts must complete a recovery-file backup and explicit browser migration. Another device requires the private recovery key; email password recovery cannot decrypt data. Agent reporting uses a public encryption key and a separate append-only token. See [privacy and migration boundaries](docs/privacy-requirements.md) and [reporting setup](docs/activity-reporting.md). The public synthetic demo remains browser-local. Live migration status must be verified per account.

## Passkey unlock

The hosted build supports passkey-based schedule unlock with WebAuthn PRF-compatible browsers/password managers. Email/password sign-in remains in place. Choose **Set up passkey** during encryption setup, or **Account → Passkey settings** to add one using an existing recovery file. Save an independent recovery backup when possible. See [setup, compatibility and validation limits](docs/passkeys.md). No real provider compatibility is claimed until tested by the owner.

## Phone-compatible unlock

The primary account unlock uses a random vault password saved in your password manager, with no mobile WebAuthn PRF requirement. Existing passkey accounts can retrieve that same secret from the working PC through Account → Set up phone access. Existing encrypted data stays intact. See [phone setup and validation boundaries](docs/phone-access.md).

## Approve another device

A locked device can request access from an unlocked device on the same account. Compare the full code and approve explicitly; the temporary exchange transfers only encrypted key material. An existing account may need one initial working-passkey verification to enable approvals. Recovery and vault-password unlock remain available. See [protocol, limitations and validation status](docs/device-approval.md). Real phone approval must be verified by the owner; no independent security audit is claimed.
