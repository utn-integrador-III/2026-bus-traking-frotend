export const fontFamily = {
  sans: [
    '"Plus Jakarta Sans"',
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "sans-serif",
  ],
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

export const fontSize = {
  micro: 9,
  "2xs": 10,
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 15,
  xl: 16,
  "2xl": 18,
  "3xl": 20,
  "4xl": 22,
  "5xl": 26,
  "6xl": 30,
  hero: 44,
} as const;

export const lineHeight = {
  tight: 1.1,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.6,
} as const;

export const letterSpacing = {
  tighter: "-0.025em",
  tight: "-0.02em",
  snug: "-0.01em",
  normal: "0",
  wide: "0.06em",
  widest: "0.18em",
} as const;

export type FontSize = keyof typeof fontSize;
export type FontWeight = keyof typeof fontWeight;
