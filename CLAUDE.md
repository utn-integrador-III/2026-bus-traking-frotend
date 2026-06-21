# CLAUDE.md

Este archivo guía a Claude Code (claude.ai/code) al trabajar en este repositorio.

## Qué es esto

Cliente **móvil (frontend)** de una aplicación de **seguimiento de buses en tiempo real**
(un "Waze para transporte público"). Sirve a tres roles — **Passenger**, **Driver**,
**Administrator** — y consume un backend REST + realtime que vive en un repo separado.

> **Este repo es solo frontend.** No agregar aquí lógica de servidor, queries a base de
> datos ni código Express. El backend (Node.js + Express + Supabase) es un proyecto aparte:
> `D:\GitHub\Universidad\Integrador III\2026-bus-tracking-api`.

Estado actual: **scaffold**. La estructura de carpetas en `src/` (app móvil) existe pero los
archivos están vacíos. `package.json` y `.env.example` raíz aún no tienen contenido de la app
móvil — son los primeros artefactos a crear para el móvil.

> **Este repo es un monorepo.** En la raíz vive (en construcción) la app **móvil React Native**
> y el **tooling compartido**; en **`web/`** vive una app **web Next.js** ya inicializada. Ver
> la sección "Aplicación web (`web/`)" más abajo. El `package.json` de la raíz es el root de
> tooling (Husky + automatizaciones) del monorepo, no la app móvil todavía.

## Stack tecnológico (autoritativo)

| Concern | Tecnología |
|---|---|
| Framework móvil | **React Native** (TypeScript) — probablemente sobre **Expo** (push tokens, background location) |
| Backend API | **Node.js + Express 5** (repo separado), base URL vía env |
| Auth | **Supabase Auth** — login con email/password + OAuth; JWT en cada request protegido |
| Realtime | **Supabase Realtime** (canales WebSocket) para telemetría de buses |
| Mapas | **Mapcn** / componente de mapa que renderice capas **GeoJSON** (rutas, paradas, marcador del bus) |
| Push notifications | **Expo Push API** (token `expo_push_token` por pasajero) |
| Persistencia offline | **SQLite / MMKV** para encolar reportes de incidentes en baja conectividad (NFR-12) |

## Comandos

> `package.json` está vacío; estos scripts deben crearse. Convención esperada (proyecto Expo):

```bash
npm install            # instalar dependencias
npx expo start         # arrancar el dev server (Metro) — escanear QR con Expo Go
npm run android        # build/run en emulador o dispositivo Android
npm run ios            # build/run en simulador iOS (solo macOS)
npm run lint           # ESLint
```

Copiar `.env.example` → `.env` antes de correr. El backend espera el frontend en
`http://localhost:8081` (Metro) y tiene CORS para `8081`, `19006` (Expo web) y `3000`.

## Variables de entorno (frontend)

