export const TEMPLATE_GROUPS = [
  { key: 'antes', label: 'Antes de agendar' },
  { key: 'cita', label: 'La cita' },
  { key: 'despues', label: 'Después del servicio' },
];

export const AUTO_FIELDS = {
  empresa: 'Empresa',
  agente: 'Agente',
};

export const FIELD_LABELS = {
  fecha: 'Fecha',
  hora: 'Hora',
  direccion: 'Dirección',
  groomer: 'Groomer',
  mascota: 'Nombre de la mascota',
  link: 'Link de reseña',
  monto: 'Monto',
};

export const DEFAULT_TEMPLATES = [
  {
    id: 'pedir-zip',
    group: 'antes',
    title: 'Pedir ZIP code',
    es: 'Para confirmar la disponibilidad en su zona, por favor indíquenos su código postal (ZIP code).',
    en: 'To confirm availability in your area, please share your ZIP code.',
  },
  {
    id: 'datos-agendar',
    group: 'antes',
    title: 'Pedir datos para agendar',
    es: 'Para agendar su cita, por favor envíenos los siguientes datos:\n• Nombre completo\n• Dirección del servicio\n• Raza, edad y peso aproximado de su mascota\n• Día y horario de preferencia',
    en: 'To book your appointment, please send us the following:\n• Full name\n• Service address\n• Breed, age and approximate weight of your pet\n• Preferred day and time',
  },
  {
    id: 'fuera-de-zona',
    group: 'antes',
    title: 'Fuera de zona',
    es: 'Gracias por comunicarse con {empresa}. Por el momento no tenemos cobertura en su zona. Con gusto le atenderemos si en otra oportunidad el servicio es en un área dentro de nuestra cobertura.',
    en: 'Thank you for contacting {empresa}. At this time we do not cover your area. We will gladly assist you if a future service falls within our coverage area.',
  },
  {
    id: 'confirmacion',
    group: 'cita',
    title: 'Confirmación de cita',
    es: 'Le escribimos de {empresa} para confirmar su cita del {fecha} a las {hora} en {direccion}.\n\nPor favor responda Y para confirmar su cita.',
    en: 'This is {empresa} reaching out to confirm your appointment on {fecha} at {hora} at {direccion}.\n\nPlease reply Y to confirm your appointment.',
  },
  {
    id: 'recordatorio',
    group: 'cita',
    title: 'Recordatorio del día anterior',
    es: 'Le recordamos su cita de mañana, {fecha}, a las {hora} con {empresa}. Si necesita hacer algún cambio, responda a este mensaje.',
    en: 'This is a reminder of your appointment tomorrow, {fecha}, at {hora} with {empresa}. If you need to make any changes, please reply to this message.',
  },
  {
    id: 'en-camino',
    group: 'cita',
    title: 'Groomer en camino',
    es: 'Le informamos que {groomer} ya va en camino y llegará aproximadamente a las {hora}.',
    en: 'We would like to let you know that {groomer} is on the way and will arrive at approximately {hora}.',
  },
  {
    id: 'retraso',
    group: 'cita',
    title: 'Aviso de retraso',
    es: 'Le informamos que {groomer} presenta un retraso y llegará aproximadamente a las {hora}. Le pedimos disculpas por las molestias ocasionadas y agradecemos mucho su comprensión.',
    en: 'We would like to let you know that {groomer} is running late and will arrive at approximately {hora}. We apologize for any inconvenience this may cause and truly appreciate your understanding.',
  },
  {
    id: 'reprogramada',
    group: 'cita',
    title: 'Cita reprogramada',
    es: 'Su cita con {empresa} quedó reprogramada para el {fecha} a las {hora}. Gracias por avisarnos.',
    en: 'Your appointment with {empresa} has been rescheduled to {fecha} at {hora}. Thank you for letting us know.',
  },
  {
    id: 'cancelada',
    group: 'cita',
    title: 'Cita cancelada',
    es: 'Su cita del {fecha} con {empresa} quedó cancelada. Cuando desee agendar nuevamente, escríbanos por este medio.',
    en: 'Your appointment on {fecha} with {empresa} has been cancelled. Whenever you would like to book again, write to us here.',
  },
  {
    id: 'gracias',
    group: 'despues',
    title: 'Agradecimiento',
    es: 'Gracias por confiar en {empresa} para el cuidado de {mascota}. Fue un placer atenderle.',
    en: 'Thank you for trusting {empresa} with the care of {mascota}. It was a pleasure serving you.',
  },
  {
    id: 'resena',
    group: 'despues',
    title: 'Pedir reseña',
    es: 'Gracias por elegir a {empresa}. Si quedó satisfecho con el servicio, nos ayudaría mucho una reseña suya: {link}',
    en: 'Thank you for choosing {empresa}. If you were happy with the service, a review would help us a lot: {link}',
  },
  {
    id: 'pago',
    group: 'despues',
    title: 'Monto del servicio',
    es: 'El total del servicio de hoy es de {monto}. Gracias por su preferencia.',
    en: "The total for today's service is {monto}. Thank you for your business.",
  },
];
