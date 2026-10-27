export const CALL_FLOW_GREETING = {
  speaker: 'agent',
  en: 'Hi, thank you for calling {{company}}, this is David, how can I help you today?',
  es: 'Hola, gracias por llamar a {{company}}, habla David, ¿en qué puedo ayudarle hoy?',
};

export const CALL_FLOW_BRANCHES = [
  {
    key: 'price_first',
    title: 'El cliente pregunta el precio primero',
    steps: [
      {
        speaker: 'customer',
        en: 'How much do you charge for a Shih Tzu?',
        es: '¿Cuánto cobran por un Shih Tzu?',
      },
      {
        speaker: 'agent',
        en: "May I please have your dog's breed and weight? I will show you the package and price.",
        es: '¿Me podría indicar la raza y el peso de su perro, por favor? Le muestro el paquete y el precio.',
      },
      {
        speaker: 'customer',
        en: "It's a Shih Tzu, about 12 lbs.",
        es: 'Es un Shih Tzu, como de 12 libras.',
      },
      {
        speaker: 'agent',
        en: 'For your pet we offer the basic service, which includes bath, nail clipping, ear cleaning and sanitary cleaning, and would be a total of "". If you want to include a haircut, this would be the full grooming, and would be a total of "".',
        es: 'Para su mascota ofrecemos el servicio básico, que incluye baño, corte de uñas, limpieza de oídos y limpieza sanitaria, por un total de "". Si desea incluir el corte de pelo, sería el full grooming, por un total de "".',
      },
      {
        speaker: 'customer',
        en: "I'll take the full grooming. Do you have availability soon?",
        es: 'Voy a tomar el full grooming. ¿Tienen disponibilidad pronto?',
      },
      {
        speaker: 'agent',
        en: 'May I please have your zip code and I will check the soonest availability in your area?',
        es: '¿Me podría indicar su código postal, por favor? Voy a revisar la disponibilidad más pronta en su zona.',
      },
      {
        speaker: 'customer',
        en: "It's 33032.",
        es: 'Es el 33032.',
      },
      {
        speaker: 'agent',
        en: 'Tomorrow we have an available spot between 9 and 10 am, would that work for you?',
        es: 'Mañana tenemos un espacio disponible entre las 9 y las 10 am, ¿le funciona ese horario?',
      },
      {
        speaker: 'customer',
        en: 'Yes, that works.',
        es: 'Sí, me funciona.',
      },
    ],
  },
  {
    key: 'zip_first',
    title: 'El cliente pide una cita primero',
    steps: [
      {
        speaker: 'customer',
        en: 'Hi, I need a grooming appointment for my dog.',
        es: 'Hola, necesito una cita de grooming para mi perro.',
      },
      {
        speaker: 'agent',
        en: 'May I please have your zip code and I will check the soonest availability in your area?',
        es: '¿Me podría indicar su código postal, por favor? Voy a revisar la disponibilidad más pronta en su zona.',
      },
      {
        speaker: 'customer',
        en: 'Sure, my zip code is 33178.',
        es: 'Claro, mi código postal es 33178.',
      },
      {
        speaker: 'agent',
        en: 'Tomorrow we have an available spot between 9 and 10 am, would that work for you?',
        es: 'Mañana tenemos un espacio disponible entre las 9 y las 10 am, ¿le funciona ese horario?',
      },
      {
        speaker: 'customer',
        en: 'Yes, that works. How much would that be?',
        es: 'Sí, me funciona. ¿Cuánto sería?',
      },
      {
        speaker: 'agent',
        en: "May I please have your dog's breed and weight? I will show you the package and price.",
        es: '¿Me podría indicar la raza y el peso de su perro, por favor? Le muestro el paquete y el precio.',
      },
      {
        speaker: 'customer',
        en: "It's a Poodle, about 7 lbs.",
        es: 'Es un Poodle, como de 7 libras.',
      },
      {
        speaker: 'agent',
        en: 'For your pet we offer the basic service, which includes bath, nail clipping, ear cleaning and sanitary cleaning, and would be a total of "". If you want to include a haircut, this would be the full grooming, and would be a total of "".',
        es: 'Para su mascota ofrecemos el servicio básico, que incluye baño, corte de uñas, limpieza de oídos y limpieza sanitaria, por un total de "". Si desea incluir el corte de pelo, sería el full grooming, por un total de "".',
      },
      {
        speaker: 'customer',
        en: 'The full grooming, please.',
        es: 'El full grooming, por favor.',
      },
    ],
  },
];

export const CALL_FLOW_CLOSING = [
  {
    speaker: 'agent',
    en: 'Would you like to do regular wash, or bath and haircut?',
    es: '¿Le gustaría el lavado regular, o baño y corte?',
  },
  {
    speaker: 'customer',
    en: 'Bath and haircut, please.',
    es: 'Baño y corte, por favor.',
  },
  {
    speaker: 'agent',
    en: 'Would you also like to add any of the following: teeth brushing, deep dental cleaning, paw hydration, deshedding, or special shampoo?',
    es: '¿Le gustaría agregar alguno de los siguientes: cepillado de dientes, limpieza dental profunda, hidratación de patas, deslanado, o shampoo especial?',
  },
  {
    speaker: 'customer',
    en: "No, thank you, that's all for now.",
    es: 'No, gracias, eso es todo por ahora.',
  },
  {
    speaker: 'agent',
    en: 'Perfect, we will proceed to create your profile. May I have your first name, last name, phone number, full address, and your dog\'s breed and name, please?',
    es: 'Perfecto, vamos a crear su perfil. ¿Me podría proporcionar su nombre, apellido, número de teléfono, dirección completa, y la raza y nombre de su perro, por favor?',
  },
  {
    speaker: 'customer',
    en: "John Smith, 305-555-0123, 123 Main Street, Miami, Florida, 33178. She's a Shih Tzu named Fifi.",
    es: 'John Smith, 305-555-0123, 123 Main Street, Miami, Florida, 33178. Es una Shih Tzu que se llama Fifi.',
  },
  {
    speaker: 'agent',
    en: "Fifi's appointment has been booked successfully for tomorrow between 9 and 10 am. It's my pleasure, thank you so much for calling, have a great day!",
    es: 'La cita de Fifi ha sido agendada exitosamente para mañana entre las 9 y las 10 am. Ha sido un placer, muchas gracias por llamar, que tenga un excelente día!',
  },
];