`.env.example` está vacío. Las claves mínimas que el cliente necesita (prefijo `EXPO_PUBLIC_`
para que Expo las exponga al bundle):

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000     # API REST del backend (APP_PORT=8000)
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key   # SOLO la anon key, NUNCA la service_role
```

> **Nunca** embeber `SUPABASE_SERVICE_ROLE_KEY` ni `JWT_SECRET_KEY` en el cliente: son secretos
> exclusivos del backend. El frontend solo usa la `anon key` y el JWT de sesión del usuario.

## Arquitectura de carpetas (`src/`)

Organización por **responsabilidad** y **rol de usuario** (ver `README.md` para detalle):

```
src/
├── app/            configuración global, roles, permisos, providers
├── auth/           login, registro de pasajero, manejo de acceso protegido
├── navigation/     navegación basada en rol (passenger / driver / admin)
├── screens/
│   ├── passenger/  trips disponibles, detalle, mapa en vivo, reportes, notificaciones, perfil
│   ├── driver/     trips asignados, control de trip, mapa, start/end, reporte de incidentes
│   └── admin/      dashboard, gestión de trips/rutas/paradas/buses/drivers, monitoreo, moderación
├── components/     UI reutilizable (mapa, trip cards, report items, notificaciones)
├── services/       comunicación externa (API REST, Supabase, auth, trips, locations, reports, realtime)
├── hooks/          hooks custom (estado auth, validación de rol, tracking realtime, ubicación, push)
├── context/        estado global (AuthContext, TripContext)
├── types/          tipos/interfaces TS (user, trip, route, stop, bus, report, notification)
├── utils/          helpers (fechas, distancias, validación de rol y formularios)
└── config/         configuración de entorno, constantes
```

Archivos ya esbozados (vacíos): `auth/LoginScreen.tsx`, `auth/RegisterPassengerScreen.tsx`,
`navigation/AppNavigator.tsx`, `screens/{admin,driver,passenger}/*HomeScreen.tsx`,
`services/apiClient.ts`, `services/supaBase.ts`, `types/{trip,user}.types.ts`.

## Responsabilidades del frontend por rol

- **Passenger**: registro/login, lista de rutas y horarios del día, preview interactivo de un
  trip (ruta GeoJSON + paradas + bus en vivo) antes de comprar, seguimiento en tiempo real,
  selección de parada de abordaje/destino, compra simulada de ticket + render de **QR**,
  reporte de incidentes, recepción de push notifications.
- **Driver**: ver trips asignados del día, iniciar/finalizar trip con un toque, **stream de GPS
  en background cada 2s** mientras el trip está activo, **escanear QR** para validar abordaje,
  reportar incidentes críticos (bloqueado si velocidad > 0 km/h).
- **Administrator**: dashboard cartográfico con telemetría en vivo, CRUD de rutas/paradas/
  buses/trips/drivers, monitoreo de trips activos, moderación de reportes comunitarios.

## Integración con el backend — REST API

Base: `EXPO_PUBLIC_API_BASE_URL` + ruta. Todo endpoint protegido requiere header
`Authorization: Bearer <jwt>`. Catálogo completo en
`00-Recursos\Endpoints_BusTracking(REST API Endpoints).csv`. Resumen:

| Método | Endpoint | Rol | Uso |
|---|---|---|---|
| POST | `/api/auth/register` | público | registro de pasajero (rol forzado a Passenger) |
| POST | `/api/auth/login` | público | login, retorna `{ token, user }` |
| POST | `/api/admin/drivers` | admin | crear cuenta de driver |
| GET/POST/PUT/DELETE | `/api/admin/routes[/:id]` | admin | CRUD rutas (con `geometry_geojson`) |
| GET/POST/DELETE | `/api/admin/stops[/:id]` | admin | CRUD paradas (`?route_id` opcional) |
| POST | `/api/admin/trips` | admin | planificar/despachar trip |
| GET | `/api/admin/incidents` | admin | listar reportes para moderar (`?status`) |
| PUT | `/api/admin/incidents/:id` | admin | validar/descartar reporte |
| GET | `/api/admin/telemetry/history` | admin | traza histórica (`?trip_id&start_time&end_time`) |
| GET | `/api/driver/trips` | driver | trips asignados del día (derivado del JWT) |
| PATCH | `/api/driver/trips/:id/status` | driver | Start / End trip (In Progress, Completed, Cancelled) |
| POST | `/api/driver/incidents` | driver | reporte rápido (bloqueado si speed > 0) |
| GET | `/api/passenger/routes` | passenger | rutas + horarios del día actual |
| GET | `/api/passenger/trips/:id/preview` | passenger | preview: ruta GeoJSON + paradas + bus en vivo |
| POST | `/api/tickets/checkout` | passenger | compra simulada (~1.5s); senior → $0 |
| POST | `/api/tickets/verify` | driver | validar QR al abordar (transición ACID Generated→Scanned) |
| POST | `/api/passenger/incidents` | passenger | reportar anomalía (cola offline en Milestone 3) |
| GET | `/api/passenger/incidents` | passenger | reportes comunitarios de la última hora (`?trip_id`) |

## Integración con el backend — Realtime (Supabase WebSocket)

Detalle en `00-Recursos\Endpoints_BusTracking(WebSocket and Real-Time Events).csv`.

- **`realtime:public:trip_location:${trip_id}`** — el **Driver publica** telemetría
  `{ latitude, longitude, speed, heading, timestamp }` cada ~2s mientras el trip está activo.
  **Passengers y Admin se suscriben** para animar el marcador del bus (latencia objetivo < 2s).
- **`supabase_database_changes:Trip`** — cambios de estado del trip (Scheduled → In Progress,
  delays, cancelaciones) que disparan push automáticas a los pasajeros suscritos.
- **`geofence_alerts_trigger`** (interno/Edge) — push nativa cuando el bus entra a < 500m de la
  parada elegida por el pasajero (lógica Haversine en el backend).

## Modelo de datos (entidades relevantes para tipos del frontend)

PKs UUID salvo nota. Definir en `src/types/`:

- **User**: `id`, `name`, `email`, `role` (`'Passenger' | 'Driver' | 'Admin'`).
- **Passenger**: `user_id`, `phone`, `notification_preferences` (JSON), `is_senior` (bool),
  `expo_push_token` (nullable).
- **Driver**: `user_id`, `license_number`. **Administrator**: `user_id`, `employee_code`.
- **Bus**: `id`, `plate_number`, `capacity`, `status`.
- **Route**: `id`, `name`, `origin`, `destination`, `geometry_geojson` (LineString).
- **Stop**: `id`, `route_id`, `name`, `latitude`, `longitude`, `stop_order`.
- **Trip**: `id`, `route_id`, `bus_id`, `driver_id`, `departure_time`, `arrival_time?`,
  `status` (`'Scheduled' | 'Pending' | 'In Progress' | 'Stopped' | 'Delayed' | 'Completed' | 'Cancelled'`).
- **Location**: telemetría histórica (`latitude`, `longitude`, `speed`, `heading`, `timestamp`).
- **Report**: `trip_id`, `user_id`, `type`, `description`, `latitude`, `longitude`, `timestamp`.
- **Notification**: `user_id`, `trip_id`, `message`, `status`, `timestamp`.
- **Ticket**: `passenger_id`, `trip_id`, `status` (`'Generated' | 'Scanned' | 'Cancelled'`),
  `payment_type` (`'Simulated_Card' | 'Senior_Exemption'`), `generated_at`, `scanned_at?`.

## Reglas de dominio que afectan al frontend

- **RBAC (FR-04/05):** el registro público siempre crea rol `Passenger`. La navegación debe
  interceptarse según el rol del JWT — nunca confiar en input del cliente para el rol. Driver y
  Admin solo los crea un Administrator.
- **Ciclo de vida del Trip:** `Scheduled → Pending → In Progress → (Stopped | Delayed) → Completed | Cancelled`.
  El backend deriva los estados intermedios; el driver solo hace **Start** y **End**. El frontend
  refleja el estado en tiempo real (FR-17) y anima el marcador (FR-18).
- **Telemetría del Driver:** stream cada ~2s en background mientras el trip está activo. El
  tracking GPS **debe detenerse de inmediato** al marcar el trip Completed/Cancelled (FR-14).
- **Tickets:** checkout simulado (gateway dummy aprueba) → ticket único → render de **QR
  encriptado** desde el ticket ID. Si `is_senior`, se omite el pago y se emite ticket $0 (FR-22-SR).
  El driver escanea QRs; las validaciones concurrentes son ACID en el backend (NFR-15).
- **Missed-bus (FR-16-MB):** si el bus rebasa la parada elegida, **no** forzar salida; mostrar
  alerta y permitir elegir otra parada downroute o salir manualmente.
- **Geofence (FR-21):** alerta push cuando el bus está a < 500m de la parada del pasajero.
- **Offline (NFR-12):** los reportes de incidentes redactados sin conexión se encolan localmente
  (SQLite/MMKV) y se sincronizan al recuperar red.
- **Mapas (FR-23):** renderizar capas GeoJSON (rutas lineales + geofences de paradas) y el
  marcador dinámico del vehículo.
- **Usabilidad (NFR-09):** diseño responsive idéntico en smartphones y tablets.

## Documentos de referencia (fuera del repo)

Requisitos completos (FR-01..FR-30, NFR-01..NFR-16), historias de usuario, modelo de datos,
endpoints y mockups viven en:
`D:\Universidad\2026\II-Cuatrimestre\ITI-823 PROYECTO INTEGRADOR III  DESARROLLO DE SOFTWARE II\00-Recursos\`

- `Functional and non-functional requirements - Buses Project.pdf`
- `BusTrackingProject-CoreUserStoriesChecklists.pdf` (US-00A..US-03, Milestone 1 = MVP)
- `Endpoints_BusTracking(REST API Endpoints).csv`
- `Endpoints_BusTracking(WebSocket and Real-Time Events).csv`
- `Mockup.pdf` / `Bus_Tracking_App_-_Mockups.pptx`

Backend (repo separado): `D:\GitHub\Universidad\Integrador III\2026-bus-tracking-api` —
ver su `CLAUDE.md` y `docs/` (`api-docs-swagger.md`, `routes-module.md`, `trips-module.md`).

## Alcance por entregas (Milestones)

- **Milestone 1 (Core MVP):** auth + RBAC, lista de rutas/trips, preview de ruta, tracking en
  vivo (passenger), start/end + stream GPS (driver), mapas con GeoJSON. US-00A/B/C, US-01/02/03.
- **Milestone 2:** tickets (checkout simulado + QR), validación de QR por driver, incidentes
  comunitarios (crear/listar overlays en mapa).
- **Milestone 3:** exención senior ($0), moderación de incidentes (admin), historial de
  telemetría (auditoría), cola offline de reportes.

## Aplicación web (`web/`)

App **Next.js 16 + React 19 + TypeScript** (App Router, Tailwind v4), gestor **npm**. Consume
el mismo backend REST + Supabase Realtime descrito arriba (ver variables `NEXT_PUBLIC_*` en
`web/.env.example` y validación en `web/lib/env.ts` vía `@t3-oss/env-nextjs`).

Comandos (desde `web/`, o `npm run web:* ` desde la raíz):

```bash
npm run dev          # next dev (localhost:3000)
npm run build        # build de producción
npm run lint         # ESLint (incluye regla local/no-comments)
npm run typecheck    # tsc --noEmit
npm run strip:dry    # reporta comentarios prohibidos (gate de CI)
npm run strip:apply  # elimina comentarios prohibidos in-place
npm run env:check    # verifica drift lib/env.ts ↔ .env.example
npm test             # Playwright e2e (levanta el dev server)
```

### Automatizaciones (defensa en profundidad — replicadas del paquete de referencia)

Las mismas verificaciones corren en el hook local **y** en CI:

- **Husky** (`.husky/` en la raíz del repo): `pre-commit` corre `typecheck` + `lint` de `web/`
  + `gitleaks protect --staged`; `pre-push` bloquea push directo a `main`/`qa`/`dev` y **avisa**
  si la rama no sigue `<prefijo>/us<NN>-<dueño>`. Se instalan solos vía el script `prepare` de
  la raíz (`npm install` en la raíz).
- **ESLint flat config** (`web/eslint.config.mjs`): `eslint-config-next` + regla custom
  **`local/no-comments`** (`web/tools/eslint-rules/no-comments.mjs`) que prohíbe comentarios.
- **Zero-comments**: el código no lleva comentarios; toda explicación va a `.md`/`docs/`. Solo
  se eximen directivas del toolchain (`eslint-disable`, `@ts-*`, `/* global */`, etc.).
  `web/tools/strip-comments.mjs` limpia el código (scope: `app/`, `lib/`, `scripts/` + configs raíz).
- **Gitleaks** (`.gitleaks.toml` en la raíz): escaneo de secretos; allowlist para `.env.example`,
  lockfiles, fixtures.
- **check-env-drift** (`web/scripts/check-env-drift.mjs`): falla si una var de `lib/env.ts`
  (bloques `server`/`client`) falta en `.env.example`.
- **GitHub Actions** (raíz `.github/`): `ci.yml` (jobs `typecheck`/`lint`+`strip:dry`/`build`/`test`
  con `working-directory: web`, npm + Node 22) y `secret-scan.yml` (gitleaks full-history sobre
  push/PR a `main`/`qa`/`dev`). `dependabot.yml` agrupa updates npm de `/web` y de la raíz, + actions.

> Para la app móvil (raíz) estas automatizaciones aún no aplican; los hooks hoy validan `web/`.
> Cuando el móvil arranque, extender el `pre-commit` y un job de CI análogos.

## Restricción — Flujo de ramas Git (regla dura)

Mismo flujo que el backend. Toda integración a `main` pasa por **`dev → qa → main`**.

```
feature/* | fix/* | chore/* | refactor/* | docs/* | test/*  ── PR ──▶ dev ── PR ──▶ qa ── PR ──▶ main
hotfix/* ── PR ──▶ main  (+ back-merge main → qa → dev el mismo día)
```

- Ramas largas protegidas: `main`, `qa`, `dev` — **commit/push directo PROHIBIDO**.
- **Nombre de rama y encabezado/título del PR: `<prefijo>/us<NN>-<dueño>`** — cada tarea proviene
  de una historia de usuario (US). Ej. `feature/us11-Alex`. `us<NN>` en minúsculas; `<dueño>` es
  el nombre del dev responsable. **Si no se conoce el número de US o el dueño, PREGUNTAR — nunca inventar.**
- Las ramas cortas se crean desde `dev` actualizado (`hotfix/*` desde `main`).
- Antes de commitear, verificar la rama: si es `main`/`qa`/`dev`, crear una rama corta primero.
- `--no-verify` prohibido salvo aprobación explícita. Commit/push **solo cuando el humano lo pida**.

Detalle completo: [`docs/git-workflow.md`](docs/git-workflow.md) · resumen para agentes:
[`docs/AGENTS-reglas-ramas-y-pr.md`](docs/AGENTS-reglas-ramas-y-pr.md).

## Notas de trabajo

- `node_modules/`, `.env`, `.env.*` (salvo `.env.example`) y `.claude` están en `.gitignore`.
- Mantener la separación de capas: las pantallas (`screens/`) no llaman a la API directo; pasan
  por `services/` (y por `hooks/`/`context/` para estado). Tipos compartidos en `types/`.
- Espejar NFR-14 (desacople): aislar las llamadas a Supabase/API/Expo en `services/` para poder
  cambiar de proveedor sin tocar la UI.
