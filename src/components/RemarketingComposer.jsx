import { useEffect, useMemo, useState } from 'react';
import { CheckIcon, CopyIcon } from './Icons';
import { CAMPAIGNS, CTAS, DISCOUNTS, GIFTS, buildRemarketing, dentalOffer } from '../lib/remarketingMessage';

const COPIED_MS = 1800;

function formatDate(value, lang) {
  if (!value) return '';
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-VE', { weekday: 'long', day: 'numeric', month: 'long' });
}

function Chips({ label, options, value, onChange }) {
  return (
    <fieldset className="rmkt__chips">
      <legend>{label}</legend>
      <div>
        {options.map((o) => (
          <button key={o.key} type="button" aria-pressed={value === o.key} onClick={() => onChange(o.key)}>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Switch({ label, checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="rmkt__switch" onClick={() => onChange(!checked)}>
      <span className="rmkt__switch-track" aria-hidden="true">
        <span />
      </span>
      {label}
    </button>
  );
}

export default function RemarketingComposer({ lang, company, rows }) {
  const [campaign, setCampaign] = useState('regreso');
  const [client, setClient] = useState('');
  const [pet, setPet] = useState('');
  const [discount, setDiscount] = useState(0);
  const [gift, setGift] = useState('');
  const [limited, setLimited] = useState(false);
  const [untilOn, setUntilOn] = useState(false);
  const [until, setUntil] = useState('');
  const [cta, setCta] = useState('si');
  const [phone, setPhone] = useState('');
  const [showPrice, setShowPrice] = useState(true);
  const [stop, setStop] = useState(true);
  const [copied, setCopied] = useState(false);

  const offer = useMemo(() => dentalOffer(rows, company?.slug), [rows, company?.slug]);

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(t);
  }, [copied]);

  const message = buildRemarketing({
    lang,
    companyName: company?.name,
    campaign,
    client,
    pet,
    discount,
    gift,
    limited,
    until: untilOn ? formatDate(until, lang) : '',
    cta,
    phone,
    showPrice,
    stop,
    offer,
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rmkt">
      {!company && <p className="rmkt__warn">Elige la empresa arriba para que el mensaje lleve su nombre.</p>}

      <div className="rmkt__campaigns" role="radiogroup" aria-label="Tipo de campaña">
        {CAMPAIGNS.map((c, i) => (
          <button key={c.key} type="button" role="radio" aria-checked={campaign === c.key} style={{ '--i': i }} onClick={() => setCampaign(c.key)}>
            <strong>{c.label}</strong>
            <span>{c.hint}</span>
          </button>
        ))}
      </div>

      {campaign === 'dental' && company && !offer && <p className="rmkt__warn">Esta empresa no tiene precios de limpieza dental en el catálogo.</p>}

      <div className="rmkt__row">
        <label className="msg-field">
          <span>Cliente (opcional)</span>
          <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="María" />
        </label>
        <label className="msg-field">
          <span>Mascota (opcional)</span>
          <input value={pet} onChange={(e) => setPet(e.target.value)} placeholder="Max" />
        </label>
      </div>

      <Chips label="Descuento" options={DISCOUNTS.map((d) => ({ key: d, label: d ? `${d}%` : 'Sin descuento' }))} value={discount} onChange={setDiscount} />
      <Chips label="Adicional de cortesía" options={GIFTS} value={gift} onChange={setGift} />

      <div className="rmkt__switches">
        <Switch label="Cupos limitados" checked={limited} onChange={setLimited} />
        <Switch label="Fecha límite" checked={untilOn} onChange={setUntilOn} />
        {campaign === 'dental' && offer && <Switch label={`Mostrar precio (desde ${offer.price})`} checked={showPrice} onChange={setShowPrice} />}
        <Switch label="Opción para darse de baja (STOP)" checked={stop} onChange={setStop} />
      </div>

      {untilOn && (
        <label className="msg-field rmkt__until">
          <span>Válida hasta</span>
          <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
        </label>
      )}

      <Chips label="Llamado a la acción" options={CTAS} value={cta} onChange={setCta} />
      {cta === 'llamar' && (
        <label className="msg-field rmkt__until">
          <span>Teléfono</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(305) 555-0123" inputMode="tel" />
        </label>
      )}

      <div className={copied ? 'rmkt__preview is-copied' : 'rmkt__preview'}>
        <p key={message}>{message}</p>
        <button type="button" className="rmkt__copy" onClick={copy}>
          {copied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
          {copied ? 'Mensaje copiado' : 'Copiar mensaje de remarketing'}
        </button>
      </div>
    </div>
  );
}
