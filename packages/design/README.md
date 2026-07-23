# @bustrack/design

Sistema de diseño compartido de **Bus Tracking**. Es la **fuente única de verdad**
de la identidad visual (colores, tipografía, espaciado, radios, sombras, z-index e
iconos) que consumen tanto la **web Next.js** (`web/`) como la futura **app móvil
React Native** (raíz). Su objetivo: que construir nuevas pantallas y módulos sea
trivial y consistente, sin redefinir estilos en cada app.

Derivado del mockup `Bus Tracking App.dc.html` (proyecto Claude Design de Fernando).

## Identidad

| Token | Valor | Uso |
|---|---|---|
| Prussian navy | `#14213d` | Marca, texto principal, superficies oscuras |
| Orange / Amber | `#fca311` | Acción primaria, acento, rol Pasajero |
| Driver blue | `#3e67bf` | Acento rol Conductor |
| Admin blue | `#7e99d5` | Acento rol Administrador |
| App background | `#e8e9e6` | Fondo de la app |
| Tipografía | Plus Jakarta Sans (400–800) | Toda la UI |

Estados: success `#1f8a4c`, warning `#a16402`, danger `#c0392b`, info `#3e67bf`.

## Estructura

```
src/
├── tokens/
│   ├── colors.ts      paleta cruda (escalas)
│   ├── semantic.ts    mapeo semántico (brand, surface, text, border, estados) + roleAccent
│   ├── typography.ts  fontFamily, fontWeight, fontSize, lineHeight, letterSpacing
│   ├── spacing.ts     escala de espaciado (px)
│   ├── radii.ts       radios de borde (px)
│   ├── shadows.ts     sombras web (CSS) + elevation (RN)
│   ├── zIndex.ts      capas
│   └── index.ts
├── icons/index.ts     set de iconos SVG (path data) agnóstico de plataforma
└── index.ts
styles/
└── theme.css          binding Tailwind v4 (@theme) — espejo de los tokens
```

`src/tokens/*` es la fuente de verdad; `styles/theme.css` la refleja para Tailwind v4.
Al cambiar un token, actualizar ambos (el set es pequeño y plano a propósito).

## Uso — Web (Next.js + Tailwind v4)

1. Dependencia (ya cableada vía npm workspaces): `"@bustrack/design": "*"`.
2. En `app/globals.css`, después de Tailwind:

   ```css
   @import "tailwindcss";
   @import "@bustrack/design/theme.css";
   ```

3. Cargar la fuente en `app/layout.tsx` y exponer `--font-jakarta`:

   ```tsx
   import { Plus_Jakarta_Sans } from "next/font/google";
   const jakarta = Plus_Jakarta_Sans({
     variable: "--font-jakarta",
     subsets: ["latin"],
     weight: ["400", "500", "600", "700", "800"],
   });
   // <html className={jakarta.variable}>
   ```

Quedan disponibles utilidades Tailwind con los tokens, por ejemplo:
`bg-brand text-accent rounded-lg shadow-card text-2xl font-extrabold border-border`,
`bg-success-bg text-success`, `bg-amber-soft text-amber-text`, `font-sans`.

También se pueden importar los valores en TS/TSX:

```ts
import { color, radius, shadow, fontSize, icons } from "@bustrack/design";
```

## Uso — Móvil (React Native / Expo)

Importar los tokens directamente (sin CSS):

```ts
import { color, spacing, radius, fontSize, elevation } from "@bustrack/design";

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...elevation.card,
  },
});
```

La fuente se carga con `expo-font` (familia `Plus Jakarta Sans`). Iconos: render con
`react-native-svg` usando `icons[name]` + `iconDefaults`.

## Escalas

- **fontSize** (px): `micro 9 · 2xs 10 · xs 11 · sm 12 · base 13 · md 14 · lg 15 · xl 16 · 2xl 18 · 3xl 20 · 4xl 22 · 5xl 26 · 6xl 30 · hero 44`
- **radius** (px): `xs 6 · sm 9 · md 11 · lg 14 · xl 16 · 2xl 18 · 3xl 26 · frame 30 · full 999`
- **spacing** (px): `xs 4 · sm 8 · md 12 · lg 16 · xl 20 · 2xl 24 · 3xl 32 · 4xl 44 · 5xl 54`
- **shadow**: `card · cardSoft · floating · sheet · button`

## Alcance

Esta entrega es **tokens + tema**: la base compartida. No incluye componentes React
(DOM) ni RN — cada app construye su UI con estos tokens. Componentes reutilizables
(Button, Input, Badge, Card, BottomNav…) son un paso posterior, por plataforma.
