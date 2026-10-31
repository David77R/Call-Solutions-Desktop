const PREFIX = 'ccs_summary_draft:';
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

const keyOf = (slug, dateKey) => `${PREFIX}${slug}:${dateKey}`;

export function readDraft(slug, dateKey, baseSavedAt) {
  try {
    const raw = localStorage.getItem(keyOf(slug, dateKey));
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft?.form || Date.now() - (draft.at || 0) > MAX_AGE_MS) return null;
    if ((draft.base || null) !== (baseSavedAt || null)) return null;
    return draft;
  } catch {
    return null;
  }
}

export function hasDraft(slug, dateKey, baseSavedAt) {
  return Boolean(slug && dateKey && readDraft(slug, dateKey, baseSavedAt));
}

export function writeDraft(slug, dateKey, baseSavedAt, form) {
  try {
    localStorage.setItem(keyOf(slug, dateKey), JSON.stringify({ form, base: baseSavedAt || null, at: Date.now() }));
  } catch {
    return;
  }
}

export function clearDraft(slug, dateKey) {
  try {
    localStorage.removeItem(keyOf(slug, dateKey));
  } catch {
    return;
  }
}
