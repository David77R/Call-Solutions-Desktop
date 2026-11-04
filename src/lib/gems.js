export const GEMS = {
  sapphire: { name: 'Sapphire', color: '#2f6bff', light: '#9cc0ff', dark: '#1838a8' },
  diamond: { name: 'Diamond', color: '#bfeaff', light: '#ffffff', dark: '#5fb4dc' },
  ruby: { name: 'Ruby', color: '#e0245e', light: '#ff8fb0', dark: '#8f0f37' },
  emerald: { name: 'Emerald', color: '#10b981', light: '#7ff0c8', dark: '#05744f' },
  topaz: { name: 'Topaz', color: '#f5a524', light: '#ffd98a', dark: '#a86508' },
  amethyst: { name: 'Amethyst', color: '#9b5de5', light: '#d3b4ff', dark: '#5b2a9e' },
  pearl: { name: 'Pearl', color: '#f3ede2', light: '#ffffff', dark: '#c9b9a6', round: true },
  platinum: { name: 'Platinum', color: '#c8cdd6', light: '#f4f6fa', dark: '#7d8596' },
};

const PATTERN = new RegExp(`\\b(${Object.keys(GEMS).join('|')})\\b`, 'i');
const GEM_COMPANIES = new Set(['floridaluxury']);

export function gemFor(companySlug, ...texts) {
  if (!GEM_COMPANIES.has(companySlug)) return null;
  for (const text of texts) {
    const m = PATTERN.exec(text || '');
    if (m) return GEMS[m[1].toLowerCase()];
  }
  return null;
}

export function gemForRow(row) {
  return row ? gemFor(row.company_slug, row.category_name, row.pill_label, row.label) : null;
}
