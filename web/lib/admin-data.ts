import type { IconName } from "@bustrack/design";

export type RouteStatus = "Activa" | "Inactiva";

export type AdminRoute = {
  id: string;
  code: string;
  name: string;
  stops: number;
  distanceKm: number;
  status: RouteStatus;
};

export type Bus = {
  id: string;
  plate: string;
  seats: number;
};

export type Driver = {
  id: string;
  name: string;
  license: string;
  code: string;
  active: boolean;
};

export type Passenger = {
  id: string;
  name: string;
  email: string;
  senior: boolean;
  active: boolean;
};

export type IncidentTone = "warning" | "danger" | "info";
export type IncidentStatus = "Pendientes" | "Validados";

export type Incident = {
  id: string;
  title: string;
  routeCode: string;
  quote: string;
  author: string;
  ago: string;
  icon: IconName;
  tone: IncidentTone;
  status: IncidentStatus;
};

export type TelemetryBus = {
  id: string;
  code: string;
  driver: string;
  speedKmh: number;
  origin: string;
  destination: string;
  note: string;
  state: "En ruta" | "Demora" | "Detenido";
};

export type DashboardStat = {
  label: string;
  value: number;
  tone: "neutral" | "success" | "warning" | "danger";
};

export const dashboardStats: DashboardStat[] = [
  { label: "Buses activos", value: 12, tone: "neutral" },
  { label: "En ruta", value: 9, tone: "success" },
  { label: "Demoras", value: 2, tone: "warning" },
  { label: "Incidentes", value: 3, tone: "danger" },
];

export const telemetryBuses: TelemetryBus[] = [
  {
    id: "t-224b",
    code: "224B",
    driver: "Carlos Méndez",
    speedKmh: 32,
    origin: "Centro",
    destination: "Aeropuerto",
    note: "puntual",
    state: "En ruta",
  },
  {
    id: "t-354b",
    code: "354B",
    driver: "Luisa Fernández",
    speedKmh: 0,
    origin: "Centro",
    destination: "Universidad",
    note: "demora 4 min",
    state: "Demora",
  },
  {
    id: "t-101",
    code: "101",
    driver: "Pablo Quirós",
    speedKmh: 41,
    origin: "Centro",
    destination: "Heredia",
    note: "puntual",
    state: "En ruta",
  },
];

export const routes: AdminRoute[] = [
  {
    id: "r-224b",
    code: "224B",
    name: "Centro → Aeropuerto",
    stops: 6,
    distanceKm: 18.2,
    status: "Activa",
  },
  {
    id: "r-354b",
    code: "354B",
    name: "Centro → Universidad",
    stops: 8,
    distanceKm: 12.5,
    status: "Activa",
  },
  {
    id: "r-220",
    code: "220",
    name: "Centro → Cartago",
    stops: 10,
    distanceKm: 22.4,
    status: "Inactiva",
  },
];

export const buses: Bus[] = [
  { id: "b-742", plate: "SJB-742", seats: 40 },
  { id: "b-518", plate: "SJB-518", seats: 36 },
  { id: "b-903", plate: "SJB-903", seats: 44 },
];

export const drivers: Driver[] = [
  {
    id: "d-742",
    name: "Carlos Méndez",
    license: "B-4421",
    code: "DRV-0742",
    active: true,
  },
  {
    id: "d-743",
    name: "Luisa Fernández",
    license: "B-3108",
    code: "DRV-0743",
    active: true,
  },
  {
    id: "d-744",
    name: "Marco Rojas",
    license: "B-2890",
    code: "DRV-0744",
    active: false,
  },
];

export const passengers: Passenger[] = [
  {
    id: "p-1",
    name: "Andrea Solís",
    email: "andrea@correo.com",
    senior: false,
    active: true,
  },
  {
    id: "p-2",
    name: "Diego Mora",
    email: "diego@correo.com",
    senior: false,
    active: true,
  },
  {
    id: "p-3",
    name: "Sofía Rivas",
    email: "sofia@correo.com",
    senior: true,
    active: true,
  },
];

export const incidents: Incident[] = [
  {
    id: "i-1",
    title: "Tráfico intenso",
    routeCode: "354B",
    quote: "Embotellamiento en Av. Central.",
    author: "Andrea S.",
    ago: "hace 6 min",
    icon: "traffic",
    tone: "warning",
    status: "Pendientes",
  },
  {
    id: "i-2",
    title: "Accidente reportado",
    routeCode: "224B",
    quote: "Choque leve cerca de Sabana.",
    author: "Diego M.",
    ago: "hace 14 min",
    icon: "alertTriangle",
    tone: "danger",
    status: "Pendientes",
  },
  {
    id: "i-3",
    title: "Saturación",
    routeCode: "101",
    quote: "Bus lleno, no pude abordar.",
    author: "Sofía R.",
    ago: "hace 22 min",
    icon: "users",
    tone: "info",
    status: "Pendientes",
  },
];
