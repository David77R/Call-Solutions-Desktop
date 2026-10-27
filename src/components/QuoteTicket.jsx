import { useEffect, useId, useState } from 'react';
import AnimatedPrice from './AnimatedPrice';
import ZonePicker from './ZonePicker';
import { AlertIcon, CheckIcon, CloseIcon, CopyIcon, PawIcon, StarIcon } from './Icons';
import { coatDescriptions } from '../data/coats';
import { getServiceDescription } from '../data/serviceDescriptions';
import { isDiscountEligible, itemKey, parsePrice } from '../lib/search';
import { isFavorite, toggleFavorite } from '../lib/favorites';
import { buildBreedSuggestion, buildQuoteMessage } from '../lib/quoteMessage';
import fifo from '../assets/fifo.png';
import './QuoteTicket.css';

const money = (n) => `$${n.toFixed(2)}`;

function EmptyTicket() {
  return (
    <div className="ticket ticket--empty">
      <img src={fifo} alt="" className="ticket__fifo" />
      <p className="ticket__empty-title">Arma la cotización</p>
      <p className="ticket__empty-body">Busca una raza, un peso o un servicio y elige un resultado. Aquí aparece el precio listo para decirlo en la llamada.</p>
      <p className="ticket__empty-keys">
        <span>
          <kbd>/</kbd> para buscar
        </span>
        <span>
          <kbd>Enter</kbd> elige el primero
        </span>
      </p>
    </div>
  );
}

export default function QuoteTicket({ item, descriptions, rows, breedFromQuery, lang, onLangChange, onClose }) {
  if (!item) return <EmptyTicket />;
  return (
    <FilledTicket
      key={itemKey(item)}
      item={item}
      descriptions={descriptions}
      rows={rows}
      breedFromQuery={breedFromQuery}
      lang={lang}
      onLangChange={onLangChange}
      onClose={onClose}
    />
  );
}

