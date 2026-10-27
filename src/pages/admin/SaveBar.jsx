export default function SaveBar({ dirty, status, error, onSave, onDiscard }) {
  if (!dirty && status !== 'saved') return null;
  return (
    <div className={`savebar is-${status}`} role="status">
      <span>{status === 'saved' ? 'Cambios guardados. Ya los ve todo el equipo, en escritorio y en el teléfono.' : error || 'Tienes cambios sin guardar.'}</span>
      {dirty && (
        <span className="savebar__actions">
          <button type="button" className="sf-chip" onClick={onDiscard} disabled={status === 'saving'}>
            Descartar
          </button>
          <button type="button" className="savebar__save" onClick={onSave} disabled={status === 'saving'}>
            {status === 'saving' ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </span>
      )}
    </div>
  );
}

export function useSaver(save) {
  return async (setStatus, setError, payload, onDone) => {
    setStatus('saving');
    setError('');
    try {
      await save(payload);
      setStatus('saved');
      onDone?.();
      setTimeout(() => setStatus('idle'), 2600);
    } catch (e) {
      setStatus('error');
      setError(e.message || 'No se pudo guardar.');
    }
  };
}
