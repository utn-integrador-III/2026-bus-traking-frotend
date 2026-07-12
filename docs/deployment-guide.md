# Guia de despliegue automatizado del frontend

Este documento describe la estrategia de despliegue unificada para el proyecto
Bus Tracking. Define como desplegar automaticamente los tres artefactos del
sistema (backend, web frontend, app movil) cuando el codigo se integra en la
rama `main`.

## Arquitectura del despliegue

```
Browser / dispositivo movil
    |
    |--- Web (Next.js) ----------------> Vercel
    |                                      https://bus-tracking.vercel.app
    |
    |--- App movil (Expo/RN) -----------> EAS Build + EAS Update
    |                                      (App Store / Google Play)
    |
    |--- API REST ----------------------> Fly.io
    |                                      https://bus-tracking-api.fly.dev
    |
    v
Supabase (PostgreSQL gestionado + Auth + Realtime)
```

| Componente | Tecnologia | Plataforma cloud |
|---|---|---|
| Backend API | Node.js 22 + Express 5 | Fly.io (Docker) |
| Frontend web | Next.js 16 + React 19 + Tailwind v4 | Vercel |
| Frontend movil | React Native + Expo SDK 54 | EAS Build + EAS Update |
| Base de datos | Supabase (PostgreSQL) | Supabase cloud |
| CI/CD | GitHub Actions | GitHub Actions |
| Codigo fuente | Git + GitHub (monorepo) | GitHub |

Repositorios:
- Frontend: `github.com/utn-integrador-III/2026-bus-tracking-frontend`
- Backend:  `github.com/utn-integrador-III/2026-bus-tracking-api`

---

## Evaluacion de guias existentes

Se revisaron las siguientes guias de deployment disponibles en el equipo:

1. **Guia de Fly.io + Docker** (`2026-deployment-automation`): Utiliza Fly.io
   como plataforma de contenedores, Docker para empaquetar la aplicacion, y
   flyctl para el despliegue. Documentada en `docs/deployment-guide.md` del
   repositorio backend.

2. **Guia de Vercel para Next.js**: Documentacion interna de Vercel para
   desplegar aplicaciones Next.js con zero-config, soporte nativo de ISR/SSR,
   y GitHub integrado.

3. **Guias en Teams**: Notas sobre configuracion de Supabase, variables de
   entorno, y pasos manuales de deployment.

### Conclusion de la evaluacion

La estrategia de **Fly.io + Docker** es la mas adecuada para el backend por su
bajo costo (escala a cero), soporte nativo de contenedores, y alineacion con el
stack Node.js/Express.

Para el **frontend web (Next.js)**, **Vercel** es la plataforma optima porque:
- Es creada por el equipo de Next.js, con soporte nativo de todas las
  caracteristicas (ISR, SSR, App Router, Turbopack, middleware).
- Zero-config para Next.js -- solo conectar el repositorio.
- Integracion nativa con GitHub (deploy por push a `main`).
- Free tier generoso para proyectos academicos.
- Soporta monorepos con workspaces de npm.

Para la **app movil (Expo/React Native)**, **EAS Build + EAS Update** es la
solucion oficial de Expo para compilar y distribuir la app en tiendas (App
Store / Google Play), ademas de permitir actualizaciones OTA (over-the-air)
sin pasar por las tiendas.

---

## Tecnologias y servicios utilizados

### Backend (repositorio separado)

Ver `docs/deployment-guide.md` del repositorio backend.

Archivos clave en el backend:
- `Dockerfile` -- definicion de la imagen multi-etapa
- `fly.toml` -- configuracion de la app en Fly.io
- `.dockerignore` -- exclusiones del build de Docker
- `.github/workflows/deploy-backend.yml` -- CD pipeline

### Frontend web (Next.js en `web/`)

**Plataforma:** Vercel (plan Hobby, gratuito)

**Archivos de configuracion necesarios:**
- `vercel.json` (raiz del repo) -- configura `rootDirectory: "web"` para el
  monorepo, define `buildCommand`, `installCommand`, y `framework: "nextjs"`.
- `.github/workflows/deploy-web.yml` -- CD pipeline que despliega a Vercel.

**Variables de entorno (`web/.env.example`):**
```
NEXT_PUBLIC_API_BASE_URL=https://bus-tracking-api.fly.dev
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon
```

Estas variables se configuran como **Environment Variables** en el dashboard de
Vercel (Settings > Environment Variables), no en el repositorio.

### Frontend movil (Expo/React Native en la raiz)

**Plataforma:** EAS Build + EAS Update (plan Free)

