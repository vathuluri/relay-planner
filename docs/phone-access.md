# Phone and PC access without passkey PRF

Use the same account and the same randomly generated vault password on both devices. Save it as a separate password-manager login named Relay vault unlock; it is distinct from the Netlify Identity sign-in password. The password manager can fill this normal password field without WebAuthn PRF. Trust this device optionally remembers a nonextractable key in IndexedDB. Clearing browser storage requires the vault password again.

## Existing passkey accounts

1. Unlock on the browser where the passkey already works.
2. Account → Set up phone access → Verify and retrieve vault password.
3. Approve the existing passkey on that PC. Save the displayed vault password privately in Proton Pass. The owner must handle this credential; do not share it in chat.
4. On the phone, sign in to the same Relay account, fill Vault password from that password-manager item, then Unlock. No new account, passkey, key rotation or data replacement is involved.

The dialog can alternatively verify an existing vault password/recovery key. It clears the displayed value on close or after five minutes, and ignores results arriving after the dialog was closed. Copying to the clipboard happens only through the owner's Copy button; Relay does not clear the clipboard automatically because it may contain something else by then. The owner should treat clipboard history as sensitive.

## New accounts

Create vault password generates the same 256-bit random recovery secret previously downloaded as a recovery file. Save it in your password manager and confirm before continuing with encryption migration. Downloading a recovery file remains optional. Passkeys are an optional advanced unlock path, not a requirement for phone access. No server password-derivation change or human-chosen low-entropy encryption password is introduced.

## Encryption and validation boundaries

This reuses the account's existing random 256-bit AES recovery secret. Retrieving it uses the enrolled PC passkey and local AES-GCM decryption, followed by schedule decryption verification. It never uploads the secret, changes the private RSA key, or rewrites task/receipt ciphertext. Account login still uses Netlify Identity; the vault password never goes to Identity or the schedule API. A holder of both account access/ciphertext and this secret can read the schedule, so preserve it privately and keep a backup. Relay cannot reset it.

Offline checks exercise passkey-to-vault-password recovery, normal Web Crypto unlock without PRF, account mismatch, dialog closure during verification, secret clearing and new-account confirmation. These establish the implemented path, not successful real-device testing. The owner must verify the deployed PC-to-phone flow. Native password autofill behavior depends on the owner's manager settings; manual paste into Vault password is supported. The browser-code and hosting metadata limitations in privacy-requirements.md still apply.
