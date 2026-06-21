export const zIndex = {
  base: 0,
  raised: 10,
  sticky: 100,
  header: 200,
  overlay: 1000,
  sheet: 1100,
  modal: 1200,
  toast: 1300,
  tooltip: 1400,
} as const;

export type ZIndex = keyof typeof zIndex;
