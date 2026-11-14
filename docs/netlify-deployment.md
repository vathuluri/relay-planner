# Netlify deployment

Relay has two builds:
- npm run build: synthetic, browser-local demo for the original private Sites preview.
- npm run build:netlify: account sign-in shell plus a Netlify Function for private saved schedules.

Import vathuluri/relay-planner as a **new project**, branch main. netlify.toml supplies build command npm run build:netlify, publish directory dist and function directory netlify/functions. Use Node 24. No secret or admin token belongs in the browser or repository.

Enable Netlify Identity on this new project. Keep email confirmation enabled. Use open registration when ready to let people create their own accounts; invite-only is suitable for initial checks. Set the Identity site URL to the actual project URL and confirmation/recovery redirect to /. The account entrypoint calls handleAuthCallback to finish those email flows. Verify actual signup, confirmation, login, reset and logout on the deployed URL; Netlify Identity cannot be fully tested by the static local server.

Each verified session's user ID determines the storage key. Netlify Blobs stores one schedule per account in relay-schedules, using strong reads and atomic conditional writes. Client-supplied account IDs are ignored. A stale version gets HTTP409; it cannot overwrite a newer schedule. No records are copied from the demo or personal blog. New accounts start empty.

Current scope: per-account tasks, dates, times, owner labels and task status, saved across devices. Work / Projects / Personal are fixed groups. No shared team membership, invitations to another person's calendar, timers, recurring execution, agent execution or automatic reminders. Dates and times are saved as entered, not converted between timezones. Task review is personal tracking, not an enforced manager approval process.

Local checks: npm test includes session isolation, unauthenticated rejection, stale/concurrent-write conflicts, origin checks, invalid dates/times, failure handling and cloud-save rollback. These use fake sessions/storage. Production signup and multi-account isolation must be checked separately before inviting others.

If Netlify Identity or Blobs is unavailable, access and saving fail closed. The app never silently falls back to browser-only saving. Refresh schedule loads the latest server copy. Submitted edits have no automatic retry; failed saves leave the current displayed schedule unchanged.
