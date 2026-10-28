export const CAMPAIGNS = [
  { key: 'regreso', label: 'Cliente que regresa', hint: 'Hace tiempo que no agenda' },
  { key: 'mantenimiento', label: 'Le toca su grooming', hint: 'Recordatorio de rutina' },
  { key: 'dental', label: 'Promo dental', hint: 'Limpieza dental con precio' },
  { key: 'zona', label: 'Estamos en su zona', hint: 'Cupos esta semana' },
];

export const DISCOUNTS = [0, 10, 15, 20];

export const GIFTS = [
  { key: '', label: 'Sin regalo' },
  { key: 'cepillado', label: 'Cepillado de dientes', es: 'el cepillado de dientes', en: 'teeth brushing' },
  { key: 'unas', label: 'Corte de uñas', es: 'el corte de uñas', en: 'a nail trim' },
  { key: 'huellas', label: 'Hidratación de huellas', es: 'la hidratación de huellas y nariz', en: 'a paw and nose balm treatment' },
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
    greet: (name) => (name ? `Estimado(a) ${name}:` : 'Estimado(a) cliente:'),
    pet: (name) => name || 'su mascota',
    regreso: (pet, co) => `Hace un tiempo que no vemos a ${pet} y en ${co} queremos consentirle nuevamente. Tenemos disponibilidad para atenderle en la comodidad de su hogar.`,
    mantenimiento: (pet, co) =>
      `Ya es momento del próximo grooming de ${pet}. Mantener su rutina cada 4 a 6 semanas ayuda a que su pelaje y su piel se mantengan sanos, y en ${co} tenemos cupos disponibles para atenderle.`,
    dental: (pet, co) =>
      `${co} tiene una promoción especial de limpieza dental para ${pet}: profilaxis con tecnología de ultrasonido, sin anestesia, que remueve la placa y el sarro sin causarle ningún tipo de daño.`,
    dentalBath: (pet, co) =>
      `${co} tiene una promoción especial para ${pet}: limpieza dental profunda con tecnología de ultrasonido, sin anestesia, más un baño completo con limpieza de oídos y afeitado sanitario.`,
    dentalCosmetic: (pet, co) =>
      `${co} tiene una promoción especial de limpieza dental cosmética para ${pet}, que remueve la placa de la superficie de sus dientes y le deja una sonrisa más limpia.`,
    price: (p) => `Precio desde ${p}, según el tamaño de su mascota.`,
    zona: (pet, co) => `Esta semana el equipo de ${co} estará en su zona y contamos con algunos cupos disponibles para ${pet}.`,
    discount: (n) => `Como agradecimiento, le ofrecemos un ${n}% de descuento en su próximo servicio.`,
    gift: (g) => `Además, le incluimos ${g} de cortesía.`,
    limited: 'Los cupos son limitados.',
    until: (d) => `Promoción válida hasta el ${d}.`,
    si: 'Responda SÍ a este mensaje y con gusto le reservamos su cita.',
    dia: 'Respóndanos con el día y la hora que mejor le convengan y le confirmamos su cita.',
    llamar: (phone) => `Llámenos o escríbanos al ${phone} para agendar su cita.`,
    phoneHole: '[Teléfono]',
    sign: (co) => `Saludos cordiales,\n${co}`,
    stop: 'Responda STOP para dejar de recibir estos mensajes.',
  },
  en: {
    greet: (name) => (name ? `Hello ${name},` : 'Hello,'),
    pet: (name) => name || 'your pet',
    regreso: (pet, co) => `It has been a while since we last saw ${pet}, and ${co} would love to pamper them again. We have availability to serve you in the comfort of your home.`,
    mantenimiento: (pet, co) =>
      `It is time for ${pet}'s next grooming. Keeping a routine every 4 to 6 weeks helps keep their coat and skin healthy, and ${co} has openings available for you.`,
    dental: (pet, co) =>
      `${co} has a special dental cleaning promotion for ${pet}: anesthesia-free ultrasound prophylaxis that removes plaque and tartar without causing any harm.`,
    dentalBath: (pet, co) => `${co} has a special promotion for ${pet}: anesthesia-free ultrasound deep dental cleaning, plus a full bath with ear cleaning and sanitary trim.`,
    dentalCosmetic: (pet, co) => `${co} has a special cosmetic dental cleaning promotion for ${pet} that removes plaque from the surface of their teeth for a cleaner smile.`,
    price: (p) => `Starting at ${p}, depending on your pet's size.`,
    zona: (pet, co) => `This week the ${co} team will be in your area, and we have a few openings available for ${pet}.`,
    discount: (n) => `As a thank you, we are offering you ${n}% off your next service.`,
    gift: (g) => `Plus, we will include ${g} at no charge.`,
    limited: 'Spots are limited.',
    until: (d) => `Offer valid until ${d}.`,
    si: 'Reply YES to this message and we will gladly book your appointment.',
    dia: 'Reply with the day and time that work best for you and we will confirm your appointment.',
    llamar: (phone) => `Call or text us at ${phone} to book your appointment.`,
    phoneHole: '[Phone]',
    sign: (co) => `Best regards,\n${co}`,
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

export function buildRemarketing({ lang, companyName, campaign, client, pet, discount, gift, limited, until, cta, phone, showPrice, stop, offer }) {
  const t = COPY[lang] || COPY.es;
  const co = companyName || '[Empresa]';
  const petName = t.pet(pet.trim());
  const body = [];

  if (campaign === 'dental') {
    body.push(offer?.withBath ? t.dentalBath(petName, co) : offer?.cosmetic ? t.dentalCosmetic(petName, co) : t.dental(petName, co));
    if (showPrice && offer?.price) body.push(t.price(offer.price));
  } else {
    body.push(t[campaign](petName, co));
  }

  const extras = [];
  if (discount) extras.push(t.discount(discount));
  const giftItem = GIFTS.find((g) => g.key === gift);
  if (giftItem?.key) extras.push(t.gift(giftItem[lang] || giftItem.es));
  if (limited) extras.push(t.limited);
  if (until) extras.push(t.until(until));

  const action = cta === 'llamar' ? t.llamar(phone.trim() || t.phoneHole) : t[cta];
  const blocks = [t.greet(client.trim()), body.join(' ')];
  if (extras.length) blocks.push(extras.join(' '));
  blocks.push(action, t.sign(co));
  if (stop) blocks.push(t.stop);
  return blocks.join('\n\n');
}
