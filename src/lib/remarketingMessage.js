export const CAMPAIGNS = [
  { key: 'regreso', label: 'Cliente que regresa', hint: 'Hace tiempo que no agenda' },
  { key: 'mantenimiento', label: 'Le toca su grooming', hint: 'Recordatorio de rutina' },
  { key: 'dental', label: 'Promo dental', hint: 'Limpieza dental con precio' },
  { key: 'zona', label: 'Estamos en su zona', hint: 'Cupos esta semana' },
];

export const DISCOUNTS = [0, 10, 15, 20];

export const GIFTS = [
  { key: '', label: 'Sin regalo' },
  { key: 'cepillado', label: 'Cepillado de dientes', es: 'cepillado de dientes', en: 'teeth brushing' },
  { key: 'unas', label: 'Corte de uñas', es: 'corte de uñas', en: 'nail trim' },
  { key: 'huellas', label: 'Hidratación de huellas', es: 'hidratación de huellas', en: 'paw balm' },
];

export const CTAS = [
  { key: 'si', label: 'Responder SÍ' },
  { key: 'dia', label: 'Responder con día y hora' },
  { key: 'llamar', label: 'Llamar o escribir' },
];

const DENTAL_PROMO = /promo dental/i;
const COSMETIC = /cosm|smile/i;
const DENTAL = /dental|smile/i;
const CAT = /gato|cat\b|cats/i;

const COPY = {
  es: {
    hello: (name) => (name ? `Hola, ${name}.` : ''),
    pet: (name) => name || 'su mascota',
    regreso: (pet) => `¡Extrañamos a ${pet}! Agende su grooming a domicilio y vuelva a consentirle.`,
    mantenimiento: (pet) => `Ya le toca el grooming a ${pet} y tenemos cupos esta semana.`,
    zona: (pet) => `Estamos en su zona esta semana y quedan pocos cupos para ${pet}.`,
    dental: (pet, price) => `Promo dental para ${pet}: limpieza con ultrasonido, sin anestesia${price ? `, desde ${price}` : ''}.`,
    dentalBath: (pet, price) => `Promo dental + baño para ${pet}: limpieza con ultrasonido sin anestesia y baño completo${price ? `, desde ${price}` : ''}.`,
    dentalCosmetic: (pet, price) => `Promo dental para ${pet}: limpieza cosmética que elimina la placa${price ? `, desde ${price}` : ''}.`,
    discountGift: (n, g) => `Ahora con ${n}% de descuento + ${g} gratis.`,
    discount: (n) => `Ahora con ${n}% de descuento.`,
    gift: (g) => `Incluye ${g} gratis.`,
    limitedUntil: (d) => `Cupos limitados hasta el ${d}.`,
    limited: 'Cupos limitados.',
    until: (d) => `Válido hasta el ${d}.`,
    si: 'Responda SÍ y le reservamos su cita.',
    dia: 'Responda con el día y la hora que prefiera y le reservamos.',
    llamar: (phone) => `Llame o escriba al ${phone} para agendar.`,
    phoneHole: '[Teléfono]',
    stop: 'Responda STOP para salir.',
  },
  en: {
    hello: (name) => (name ? `Hi ${name}!` : ''),
    pet: (name) => name || 'your pet',
    regreso: (pet) => `We miss ${pet}! Pamper them again with a mobile grooming visit.`,
    mantenimiento: (pet) => `It's time for ${pet}'s grooming and we have openings this week.`,
    zona: (pet) => `We're in your area this week with only a few spots left for ${pet}.`,
    dental: (pet, price) => `Dental promo for ${pet}: anesthesia-free ultrasound cleaning${price ? `, from ${price}` : ''}.`,
    dentalBath: (pet, price) => `Dental + bath promo for ${pet}: anesthesia-free ultrasound cleaning plus a full bath${price ? `, from ${price}` : ''}.`,
    dentalCosmetic: (pet, price) => `Dental promo for ${pet}: cosmetic cleaning that removes plaque${price ? `, from ${price}` : ''}.`,
    discountGift: (n, g) => `Now ${n}% off + free ${g}.`,
    discount: (n) => `Now ${n}% off.`,
    gift: (g) => `Includes free ${g}.`,
    limitedUntil: (d) => `Limited spots until ${d}.`,
    limited: 'Limited spots.',
    until: (d) => `Valid until ${d}.`,
    si: 'Reply YES to book your appointment.',
    dia: 'Reply with your preferred day and time and we will book it.',
    llamar: (phone) => `Call or text ${phone} to book.`,
    phoneHole: '[Phone]',
    stop: 'Reply STOP to opt out.',
  },
};

function minPrice(rows) {
  const values = rows.map((r) => parseFloat(String(r.price_display || '').replace(/[^0-9.]/g, ''))).filter((n) => n > 0);
  return values.length ? Math.min(...values) : null;
}

export function dentalOffer(rows, slug) {
  if (!slug) return null;
  const own = rows.filter((r) => r.company_slug === slug && !CAT.test(`${r.category_name} ${r.label}`));
  const promo = own.filter((r) => DENTAL_PROMO.test(r.category_name));
  const dental = own.filter((r) => DENTAL.test(r.category_name) && !DENTAL_PROMO.test(r.category_name));
  const list = promo.length ? promo : dental;
  const price = minPrice(list);
  if (price == null) return null;
  return { withBath: promo.length > 0, cosmetic: list.some((r) => COSMETIC.test(r.category_name)), price: `$${price.toFixed(0)}` };
}

export const SMS_SEGMENT = 160;

export function buildRemarketing({ lang, companyName, campaign, client, pet, discount, gift, limited, until, cta, phone, showPrice, stop, offer }) {
  const t = COPY[lang] || COPY.es;
  const co = companyName || '[Empresa]';
  const petName = t.pet(pet.trim());

  let hook;
  if (campaign === 'dental') {
    const price = showPrice ? offer?.price : null;
    hook = offer?.withBath ? t.dentalBath(petName, price) : offer?.cosmetic ? t.dentalCosmetic(petName, price) : t.dental(petName, price);
  } else {
    hook = t[campaign](petName);
  }

  const giftItem = GIFTS.find((g) => g.key === gift && g.key);
  const giftText = giftItem ? giftItem[lang] || giftItem.es : '';
  let offerText = '';
  if (discount && giftText) offerText = t.discountGift(discount, giftText);
  else if (discount) offerText = t.discount(discount);
  else if (giftText) offerText = t.gift(giftText);

  let urgency = '';
  if (limited && until) urgency = t.limitedUntil(until);
  else if (limited) urgency = t.limited;
  else if (until) urgency = t.until(until);

  const lead = [`${co}:`, t.hello(client.trim()), hook, offerText, urgency].filter(Boolean).join(' ');
  const action = cta === 'llamar' ? t.llamar(phone.trim() || t.phoneHole) : t[cta];
  return [lead, action, stop ? t.stop : ''].filter(Boolean).join('\n');
}
