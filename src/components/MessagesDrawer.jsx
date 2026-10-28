import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon, CloseIcon, CopyIcon, SearchIcon } from './Icons';
import { shortCompanyName } from './CompanyTabs';
import { useCatalog } from '../lib/useCatalog';
import { useAuth } from '../lib/AuthContext';
import { accentTokens } from '../lib/color';
import { AUTO_FIELDS, FIELD_LABELS, TEMPLATE_GROUPS } from '../data/messageTemplates';
import {
  OPEN_EVENT,
  countUsage,
  fillTemplate,
  placeholders,
  readMessageLang,
  readUsage,
  saveMessageLang,
  useMessageTemplates,
} from '../lib/messageTemplates';
import './MessagesDrawer.css';

const COPIED_MS = 1600;
const FLASH_MS = 1800;

const fieldLabel = (key) => FIELD_LABELS[key] || AUTO_FIELDS[key] || key;

function Preview({ text, values }) {
  const parts = text.split(/(\{[a-z_]+\})/g);
  return (
    <p className="msg-card__text">
      {parts.map((part, i) => {
        const key = part.match(/^\{([a-z_]+)\}$/)?.[1];
        if (!key) return <span key={i}>{part}</span>;
        return values[key] ? (
          <mark key={i} className="msg-card__filled">
            {values[key]}
          </mark>
        ) : (
          <mark key={i} className="msg-card__hole">
            {fieldLabel(key)}
          </mark>
        );
      })}
    </p>
  );
}

function MessageCard({ template, lang, auto, index, flash, onCopied }) {
  const text = template[lang] || template.es || '';
  const fields = placeholders(text).filter((k) => !(k in AUTO_FIELDS));
  const [values, setValues] = useState({});
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);
  const all = { ...auto, ...values };

  useEffect(() => {
    if (!flash) return;
    ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [flash]);

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    const out = fillTemplate(text, all).replace(/\{([a-z_]+)\}/g, (m, key) => `[${fieldLabel(key)}]`);
    try {
      await navigator.clipboard.writeText(out);
      setCopied(true);
      onCopied(template.id);
    } catch {
      setCopied(false);
    }
  };

  return (
    <li ref={ref} className={`msg-card${copied ? ' is-copied' : ''}${flash ? ' is-flash' : ''}`} style={{ '--i': Math.min(index, 12) }}>
      <div className="msg-card__head">
        <span className="msg-card__title">{template.title}</span>
        <button type="button" className="msg-card__copy" onClick={copy} aria-label={`Copiar ${template.title}`}>
          {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <Preview text={text} values={all} />
      {fields.length > 0 && (
        <div className="msg-card__fields">
          {fields.map((key) => (
            <label key={key} className="msg-field">
              <span>{fieldLabel(key)}</span>
              <input value={values[key] || ''} onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))} />
            </label>
          ))}
        </div>
      )}
    </li>
  );
}

export default function MessagesDrawer() {
  const { items } = useMessageTemplates();
  const { companies } = useCatalog();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState(readMessageLang);
  const [slug, setSlug] = useState(null);
  const [query, setQuery] = useState('');
  const [flashId, setFlashId] = useState(null);
  const [usage, setUsage] = useState(readUsage);
  const searchRef = useRef(null);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const onOpen = (e) => {
      const detail = e.detail || {};
      if (detail.companySlug) setSlug(detail.companySlug);
      if (detail.lang) setLang(detail.lang);
      setQuery('');
      setFlashId(detail.focusId || null);
      setUsage(readUsage());
      setOpen(true);
    };
    const onKey = (e) => {
      const tag = e.target.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
      if (e.key === 'Escape' && openRef.current) {
        e.stopImmediatePropagation();
        setOpen(false);
        return;
      }
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setFlashId(null);
        setUsage(readUsage());
        setOpen((o) => !o);
      }
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener('keydown', onKey, true);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => searchRef.current?.focus(), 260);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!flashId) return undefined;
    const t = setTimeout(() => setFlashId(null), FLASH_MS);
    return () => clearTimeout(t);
  }, [flashId]);

  const company = companies.find((c) => c.slug === slug) || null;
  const auto = { empresa: company?.name || '', agente: (user?.displayName || '').split(' ')[0] };

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = items.filter((t) => !q || `${t.title} ${t.es} ${t.en}`.toLowerCase().includes(q));
    return TEMPLATE_GROUPS.map((g) => ({
      ...g,
      items: visible.filter((t) => (t.group || 'antes') === g.key).sort((a, b) => (usage[b.id] || 0) - (usage[a.id] || 0)),
    })).filter((g) => g.items.length);
  }, [items, query, usage]);

  const changeLang = (next) => {
    setLang(next);
    saveMessageLang(next);
  };

  let index = 0;

  return (
    <div className={open ? 'msgs is-open' : 'msgs'} aria-hidden={!open}>
      <div className="msgs__backdrop" onClick={() => setOpen(false)} />
      <aside className="msgs__panel" role="dialog" aria-modal="true" aria-label="Mensajes listos" style={accentTokens(company?.color_primary)} inert={!open}>
        <header className="msgs__head">
          <div>
            <h2 className="msgs__title">Mensajes listos</h2>
            <p className="msgs__sub">
              Elige, completa y copia. Abre y cierra con la tecla <kbd>M</kbd>.
            </p>
          </div>
          <button type="button" className="msgs__close" onClick={() => setOpen(false)} aria-label="Cerrar mensajes">
            <CloseIcon size={20} />
          </button>
        </header>

        <div className="msgs__tools">
          <label className="msgs__search">
            <SearchIcon size={18} />
            <span className="sf-sr">Buscar mensaje</span>
            <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar mensaje" />
          </label>
          <div className="lang-toggle msgs__lang" role="group" aria-label="Idioma">
            <span className="lang-toggle__thumb" style={{ transform: lang === 'en' ? 'translateX(100%)' : 'none' }} aria-hidden="true" />
            <button type="button" aria-pressed={lang === 'es'} onClick={() => changeLang('es')}>
              Español
            </button>
            <button type="button" aria-pressed={lang === 'en'} onClick={() => changeLang('en')}>
              English
            </button>
          </div>
        </div>

        <div className="msgs__companies" role="group" aria-label="Empresa del mensaje">
          {companies.map((c) => (
            <button
              key={c.slug}
              type="button"
              aria-pressed={slug === c.slug}
              style={{ '--co': c.color_primary }}
              onClick={() => setSlug((s) => (s === c.slug ? null : c.slug))}
            >
              <span aria-hidden="true" />
              {shortCompanyName(c.name)}
            </button>
          ))}
        </div>

        <div className="msgs__list">
          {groups.map((g) => (
            <section key={g.key} className="msgs__group">
              <h3>{g.label}</h3>
              <ul>
                {g.items.map((t) => (
                  <MessageCard
                    key={`${t.id}-${lang}`}
                    template={t}
                    lang={lang}
                    auto={auto}
                    index={index++}
                    flash={open && flashId === t.id}
                    onCopied={(id) => setUsage(countUsage(id))}
                  />
                ))}
              </ul>
            </section>
          ))}
          {!groups.length && <p className="msgs__empty">No hay mensajes que coincidan con "{query}".</p>}
        </div>
      </aside>
    </div>
  );
}
