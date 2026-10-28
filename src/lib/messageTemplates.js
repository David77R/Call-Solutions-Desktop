import { useSyncExternalStore } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_TEMPLATES } from '../data/messageTemplates';

const USAGE_KEY = 'ccs_message_usage';
const LANG_KEY = 'ccs_message_lang';
const PLACEHOLDER = /\{([a-z_]+)\}/g;
export const OPEN_EVENT = 'ccs-open-messages';

let snapshot = { items: DEFAULT_TEMPLATES, fromServer: false };
let started = false;
const listeners = new Set();

function subscribe(listener) {
  if (!started) {
    started = true;
    onSnapshot(
      doc(db, 'messageTemplates', 'main'),
      (snap) => {
        const items = snap.exists() && Array.isArray(snap.data().items) ? snap.data().items : DEFAULT_TEMPLATES;
        snapshot = { items, fromServer: snap.exists() };
        listeners.forEach((l) => l());
      },
      () => {}
    );
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => snapshot;

export function useMessageTemplates() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function placeholders(text) {
  return [...new Set([...(text || '').matchAll(PLACEHOLDER)].map((m) => m[1]))];
}

export function fillTemplate(text, values) {
  return (text || '').replace(PLACEHOLDER, (match, key) => (values[key] ? values[key] : match));
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

export function readUsage() {
  return readJson(USAGE_KEY, {});
}

export function countUsage(id) {
  const usage = readUsage();
  usage[id] = (usage[id] || 0) + 1;
  writeJson(USAGE_KEY, usage);
  return usage;
}

export function readMessageLang() {
  return readJson(LANG_KEY, 'es') === 'en' ? 'en' : 'es';
}

export function saveMessageLang(lang) {
  writeJson(LANG_KEY, lang);
}

export function openMessages(detail = {}) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail }));
}

export function templateById(items, id) {
  return items.find((t) => t.id === id) || DEFAULT_TEMPLATES.find((t) => t.id === id) || null;
}