**Archivos de configuracion necesarios:**
- `eas.json` (raiz del repo) -- perfiles de build (development, preview,
  production) y configuracion de EAS Update.
- `app.json` (ya existe) -- configuracion base de Expo.
- `.github/workflows/deploy-mobile.yml` -- CD pipeline para EAS Build.

**Variables de entorno (`root/.env.example`):**
```
EXPO_PUBLIC_API_URL=https://bus-tracking-api.fly.dev
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=tu_clave_google_maps
EXPO_PUBLIC_APP_NAME=Bus Tracking App
EXPO_PUBLIC_APP_ENV=production
```

---

## Pipeline CI/CD completo

### Flujo de Git para produccion

```
feature/*  --PR-->  dev  --PR-->  qa  --PR-->  main
                                                 |
                                        (CI + CD automatico)
```

### Eventos por rama

| Rama | Evento | Accion CI | Accion CD |
|---|---|---|---|
| `feature/*` | Push y PR a `dev` | CI (lint, typecheck, build, test) | No |
| `dev` | Push y PR a `qa` | CI (lint, typecheck, build, test) | No |
| `qa` | Push y PR a `main` | CI (lint, typecheck, build, test) | No |
| `main` | Push (merge desde `qa`) | CI (lint, typecheck, build, test) | CD: Vercel + EAS |
| `main` | Push (hotfix desde `main`) | CI (lint, typecheck, build, test) | CD: Vercel + EAS |

### Workflows de GitHub Actions

#### 1. CI (`ci.yml`)

Se ejecuta en **todos los PRs y pushes** a `main`, `qa`, `dev`. Ignora cambios
en `.md` y `docs/`.

Jobs:
- **typecheck**: TypeScript checks del design system y web
- **lint**: ESLint + verificacion de zero-comments
- **build**: Build de produccion de Next.js
- **test**: Playwright e2e tests (depende de build)

#### 2. Deploy Web (`deploy-web.yml`)

Se ejecuta solo en **push a `main`** (despues de merge). Despliega el
frontend web a Vercel.

```yaml
name: Deploy Web (Vercel)

on:
  push:
    branches: [main]
    paths-ignore:
      - '**.md'
      - 'docs/**'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: npm ci
      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          npx vercel pull --yes --token=$VERCEL_TOKEN
          npx vercel build --prod --token=$VERCEL_TOKEN
          npx vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN
```

#### 3. Deploy Movil (`deploy-mobile.yml`)

Se ejecuta solo en **push a `main`**. Compila la app con EAS Build (Android + iOS).
Si tambien se quiere OTA, agregar un paso separado de `eas update` en el workflow.

```yaml
name: Deploy Mobile (EAS)

on:
  push:
    branches: [main]
    paths-ignore:
      - '**.md'
      - 'docs/**'
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: npm ci
      - name: EAS Build
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Build Android
        run: eas build --platform android --profile production --non-interactive
      - name: Build iOS
        run: eas build --platform ios --profile production --non-interactive
```

### Resumen del pipeline

```
Push a main
    |
    v
[CI] typecheck + lint + build + test
    |
    |--- Exitoso ---> [CD Web]    Vercel deploy
    |                  [CD Mobile] EAS Build (Android + iOS)
    |
    |--- Fallo -----> Notificar al equipo (GitHub commit status)
```

---

## Guia paso a paso: deploy desde cero

### Paso 1: Configurar Supabase

Supabase es compartido entre backend y frontend. Configurar una sola vez:

1. Crear un proyecto en https://supabase.com.
2. Obtener las credenciales desde Project Settings > API:
   - Project URL
   - anon public key
   - service_role key (solo backend, jamas en el frontend).
3. Ejecutar las migraciones del backend (`database/migrations/`).
4. Configurar Row Level Security (RLS).

### Paso 2: Configurar Vercel (frontend web)

1. Crear cuenta en https://vercel.com (login con GitHub).
2. Click en "Add New > Project".
3. Importar el repositorio `2026-bus-tracking-frontend`.
4. Configurar:
   - **Root Directory:** `web/`
   - **Framework:** Next.js (se detecta automaticamente).
   - **Build Command:** `npm run build` (por defecto).
   - **Output Directory:** `.next` (por defecto).
   - **Install Command:** `npm ci` (por defecto).
5. En Settings > Environment Variables, agregar:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://tu-app.fly.dev`
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://tu-proyecto.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `tu_clave_anon`
6. Click en "Deploy".
7. Vercel genera automaticamente un dominio `bus-tracking.vercel.app`.

