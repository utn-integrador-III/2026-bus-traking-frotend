import { palette } from "./colors";

export const color = {
  brand: palette.navy.DEFAULT,
  accent: palette.amber.DEFAULT,

  background: palette.neutral[250],
  surface: palette.neutral[0],
  surfaceAlt: palette.neutral[150],

  textPrimary: palette.navy.DEFAULT,
  textSecondary: palette.neutral[600],
  textMuted: palette.neutral[500],

  onDarkPrimary: palette.onDark.primary,
  onDarkSecondary: palette.onDark.secondary,
  onDarkMuted: palette.onDark.muted,

  border: palette.neutral[350],
  borderSubtle: palette.neutral[300],
  divider: palette.neutral[200],

  success: palette.success.DEFAULT,
  successBg: palette.success.bg,
  warning: palette.warning.DEFAULT,
  warningBg: palette.warning.bg,
  warningBorder: palette.warning.border,
  danger: palette.danger.DEFAULT,
  dangerBg: palette.danger.bg,
  dangerBorder: palette.danger.border,
  info: palette.info.DEFAULT,
  infoBg: palette.info.bg,

  inputBg: palette.input.bg,
  inputBorder: palette.input.border,
  inputPlaceholder: palette.input.placeholder,
} as const;

export type UserRole = "passenger" | "driver" | "admin";

export const roleAccent: Record<UserRole, string> = {
  passenger: palette.amber.DEFAULT,
  driver: palette.driver,
  admin: palette.admin,
};

export type SemanticColor = typeof color;
