export const BREED_ALIASES = {
  'pastor aleman': 'german shepherd',
  'pastor alemán': 'german shepherd',
  'westie': 'west highland white terrier',
  'west highland': 'west highland white terrier',
  'labrador': 'labrador retriever',
  'golden': 'golden retriever',
  'caniche': 'poodle',
  'caniche toy': 'toy poodle',
  'caniche miniatura': 'miniature poodle',
  'caniche mini': 'miniature poodle',
  'miniature': ['miniature poodle', 'schnauzer mini'],
  'mini': ['miniature poodle', 'schnauzer mini', 'toy poodle'],
  'miniature schnauzer': 'schnauzer mini',
  'salchicha': 'dachshund',
  'bulldog frances': 'french bulldog',
  'bulldog francés': 'french bulldog',
  'bulldog ingles': 'english bulldog',
  'bulldog inglés': 'english bulldog',
  'schnauzer miniatura': 'schnauzer mini',
  'mini schnauzer': 'schnauzer mini',
  'gran danes': 'great dane',
  'gran danés': 'great dane',
  'pug': 'carlino / pug',
  'carlino': 'carlino / pug',
  'chihuahueño': 'chihuahua',
  'husky siberiano': 'husky',
  'pastor belga': 'belgian malinois',
  'dogo': 'dogo argentino',
  'boyero de berna': 'bernese mountain dog',
  'gran pirineo': 'great pyrenees',
  'san bernardo': 'saint bernard',
  'dalmata': 'dalmata',
  'dálmata': 'dalmata',
};

export function resolveBreedAliases(text) {
  const needle = text.trim().toLowerCase();
  if (!needle) return [];

  const matches = [];
  for (const [alias, canonical] of Object.entries(BREED_ALIASES)) {
    if (needle === alias || needle.includes(alias) || alias.includes(needle)) {
      if (Array.isArray(canonical)) {
        matches.push(...canonical);
      } else {
        matches.push(canonical);
      }
    }
  }
  return [...new Set(matches)];
}