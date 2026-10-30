import { useEffect, useState } from 'react';
import './SyncNotice.css';

const ERRORS = {
  'permission-denied': 'La base de datos no le da permiso a esta cuenta para leerlos. Cierra sesión y vuelve a entrar; si sigue igual, hay que revisar las reglas de Firestore.',
  unauthenticated: 'La sesión expiró. Cierra sesión y vuelve a entrar.',
  unavailable: 'No hay conexión con la base de datos en este momento.',
};

export default function SyncNotice({ fromCache, error, what }) {
  const [late, setLate] = useState(false);

  useEffect(() => {
    if (!fromCache) {
      setLate(false);
      return undefined;
    }
    const t = setTimeout(() => setLate(true), 6000);
    return () => clearTimeout(t);
  }, [fromCache]);

  if (error) {
    return (
      <div className="sync-notice is-error" role="alert">
        <strong>No se pudieron cargar {what}.</strong>
        <span>{ERRORS[error] || `Error: ${error}. Recarga la página.`}</span>
        <button type="button" onClick={() => window.location.reload()}>
          Recargar
        </button>
      </div>
    );
  }

  if (fromCache && late) {
    return (
      <div className="sync-notice" role="status">
        <strong>Sin conexión con la base de datos.</strong>
        <span>Lo que ves es la última copia guardada en este equipo y puede no incluir lo que marcó el resto del equipo.</span>
        <button type="button" onClick={() => window.location.reload()}>
          Recargar
        </button>
      </div>
    );
  }

  return null;
}
