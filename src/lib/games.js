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

function useWeekTotals(collectionName) {
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
            if (!name || !keys.includes(data.date_key)) return;
            next[name] = (next[name] || 0) + (data.score || 0);
          });
          setTotals(next);
        },
        () => {}
      ),
    [collectionName]
  );
  return totals;
}

export function useLeaderboard() {
  const trivia = useWeekTotals('triviaScores');
  const maze = useWeekTotals('mazeScores');
  const names = new Set([...Object.keys(trivia), ...Object.keys(maze)]);
  return [...names]
    .map((name) => ({ name, trivia: trivia[name] || 0, maze: maze[name] || 0, total: (trivia[name] || 0) + (maze[name] || 0) }))
    .sort((a, b) => b.total - a.total);
}
