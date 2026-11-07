import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { todayKey } from './summaries';

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function weekKeys(reference = todayKey()) {
  const [y, m, d] = reference.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  });
}

export function saveTriviaScore(agentName, score, total) {
  if (!agentName?.trim() || score <= 0) return Promise.resolve();
  return setDoc(doc(db, 'triviaScores', makeId()), {
    agent_name: agentName.trim(),
    score,
    total_questions: total,
    date_key: todayKey(),
    played_at: new Date().toISOString(),
  }).catch(() => {});
}

export function saveMazeScore(agentName, score) {
  if (!agentName?.trim() || score <= 0) return Promise.resolve();
  return setDoc(doc(db, 'mazeScores', makeId()), {
    agent_name: agentName.trim(),
    score,
    date_key: todayKey(),
    played_at: new Date().toISOString(),
  }).catch(() => {});
}

export function saveCatScore(agentName, score, result, level) {
  if (!agentName?.trim() || score <= 0) return Promise.resolve();
  return setDoc(doc(db, 'catArtilleryScores', makeId()), {
    agent_name: agentName.trim(),
    score,
    result,
    level,
    date_key: todayKey(),
    played_at: new Date().toISOString(),
  }).catch(() => {});
}

export function saveBombScore(agentName, score, result, level) {
  if (!agentName?.trim() || score <= 0) return Promise.resolve();
  return setDoc(doc(db, 'catArtilleryScores', makeId()), {
    agent_name: agentName.trim(),
    game: 'bomb',
    score,
    result,
    level,
    date_key: todayKey(),
    played_at: new Date().toISOString(),
  }).catch(() => {});
}

export function saveHockeyScore(agentName, score, result, level) {
  if (!agentName?.trim() || score <= 0) return Promise.resolve();
  return setDoc(doc(db, 'catArtilleryScores', makeId()), {
    agent_name: agentName.trim(),
    game: 'hockey',
    score,
    result,
    level,
    date_key: todayKey(),
    played_at: new Date().toISOString(),
  }).catch(() => {});
}

export function saveDodgeScore(agentName, score, result, level) {
  if (!agentName?.trim() || score <= 0) return Promise.resolve();
  return setDoc(doc(db, 'catArtilleryScores', makeId()), {
    agent_name: agentName.trim(),
    game: 'dodge',
    score,
    result,
    level,
    date_key: todayKey(),
    played_at: new Date().toISOString(),
  }).catch(() => {});
}

export function saveConquestScore(agentName, score, result, level) {
  if (!agentName?.trim() || score <= 0) return Promise.resolve();
  return setDoc(doc(db, 'catArtilleryScores', makeId()), {
    agent_name: agentName.trim(),
    game: 'conquest',
    score,
    result,
    level,
    date_key: todayKey(),
    played_at: new Date().toISOString(),
  }).catch(() => {});
}

function useWeekTotals(collectionName, game) {
  const [totals, setTotals] = useState({});
  useEffect(
    () =>
      onSnapshot(
        collection(db, collectionName),
        (snap) => {
          const keys = weekKeys();
          const next = {};
          snap.docs.forEach((d) => {
            const data = d.data();
            const name = (data.agent_name || '').trim();
            if (!name || !keys.includes(data.date_key) || (data.game || null) !== (game || null)) return;
            next[name] = (next[name] || 0) + (data.score || 0);
          });
          setTotals(next);
        },
        () => {},
      ),
    [collectionName, game],
  );
  return totals;
}

export function useLeaderboard() {
  const trivia = useWeekTotals('triviaScores');
  const maze = useWeekTotals('mazeScores');
  const cats = useWeekTotals('catArtilleryScores');
  const bombs = useWeekTotals('catArtilleryScores', 'bomb');
  const hockey = useWeekTotals('catArtilleryScores', 'hockey');
  const dodge = useWeekTotals('catArtilleryScores', 'dodge');
  const conquest = useWeekTotals('catArtilleryScores', 'conquest');
  const names = new Set([
    ...Object.keys(trivia),
    ...Object.keys(maze),
    ...Object.keys(cats),
    ...Object.keys(bombs),
    ...Object.keys(hockey),
    ...Object.keys(dodge),
    ...Object.keys(conquest),
  ]);
  return [...names]
    .map((name) => ({
      name,
      trivia: trivia[name] || 0,
      maze: maze[name] || 0,
      cats: cats[name] || 0,
      bombs: bombs[name] || 0,
      hockey: hockey[name] || 0,
      dodge: dodge[name] || 0,
      conquest: conquest[name] || 0,
      total: (trivia[name] || 0) + (maze[name] || 0) + (cats[name] || 0) + (bombs[name] || 0) + (hockey[name] || 0) + (dodge[name] || 0) + (conquest[name] || 0),
    }))
    .sort((a, b) => b.total - a.total);
}
