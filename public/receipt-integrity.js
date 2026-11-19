import {open} from './crypto.js';

// The saved schedule has already authenticated successfully. A bad append-only
// receipt must not prevent that schedule or other verified receipts from loading.
export async function decodeActivityFeed(data, saved, privateKey) {
  const records = data.feed ?? [];
  if (!Array.isArray(records)) throw Error('Encrypted activity feed is invalid.');
  const results = await Promise.allSettled(records.map(async record => {
    if (record?.keyId !== data.vault.keys.keyId) throw Error('Receipt key mismatch.');
    const task = await open(record.envelope, privateKey, data.accountId, record.id);
    if (!task || task.id !== record.id || !task.activity || typeof task.activity !== 'object') {
      throw Error('Invalid encrypted receipt.');
    }
    const review = saved.reviews?.[record.id];
    const original = {...task, activity: {...task.activity, receiptTitle: task.title}};
    return review ? {
      ...original,
      status: review.status,
      history: review.history,
      ...(typeof review.title === 'string' && review.title.trim() && review.title.length <= 120 ? {title: review.title} : {}),
    } : original;
  }));
  const tasks = [...saved.tasks], receiptIssues = [], retainedReviews = {};
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      tasks.push(result.value);
    } else {
      // Do not expose unauthenticated fields or raw crypto errors to the UI.
      receiptIssues.push({index, reason: 'verification-failed'});
      const id = records[index]?.id;
      if (typeof id === 'string' && Object.hasOwn(saved.reviews ?? {}, id)) {
        Object.defineProperty(retainedReviews, id, {value: saved.reviews[id], enumerable: true});
      }
    }
  });
  return {tasks, receiptIssues, retainedReviews};
}

export function showReceiptWarning(element, issues) {
  const count = issues.length;
  element.hidden = count === 0;
  element.textContent = count === 0 ? '' :
    `${count} ${count === 1 ? 'report could' : 'reports could'} not be verified and ${count === 1 ? 'is' : 'are'} hidden. Your other tasks are available. Refresh to try again.`;
}
