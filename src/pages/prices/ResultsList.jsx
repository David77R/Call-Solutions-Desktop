import { itemKey, labelWithRange } from '../../lib/search';
import fifo from '../../assets/fifo.webp';

function groupByCompany(results) {
  const groups = [];
  const index = new Map();
  for (const row of results) {
    if (!index.has(row.company_slug)) {
      index.set(row.company_slug, groups.length);
      groups.push({ slug: row.company_slug, name: row.company_name, color: row.color_primary, rows: [] });
    }
    groups[index.get(row.company_slug)].rows.push(row);
  }
  return groups;
}

function Badges({ row }) {
  return (
    <span className="result__badges">
      {row.needs_review && <span className="result__badge result__badge--warn">Verificar</span>}
      {row.suggested && <span className="result__badge">Por peso</span>}
      {row.surcharge_alert && <span className="result__badge result__badge--warn">Cargo especial</span>}
      {row.only_gold_alert && <span className="result__badge result__badge--warn">Solo Gold</span>}
      {row.double_coat_large_alert && <span className="result__badge result__badge--warn">Precio Large</span>}
    </span>
  );
}

export default function ResultsList({ results, query, selectedKey, onSelect }) {
  if (!results.length) {
    return (
      <div className="results-empty">
        <img src={fifo} alt="" className="results-empty__fifo" />
        <p className="results-empty__title">No encontré “{query}”</p>
        <p className="results-empty__body">Revisa la ortografía, prueba con el nombre de la raza o agrega el peso, por ejemplo “husky 60 lbs”.</p>
        <a className="results-empty__link" href={`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`} target="_blank" rel="noreferrer">
          Ver “{query}” en Google Imágenes
        </a>
      </div>
    );
  }

  let order = 0;
  return (
    <div className="results">
      <p className="results__count">
        {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
      </p>
      {groupByCompany(results).map((group) => (
        <section key={group.slug} className="results__group" style={{ '--row-color': group.color }}>
          <h3 className="results__group-title">
            <span className="results__group-dot" aria-hidden="true" />
            {group.name}
          </h3>
          <ul className="results__list">
            {group.rows.map((row) => {
              const key = itemKey(row);
              const i = order++;
              return (
                <li key={key} style={{ '--i': Math.min(i, 14) }}>
                  <button type="button" className={selectedKey === key ? 'result is-selected' : 'result'} onClick={() => onSelect(row)}>
                    <span className="result__text">
                      <span className="result__label">{labelWithRange(row)}</span>
                      <span className="result__category">{row.category_name}</span>
                      <Badges row={row} />
                    </span>
                    <span className="result__price">{row.price_display || 'Por confirmar'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
