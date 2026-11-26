export function showSyncWarning(element, reporting = {}, {failed = false, now = Date.now()} = {}) {
  const last = Date.parse(reporting.lastAcceptedAt);
  const stale = Number.isFinite(last) && now - last > 24 * 60 * 60 * 1000;
  element.hidden = !failed && !reporting.retrying && !stale;
  element.textContent = failed
    ? 'Calendar sync failed. Showing your last loaded schedule. Refresh to retry.'
    : reporting.retrying
      ? 'Agent reports are waiting for retry. New work may be missing from this calendar.'
      : stale
        ? 'No agent reports received in over 24 hours. If agents have worked, check the reporting companion on your computer.'
        : '';
}
