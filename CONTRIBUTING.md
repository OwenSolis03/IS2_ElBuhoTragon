# Cómo contribuir a El Búho Tragón

Flujo de trabajo del equipo: de un cambio en tu computadora a verlo publicado en el sitio.

- **Repositorio central:** https://github.com/OwenSolis03/IS2_ElBuhoTragon
- **Sitio publicado:** https://buhotragon.d2c3gnm85qd306.amplifyapp.com
- **Regla de oro:** `main` es lo que está publicado. Nada entra a `main` sin Pull Request.

---

## 1. Preparación (una sola vez)

```bash
git clone https://github.com/OwenSolis03/IS2_ElBuhoTragon.git
cd IS2_ElBuhoTragon
```

**Backend (Django):**

```bash
cd backend
python3 -m venv venv
venv/bin/pip install -r requirements.txt
cp .env.example .env        # deja DJANGO_DEBUG=True para desarrollo
```

Para la base de datos local pide una copia al equipo (no está en el repo) o crea una vacía con `venv/bin/python manage.py migrate`.

**Frontend (React + Vite):**

```bash
cd frontend
npm install
```

**Chatbot (opcional):** usa Amazon Bedrock y necesita credenciales de AWS. Sin ellas, el resto del sitio funciona y el chatbot responde "no disponible".

---

## 2. Cada cambio, paso a paso

1. **Actualízate**

   ```bash
   git switch main
   git pull
   ```

2. **Crea una rama** con un nombre que diga qué haces

   ```bash
   git switch -c feat/filtro-por-precio
   ```

   Prefijos: `feat/` algo nuevo · `fix/` corrección · `docs/` documentación · `chore/` mantenimiento.

3. **Haz tus cambios y pruébalos en local**

   ```bash
   # Backend  (http://127.0.0.1:8000)
   cd backend && venv/bin/python manage.py runserver

   # Frontend (http://localhost:5173)
   cd frontend && npm run dev
   ```

   - Si tocaste el backend, corre las pruebas: `venv/bin/python manage.py test apps.cafeteria.tests`
   - Si cambiaste un modelo: `venv/bin/python manage.py makemigrations` y **sube el archivo de migración**.
   - Si tocaste el frontend, revisa que compile: `npm run build`

4. **Guarda y sube tu rama**

   ```bash
   git add <archivos>
   git commit -m "feat: agrega filtro por precio"
   git push -u origin feat/filtro-por-precio
   ```

5. **Abre un Pull Request** en GitHub hacia `main`. Explica qué cambiaste y cómo probarlo.

6. **Revisión:** otra persona del equipo lo revisa y lo aprueba. Si pide cambios, haz nuevos commits en la misma rama y vuelve a hacer `git push`.

7. **Merge a `main`** y deploy (ver sección 3).

---

## 3. Deploy

| Parte | Dónde vive | Cómo se publica |
|---|---|---|
| Frontend | AWS Amplify | Se compila `frontend/` y se publica en Amplify |
| Backend y chatbot | Servidor EC2 | `deploy/ec2/setup.sh` actualiza el código, aplica migraciones y reinicia |

**Situación actual:** después del merge, la persona con acceso a AWS publica el cambio (unos 5 minutos). Avísale en el Pull Request.

**Objetivo:** el merge a `main` publicará solo (Amplify conectado a GitHub y un GitHub Action para el backend), sin que nadie del equipo necesite cuenta de AWS.

---

## 4. Reglas importantes

- **Nunca** hagas push directo a `main`.
- **Nunca** subas `backend/.env`, archivos `.db`, llaves, tokens ni contraseñas.
- **Los datos del sitio no viajan con el código.** Cafeterías, menús, reseñas y usuarios viven en el servidor; se editan desde el panel de administración del sitio, no desde tu base local.
- Las direcciones de la API van en `frontend/src/config.js` (`API_URL`). No escribas `http://127.0.0.1:8000` directo en los componentes.
- Los permisos de la API están en `backend/apps/cafeteria/permissions.py`. Un endpoint nuevo debe declarar quién puede usarlo.

---

## 5. Si algo sale mal

- **Rompí algo en mi rama:** no pasa nada; `main` y el sitio siguen intactos. Corrige y haz push de nuevo.
- **Se publicó algo con error:** abre un Pull Request que revierta el cambio (`git revert <commit>`) y avisa a quien tenga acceso a AWS.
- **Dudas:** pregunta en el Pull Request o al equipo antes de hacer merge.
