# Approve another device

Sign in to the same Relay account on both devices. On the locked phone, choose **Approve from another device** and leave the page open. On the unlocked PC, open **Account → Approve a device**, compare the full code with the phone, check the match confirmation and approve. The phone verifies the encrypted response and opens the existing schedule. Selecting **Trust this device** on the phone remembers a nonextractable vault key locally; otherwise access lasts only in that page. No password copying or phone WebAuthn PRF is required.

Existing accounts may need **Enable approvals with my working passkey** once on the PC. This re-verifies the working passkey and encrypts the existing recovery secret to the account's public RSA key. It does not expose the secret in the UI or change the vault key. Later approvals can decrypt this small envelope using the already-unlocked, nonextractable private key. An existing vault-password option is provided explicitly for accounts without a working passkey. New migrations prepare this envelope automatically. A remembered private key cannot itself be exported, so bootstrapping cannot simply copy it.

Keep an independent recovery backup. Device approval requires another unlocked device; it does not recover an account when all keys and trusted devices are lost.

## Protocol

The requesting page generates a fresh nonextractable ECDH P-256 key pair, 256-bit random request ID and nonce, and a five-minute expiry. An authenticated, same-origin endpoint stores only the request's public key and metadata, scoped to the Identity account and vault key ID. A comparison code is the first 48 bits of SHA-256 over a canonical account/request transcript, displayed as twelve hex digits. This code is a human verification check, not an access token. The owner must compare all digits on the two actual devices.

After explicit owner confirmation, the unlocked PC uses another ephemeral ECDH P-256 key pair, HKDF-SHA-256 and AES-256-GCM to encrypt the existing random recovery secret for the requester. HKDF context binds the account, vault key ID, request ID, requesting public key, nonce, expiry and responding public key. AES authenticated context also binds the request transcript. No decryption secret is sent in plaintext to the relay server.

The requesting page retains its original transcript, refuses substituted request data, decrypts the response using its in-memory ephemeral key, imports the existing nonextractable vault key and verifies schedule decryption. It consumes the approval before finishing unlock and optionally remembering the vault key. Consume is idempotent to handle a lost acknowledgement; ciphertext is removed on consumption/cancellation. Subsequent schedule reads use the current version so the first edit does not overwrite changes made during pairing.

Server operations use conditional writes, reject cross-account/origin requests, reject unexpected fields/private keys/plaintext, cap active entries at five and enforce expiry and pending → approved → consumed/cancelled transitions. Cancel/reload drops the requester's ephemeral private key. Expired entries cannot be used; stale ledger metadata/ciphertext is pruned on the next mutation, not a promised five-minute physical deletion from provider backups. Hosted historical retention remains outside this application protocol.

## Trust and limitations

- Only approve a request you just made and whose complete code matches. Without that comparison, an attacker controlling the relay could substitute their own requesting key. This is a human-mediated pairing design, not a formally verified protocol.
- Approving gives the device the same vault decryption authority as another unlocked device. Cancelling a pending request cannot revoke a device after successful consumption. Revoking an already-trusted device cryptographically requires key rotation, which this version does not implement. Use Forget device key on that device and sign out when appropriate; neither guarantees erasure from a compromised device.
- A compromised unlocked browser/device or malicious JavaScript served by the application origin can access plaintext. Encryption does not remove that browser trust boundary. Hosting still sees account identifiers, request times, public ephemeral keys, status and ciphertext sizes.
- No private key, recovery secret, task text, user agent or device fingerprint is stored in the pairing ledger or logs. No public pairing URL, email or third-party messaging service is used.
- Browser Web Crypto and device storage behavior still require real-device verification. Node/JSDOM tests do not prove Safari/Proton behavior. No independent security audit is claimed.

## Checks

Offline tests use real Web Crypto with synthetic accounts to exercise correct exchange, wrong device/account/vault, modified nonce/response, expiry, account-scoped API reads, origin restrictions, plaintext refusal, one-time consumption, cancellation, concurrent conditional writes, limits, requester remembering without PRF and matching-code UI gating. Regression tests also cover encrypted bootstrap preservation across schedule saves. Live PC-to-phone approval remains a separate owner verification step.

References: [Web Crypto key agreement and derivation](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey), [Web Cryptography specification](https://www.w3.org/TR/webcrypto/).
