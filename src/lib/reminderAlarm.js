export const REPEAT = {
  once: 'Una vez',
  daily: 'Todos los días',
  weekdays: 'De lunes a viernes',
};

const WINDOW_MS = 3 * 60 * 60 * 1000;
const SEEN_KEY = 'ccs_reminder_seen';
const SNOOZE_KEY = 'ccs_reminder_snooze';

const pad = (n) => String(n).padStart(2, '0');

export const localDayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const nowTime = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function readMap(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}') || {};
  } catch {
    return {};
  }
}

function writeMap(key, map) {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    return;
  }
}

export function occurrence(alarm, now = new Date()) {
  if (!alarm?.time) return null;
  const [h, m] = alarm.time.split(':').map(Number);
  if (alarm.repeat === 'once') {
    if (!alarm.date) return null;
    const [y, mo, d] = alarm.date.split('-').map(Number);
    return new Date(y, mo - 1, d, h, m, 0, 0);
  }
  const day = now.getDay();
  if (alarm.repeat === 'weekdays' && (day === 0 || day === 6)) return null;
  const at = new Date(now);
  at.setHours(h, m, 0, 0);
  return at;
}

export function formatClock(time) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' });
}

export function describeAlarm(alarm) {
  if (!alarm?.time) return '';
  const clock = formatClock(alarm.time);
  if (alarm.repeat !== 'once') return `${clock}, ${REPEAT[alarm.repeat].toLowerCase()}`;
  const [y, mo, d] = (alarm.date || localDayKey()).split('-').map(Number);
  const date = new Date(y, mo - 1, d);
  const label = localDayKey(date) === localDayKey() ? 'hoy' : date.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${clock}, ${label}`;
}

export function buildAlarm({ time, repeat, date }) {
  if (!time) return null;
  return {
    time,
    repeat,
    date: repeat === 'once' ? date || localDayKey() : null,
    armed_at: new Date().toISOString(),
  };
}

export function dueReminders(items, now = new Date()) {
  const seen = readMap(SEEN_KEY);
  const snooze = readMap(SNOOZE_KEY);
  return items
    .map((reminder) => {
      if (reminder.status === 'listo') return null;
      const at = occurrence(reminder.alarm, now);
      if (!at) return null;
      const elapsed = now - at;
      if (elapsed < 0 || elapsed > WINDOW_MS) return null;
      if (reminder.alarm.armed_at && new Date(reminder.alarm.armed_at) > at) return null;
      const key = at.toISOString();
      if (seen[reminder.id] === key) return null;
      if (snooze[reminder.id] && new Date(snooze[reminder.id]) > now) return null;
      return { reminder, at, key };
    })
    .filter(Boolean)
    .sort((a, b) => a.at - b.at);
}

export function markSeen(id, key) {
  const seen = readMap(SEEN_KEY);
  seen[id] = key;
  writeMap(SEEN_KEY, seen);
  const snooze = readMap(SNOOZE_KEY);
  delete snooze[id];
  writeMap(SNOOZE_KEY, snooze);
}

export function snoozeReminder(id, minutes) {
  const snooze = readMap(SNOOZE_KEY);
  snooze[id] = new Date(Date.now() + minutes * 60000).toISOString();
  writeMap(SNOOZE_KEY, snooze);
}

export function askNotificationPermission() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
  Notification.requestPermission().catch(() => {});
}

let audio = null;

export function chime() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const start = audio.currentTime + 0.02;
    [659.25, 880, 1318.5].forEach((freq, i) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const t = start + i * 0.16;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.16, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + 1);
    });
  } catch {
    return;
  }
}
