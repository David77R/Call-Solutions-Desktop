import { useId, useState } from 'react';
import HoloBackdrop from './HoloBackdrop';
import { useAuth } from '../../lib/AuthContext';
import logo from '../../assets/ccs-logo.png';
import './LoginPage.css';

const MIN_PASSWORD = 6;

const ERRORS = {
  'auth/invalid-credential': 'Nombre, apellido o contraseña incorrectos. Revisa que estén escritos igual que cuando creaste tu perfil.',
  'auth/invalid-email': 'Escribe tu nombre y tu apellido sin símbolos raros.',
  'auth/user-disabled': 'Esta cuenta está desactivada. Habla con tu supervisor.',
  'auth/too-many-requests': 'Demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.',
  'auth/network-request-failed': 'No hay conexión a internet. Revisa la red y vuelve a intentarlo.',
  'auth/email-already-in-use': 'Ya existe un perfil con ese nombre y apellido. Inicia sesión con tu contraseña.',
  'auth/weak-password': `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`,
  'auth/operation-not-allowed': 'El registro está desactivado en este momento. Habla con tu supervisor.',
};

const MODES = {
  login: {
    title: 'Inicia sesión',
    subtitle: 'Entra con tu nombre, tu apellido y tu contraseña.',
    submit: 'Entrar',
    busy: 'Entrando…',
  },
  register: {
    title: 'Crea tu perfil',
    subtitle: 'Solo necesitas tu nombre, tu apellido y una contraseña. Úsalos igual cada vez que entres.',
    submit: 'Crear perfil y entrar',
    busy: 'Creando tu perfil…',
  },
};

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const id = useId();
  const copy = MODES[mode];
  const isRegister = mode === 'register';

  const fail = (message) => {
    setError(message);
    setShake(true);
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setConfirm('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !password) {
      fail('Completa tu nombre, tu apellido y tu contraseña.');
      return;
    }
    if (isRegister && password.length < MIN_PASSWORD) {
      fail(ERRORS['auth/weak-password']);
      return;
    }
    if (isRegister && password !== confirm) {
      fail('Las dos contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (isRegister) await register(firstName, lastName, password);
      else await login(firstName, lastName, password);
    } catch (err) {
      fail(ERRORS[err.code] || 'No se pudo completar. Inténtalo de nuevo.');
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <HoloBackdrop />

      <main
        className={shake ? 'login__card is-shaking' : 'login__card'}
        onAnimationEnd={(e) => e.animationName === 'login-shake' && setShake(false)}
      >
        <img src={logo} alt="CC+CS Solutions" className="login__logo" />

        <div className="login__modes" role="tablist" aria-label="Opciones de acceso">
          <span className="login__modes-thumb" style={{ transform: isRegister ? 'translateX(100%)' : 'none' }} aria-hidden="true" />
          <button type="button" role="tab" aria-selected={!isRegister} onClick={() => switchMode('login')}>
            Ya tengo perfil
          </button>
          <button type="button" role="tab" aria-selected={isRegister} onClick={() => switchMode('register')}>
            Soy nuevo
          </button>
        </div>

        <div className="login__heading" key={mode}>
          <h1 className="login__title">{copy.title}</h1>
          <p className="login__subtitle">{copy.subtitle}</p>
        </div>

        <form className="login__form" onSubmit={onSubmit} noValidate>
          <div className="login__row">
            <div className="login__field">
              <label htmlFor={`${id}-first`}>Nombre</label>
              <input
                id={`${id}-first`}
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="login__field">
              <label htmlFor={`${id}-last`}>Apellido</label>
              <input id={`${id}-last`} autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="login__field">
            <label htmlFor={`${id}-pass`}>{isRegister ? `Contraseña (mínimo ${MIN_PASSWORD} caracteres)` : 'Contraseña'}</label>
            <div className="login__password">
              <input
                id={`${id}-pass`}
                type={showPassword ? 'text' : 'password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="login__reveal" onClick={() => setShowPassword((v) => !v)} aria-pressed={showPassword}>
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="login__field login__field--enter">
              <label htmlFor={`${id}-confirm`}>Repite la contraseña</label>
              <input
                id={`${id}-confirm`}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          )}

          {error && (
            <p className="login__error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="login__submit" disabled={busy}>
            {busy ? <span className="login__spinner" aria-hidden="true" /> : null}
            {busy ? copy.busy : copy.submit}
          </button>
        </form>
      </main>
    </div>
  );
}
