import { useState } from 'react';
import CompanyTabs from '../../components/CompanyTabs';
import { useCatalog } from '../../lib/useCatalog';
import { useAuth } from '../../lib/AuthContext';
import { useGroomerRosters } from '../../lib/useGroomerRosters';
import { deleteQualityEntry, useQualityEntries } from '../../lib/qualityControl';
import { Composer, QualityEntry, QualityStats } from './QualityParts';
import { labelFromDateKey, shiftDateKey, todayKey } from '../../lib/summaries';
import { accentTokens } from '../../lib/color';

export default function QualityPage() {
  const { companies } = useCatalog();
  const { user } = useAuth();
  const rosters = useGroomerRosters();
  const [slug, setSlug] = useState(undefined);
  const [dateKey, setDateKey] = useState(todayKey());
  const entries = useQualityEntries(dateKey);
  const showingAll = slug === null;
  const company = showingAll ? null : companies.find((c) => c.slug === slug) || companies[0] || null;
  const list = showingAll ? entries : entries.filter((e) => e.company_slug === company?.slug);
  const companyOf = (s) => companies.find((c) => c.slug === s);
  const isToday = dateKey === todayKey();

  return (
    <div className="qc" style={accentTokens(company?.color_primary)}>
      <div className="qc__head">
        <h1 className="qc__title">Control de calidad</h1>
        <div className="date-nav">
          <button type="button" className="date-nav__btn" aria-label="Día anterior" onClick={() => setDateKey((k) => shiftDateKey(k, -1))}>
            ‹
          </button>
          <span className="qc__date">{labelFromDateKey(dateKey)}</span>
          <button type="button" className="date-nav__btn" aria-label="Día siguiente" disabled={isToday} onClick={() => setDateKey((k) => shiftDateKey(k, 1))}>
            ›
          </button>
        </div>
      </div>

      <CompanyTabs companies={companies} activeSlug={company?.slug ?? null} onChange={setSlug} />

      {showingAll && <p className="qc-hint">Viendo los controles de todas las empresas. Elige una empresa para registrar uno nuevo.</p>}

      {company && <Composer key={`${company.slug}-${dateKey}`} company={company} roster={rosters[company.slug] || []} agentName={user?.displayName || 'Agente'} dateKey={dateKey} />}

      <QualityStats list={list} />

      <ul className="qc-list">
        {list.map((e, i) => (
          <QualityEntry
            key={e.id}
            entry={e}
            index={i}
            company={showingAll ? companyOf(e.company_slug) : null}
            onDelete={deleteQualityEntry}
            editCompany={companyOf(e.company_slug)}
            roster={rosters[e.company_slug] || []}
            agentName={user?.displayName || 'Agente'}
          />
        ))}
        {!list.length && <li className="qc-empty">Sin controles registrados {showingAll ? 'en ninguna empresa' : `para ${company?.name}`} en este día.</li>}
      </ul>
    </div>
  );
}
