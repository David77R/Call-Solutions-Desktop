import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import CompanyTabs, { shortCompanyName } from '../../components/CompanyTabs';
import WeightDial from '../../components/WeightDial';
import QuoteTicket from '../../components/QuoteTicket';
import { CloseIcon, SearchIcon } from '../../components/Icons';
import ResultsList from './ResultsList';
import CompanyOverview from './CompanyOverview';
import { useCatalog } from '../../lib/useCatalog';
import { useServiceDescriptions } from '../../lib/useServiceDescriptions';
import { accentTokens } from '../../lib/color';
import { addToHistory } from '../../lib/favorites';
import {
  catCoverage,
  extractWeightLbs,
  isCatQuery,
  findBreed,
  getBreedBundle,
  getSizeBands,
  isBreedCategory,
  itemKey,
  searchPriceItems,
  stripWeight,
  titleCase,
} from '../../lib/search';
import './PricesPage.css';

const STATUS_TEXT = {
  loading: 'Cargando catálogo…',
  live: 'Precios al día',
  offline: 'Sin conexión, usando la última copia',
};

const MIN_BREED_CHARS = 3;

export default function PricesPage() {
  const catalog = useCatalog();
  const descriptions = useServiceDescriptions();
  const [activeSlug, setActiveSlug] = useState(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [selectedBreed, setSelectedBreed] = useState(null);
  const [lang, setLang] = useState('es');
  const inputRef = useRef(null);
  const location = useLocation();
  const openedFromState = useRef(false);

  const trimmed = query.trim();
  const results = useMemo(
    () => (trimmed && catalog.rows.length ? searchPriceItems(catalog, trimmed, activeSlug) : null),
    [catalog, trimmed, activeSlug]
  );

  const weight = trimmed ? extractWeightLbs(trimmed) : null;
  const breedText = trimmed ? stripWeight(trimmed) : '';
  const catQuery = trimmed ? isCatQuery(trimmed) : false;
  const breed = !catQuery && breedText.length >= MIN_BREED_CHARS ? findBreed(breedText) : null;
  const catMissing = useMemo(() => (catQuery ? catCoverage(catalog.companies.filter((c) => !activeSlug || c.slug === activeSlug)) : []), [catQuery, catalog.companies, activeSlug]);

  const activeCompany = catalog.companies.find((c) => c.slug === activeSlug) || null;
  const dialSlug = activeSlug || selected?.company_slug || results?.[0]?.company_slug || null;
  const dialCompany = catalog.companies.find((c) => c.slug === dialSlug) || null;
  const bands = useMemo(() => getSizeBands(dialCompany), [dialCompany]);
  const showDial = Boolean(dialCompany && bands.length && (weight != null || breed));

  const accentColor = selected?.color_primary || activeCompany?.color_primary || null;

  const handleSelect = useCallback(
    (item) => {
      const breedLabel = item.breed || (isBreedCategory(item.category_name) ? item.label : null);
      let next = null;
      if (breedLabel) next = getBreedBundle(catalog, item.company_slug, breedLabel);
      if (!next) {
        const key = itemKey(item);
        const fresh = catalog.rows.find((r) => itemKey(r) === key);
        next = item.price_display !== undefined && item.weight_match !== undefined ? item : fresh || item;
      }
      addToHistory(next);
      setSelected(next);
      setSelectedBreed(catQuery || item.is_cat ? 'Gato' : breed ? titleCase(breed.breed) : null);
    },
    [catalog, breed, catQuery]
  );

  const clearSelected = useCallback(() => {
    setSelected(null);
    setSelectedBreed(null);
  }, []);

  useEffect(() => {
    const incoming = location.state?.item;
    if (!incoming || openedFromState.current || !catalog.rows.length) return;
    openedFromState.current = true;
    handleSelect(incoming);
  }, [location.state, catalog.rows.length, handleSelect]);

  const handleCompany = (slug) => {
    setActiveSlug(slug);
    if (slug && selected && selected.company_slug !== slug) clearSelected();
  };

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;
      if (e.key === '/' && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === 'Escape' && !typing) clearSelected();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearSelected]);

  const onInputKey = (e) => {
    if (e.key === 'Escape') {
      if (query) setQuery('');
      else clearSelected();
    }
    if (e.key === 'Enter' && results?.length) {
      handleSelect(results[0]);
    }
  };

  return (
    <div className="prices" style={accentTokens(accentColor)}>
      <div className="prices__top">
        <CompanyTabs companies={catalog.companies} activeSlug={activeSlug} onChange={handleCompany} />
        <span className={`prices__status is-${catalog.status}`}>
          <span className="prices__status-dot" aria-hidden="true" />
          {STATUS_TEXT[catalog.status]}
        </span>
      </div>

      <div className="prices__body">
        <div className="prices__main">
          <div className="search">
            <label htmlFor="price-search" className="search__label">
              Raza, peso o servicio que dice el cliente
            </label>
            <div className="search__field">
              <SearchIcon size={26} className="search__icon" />
              <input
                id="price-search"
                ref={inputRef}
                className="search__input"
                value={query}
                autoComplete="off"
                spellCheck="false"
                placeholder={activeCompany ? `Buscar en ${shortCompanyName(activeCompany.name)}` : 'Golden retriever 70 lbs'}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                autoFocus
              />
              {query && (
                <button type="button" className="search__clear" aria-label="Borrar búsqueda" onClick={() => setQuery('')}>
                  <CloseIcon size={18} />
                </button>
              )}
              <span className="search__underline" aria-hidden="true" />
            </div>
          </div>

          {showDial && (
            <WeightDial bands={bands} color={dialCompany.color_primary} weight={weight} breed={breed} companyKey={dialCompany.slug} />
          )}

          {results ? (
            <ResultsList results={results} query={trimmed} selectedKey={itemKey(selected)} onSelect={handleSelect} catMissing={catMissing} />
          ) : (
            <CompanyOverview
              companies={catalog.companies}
              company={activeCompany}
              onPickCompany={handleCompany}
              onSelect={handleSelect}
              selectedKey={itemKey(selected)}
            />
          )}
        </div>

        <aside className="prices__ticket" aria-label="Cotización">
          <QuoteTicket
            item={selected}
            descriptions={descriptions}
            rows={catalog.rows}
            breedFromQuery={selectedBreed}
            lang={lang}
            onLangChange={setLang}
            onClose={clearSelected}
          />
        </aside>
      </div>
    </div>
  );
}
