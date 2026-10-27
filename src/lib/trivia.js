function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function makeOptions(correct, distractors) {
  const unique = [...new Set([correct, ...shuffle(distractors)])].slice(0, 4);
  const options = shuffle(unique).map((text, i) => ({ id: String.fromCharCode(97 + i), text }));
  return { options, correctOptionId: options.find((o) => o.text === correct)?.id ?? options[0].id };
}

function pricePool(companies) {
  const re = /^\$[\d,]+(\.\d{1,2})?$/;
  return companies.flatMap((c) =>
    (c.categories || []).flatMap((cat) =>
      (cat.items || [])
        .filter((i) => re.test((i.price_display || '').trim()) && !i.needs_review)
        .map((i) => ({ key: `price-${c.slug}-${cat.name}-${i.label}`, label: i.label, category: cat.name, company: c.name, price: i.price_display.trim() }))
    )
  );
}

function priceQuestion(pool, used) {
  const candidates = pool.filter((p) => !used.has(p.key));
  if (!candidates.length) return null;
  const t = pick(candidates);
  used.add(t.key);
  const { options, correctOptionId } = makeOptions(t.price, pool.filter((p) => p.price !== t.price).map((p) => p.price));
  if (options.length < 2) return null;
  return {
    id: t.key,
    prompt: `¿Cuánto cuesta "${t.label}" dentro de "${t.category}" en ${t.company}?`,
    options,
    correctOptionId,
    explanation: `"${t.label}" en "${t.category}" de ${t.company} cuesta ${t.price}.`,
  };
}

function surchargeQuestion(companies, used) {
  const withRule = companies.filter((c) => c.special_breed_surcharge?.keywords?.length);
  const candidates = withRule.filter((c) => !used.has(`surcharge-${c.slug}`));
  if (!candidates.length) return null;
  const t = pick(candidates);
  used.add(`surcharge-${t.slug}`);
  const correct = t.special_breed_surcharge.keywords.join(', ');
  const fakes = ['Chihuahua, Beagle, Boxer', 'Dálmata, Pug, Basset Hound', 'Labrador, Bulldog Francés'];
  const { options, correctOptionId } = makeOptions(correct, [...withRule.filter((c) => c.slug !== t.slug).map((c) => c.special_breed_surcharge.keywords.join(', ')), ...fakes]);
  return {
    id: `surcharge-${t.slug}`,
    prompt: `¿Qué razas tienen cargo adicional especial en ${t.name}?`,
    options,
    correctOptionId,
    explanation: `En ${t.name} se cobra ${t.special_breed_surcharge.amount} extra por: ${correct}.`,
  };
}

function doubleCoatQuestion(companies, used) {
  const t = companies.find((c) => c.double_coat_breeds?.keywords?.length && !used.has(`doublecoat-${c.slug}`));
  if (!t) return null;
  used.add(`doublecoat-${t.slug}`);
  const correct = t.double_coat_breeds.keywords.join(', ');
  const { options, correctOptionId } = makeOptions(correct, ['Chihuahua, Pug, Shih Tzu', 'Poodle, Maltese, Yorkshire Terrier', 'Beagle, Dachshund, Boston Terrier']);
  return {
    id: `doublecoat-${t.slug}`,
    prompt: `¿Cuáles razas en ${t.name} siempre se cotizan como servicio completo?`,
    options,
    correctOptionId,
    explanation: `En ${t.name}, estas razas de doble manto siempre llevan ${t.double_coat_breeds.label || 'Solo Gold'}: ${correct}.`,
  };
}

function groomerQuestion(companies, rosters, used) {
  const slugs = Object.keys(rosters).filter((s) => rosters[s]?.length && !used.has(`groomer-${s}`));
  if (!slugs.length) return null;
  const slug = pick(slugs);
  used.add(`groomer-${slug}`);
  const company = companies.find((c) => c.slug === slug);
  const correct = pick(rosters[slug]);
  const others = Object.entries(rosters)
    .filter(([s]) => s !== slug)
    .flatMap(([, names]) => names)
    .filter((n) => !rosters[slug].includes(n));
  const { options, correctOptionId } = makeOptions(correct, others);
  if (options.length < 2) return null;
  return {
    id: `groomer-${slug}`,
    prompt: `¿Cuál de estos es groomer en ${company?.name || slug}?`,
    options,
    correctOptionId,
    explanation: `${correct} es groomer en ${company?.name || slug}.`,
  };
}

export function generateTrivia(companies, rosters, count = 8) {
  const pool = pricePool(companies);
  const used = new Set();
  const builders = [
    () => priceQuestion(pool, used),
    () => priceQuestion(pool, used),
    () => surchargeQuestion(companies, used),
    () => doubleCoatQuestion(companies, used),
    () => groomerQuestion(companies, rosters, used),
  ];
  const questions = [];
  let attempts = 0;
  while (questions.length < count && attempts < count * 10) {
    attempts += 1;
    const q = pick(builders)();
    if (q && !questions.some((e) => e.id === q.id)) questions.push(q);
  }
  return shuffle(questions);
}
