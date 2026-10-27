# CC+CS Escritorio

Versión web de escritorio de la herramienta de CC+CS Solutions para agentes del call center: cotización de precios por raza, peso y servicio para las empresas de grooming, con inicio de sesión por agente.

## Requisitos

- Node.js 20 o superior
- Un archivo `.env.local` con las variables de `.env.example`

## Desarrollo

```bash
npm install
npm run dev
```

## Producción

```bash
npm run build
```

Se despliega en Vercel. Las variables `VITE_FIREBASE_*` se configuran en el panel del proyecto.
