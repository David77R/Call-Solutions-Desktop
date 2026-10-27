import { itemKey } from '../../lib/search';
import { readableOn } from '../../lib/color';
import { getFavorites, getHistory } from '../../lib/favorites';

function QuickList({ title, items, onSelect }) {
  if (!items.length) return null;
  return (
    <section className="quick">
      <h3 className="quick__title">{title}</h3>
      <div className="quick__row">
        {items.slice(0, 8).map((item, i) => (
          <button key={itemKey(item)} type="button" className="quick__card" style={{ '--row-color': item.color_primary, '--i': i }} onClick={() => onSelect(item)}>
            <span className="quick__company">{item.company_name}</span>
            <span className="quick__label">{item.breed || item.label}</span>
            <span className="quick__price">{item.price_display || 'Por confirmar'}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function CompanyOverview({ companies, company, onPickCompany, onSelect, selectedKey }) {
  if (!company) {
    return (
      <div className="overview">
        <div className="overview__companies">
          {companies.map((c, i) => (
            <button
              key={c.slug}
              type="button"
              className="company-card"
              style={{ '--row-color': c.color_primary, '--on-row': readableOn(c.color_primary), '--i': i }}
              onClick={() => onPickCompany(c.slug)}
            >
              <span className="company-card__moon" aria-hidden="true" />
              <span className="company-card__name">{c.name}</span>
              <span className="company-card__meta">{(c.categories || []).length} categorías de servicio</span>
            </button>
          ))}
        </div>
        <QuickList title="Vistos hace poco" items={getHistory()} onSelect={onSelect} />
        <QuickList title="Favoritos" items={getFavorites()} onSelect={onSelect} />
      </div>
    );
  }

  return (
    <div className="overview" key={company.slug}>
      {company.notes?.length > 0 && (
        <ul className="overview__notes">
          {company.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
      <div className="overview__categories">
        {(company.categories || []).map((cat, ci) => (
          <section key={cat.name} className="category" style={{ '--i': ci }}>
            <h3 className="category__title">{cat.name}</h3>
            <ul className="category__items">
              {(cat.items || []).map((item) => {
                const row = {
                  company_slug: company.slug,
                  company_name: company.name,
                  color_primary: company.color_primary,
                  category_name: cat.name,
                  pill_label: cat.pill_label || null,
                  label: item.label,
                  price_display: item.price_display ?? null,
                  needs_review: !!item.needs_review,
                  coat: item.coat ?? null,
                  service_note: item.service_note ?? null,
                  weight_min_lbs: item.weight_min_lbs ?? null,
                  weight_max_lbs: item.weight_max_lbs ?? null,
                };
                const key = itemKey(row);
                return (
                  <li key={key}>
                    <button type="button" className={selectedKey === key ? 'category__item is-selected' : 'category__item'} onClick={() => onSelect(row)}>
                      <span>{item.label}</span>
                      <span className="category__price">{item.price_display || 'Por confirmar'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
