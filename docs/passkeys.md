# Passkey unlock

The hosted account build offers **Set up passkey** during encryption setup. Save it in your browser's compatible password manager, click **Verify passkey** and approve its prompt, then choose Continue. A recovery-file download remains available as an independent backup, but is not required after passkey verification.

This is encrypted-schedule unlock, not passwordless account sign-in. Netlify Identity email/password authentication is unchanged. On another device, sign in to the same account and choose Unlock with passkey. Your password manager must make the same passkey available there and support WebAuthn PRF in that browser. Generic passkey support alone is insufficient. Relay reports unsupported PRF or cancellation without migrating the schedule. A provider might still save an unused credential when its PRF capability check fails.

Already encrypted with a recovery file? Use Account → Passkey settings, import your existing recovery file (or enter its key locally), then choose Add passkey using recovery key. A remembered device key cannot be exported to enroll a passkey. This first version supports one enrolled passkey and does not support replacement or revocation in Relay. Do not delete your only working passkey. Keep an independent recovery file; a synced passkey may still be lost if its provider account becomes inaccessible. Password reset cannot decrypt a schedule.

## Encryption boundary

WebAuthn registration requires a discoverable credential and user verification. Its PRF extension produces a 256-bit secret during an assertion, used locally as an AES-GCM wrapping key. Relay wraps the existing random recovery secret using a fresh nonce and associated data bound to account and vault key identity. The RSA schedule key and existing encrypted agent receipts do not change. An explicit Verify passkey click evaluates PRF and locally verifies the wrapped recovery secret before migration or enrollment is accepted. A cancelled verification can be retried in the same page without creating another credential. The server receives only the credential ID, public PRF salt, nonce and ciphertext; never PRF output, recovery secret, private key, or the full WebAuthn response. Identity authenticates server requests, so these local unlock ceremonies are not represented as server-verified WebAuthn sign-in.

Account authorization, origin checks, conditional versions and strict envelope validation govern enrollment. Normal saves retain the passkey envelope, including saves from older clients. Passkeys are bound to the current website domain: moving the app requires a separate recovery/enrollment plan. HTTPS protects transport; host metadata and browser-delivered-code limitations still apply. See privacy-requirements.md. No independent security audit is claimed.

## Validation

Offline tests use a synthetic authenticator and real Web Crypto to cover registration, PRF capability failure, cancellation, credential mismatch, wrong-account/key authentication, migration, later saves and reload unlock. Server tests cover isolation, origins, stale versions, envelope validation and replacement refusal. Real password-manager registration and phone sync require owner verification on the deployed domain; simulated tests do not establish provider compatibility.

References: [WebAuthn PRF extension](https://www.w3.org/TR/webauthn-3/#prf-extension), [W3C explanation](https://github.com/w3c/webauthn/blob/main/explainers/prf-extension.md).
