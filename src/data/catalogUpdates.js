export const CATALOG_UPDATES = [
  {
    id: 'flg-amethyst-cats',
    slug: 'floridaluxury',
    title: 'Amethyst de $110 y $145 marcados como servicio para gatos',
    flagItems: [{ category: /amethyst/i, prices: ['$110.00', '$145.00'], set: { is_cat: true } }],
  },
  {
    id: 'famous-orlando',
    slug: 'famous',
    title: 'Precios de Orlando (Silver, Gold, gatos y limpieza dental)',
    addNotes: ['Ahora también cubren Orlando: usa el botón Miami / Orlando de arriba para ver los precios de cada zona. Los de Orlando son distintos a los de Miami.'],
    addCategories: [
      {
        name: 'Silver Orlando (baño + sanitario)',
        pill_label: 'Silver Orlando',
        tag: 'Orlando',
        items: [
          { label: 'Mini Orlando (0-15 lbs)', price_display: '$75.00', needs_review: false, weight_min_lbs: 0, weight_max_lbs: 15 },
          { label: 'Small Orlando (16-25 lbs)', price_display: '$80.00', needs_review: false, weight_min_lbs: 16, weight_max_lbs: 25 },
          { label: 'Medium Orlando (26-45 lbs)', price_display: '$100.00', needs_review: false, weight_min_lbs: 26, weight_max_lbs: 45 },
          { label: 'Large Orlando (46-65 lbs)', price_display: '$125.00', needs_review: false, weight_min_lbs: 46, weight_max_lbs: 65 },
          { label: 'Extra Large Orlando (65-150 lbs)', price_display: '$160.00', needs_review: true, weight_min_lbs: 65, weight_max_lbs: 150 },
        ],
      },
      {
        name: 'Gold Orlando (Silver + corte)',
        pill_label: 'Gold Orlando',
        tag: 'Orlando',
        items: [
          { label: 'Mini Orlando (0-15 lbs)', price_display: '$95.00', needs_review: false, weight_min_lbs: 0, weight_max_lbs: 15 },
          { label: 'Small Orlando (16-25 lbs)', price_display: '$100.00', needs_review: false, weight_min_lbs: 16, weight_max_lbs: 25 },
          { label: 'Medium Orlando (26-45 lbs)', price_display: '$125.00', needs_review: false, weight_min_lbs: 26, weight_max_lbs: 45 },
          { label: 'Large Orlando (46-65 lbs)', price_display: '$145.00', needs_review: false, weight_min_lbs: 46, weight_max_lbs: 65 },
          { label: 'Extra Large Orlando (66-150 lbs)', price_display: '$180.00', needs_review: false, weight_min_lbs: 66, weight_max_lbs: 150 },
        ],
      },
      {
        name: 'Baño para Gato Silver Orlando',
        pill_label: 'Baño para Gato Silver Orlando',
        tag: 'Orlando',
        items: [{ label: 'Baño para Gato - Silver Orlando', price_display: '$170.00', needs_review: false }],
      },
      {
        name: 'Baño para Gato Gold Orlando',
        pill_label: 'Baño para Gato Gold Orlando',
        tag: 'Orlando',
        items: [{ label: 'Baño para Gato - Gold Orlando', price_display: '$120.00', needs_review: false }],
      },
      {
        name: 'Deep Dental Cleaning Orlando',
        pill_label: 'Limpieza Dental Orlando',
        tag: 'Orlando',
        items: [{ label: 'Limpieza dental profunda Orlando (todas las tallas)', price_display: '$245.00', needs_review: false }],
      },
    ],
    addItems: [
      {
        category: 'Gold Orlando (Silver + corte)',
        items: [{ label: 'Small Orlando (16-25 lbs)', price_display: '$100.00', needs_review: false, weight_min_lbs: 16, weight_max_lbs: 25 }],
      },
    ],
  },
];

const ZONE_BASE = { famous: 'Miami' };
const SHARED_CATEGORY = /adicional|add-on/i;

export function companyZones(company) {
  if (!company) return [];
  const tags = [...new Set((company.categories || []).map((c) => c.tag).filter(Boolean))];
  return tags.length ? [ZONE_BASE[company.slug] || 'Principal', ...tags] : [];
}

export const isSharedCategory = (name) => SHARED_CATEGORY.test(name || '');

export function inZone(zone, zones, tag, categoryName) {
  if (!zone || zones.length < 2) return true;
  if (SHARED_CATEGORY.test(categoryName || '')) return true;
  return zone === zones[0] ? !tag : tag === zone;
}

export function applyCatalogUpdates(company) {
  const updates = CATALOG_UPDATES.filter((u) => u.slug === company.slug);
  if (!updates.length) return company;
  let next = null;
  const draft = () => {
    if (!next)
      next = { ...company, categories: (company.categories || []).map((c) => ({ ...c, items: (c.items || []).map((i) => ({ ...i })) })), notes: [...(company.notes || [])] };
    return next;
  };
  const pending = [];
  updates.forEach((u) => {
    let changed = false;
    (u.addCategories || []).forEach((cat) => {
      if ((next || company).categories?.some((c) => c.name === cat.name)) return;
      draft().categories.push({ ...cat, items: cat.items.map((i) => ({ ...i })) });
      changed = true;
    });
    (u.addItems || []).forEach((rule) => {
      const ci = (next || company).categories?.findIndex((c) => c.name === rule.category) ?? -1;
      if (ci < 0) return;
      rule.items.forEach((item) => {
        if ((next || company).categories[ci].items?.some((i) => i.label === item.label)) return;
        const items = draft().categories[ci].items;
        const at = items.findIndex((i) => (i.weight_min_lbs ?? Infinity) > (item.weight_min_lbs ?? Infinity));
        items.splice(at < 0 ? items.length : at, 0, { ...item });
        changed = true;
      });
    });
    (u.flagItems || []).forEach((rule) => {
      (next || company).categories?.forEach((cat, ci) => {
        if (!rule.category.test(cat.name)) return;
        (cat.items || []).forEach((item, ii) => {
          if (!rule.prices.includes(item.price_display)) return;
          if (Object.entries(rule.set).every(([k, v]) => item[k] === v)) return;
          Object.assign(draft().categories[ci].items[ii], rule.set);
          changed = true;
        });
      });
    });
    (u.addNotes || []).forEach((note) => {
      if ((next || company).notes?.includes(note)) return;
      draft().notes.push(note);
      changed = true;
    });
    if (changed) pending.push(u.title);
  });
  if (!next) return company;
  return { ...next, pending_updates: pending };
}
