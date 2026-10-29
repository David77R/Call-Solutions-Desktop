import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { CloseIcon, PawIcon, SearchIcon } from '../../components/Icons';
import { coatDescriptions } from '../../data/coats';
import { useCatalog } from '../../lib/useCatalog';
import { BREEDS, COAT_LABELS, SIZE_LABELS, loadBackupPhoto, recommendServices, useBreedPhoto } from '../../lib/breedWiki';
import './BreedsPage.css';

const plain = (text) =>
  (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

function useInView(ref) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setInView(true);
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, inView]);
  return inView;
}

function Photo({ breed, enabled, large = false }) {
  const { photo, state } = useBreedPhoto(breed, enabled);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [backup, setBackup] = useState(null);
  const [failed, setFailed] = useState(false);
  const source = backup || photo;
  const candidates = source ? [...new Set([large ? source.large : source.src, ...(source.backups || [])].filter(Boolean))] : [];
  const src = failed ? null : candidates[attempt] || null;

  const onError = () => {
    if (attempt + 1 < candidates.length) {
      setAttempt(attempt + 1);
      return;
    }
    if (!backup) {
      loadBackupPhoto(breed).then((found) => {
        if (found && found.src !== candidates[attempt]) {
          setBackup(found);
          setAttempt(0);
        } else {
          setFailed(true);
        }
      });
      return;
    }
    setFailed(true);
  };

  const missing = failed || state === 'missing';
  return (
    <div className={`breed-photo${large ? ' breed-photo--large' : ''}${loaded && src ? ' is-loaded' : ''}${missing ? ' is-missing' : ''}`}>
      {src && large && loaded ? <img className="breed-photo__blur" src={src} alt="" aria-hidden="true" /> : null}
      {src ? (
        <img
          key={src}
          className="breed-photo__img"
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            onError();
          }}
        />
      ) : null}
      {(!src || !loaded) && (
        <span className="breed-photo__ph" aria-hidden="true">
          {missing ? <PawIcon size={34} /> : <span className="breed-photo__shimmer" />}
        </span>
      )}
    </div>
  );
}

function PhotoCredit({ breed }) {
  const { photo } = useBreedPhoto(breed, true);
  if (!photo) return null;
  return <span className="breed-modal__credit">Foto: {photo.source || 'Wikipedia'}</span>;
}

function BreedCard({ breed, index, onOpen }) {
  const ref = useRef(null);
  const inView = useInView(ref);
  return (
    <button ref={ref} type="button" className="breed-card" style={{ '--i': Math.min(index, 18) }} onClick={() => onOpen(breed)}>
      <Photo breed={breed} enabled={inView} />
      <span className="breed-card__body">
        <span className="breed-card__name">{breed.name}</span>
        <span className="breed-card__origin">{breed.origin}</span>
        <span className="breed-card__chips">
          <span>{breed.size}</span>
          <span>{COAT_LABELS[breed.coat]}</span>
        </span>
      </span>
    </button>
  );
}

