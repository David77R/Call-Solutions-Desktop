import { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { agentDisplayName } from './agents';

const AVATAR_SIZE = 192;
const AVATAR_QUALITY = 0.85;

export function useAgentProfile(user) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    const ref = doc(db, 'agents', user.uid);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data());
          return;
        }
        setDoc(ref, { displayName: agentDisplayName(user), email: user.email, createdAt: serverTimestamp() }, { merge: true }).catch(() => {});
      },
      () => setProfile(null)
    );
  }, [user]);

  return profile;
}

const SAVE_TIMEOUT_MS = 20000;

function fail(message) {
  const err = new Error(message);
  err.code = message;
  return err;
}

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      return loadImage(file);
    }
  }
  return loadImage(file);
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(fail('unreadable'));
    };
    img.src = url;
  });
}

function withTimeout(promise) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(fail('timeout')), SAVE_TIMEOUT_MS))]);
}

const HEIC = /\.(heic|heif)$/i;

export const isHeic = (file) => /image\/hei[cf]/i.test(file.type) || HEIC.test(file.name || '');

async function toJpeg(file) {
  if (!isHeic(file)) return file;
  try {
    const { default: heic2any } = await import('heic2any');
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    return Array.isArray(out) ? out[0] : out;
  } catch {
    throw fail('unreadable');
  }
}

export async function saveAgentPhoto(user, file) {
  const img = await decode(await toJpeg(file));
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) throw fail('unreadable');
  const side = Math.min(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (width - side) / 2, (height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  if (typeof img.close === 'function') img.close();
  const photo = canvas.toDataURL('image/jpeg', AVATAR_QUALITY);
  await withTimeout(setDoc(doc(db, 'agents', user.uid), { photo, photoUpdatedAt: serverTimestamp() }, { merge: true }));
}