function FilledTicket({ item, descriptions, rows, breedFromQuery, lang, onLangChange, onClose }) {
  const isBundle = item.type === 'breed_bundle';
  const [optionIndex, setOptionIndex] = useState(0);
  const setLang = onLangChange;
  const [favorited, setFavorited] = useState(() => isFavorite(item));
  const [favPulse, setFavPulse] = useState(0);
  const [copied, setCopied] = useState(false);
  const [suggestionCopied, setSuggestionCopied] = useState(false);
  const [zone, setZone] = useState(null);
  const [discountText, setDiscountText] = useState('');
  const discountId = useId();

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    if (!suggestionCopied) return undefined;
    const t = setTimeout(() => setSuggestionCopied(false), 1800);
    return () => clearTimeout(t);
  }, [suggestionCopied]);

  const option = isBundle ? item.options?.[optionIndex] : null;
  const title = isBundle ? item.breed : item.label;
  const subtitle = isBundle
    ? item.weight_min_lbs != null
      ? `${item.weight_min_lbs}-${item.weight_max_lbs} lbs`
      : null
    : item.category_name;
  const priceText = isBundle ? option?.price : item.price_display;
  const needsReview = isBundle ? option?.needs_review : item.needs_review;
  const serviceName = isBundle ? option?.name : item.pill_label || item.category_name;
  const description = getServiceDescription(descriptions, serviceName, item.company_slug, lang);
  const surchargeApplied = !isBundle && item.surcharge_amount_applied && item.original_price_display;

  const base = parsePrice(priceText);
  const pct = parseFloat(discountText);
  const discount = isDiscountEligible(item) && discountText.trim() && pct > 0 && pct <= 100 ? { pct } : null;
  const zoneFee = item.company_slug === 'cruzin' && zone ? zone.fee : 0;
  const afterDiscount = base != null && discount ? base - (base * pct) / 100 : base;
  const total = afterDiscount != null ? afterDiscount + zoneFee : null;
  const showTotal = total != null && (discount || (zone && item.company_slug === 'cruzin'));

  const message = buildQuoteMessage({
    item: isBundle ? item : { ...item, price_display: priceText },
    rows,
    descriptions,
    lang,
    breedFromQuery,
    optionIndex,
    zone: item.company_slug === 'cruzin' && zone ? zone : null,
    zoneTotal: total != null ? money(total) : null,
    discount,
    discountTotal: afterDiscount != null ? money(afterDiscount) : null,
  });

  const suggestion = buildBreedSuggestion({ item, rows, lang, breedFromQuery, optionIndex });

  const handleCopySuggestion = async () => {
    try {
      await navigator.clipboard.writeText(suggestion);
      setSuggestionCopied(true);
    } catch {
      setSuggestionCopied(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const handleFavorite = () => {
    setFavorited(toggleFavorite(item));
    setFavPulse((n) => n + 1);
  };

  return (
    <article className="ticket" aria-live="polite">
      <header className="ticket__head">
        <span className="ticket__company">
          <span className="ticket__company-dot" aria-hidden="true" />
          {item.company_name}
        </span>
        <div className="ticket__actions">
          <button
            type="button"
            className={favorited ? 'ticket__icon-btn is-on' : 'ticket__icon-btn'}
            onClick={handleFavorite}
            aria-pressed={favorited}
            aria-label={favorited ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            title={favorited ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          >
            <StarIcon key={favPulse} filled={favorited} className={favPulse ? 'pop' : undefined} />
          </button>
          {onClose && (
            <button type="button" className="ticket__icon-btn ticket__close" onClick={onClose} aria-label="Quitar esta cotización" title="Quitar esta cotización (Esc)">
              <CloseIcon size={20} />
            </button>
          )}
        </div>
      </header>

      <div className="ticket__titles">
        <h2 className="ticket__title">{title}</h2>
        {subtitle && <p className="ticket__subtitle">{subtitle}</p>}
        {item.coat && coatDescriptions[item.coat] && <p className="ticket__coat">{coatDescriptions[item.coat]}</p>}
      </div>

      {isBundle && item.options?.length > 1 && (
        <div className="ticket__options" role="radiogroup" aria-label="Servicio">
          {item.options.map((opt, i) => (
            <button
              key={`${opt.name}-${i}`}
              type="button"
              role="radio"
              aria-checked={i === optionIndex}
              className={i === optionIndex ? 'ticket__option is-active' : 'ticket__option'}
              onClick={() => setOptionIndex(i)}
            >
              {opt.name}
            </button>
          ))}
        </div>
      )}

      <div className="ticket__price-block">
        {surchargeApplied && <span className="ticket__price-old">{item.original_price_display}</span>}
        <AnimatedPrice display={priceText} className="ticket__price" />
        {needsReview && <span className="ticket__badge">Verificar precio</span>}
      </div>

      <div className="ticket__perforation" aria-hidden="true" />

      {description && (
        <div className="ticket__description">
          <span className="ticket__description-label">{lang === 'en' ? 'Includes' : 'Incluye'}</span>
          <p key={`${lang}-${description}`} className="ticket__description-text">
            {description}
          </p>
        </div>
      )}

      {item.company_slug === 'cruzin' && !isBundle && <ZonePicker zone={zone} onChange={setZone} />}

      {isDiscountEligible(item) && (
        <div className="ticket-field">
          <label htmlFor={discountId} className="ticket-field__label">
            Descuento (%)
          </label>
          <input
            id={discountId}
            className="ticket-field__input"
            inputMode="decimal"
            placeholder="Ej. 30"
            value={discountText}
            onChange={(e) => setDiscountText(e.target.value.replace(/[^0-9.]/g, ''))}
          />
        </div>
      )}

      {showTotal && (
        <div className="ticket__total">
          {discount && (
            <div className="ticket__line">
              <span>Descuento {pct}%</span>
              <span>-{money(base - afterDiscount)}</span>
            </div>
          )}
          {zone && zoneFee > 0 && (
            <div className="ticket__line">
              <span>Millaje, {zone.name}</span>
              <span>+{money(zoneFee)}</span>
            </div>
          )}
          <div className="ticket__line ticket__line--total">
            <span>Total</span>
            <AnimatedPrice display={money(total)} className="ticket__total-value" />
          </div>
        </div>
      )}

      <div className="ticket__alerts">
        {item.suggested && <p className="ticket__alert ticket__alert--info">Sugerido por el peso, no por el nombre.</p>}
        {item.only_gold_alert && (
          <p className="ticket__alert">
            <AlertIcon size={16} />
            {item.only_gold_alert}: esta raza siempre se cotiza como servicio completo.
          </p>
        )}
        {item.surcharge_alert && (
          <p className="ticket__alert">
            <AlertIcon size={16} />
            {item.surcharge_alert}.
          </p>
        )}
        {item.double_coat_large_alert && (
          <p className="ticket__alert">
            <AlertIcon size={16} />
            {item.double_coat_large_alert}
          </p>
        )}
        {item.service_note && <p className="ticket__alert ticket__alert--info">{item.service_note}</p>}
      </div>

      <div className="ticket__lang">
        <span className="ticket__lang-label">Idioma del mensaje</span>
        <div className="lang-toggle" role="group" aria-label="Idioma del mensaje">
          <span className="lang-toggle__thumb" style={{ transform: lang === 'en' ? 'translateX(100%)' : 'none' }} aria-hidden="true" />
          <button type="button" aria-pressed={lang === 'es'} onClick={() => setLang('es')}>
            Español
          </button>
          <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
            English
          </button>
        </div>
      </div>

      <details className="ticket__preview">
        <summary>Ver el mensaje que se copia</summary>
        <p key={message} className="ticket__preview-text">
          {message}
        </p>
      </details>

      <button type="button" className={copied ? 'ticket__copy is-done' : 'ticket__copy'} onClick={handleCopy}>
        <span className="ticket__copy-icon">{copied ? <CheckIcon /> : <CopyIcon />}</span>
        {copied ? 'Mensaje copiado' : 'Copiar mensaje para el cliente'}
      </button>

      {suggestion && (
        <section className="suggestion" aria-label="Sugerencia para esta raza">
          <header className="suggestion__head">
            <span className="suggestion__title">
              <PawIcon size={18} />
              Sugerencia para esta raza
            </span>
            <button type="button" className={suggestionCopied ? 'suggestion__copy is-done' : 'suggestion__copy'} onClick={handleCopySuggestion}>
              {suggestionCopied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
              {suggestionCopied ? 'Copiada' : 'Copiar'}
            </button>
          </header>
          <p key={suggestion} className="suggestion__text">
            {suggestion}
          </p>
        </section>
      )}
    </article>
  );
}