function BreedDetail({ breed, onClose }) {
  const navigate = useNavigate();
  const catalog = useCatalog();
  const services = useMemo(() => recommendServices(breed, catalog), [breed, catalog]);
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="breed-modal" role="dialog" aria-modal="true" aria-labelledby="breed-title">
      <div className="breed-modal__backdrop" onClick={onClose} />
      <article className="breed-modal__card">
        <button ref={closeRef} type="button" className="breed-modal__close" onClick={onClose} aria-label="Cerrar ficha">
          <CloseIcon size={20} />
        </button>
        <div className="breed-modal__hero">
          <Photo breed={breed} enabled large />
          <PhotoCredit breed={breed} />
        </div>
        <div className="breed-modal__content">
          <header>
            <h2 id="breed-title" className="breed-modal__title">
              {breed.name}
            </h2>
            {breed.en !== breed.name && <p className="breed-modal__en">{breed.en}</p>}
          </header>

          <dl className="breed-facts">
            <div>
              <dt>Origen</dt>
              <dd>{breed.origin}</dd>
            </div>
            <div>
              <dt>Grupo</dt>
              <dd>{breed.group}</dd>
            </div>
            <div>
              <dt>Peso típico</dt>
              <dd>
                {Math.round(breed.weight.min)}–{Math.round(breed.weight.max)} lbs
              </dd>
            </div>
            <div>
              <dt>Tamaño</dt>
              <dd>{breed.size}</dd>
            </div>
          </dl>

          <p className="breed-modal__about">{breed.about}</p>

          <div className="breed-coat">
            <strong>{COAT_LABELS[breed.coat]}</strong>
            <span>{coatDescriptions[breed.coat]}</span>
          </div>

          <section className="breed-services" aria-label="Servicio recomendado por empresa">
            <h3>Servicio recomendado por empresa</h3>
            <ul>
              {services.map((s, i) => (
                <li key={s.slug} style={{ '--co': s.color, '--i': i }}>
                  <span className="breed-services__dot" aria-hidden="true" />
                  <span className="breed-services__co">{s.name}</span>
                  <span className="breed-services__svc">{s.service}</span>
                  <span className="breed-services__price">{s.price || '—'}</span>
                </li>
              ))}
              {!services.length && <li className="breed-services__empty">Cargando precios…</li>}
            </ul>
          </section>

          <div className="breed-modal__actions">
            <button type="button" className="breed-btn breed-btn--main" onClick={() => navigate('/precios', { state: { query: breed.key } })}>
              Cotizar esta raza
            </button>
            <a className="breed-btn" href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${breed.en} dog`)}`} target="_blank" rel="noreferrer">
              Ver más fotos
            </a>
          </div>
        </div>
      </article>
    </div>,
    document.body
  );
}

export default function BreedsPage() {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [size, setSize] = useState('');
  const [coat, setCoat] = useState('');
  const [openKey, setOpenKey] = useState(() => location.state?.breed || null);

  const list = useMemo(() => {
    const q = plain(query.trim());
    return BREEDS.filter((b) => {
      if (size && b.size !== size) return false;
      if (coat && b.coat !== coat) return false;
      return !q || plain(`${b.name} ${b.en} ${b.key} ${b.origin}`).includes(q);
    });
  }, [query, size, coat]);

  const open = BREEDS.find((b) => b.key === openKey) || null;

  return (
    <div className="breeds">
      <header className="breeds__head">
        <div>
          <h1 className="breeds__title">Razas</h1>
          <p className="breeds__sub">
            {BREEDS.length} razas con su origen, pelaje y el servicio que les recomendamos en cada empresa.
          </p>
        </div>
        <label className="breeds__search">
          <SearchIcon size={18} />
          <span className="sf-sr">Buscar raza</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar raza u origen" />
        </label>
      </header>

      <div className="breeds__filters">
        <div role="group" aria-label="Tamaño">
          {['', ...SIZE_LABELS].map((s) => (
            <button key={s || 'all'} type="button" aria-pressed={size === s} onClick={() => setSize(s)}>
              {s || 'Todos los tamaños'}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Pelaje">
          {['', ...Object.keys(COAT_LABELS)].map((c) => (
            <button key={c || 'all'} type="button" aria-pressed={coat === c} onClick={() => setCoat(c)}>
              {c ? COAT_LABELS[c] : 'Todos los pelajes'}
            </button>
          ))}
        </div>
      </div>

      <p className="breeds__count">
        {list.length} {list.length === 1 ? 'raza' : 'razas'}
      </p>

      <div className="breeds__grid">
        {list.map((b, i) => (
          <BreedCard key={b.key} breed={b} index={i} onOpen={(x) => setOpenKey(x.key)} />
        ))}
        {!list.length && <p className="breeds__empty">No hay razas que coincidan.</p>}
      </div>

      {open && <BreedDetail breed={open} onClose={() => setOpenKey(null)} />}
    </div>
  );
}
