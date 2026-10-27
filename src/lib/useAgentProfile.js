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
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}

export async function saveAgentPhoto(user, file) {
  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  const photo = canvas.toDataURL('image/jpeg', AVATAR_QUALITY);
  await setDoc(doc(db, 'agents', user.uid), { photo, photoUpdatedAt: serverTimestamp() }, { merge: true });
}
