---
name: buho-backend
description: Pautas para cambiar el backend Django/DRF de El Búho Tragón - endpoints, permisos, modelos, migraciones, serializers, settings y pruebas. Úsala al agregar o modificar cualquier cosa en backend/ (vistas, rutas, modelos, autenticación, límites de peticiones o configuración).
---

# Backend de El Búho Tragón (Django 5.1 + DRF + Simple JWT)

Lee primero `buho-contexto` si no lo has hecho.

## Archivos clave

| Archivo | Qué contiene |
|---|---|
| `backend/apps/cafeteria/models.py` | `Facultades`, `Tienditas`, `Menus`, `Usuarios`, `Resenas` |
| `backend/apps/cafeteria/views.py` | ViewSets, login, registro y chatbot |
| `backend/apps/cafeteria/permissions.py` | `EsAdmin`, `EsAdminOSoloLectura`, `PermisoResena` y los throttles |
| `backend/apps/cafeteria/authentication.py` | JWT contra `Usuarios` (no `auth_user`) |
| `backend/apps/cafeteria/serializers.py` | Serializers |
| `backend/config/urls.py` | Rutas reales. `apps/cafeteria/urls.py` **no está incluido**; no agregues rutas ahí |
| `backend/config/settings.py` | Todo lo configurable sale de variables de entorno (ver `backend/.env.example`) |
| `backend/apps/cafeteria/tests.py` | Pruebas de seguridad y del motor RAG |

## Reglas no negociables

1. **Cerrado por defecto.** `DEFAULT_PERMISSION_CLASSES` es `IsAuthenticated`. Cada vista nueva declara su `permission_classes` explícitamente:
   - Catálogo público con escritura de admin → `EsAdminOSoloLectura`
   - Solo admin → `EsAdmin`
   - Público de verdad (login, registro, chatbot) → `AllowAny` **más** un throttle
2. **El usuario sale del token, nunca del cuerpo de la petición.** Usa `request.user` (una instancia de `Usuarios`). No confíes en `id_usuario`, `es_admin` ni campos parecidos que mande el cliente; márcalos como `read_only_fields`.
3. **Nunca devuelvas `contrasena`.** En cualquier serializer de `Usuarios` usa `extra_kwargs = {'contrasena': {'write_only': True}}`, y crea contraseñas con `make_password`.
4. **Endpoints públicos o caros llevan throttle.** Las tasas están en `DEFAULT_THROTTLE_RATES` (configurables por env). Para un throttle nuevo crea una clase en `permissions.py` siguiendo `_ThrottlePorIP` y agrega su tasa.
5. **Mensajes de error sin pistas.** El login responde igual si el usuario no existe que si la contraseña es incorrecta.
6. **Validación en el servidor.** Las reglas del frontend (por ejemplo, el correo `@unison.mx`) se repiten en el serializer.

## Modelos y migraciones

- Al cambiar un modelo: `venv/bin/python manage.py makemigrations` y **sube el archivo de migración** en el mismo commit.
- Las migraciones se aplican solas en producción (`setup.sh` corre `migrate`). Evita migraciones destructivas (borrar o renombrar columnas con datos). Si hacen falta, avisa y planea un respaldo antes (ver `buho-publicar`).
- `Usuarios.is_authenticated` es una propiedad necesaria para DRF; no la quites.

## Probar

```bash
cd backend
venv/bin/python manage.py check
venv/bin/python manage.py makemigrations --check --dry-run   # ¿olvidaste una migración?
venv/bin/python manage.py test apps.cafeteria.tests
```

- Para cada endpoint nuevo agrega pruebas en `tests.py` que cubran: anónimo, alumno, admin y, si aplica, que el autor salga del token.
- DRF lee `DEFAULT_THROTTLE_RATES` al importar: en pruebas de throttling usa `patch.object(SimpleRateThrottle, 'THROTTLE_RATES', {...})`, no `override_settings`.
- Desarrollo local: `backend/.env` con `DJANGO_DEBUG=True` (copia `.env.example`).

## Al terminar

Corre la checklist de `buho-revision` y publica con `buho-publicar`.
