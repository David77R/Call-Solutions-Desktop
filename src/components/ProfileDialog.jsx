import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, CloseIcon } from './Icons';
import { useAuth } from '../lib/AuthContext';
import { agentDisplayName, agentInitials } from '../lib/agents';
import { isHeic, removeAgentPhoto, saveAgentPhoto, saveAgentProfile } from '../lib/useAgentProfile';
import './ProfileDialog.css';

const ROLES = ['Agente', 'Supervisor', 'Coordinador', 'Administración'];

const PHOTO_ERRORS = {
  'permission-denied': 'Firebase no deja guardar la foto. Revisa que la regla de "agents" esté publicada.',
  unreadable: 'Esa imagen no se pudo abrir. Prueba con otra foto.',
  timeout: 'La conexión está lenta y no terminó de guardar. Inténtalo de nuevo.',
};

const PASSWORD_ERRORS = {
  'auth/wrong-password': 'La contraseña actual no es correcta.',
  'auth/invalid-credential': 'La contraseña actual no es correcta.',
  'auth/weak-password': 'La contraseña nueva es muy corta. Usa al menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
  'auth/network-request-failed': 'Sin conexión. Revisa el internet e inténtalo de nuevo.',
};

function loginName(user) {
  const local = (user?.email || '').split('@')[0];
  return local
    .split('.')
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

export default function ProfileDialog({ profile, onClose }) {
  const { user, rename, changePassword } = useAuth();
  const id = useId();
  const fileRef = useRef(null);
  const closeRef = useRef(null);
  const currentName = user?.displayName || profile?.displayName || agentDisplayName(user);
  const [name, setName] = useState(currentName);
  const [role, setRole] = useState(profile?.role || 'Agente');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', repeat: '' });
  const [pwStatus, setPwStatus] = useState('idle');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const trimmed = name.trim().replace(/\s+/g, ' ');
  const dirty = trimmed !== currentName || role.trim() !== (profile?.role || 'Agente');
  const valid = trimmed.length >= 2 && role.trim().length > 0;

  const save = async (e) => {
    e.preventDefault();
    if (!dirty || !valid) return;
    setStatus('saving');
    setError('');
    try {
      if (trimmed !== currentName) await rename(trimmed);
      await saveAgentProfile(user, { displayName: trimmed, role: role.trim() });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1800);
    } catch (err) {
      setStatus('idle');
      setError(PHOTO_ERRORS[err?.code] || PHOTO_ERRORS[err?.message] || 'No se pudo guardar. Revisa la conexión e inténtalo de nuevo.');
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type && !file.type.startsWith('image/') && !isHeic(file)) {
      setError('Elige una imagen (JPG o PNG).');
      return;
    }
    setPhotoBusy(true);
    setError('');
    try {
      await saveAgentPhoto(user, file);
    } catch (err) {
      setError(PHOTO_ERRORS[err?.code] || PHOTO_ERRORS[err?.message] || 'No se pudo guardar la foto. Inténtalo de nuevo.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const dropPhoto = async () => {
    setPhotoBusy(true);
    setError('');
    try {
      await removeAgentPhoto(user);
    } catch {
      setError('No se pudo quitar la foto. Inténtalo de nuevo.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const pwValid = pw.current && pw.next.length >= 6 && pw.next === pw.repeat;

  const savePassword = async (e) => {
    e.preventDefault();
    if (!pwValid) return;
    setPwStatus('saving');
    setPwError('');
    try {
      await changePassword(pw.current, pw.next);
      setPwStatus('saved');
      setPw({ current: '', next: '', repeat: '' });
      setTimeout(() => {
        setPwStatus('idle');
        setPwOpen(false);
      }, 2000);
    } catch (err) {
      setPwStatus('idle');
      setPwError(PASSWORD_ERRORS[err?.code] || 'No se pudo cambiar la contraseña. Inténtalo de nuevo.');
    }
  };

  return createPortal(
    <div className="profile-dlg" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
      <div className="profile-dlg__backdrop" onClick={onClose} />
      <section className="profile-dlg__card">
        <button ref={closeRef} type="button" className="profile-dlg__close" onClick={onClose} aria-label="Cerrar perfil">
          <CloseIcon size={20} />
        </button>

        <header className="profile-dlg__hero">
          <div className={photoBusy ? 'profile-dlg__avatar is-busy' : 'profile-dlg__avatar'}>
            {profile?.photo ? <img src={profile.photo} alt="" /> : <span>{agentInitials({ displayName: trimmed || currentName })}</span>}
          </div>
          <div className="profile-dlg__who">
            <h2 id={`${id}-title`}>{trimmed || currentName}</h2>
            <p>{role.trim() || 'Agente'}</p>
            <div className="profile-dlg__photo-actions">
              <button type="button" className="sf-chip" onClick={() => fileRef.current?.click()} disabled={photoBusy}>
                {photoBusy ? 'Guardando…' : profile?.photo ? 'Cambiar foto' : 'Agregar foto'}
              </button>
              {profile?.photo && (
                <button type="button" className="sf-chip" onClick={dropPhoto} disabled={photoBusy}>
                  Quitar foto
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*,.heic,.heif" hidden onChange={onFile} />
            </div>
          </div>
        </header>

        <form className="profile-dlg__form" onSubmit={save}>
          <label className="sf-field">
            <span>Nombre que ve el equipo</span>
            <input className="sf-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </label>
          <p className="profile-dlg__hint">
            Sale en el saludo, en los resúmenes y en los mensajes listos. Para entrar a la app sigues usando <strong>{loginName(user)}</strong> y tu contraseña.
          </p>

          <div className="sf-field">
            <span>Cargo</span>
            <div className="profile-dlg__roles" role="group" aria-label="Cargo">
              {ROLES.map((r) => (
                <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)}>
                  {r}
                </button>
              ))}
            </div>
            <input className="sf-input" value={role} maxLength={30} onChange={(e) => setRole(e.target.value)} aria-label="Otro cargo" placeholder="Otro cargo" />
          </div>

          {error && <p className="sf-error">{error}</p>}

          <button type="submit" className={`profile-dlg__save is-${status}`} disabled={!dirty || !valid || status === 'saving'}>
            {status === 'saved' && <CheckIcon size={18} />}
            {status === 'saving' ? 'Guardando…' : status === 'saved' ? 'Perfil guardado' : 'Guardar cambios'}
          </button>
        </form>

        <div className="profile-dlg__pw">
          <button type="button" className="profile-dlg__pw-toggle" aria-expanded={pwOpen} onClick={() => setPwOpen((o) => !o)}>
            Cambiar contraseña
            <span aria-hidden="true">{pwOpen ? '−' : '+'}</span>
          </button>
          {pwOpen && (
            <form className="profile-dlg__pw-form" onSubmit={savePassword}>
              <label className="sf-field">
                <span>Contraseña actual</span>
                <input className="sf-input" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
              </label>
              <label className="sf-field">
                <span>Contraseña nueva</span>
                <input className="sf-input" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
              </label>
              <label className="sf-field">
                <span>Repite la nueva</span>
                <input className="sf-input" type="password" autoComplete="new-password" value={pw.repeat} onChange={(e) => setPw((p) => ({ ...p, repeat: e.target.value }))} />
              </label>
              {pw.next && pw.next.length < 6 && <p className="sf-hint">Usa al menos 6 caracteres.</p>}
              {pw.repeat && pw.next !== pw.repeat && <p className="sf-hint">Las dos contraseñas nuevas no coinciden.</p>}
              {pwError && <p className="sf-error">{pwError}</p>}
              <button type="submit" className="sf-ghost" disabled={!pwValid || pwStatus === 'saving'}>
                {pwStatus === 'saving' ? 'Cambiando…' : pwStatus === 'saved' ? 'Contraseña cambiada' : 'Cambiar contraseña'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>,
    document.body
  );
}
