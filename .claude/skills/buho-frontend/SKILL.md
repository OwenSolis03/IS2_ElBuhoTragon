---
name: buho-frontend
description: Pautas para cambiar el frontend de El Búho Tragón - diseño UNISON, tokens de color y tipografía, componentes React, llamadas a la API, rediseños y cómo previsualizarlos. Úsala al editar cualquier cosa en frontend/ (páginas, componentes, estilos, textos) o al planear un cambio estético.
---

# Frontend de El Búho Tragón (React 19 + Vite 6 + Tailwind 4)

Lee primero `buho-contexto` si no lo has hecho.

## Identidad visual (resumen; el detalle está en `.better-react-web-ui.md`)

- **Personalidad:** académico, editorial, confiable, con calidez estudiantil. Voz sobria y clara, sin tono infantil.
- **Colores** (definidos en `frontend/src/index.css` `@theme` y `tailwind.config.mjs`):
  - Fondo `canvas` #0e2246 · estructuras (header, footer) `canvas-deep` #071326 · tarjetas #0a1830 con borde `white/[0.08]`
  - Acento dorado `unison-gold-light` #B39A3A (énfasis, estrellas, líneas) · azul interactivo #163A70 / #204a8e
  - Texto `paper` #F2F2F0 · abierto `emerald-400` · cerrado / alertas `rose-400`
- **Tipografía:** `font-display` (Cormorant Garamond) para títulos, `font-sans` (Plus Jakarta Sans) para UI, `font-mono` en mayúsculas con `tracking-[0.2em]` para horarios, estados y datos numéricos.
- **Evitar:** estética SaaS genérica (morados, gradientes fucsia), glassmorphism, tarjetas blancas sobre fondo oscuro, botones con brillo neón, píldoras flotantes.

## Reglas de código

1. **Tokens antes que valores sueltos.** Usa las clases del tema (`bg-canvas`, `text-paper`, `text-unison-gold-light`). Hoy hay muchos hex escritos a mano (#B39A3A aparece más de 90 veces); si tocas un componente, migra sus colores a tokens en vez de agregar más hex.
2. **API solo vía `config.js`:** `import { API_URL, authHeaders } from "../config"` y `fetch(`${API_URL}/api/...`)`. Las peticiones que escriben (POST, PUT, PATCH, DELETE) llevan `headers: { ...authHeaders() }`.
3. **Sin HTML crudo.** No uses `dangerouslySetInnerHTML`: el texto del chatbot y de las reseñas viene de usuarios o de un LLM.
4. **La seguridad vive en el backend.** Ocultar un botón de admin en React es cosmético; el permiso real lo da `permissions.py`.
5. **El chatbot** (`ChatWidget.jsx`) manda `{message, lat, lon, history}` con máximo 6 turnos; el backend corta mensajes de más de 500 caracteres.
6. Iconos: `react-icons/fi` y `react-icons/fa`. Mapas: Leaflet / React-Leaflet. No agregues librerías de componentes (shadcn, MUI) sin acordarlo.

## Trabajar un cambio visual

```bash
cd frontend
npm run dev:api-real    # datos reales del sitio, sin backend local
```

⚠️ En este modo lo que guardes se escribe en producción. Navega y revisa, pero no envíes formularios de prueba.

Para tareas de diseño puntuales usa las skills genéricas de `.agents/skills/` (por ejemplo `critique`, `polish`, `a11y`, `adapt` para responsive, `hierarchy`, `harden`), siempre dentro de la identidad de arriba.

## Rediseño grande: flujo recomendado

1. Rama `feat/rediseno-<tema>`.
2. Cambia primero los tokens y la tipografía (`index.css`, `tailwind.config.mjs`), luego los componentes compartidos (`Header`, `Footer`, `CafeCard`, `PageHeader`) y al final las páginas.
3. Revisa en móvil (375 px) y escritorio. Revisa contraste de texto dorado sobre azul.
4. `npm run build` y `npm run lint` sin errores.
5. Publica la vista previa: `deploy/amplify/deploy-frontend.sh preview` y compártela.
6. Con la aprobación: PR, merge a `main` y publicación del sitio principal (ver `buho-publicar`).

## Al terminar

Corre la checklist de `buho-revision`.