### Paso 3: Obtener token de Vercel para CI/CD

1. Ir a https://vercel.com/account/tokens.
2. Crear un token con nombre "GitHub Actions".
3. En Settings > Secrets and variables > Actions del repositorio de GitHub,
   agregar:
   - `VERCEL_TOKEN` = el token generado.
   - `VERCEL_ORG_ID` = ID de la organizacion (ver `vercel projects ls`).
   - `VERCEL_PROJECT_ID` = ID del proyecto (ver `vercel projects ls`).

### Paso 4: Configurar EAS (frontend movil)

1. Instalar EAS CLI localmente:
   ```
   npm install -g eas-cli
   ```
2. Iniciar sesion en Expo:
   ```
   eas login
   ```
3. Configurar el proyecto:
   ```
   eas init
   ```
   Esto crea un proyecto en Expo Application Services (EAS) vinculado al
   repositorio.

4. Crear `eas.json` en la raiz del repositorio (ver configuracion de ejemplo
   mas abajo).

5. Obtener el token de Expo para CI/CD:
   ```
   eas whoami  # verificar sesion
   ```
   Ir a https://expo.dev/settings/access-tokens.
   Crear un token y agregarlo a GitHub Secrets como `EXPO_TOKEN`.

### Paso 5: Verificar el pipeline completo

1. Hacer un cambio pequeno en una rama `feature/*`.
2. Abrir PR a `dev` -- CI debe ejecutarse.
3. Mergear a `dev` -- CI se ejecuta nuevamente.
4. Abrir PR de `dev` a `qa` -- CI se ejecuta.
5. Mergear a `qa` -- CI se ejecuta.
6. Abrir PR de `qa` a `main` -- CI se ejecuta.
7. Mergear a `main` -- CI + CD (Vercel + EAS) se ejecutan.

---

## Archivos de configuracion del frontend

### `vercel.json` (raiz del repositorio)

```json
{
  "rootDirectory": "web",
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci"
}
```

### `eas.json` (raiz del repositorio)

```json
{
  "cli": {
    "version": ">= 15.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "image": "latest"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## Mantenimiento y operaciones

### Actualizar la web

1. Hacer cambios en una rama `feature/*`.
2. Seguir el flujo de ramas: `feature/*` -> `dev` -> `qa` -> `main`.
3. Al mergear a `main`, Vercel despliega automaticamente.
4. Vercel soporta **Previews**: cada PR genera una URL unica para testing.

### Actualizar la app movil

- **Cambios de codigo JS/TS:** Con el workflow actual, al mergear a `main` se ejecuta `eas build` (no OTA).
- **OTA (EAS Update):** No esta automatizado; ejecutar `eas update` manualmente o agregar un paso en CI/CD.
- **Cambios nativos (plugins, config):** Requieren rebuild con `eas build` y nueva submission a las tiendas.

### Rollback

- **Vercel:** Dashboard > Deployments > menu contextual > "Promote to
  Production" de una version anterior.
- **EAS:** `eas update --branch production --message "Rollback a version X"`
  con el commit anterior.
- **Backend:** `fly deploy --image registry.fly.io/nombre-app:deployment-XX`.

### Monitoreo

- **Vercel:** Dashboard > Analytics (rendimiento web).
- **Fly.io:** `fly logs` para logs en tiempo real.
- **Supabase:** Dashboard > Database > Reports.
- **EAS:** Dashboard > Builds > historial de builds.

### Costos aproximados

| Servicio | Plan | Costo mensual |
|---|---|---|
| Fly.io (backend) | Free (3 apps, escala a cero) | $0 |
| Vercel (web) | Hobby (100GB ancho de banda, 6000 build mins) | $0 |
| EAS (movil) | Free (30 builds/mes, OTA updates ilimitados) | $0 |
| Supabase | Free (500MB BD, 2GB ancho de banda) | $0 |
| **Total** | | **$0/mes** |

---

## Referencias

- Documentacion oficial de Fly.io: https://fly.io/docs
- Documentacion oficial de Vercel: https://vercel.com/docs
- Documentacion oficial de EAS: https://docs.expo.dev/eas
- Documentacion oficial de Supabase: https://supabase.com/docs
- Guia de despliegue del backend: `docs/deployment-guide.md` en el repositorio
  backend (`2026-bus-tracking-api`)
- Flujo de ramas Git: `docs/git-workflow.md` en este repositorio
- Secret scanning: `.gitleaks.toml` en la raiz
- CI pipeline: `.github/workflows/ci.yml` en este repositorio
