---
name: buho-contexto
description: Mapa actualizado de El Búho Tragón (guía de cafeterías UNISON) - arquitectura en producción, dónde vive cada cosa, recursos de AWS y trampas conocidas del repo. Úsala al empezar cualquier tarea en este proyecto, antes de leer código o docs viejos, y cuando no sepas en qué archivo o servicio está algo.
---

# El Búho Tragón: contexto del proyecto

Guía gastronómica de la Universidad de Sonora (campus Hermosillo): cafeterías, menús, precios, horarios, reseñas, "Pasaporte Tragón" y un chatbot ("El Buhito").

## Fuente de verdad

- **Este archivo, `CONTRIBUTING.md` y el código** están al día.
- **Desactualizados, no confíes en ellos:** `PROJECT_CONTEXT.md` (describe SQLite local, Qwen en HPC y URLs fijas a 127.0.0.1), `AUDITORIA_*.md` y la carpeta `presentation/` (material de la ponencia SNIDM, describe la versión HPC).
- Diseño visual: `.better-react-web-ui.md` (vigente).

## Arquitectura en producción

```
Navegador ──► Amplify (frontend React, rama buhotragon)
                 └─ /api/* ──proxy──► EC2 (Caddy HTTPS ─► gunicorn ─► Django)
                                          ├─ SQLite en /opt/buho/data (fuera del código)
                                          └─ Amazon Bedrock (chatbot)
```

| Pieza | Dónde |
|---|---|
| Sitio | https://buhotragon.d2c3gnm85qd306.amplifyapp.com |
| Vista previa | https://preview.d2c3gnm85qd306.amplifyapp.com |
| Backend directo | https://3-22-76-54.sslip.io (el WiFi de la UNISON bloquea sslip.io; por eso el navegador entra por el proxy de Amplify) |
| AWS | Proyecto 288272421897, región **us-east-2** (única permitida), perfil CLI `buho-tragon` |
| EC2 | `i-09634d6e7ba9591a1` (t4g.micro), rol `buho-tragon-ec2`, acceso por SSM (sin SSH) |
| Bucket | `buho-tragon-deploy-288272421897` (código para deploy + `backups/`) |
| Amplify | app `d2c3gnm85qd306` |

## Mapa del repo

| Carpeta | Contenido | Skill para cambios |
|---|---|---|
| `backend/apps/cafeteria/` | Modelos, vistas, serializers, `permissions.py`, `authentication.py`, tests | `buho-backend` |
| `backend/config/settings.py` | Configuración por variables de entorno | `buho-backend` |
| `frontend/src/` | React 19 + Vite 6 + Tailwind 4; `config.js` tiene `API_URL` | `buho-frontend` |
| `llm_rag/` | Motor del chatbot (`rag_engine_bedrock.py`, `rag_engine_hpc.py`) | `buho-chatbot` |
| `deploy/` | Scripts de publicación (`amplify/`, `ec2/`) | `buho-publicar` |
| `sql/` | Respaldos SQL viejos de MySQL (sin usuarios). Referencia histórica | - |

Rutas del frontend: `/`, `/cafeterias`, `/cafeterias/:id`, `/facultad`, `/login`, `/registro`, `/admin/dashboard`, `/terminos`, `/privacidad`, `/contacto`.

## Trampas conocidas (léelas)

1. **La base de datos no está en git.** Los datos reales viven en el servidor. La copia local (`backend/el_buho_tragon.db`) es solo para desarrollo; cambiarla no cambia el sitio.
2. **Usuarios propios, no `auth_user`.** El login usa el modelo `Usuarios` y la clase `UsuariosJWTAuthentication`. El admin de Django (`/admin`) no tiene usuarios staff y no se usa; el panel real es `/admin/dashboard` en React.
3. **Finales de línea mixtos.** Muchos archivos usan CRLF (`settings.py`, `models.py`, `urls.py`, `serializers.py`, `requirements.txt`). Si los reescribes con un script, conserva el CRLF.
4. **`core.fileMode=false`.** Git no guarda permisos de ejecución por sí solo. Para scripts nuevos: `git update-index --chmod=+x <script>`.
5. **`apps/` no tiene `__init__.py`.** Las pruebas se corren con la ruta del módulo: `manage.py test apps.cafeteria.tests`.
6. **Nada de URLs fijas.** El frontend usa `API_URL` de `frontend/src/config.js`. Nunca escribas `http://127.0.0.1:8000` en un componente.
7. **Dos remotos:** `origin` (repo del equipo, OwenSolis03) y `fork` (Joaco2025). Los dos son públicos: nunca subas secretos, `.env` ni `.db`.
8. **GitNexus** (`CLAUDE.md`) pide `impact`/`detect_changes`; si la herramienta no está disponible en la sesión, revisa a mano quién llama a lo que cambias y dilo.

## Costos

Presupuesto: 100 USD de crédito (vencen el 2027-05-03) y una alerta en AWS Budgets a 15 USD/mes. Lo fijo cuesta unos $13 al mes y el chatbot unos $0.0015 por mensaje (tope de 400 al día). Antes de agregar un servicio de AWS, estima su costo mensual y avísalo.
