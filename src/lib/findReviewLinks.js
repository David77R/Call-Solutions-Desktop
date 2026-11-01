const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const GOOGLE_RE = /(g\.page|maps\.app\.goo\.gl|goo\.gl\/maps|google\.[a-z.]+\/maps|search\.google\.com\/local|g\.co\/kgs|business\.google\.com)/i;

const plain = (t) =>
  (t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ');

function aliasesOf(company) {
  const words = plain(company.name).split(/\s+/).filter(Boolean);
  const stop = new Set(['pet', 'grooming', 'mobile', 'fur', 'style', 'the']);
  const main = words.filter((w) => !stop.has(w) && w.length > 2);
  return [...new Set([plain(company.name).trim(), company.slug, ...main])].filter(Boolean);
}

function companyIn(text, companies) {
  const t = ` ${plain(text)} `;
  let best = null;
  let bestPos = -1;
  companies.forEach((c) => {
    aliasesOf(c).forEach((a) => {
      const pos = t.lastIndexOf(` ${a}`);
      if (pos > bestPos) {
        bestPos = pos;
        best = c;
      }
    });
  });
  return best;
}

export function findReviewLinks(reminders, companies) {
  const found = {};
  const ordered = [...reminders].sort((a, b) => ((a.created_at || '') < (b.created_at || '') ? -1 : 1));
  ordered.forEach((r) => {
    const text = r.text || '';
    const urls = [...text.matchAll(URL_RE)];
    urls.forEach((m) => {
      const url = m[0].replace(/[.,;]+$/, '');
      if (!GOOGLE_RE.test(url) && !/rese[ñn]a|review/i.test(text)) return;
      const lineStart = text.lastIndexOf('\n', m.index) + 1;
      const before = text.slice(lineStart, m.index);
      const owner = companyIn(before, companies) || companyIn(text.slice(0, m.index), companies) || companies.find((c) => c.slug === r.company_slug) || null;
      if (owner) found[owner.slug] = { url, reminder: r.id };
    });
  });
  return found;
}
