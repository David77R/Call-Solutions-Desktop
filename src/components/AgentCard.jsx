import { useRef, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { agentDisplayName, agentInitials } from '../lib/agents';
import { saveAgentPhoto, useAgentProfile } from '../lib/useAgentProfile';
import './AgentCard.css';

const PHOTO_ERRORS = {
  'permission-denied': 'Firebase no deja guardar la foto. Revisa que la regla de "agents" esté publicada.',
  unreadable: 'Esa imagen no se pudo abrir. Prueba con una foto en JPG o PNG (las HEIC del iPhone a veces fallan).',
  timeout: 'La conexión está lenta y la foto no terminó de subir. Inténtalo de nuevo.',
};

export default function AgentCard() {
  const { user, logout } = useAuth();
  const profile = useAgentProfile(user);
  const inputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const name = user?.displayName || profile?.displayName || agentDisplayName(user);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type && !file.type.startsWith('image/')) {
      setError('Elige una imagen (JPG o PNG).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveAgentPhoto(user, file);
    } catch (err) {
      setError(PHOTO_ERRORS[err?.code] || PHOTO_ERRORS[err?.message] || 'No se pudo guardar la foto. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="agent-card">
      <div className="agent-card__row">
        <button
          type="button"
          className={saving ? 'agent-card__avatar is-saving' : 'agent-card__avatar'}
          onClick={() => inputRef.current?.click()}
          aria-label={profile?.photo ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'}
        >
          {profile?.photo ? (
            <img key={profile.photo.length} src={profile.photo} alt="" className="agent-card__photo" />
          ) : (
            <span className="agent-card__initials">{agentInitials({ displayName: name })}</span>
          )}
          <span className="agent-card__camera" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </span>
        </button>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
        <span className="agent-card__text">
          <span className="agent-card__name">{name}</span>
          <span className="agent-card__role">Agente</span>
        </span>
        <button type="button" className="agent-card__logout" onClick={logout}>
          Salir
        </button>
      </div>
      {error && <p className="agent-card__error">{error}</p>}
    </div>
  );
}
