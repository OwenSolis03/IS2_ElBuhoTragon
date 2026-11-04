---
name: buho-revision
description: Checklist de revisión antes de hacer commit, abrir un Pull Request o publicar cambios en El Búho Tragón - seguridad, secretos, pruebas, build, migraciones y descripción del PR. Úsala al terminar cualquier cambio, antes de `git commit`/`git push`, y al revisar el PR de otra persona.
---

# Revisión antes de commit, PR o publicación

Lee primero `buho-contexto` si no lo has hecho. Recorre la lista completa y reporta qué pasó y qué no. No digas "listo" sin haber corrido los comandos.

## 1. Alcance

- [ ] `git status` y `git diff --stat`: ¿solo cambian los archivos de esta tarea? Si hay cambios ajenos sin commit (de la persona o de otra sesión), no los mezcles sin preguntar.
- [ ] GitNexus: si la herramienta está disponible, corre `detect_changes({scope: "compare", base_ref: "main"})`. Si no, dilo y revisa a mano quién usa lo que cambiaste.
- [ ] Finales de línea: si editaste archivos CRLF con scripts, que no aparezca el archivo completo como modificado en el diff.

## 2. Secretos y datos (el repo es público)

```bash
git diff --cached --name-only | grep -E '\.env$|\.db$|\.sqlite3$|\.npz$|venv/|\.pem$'   # no debe salir nada
git diff --cached | grep -nEi 'AKIA[0-9A-Z]{16}|aws_secret|pbkdf2_sha256\$|BEGIN .*PRIVATE KEY|DJANGO_SECRET_KEY=[A-Za-z0-9_-]{30,}'
```

- [ ] Sin `.env`, bases de datos, llaves, tokens, contraseñas ni correos reales (en las pruebas, solo correos inventados).

## 3. Seguridad del backend (si se tocó `backend/`)

- [ ] Cada vista nueva declara `permission_classes`. Nada de escritura con `AllowAny`, salvo login y registro.
- [ ] El usuario sale de `request.user`, no del cuerpo de la petición.
- [ ] Ningún serializer expone `contrasena`.
- [ ] Endpoints públicos o caros llevan throttle.
- [ ] Hay pruebas nuevas para anónimo, alumno y admin.

## 4. Frontend (si se tocó `frontend/`)

- [ ] `grep -rn "127.0.0.1" frontend/src` solo debe mostrar `config.js`.
- [ ] Sin `dangerouslySetInnerHTML`.
- [ ] Colores y tipografía de la identidad UNISON (ver `buho-frontend`).

## 5. Comandos que deben pasar

```bash
cd backend
venv/bin/python manage.py check
venv/bin/python manage.py makemigrations --check --dry-run
venv/bin/python manage.py test apps.cafeteria.tests
cd ../frontend
npm run lint
npm run build
```

- [ ] Si se agregó un script: `bash -n script.sh` y `git update-index --chmod=+x script.sh`.

## 6. Commit y PR

- Mensaje en español con prefijo: `feat(...)`, `fix(...)`, `docs(...)`, `chore(...)`. El cuerpo explica el porqué.
- Rama desde `main`, nunca push directo a `main`. Push al remoto del equipo (`origin`) solo si la persona lo pidió.
- La descripción del PR incluye: qué cambia, cómo probarlo, si necesita deploy de frontend, de backend o de ambos, y si trae migraciones.

## 7. Después del merge

Publica con `buho-publicar` y verifica que `/api/Usuarios/` siga respondiendo 401.
