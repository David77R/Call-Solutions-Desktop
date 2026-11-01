import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { agentDisplayName, agentInitials } from '../lib/agents';
import { useAgentProfile } from '../lib/useAgentProfile';
import ProfileDialog from './ProfileDialog';
import './AgentCard.css';

export default function AgentCard() {
  const { user, logout } = useAuth();
  const profile = useAgentProfile(user);
  const [open, setOpen] = useState(false);
  const name = user?.displayName || profile?.displayName || agentDisplayName(user);

  return (
    <div className="agent-card">
      <div className="agent-card__row">
        <button type="button" className="agent-card__open" onClick={() => setOpen(true)} aria-label={`Ver y editar el perfil de ${name}`}>
          <span className="agent-card__avatar">
            {profile?.photo ? (
              <img key={profile.photo.length} src={profile.photo} alt="" className="agent-card__photo" />
            ) : (
              <span className="agent-card__initials">{agentInitials({ displayName: name })}</span>
            )}
            <span className="agent-card__camera" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
            </span>
          </span>
          <span className="agent-card__text">
            <span className="agent-card__name">{name}</span>
            <span className="agent-card__role">{profile?.role || 'Agente'}</span>
          </span>
        </button>
        <button type="button" className="agent-card__logout" onClick={logout}>
          Salir
        </button>
      </div>
      {open && <ProfileDialog profile={profile} onClose={() => setOpen(false)} />}
    </div>
  );
}
