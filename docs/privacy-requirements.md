# Private data and encryption requirements

Source code, tests and demonstration fixtures can be public. Customer schedules, activity, transcripts and credentials cannot enter Git history, public builds, analytics or application logs.

The current hosted schedule implementation uses authenticated, account-isolated backend storage. It is not end-to-end encrypted: application servers process readable task content. Provider-managed encryption at rest and HTTPS do not make that content inaccessible to the provider. Existing records require migration; blocking new agent reporting does not encrypt or remove them.

Before enabling automatic reporting:

- Encrypt task and receipt content on the user's device before upload, using authenticated encryption and fresh nonces. Store only encrypted envelopes on the backend.
- Keep decryption keys outside the backend and authentication system. Agents receive a public encryption key, not the schedule decryption key. Authentication/reporting tokens remain separate from encryption keys.
- Unlock another device with an explicit user-held recovery secret or trusted-device transfer. Email/password reset cannot recover encryption keys. Explain that losing every key means losing access.
- Migrate existing readable records with verified decrypt/readback and explicit recovery handling. Do not silently delete or pretend old records were always encrypted. Review provider retention/backups separately.
- Test tamper rejection, nonce handling, wrong keys, account isolation, concurrent changes, browser refresh and phone unlock. Never log plaintext or keys.

Encryption protects record content, not all metadata: the service can still observe account identifiers, request times and ciphertext sizes. It cannot protect an unlocked compromised device or malicious replacement application code. Do not promise absolute protection from every third party or interceptor.

Status: requirements only. End-to-end encryption and migration are not implemented yet. Agent reporting is disabled at deployed function entry points pending that work.
