// Static account UI. Keep alternate methods available without making them compete.
export const accountGate=`
<section id="account-gate" class="account-gate">
 <a class="brand" href="/">relay<span class="brand-dot">.</span></a>
 <h1 id="account-title">Welcome back.</h1>
 <p id="account-intro">Sign in to your private workspace.</p>
 <form id="account-form">
  <label>Email<input id="account-email" type="email" autocomplete="email" required></label>
  <label>Password<input id="account-password" type="password" autocomplete="current-password" minlength="8" required></label>
  <button class="button primary" id="account-submit">Sign in</button>
 </form>
 <div class="account-actions"><button id="account-switch" class="text-button">Create an account</button><button id="account-recover" class="text-button">Forgot password?</button></div>
 <section id="vault-gate" hidden>
  <button type="button" class="text-button" id="vault-logout">Sign out</button>
  <h2 id="vault-title" hidden>Unlock your schedule</h2>
  <div id="vault-primary-action"></div>
  <div id="pair-request-panel" hidden><span class="unlock-caption">Match this code on your other device</span><strong id="pair-request-code"></strong><button type="button" class="text-button" id="pair-request-cancel">Cancel request</button></div>
  <p id="pair-request-status" class="unlock-status" role="status" aria-live="polite"></p>
  <form id="vault-form">
   <div id="vault-setup"></div>
   <div id="vault-ready" hidden>
    <div id="vault-password-result" hidden><label>Save in your password manager<input id="vault-new-password" type="password" autocomplete="new-password" readonly></label><button type="button" class="button" id="vault-copy-password">Copy vault password</button></div>
    <label class="unlock-check"><input id="vault-backed-up" type="checkbox">I saved my vault password or recovery file</label>
   </div>
   <label class="unlock-check"><input id="vault-remember" type="checkbox">Remember this device</label>
   <small class="unlock-caption">Only on a device you own.</small>
   <div id="vault-primary-submit"></div>
   <details id="vault-other-methods" class="unlock-alternatives">
    <summary>Other ways to unlock</summary>
    <div class="unlock-alternative-actions">
     <button type="button" class="button" id="pair-request-start" hidden>Approve from another device</button>
     <button type="button" class="button" id="vault-passkey">Unlock with passkey</button>
     <button type="button" class="button" id="vault-use-passkey">Use a saved passkey</button>
     <p id="vault-passkey-help" class="unlock-caption">Passkey support varies by device.</p>
     <button type="button" class="button primary" id="vault-create-password">Create vault password</button>
     <div id="vault-unlock" hidden><label>Vault password<input id="vault-secret" name="relay-vault-password" type="password" autocomplete="current-password" spellcheck="false" placeholder="From your password manager"></label></div>
     <button class="button" id="vault-submit" type="submit">Unlock with vault password</button>
     <details class="unlock-recovery"><summary>Recovery file</summary><label class="unlock-caption">Import a saved file<input type="file" id="vault-import" accept=".json,application/json"></label><button type="button" class="button" id="vault-generate">Download recovery file</button><p class="unlock-caption">Losing every unlock method means losing access. Account password reset cannot decrypt your schedule.</p></details>
    </div>
   </details>
  </form>
  <p id="vault-message" class="unlock-status" role="status" aria-live="polite"></p>
 </section>
 <p id="account-message" role="status" aria-live="polite">Connecting…</p>
</section>`;
