export const SECTION_GROUPS = [
  {
    label: 'En la llamada',
    items: [
      { path: '/precios', label: 'Precios' },
      { path: '/flujo-de-llamada', label: 'Flujo de llamada' },
      { path: '/asistente', label: 'Pregúntale a Fifo' },
      { path: '/razas', label: 'Razas' },
      { path: '/favoritos', label: 'Favoritos' },
    ],
  },
  {
    label: 'Mi turno',
    items: [
      { path: '/resumen-del-dia', label: 'Resumen del día' },
      { path: '/protocolo', label: 'Protocolo del día' },
      { path: '/recordatorios', label: 'Recordatorios' },
    ],
  },
  {
    label: 'Supervisión',
    items: [
      { path: '/resumenes', label: 'Resúmenes totales' },
      { path: '/estadisticas', label: 'Estadísticas' },
      { path: '/control-de-calidad', label: 'Control de calidad' },
      { path: '/remarketing', label: 'Remarketing' },
      { path: '/admin', label: 'Administración' },
    ],
  },
];

export const GAMES_SECTION = { path: '/juegos', label: 'Juegos de Fifo' };

export const ALL_SECTIONS = [...SECTION_GROUPS.flatMap((g) => g.items), GAMES_SECTION];
