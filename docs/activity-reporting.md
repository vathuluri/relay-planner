# Automatic activity reporting

Relay does not scrape conversations or assume scheduled jobs executed. A connected agent or script sends an explicit completion receipt. Records include source, actual completion timestamp, optional start timestamp, result and a stable run ID. Runtime is not human work time.

## Connect once

Sign in to the Netlify app, open Account > Agent connections > Connect agents. This downloads a private reporting config; the new key replaces any prior key for this account, expires in 30 days, and can only append activity. It cannot read schedules, edit human tasks, or approve work. Revoke reporting key disables it without deleting receipts. Keep the downloaded file outside Git.

On the machine that runs your jobs:

```sh
node scripts/report-activity.mjs install --file /private/path/relay-reporting.json
```

The default config/outbox lives under ~/.config/relay-planner. RELAY_DATA_DIR changes that private directory. Do not commit it or share the key in prompts. Key material is stored hashed on the server and only returned once to the browser at creation. No model API is used.

## Wrap a script

```sh
node scripts/report-activity.mjs run --title "Daily checks" --kind automation --agent "Local scheduler" -- node /path/to/checks.mjs
```

The wrapper records actual start/end, success/failure and a run ID. It sends no command line, console output, transcript, prompt or arbitrary file content. Its exit code preserves the command's outcome. A reporting failure queues the receipt locally, rather than failing a successful job. Flush retries the same run IDs:

```sh
node scripts/report-activity.mjs flush
```

Windows batch/PowerShell scripts should be launched via their executable, e.g. pwsh -File script.ps1. Do not wrap a long-running daemon and call its entire lifetime employee work.

## Agents and existing run logs

An agent can write a reviewed, minimal JSON receipt and call send --file. Required fields: runId (stable per run), title (120 chars), kind (agent or automation), status (done or attention), completedAt (actual ISO timestamp with timezone). Optional: startedAt, agent, summary (4000 chars), HTTPS link. Do not invent missing timestamps or treat a planned trigger as a completed run. For timestamp-free reconstructed tasks, use the normal calendar instead.

Append-only reports are stored separately from editable schedules, so human edits cannot erase the feed. Duplicate run IDs with identical content are acknowledged once; reusing an ID with different content is rejected. Concurrent writes retry conditional updates. Imported reports are read-only in the UI. Up to 500 reports per account are retained; a full feed refuses new reports and leaves them queued locally rather than silently deleting history. Archival is not yet implemented.

The app checks for new records every 30 seconds while visible and not editing/saving. Refresh schedule loads immediately. Times are grouped by the reporting connection's configured timezone. Reported agent/source names identify what the connected sender declared, not independent proof of provider identity.

## Current integration limit

Only jobs actually wired to the wrapper or receipt command report automatically. Installing a key alone does not connect every Claude, Codex or other session. Native hooks require the host's supported lifecycle event, local script availability and the user's hook trust; no host-wide hooks are installed by this project. No existing schedule is changed or resumed automatically.
