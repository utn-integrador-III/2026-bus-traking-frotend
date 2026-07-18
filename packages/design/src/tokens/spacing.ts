export const spacing = {
  none: 0,
  px: 1,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 44,
  "5xl": 54,
} as const;

export type Spacing = keyof typeof spacing;
