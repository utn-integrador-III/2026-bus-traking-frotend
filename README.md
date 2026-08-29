# Bus Tracking - Frontend

This repository contains the frontend of the Real-Time Bus Tracking application, a "Waze for public transportation" that serves three user roles: **Passengers**, **Drivers**, and **Administrators**. It is built as an npm workspaces monorepo that includes a **React Native (Expo) mobile app**, a **Next.js web admin panel**, and a shared **design system package**. The frontend consumes a REST API and Supabase Realtime from a separate backend repository.

## Members

- Alex Herrera Manzanares
- Luis Alejandro López Reyes
- Sebastián Rodríguez Mesen
- Sergio Quesada Chavarría
- Samiel Marín Cambronero

---

## Features

- **Mobile App (React Native + Expo)**: Public passenger registration and login, role-based navigation, available routes and trips, interactive route preview, real-time bus tracking with GeoJSON layers, simulated ticket checkout with QR rendering, QR boarding validation, incident reporting, push notifications, senior citizen exemption, and an offline incident queue.
- **Driver Mode**: Assigned trips for the day, start/end trip with a single tap, background GPS streaming every 2 seconds while a trip is active, and an onboard QR scanner.
- **Web Admin Panel (Next.js)**: Cartographic dashboard with live telemetry, CRUD for routes, stops, buses, trips, and drivers, active trip monitoring, and community incident moderation.
- **Shared Design System (`@bustrack/design`)**: Single source of truth for design tokens (colors, typography, spacing, radii, shadows, z-index) and icons, consumed by both the web and mobile apps.
- **Real-Time**: Supabase Realtime channels for bus telemetry and trip status changes, with push notifications on state changes and geofence alerts.
- **Offline Support**: Incident reports written without connectivity are queued locally (SQLite) and synchronized when the network is restored.
- **Quality Gates**: Husky pre-commit hooks, ESLint, TypeScript strict typechecking, unit and E2E test suites with 80% coverage thresholds, Gitleaks secret scanning, and GitHub Actions CI.

---

## Project Architecture

### 1. Mobile App (`src/` at the repository root)

Organized by responsibility and user role:

- **`auth/`**: Login, public passenger registration, and protected access handling.
- **`navigation/`**: Role-based navigation (Passenger / Driver / Admin).
- **`screens/`**: Application screens grouped by role (`passenger/`, `driver/`).
- **`services/`**: External communication (REST API client, Supabase, auth, tickets, incidents, driver location, notifications).
- **`hooks/`**: Custom hooks (geofence alerts, offline sync, push notifications).
- **`database/`**: Local SQLite queue for offline incident reports.
- **`types/`**: Shared TypeScript types (user, trip, incident, etc.).
- **`config/`** and **`lib/`**: Environment configuration, constants, and Supabase client initialization.

Screens never call the API directly; they go through `services/` and `hooks/` to keep the UI decoupled from providers (NFR-14).

### 2. Web Admin Panel (`web/`)

Next.js 16 (App Router) application for administrators:

- **`app/`**: Routes for login, auth callback, and the admin section (dashboard, trips, routes, stops, users, incidents, telemetry).
- **`components/admin/`**: Admin UI components (sidebar, tables, forms, maps, stat cards).
- **`lib/api/`**: Typed API client functions for the backend REST endpoints.
- **`lib/auth/`**: Session and cookie management via Supabase Auth.
- **`tests/`**: Playwright E2E tests and Vitest unit tests.

### 3. Shared Design System (`packages/design/`)

Package `@bustrack/design`: design tokens as the single source of truth (Prussian navy `#14213d`, orange/amber `#fca311`, background `#e8e9e6`, Plus Jakarta Sans), SVG icon set, and a Tailwind v4 theme CSS consumed by the web app.

### 4. File Structure

```text
2026-bus-traking-frotend
    |
    |-- src                      # Mobile app (React Native + Expo)
    |   |-- auth                 # Login, passenger registration, protected access
    |   |-- navigation           # Role-based navigation
    |   |-- screens
    |   |   |-- passenger        # Trips, live tracking, tickets, QR, incidents
    |   |   `-- driver           # Assigned trips, trip control, QR scanner
    |   |-- services             # REST API, Supabase, auth, tickets, incidents
    |   |-- hooks                # Custom hooks (push, geofence, offline sync)
    |   |-- database             # SQLite offline incident queue
    |   |-- types                # Shared TypeScript types
    |   |-- config               # Environment configuration and constants
    |   `-- lib                  # Supabase client initialization
    |
    |-- web                      # Web admin panel (Next.js 16 + React 19)
    |   |-- app                  # App Router pages (login, admin section)
    |   |-- components           # Reusable UI and admin components
    |   |-- lib                  # API client, auth, environment validation
    |   |-- tests                # Playwright E2E and Vitest unit tests
    |   `-- scripts              # Environment drift and quality scripts
    |
    |-- packages
    |   `-- design               # Shared design system (@bustrack/design)
    |
    |-- .github                  # CI workflows (typecheck, lint, build, test, secret scan)
    |-- App.tsx                  # Mobile app entry point
    |-- app.config.js            # Expo configuration
    `-- package.json             # npm workspaces root and shared tooling
```

---

## Configuration

### Prerequisites

- Node.js (20.9 or higher, 22 recommended)
- npm
- Git
- A running instance of the backend API (separate repository) on `http://localhost:8000`
- A Supabase project (URL and anon key)
- A Google Maps mobile API key (for the mobile map)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/utn-integrador-III/2026-bus-traking-frotend.git
cd 2026-bus-traking-frotend
```

2. Install dependencies from the repository root (single lockfile for all workspaces):

```bash
npm install
```

3. Create the mobile environment file from the template:

```bash
cp .env.example .env
```

The `.env` file must define `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.

4. Create the web environment file from the template:

```bash
cp web/.env.example web/.env.local
```

The web file must define `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Running the Mobile App

```bash
npx expo start          # start the Metro dev server and scan the QR with Expo Go
npm run android         # build/run on an Android emulator or device
npm run ios             # build/run on an iOS simulator (macOS only)
```

### Running the Web Admin Panel

```bash
npm run web:dev         # start the Next.js dev server
```

Access: `http://localhost:3000`

---

## Automated Testing

Both apps include test suites orchestrated through the root workspace scripts:

```bash
npm run mobile:test            # Jest unit tests (mobile)
npm run mobile:test:coverage   # mobile coverage report (80% threshold)
npm run web:test               # Playwright E2E tests (web)
npm run web:test:unit          # Vitest unit tests (web)
npm run web:test:coverage      # web coverage report (80% threshold)
```

Quality gates available as root scripts:

```bash
npm run mobile:typecheck
npm run mobile:lint
npm run web:typecheck
npm run web:lint
npm run design:typecheck
```

---

## Demo Video

[Watch the demo video](https://drive.google.com/drive/folders/1ESZNOkoY20TGu7pt-pSl53VWlYAaMI9S?usp=sharing)

---

## Future Improvements

- **Map provider abstraction**: Google Maps was adopted in this delivery following the professor's recommendation. In future iterations the map layer will move behind an adapter so Google Maps, Mapbox, and MapLibre can be swapped without touching screens or backend services, avoiding dependence on a single provider.
- **Design polish**: refine the screens that still rely on native Android defaults so the entire UI follows the shared design system.

---

[Back to top](#bus-tracking---frontend)