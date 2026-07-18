export const radius = {
  none: 0,
  xs: 6,
  sm: 9,
  md: 11,
  lg: 14,
  xl: 16,
  "2xl": 18,
  "3xl": 26,
  frame: 30,
  full: 999,
} as const;

export type Radius = keyof typeof radius;
