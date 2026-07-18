import { icons, iconDefaults, type IconName } from "@bustrack/design";

type IconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export function Icon({ name, size = 24, strokeWidth, className }: IconProps) {
  return (
    <svg
      viewBox={iconDefaults.viewBox}
      width={size}
      height={size}
      fill={iconDefaults.fill}
      stroke={iconDefaults.stroke}
      strokeWidth={strokeWidth ?? iconDefaults.strokeWidth}
      strokeLinecap={iconDefaults.strokeLinecap}
      strokeLinejoin={iconDefaults.strokeLinejoin}
      className={className}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: icons[name].join("") }}
    />
  );
}
