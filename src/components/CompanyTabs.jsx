import { useLayoutEffect, useRef, useState } from 'react';
import { MOON, readableOn } from '../lib/color';
import './CompanyTabs.css';

export function shortCompanyName(name) {
  return name.replace(/\s*(Mobile\s+)?(Pet\s+)?Grooming$/i, '').trim() || name;
}

export default function CompanyTabs({ companies, activeSlug, onChange, showAll = true }) {
  const listRef = useRef(null);
  const tabRefs = useRef({});
  const [indicator, setIndicator] = useState(null);

  const companyTabs = companies.map((c) => ({ slug: c.slug, name: shortCompanyName(c.name), color: c.color_primary }));
  const tabs = showAll ? [{ slug: null, name: 'Todas', color: MOON }, ...companyTabs] : companyTabs;
  const active = tabs.find((t) => t.slug === activeSlug) || tabs[0] || { slug: null, color: MOON };

  useLayoutEffect(() => {
    const measure = () => {
      const el = tabRefs.current[active.slug ?? 'all'];
      if (!el) return;
      setIndicator({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (listRef.current) observer.observe(listRef.current);
    return () => observer.disconnect();
  }, [active.slug, companies.length]);

  return (
    <div className="company-tabs" role="tablist" aria-label="Empresa" ref={listRef}>
      {indicator && (
        <span
          className="company-tabs__indicator"
          aria-hidden="true"
          style={{
            transform: `translate(${indicator.x}px, ${indicator.y}px)`,
            width: indicator.w,
            height: indicator.h,
            background: active.color,
          }}
        />
      )}
      {tabs.map((tab) => {
        const isActive = tab.slug === active.slug;
        return (
          <button
            key={tab.slug ?? 'all'}
            ref={(el) => {
              tabRefs.current[tab.slug ?? 'all'] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={isActive ? 'company-tabs__tab is-active' : 'company-tabs__tab'}
            style={isActive ? { color: readableOn(tab.color) } : undefined}
            onClick={() => onChange(tab.slug)}
          >
            {tab.slug && <span className="company-tabs__dot" style={{ background: tab.color }} aria-hidden="true" />}
            {tab.name}
          </button>
        );
      })}
    </div>
  );
}
