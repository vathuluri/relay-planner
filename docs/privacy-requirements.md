# Private records and encryption

Source code, tests and demonstration fixtures can be public. Customer records, credentials, recovery files and transcripts must never enter Git history, builds or application logs.

## Implemented encrypted account format

The account browser uses Web Crypto: fresh AES-256-GCM keys and 96-bit random nonces for each save or receipt, with per-record AES keys wrapped using RSA-OAEP-3072/SHA-256. Account identity and record purpose are authenticated context, preventing cross-account/record ciphertext substitution. Servers accept encrypted envelopes only for writes. Authentication and conditional versions remain necessary; encryption does not replace authorization.

A random 256-bit recovery secret encrypts the private RSA key in the browser. Only the encrypted private key and public encryption key go to storage. The recovery secret is downloaded directly to the owner, never sent to the backend. Password reset cannot unlock records. Another device must enter the recovery secret. A user may explicitly trust a device to persist its nonextractable CryptoKey in IndexedDB; otherwise it remains in the page's memory. Forget device key removes that remembered key. Clearing browser data also removes it. Losing every key and the recovery file means losing access.

Agents receive a revocable append-only reporting token and public encryption key, never the private decryption key. Report contents, timestamps, source labels and links are encrypted before upload. Offline retry packets and sent-packet deduplication records contain ciphertext, not work summaries. Local source files explicitly supplied to a reporter remain the owner's responsibility.

## Migration

An authenticated owner downloads and privately backs up the recovery file, then explicitly continues. The browser reads existing records, encrypts them, verifies them locally and conditionally replaces the active readable schedule. It fetches the saved envelope and verifies exact roundtrip content before confirming removal of the separate legacy activity blob. Interrupted confirmation can resume after successful unlock. Concurrent source/version changes refuse migration rather than overwriting newer data. Existing readable schedules remain until the owner completes migration; deployment by itself does not encrypt them.

Older browsers cannot write plaintext. Existing public-code demonstrations remain synthetic and browser-local, not encrypted customer accounts.

## Boundaries

Hosting still sees account identifiers, authentication traffic, request times, record counts and ciphertext sizes. A compromised unlocked device or malicious replacement JavaScript from the hosting origin can access plaintext and use device keys; this browser app does not protect against that threat. HTTPS protects transport. Application encryption makes stored record content unreadable without a user's private key; do not promise absolute protection from every third party.

Replacing active records does not prove erasure from provider backups, previous exports or historical logs. Provider retention and deletion policies must be handled separately. No raw task bodies or keys are logged by the functions. Do not enable request-body logging or analytics that capture decrypted UI content.

Automated tests cover recovery, wrong keys, tampering, context binding, tenant isolation, encrypted migration/readback, stale writes, delayed cleanup, reporting revocation, ciphertext retries and child exit codes. Live account migration and phone unlock must be verified separately. This implementation has not had an independent cryptographic security audit.
