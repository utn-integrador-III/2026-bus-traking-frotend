export const iconDefaults = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const icons = {
  bus: [
    '<path d="M8 6v6"/>',
    '<path d="M15 6v6"/>',
    '<path d="M2 12h19.6"/>',
    '<path d="M18 18h3s.8-1.7.8-3.2c0-.4 0-.8-.1-1.2l-1.4-5C20.1 4.8 19.1 4 18 4H4a2 2 0 0 0-2 2v10c0 .6.4 1 1 1h2"/>',
    '<circle cx="7" cy="18" r="2"/>',
    '<path d="M9 18h5"/>',
    '<circle cx="16" cy="18" r="2"/>',
  ],
  user: [
    '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>',
    '<circle cx="12" cy="7" r="4"/>',
  ],
  mail: [
    '<rect x="2" y="4" width="20" height="16" rx="2"/>',
    '<path d="m2 7 10 6 10-6"/>',
  ],
  lock: [
    '<rect x="4" y="11" width="16" height="10" rx="2"/>',
    '<path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  ],
  eye: [
    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z"/>',
    '<circle cx="12" cy="12" r="3"/>',
  ],
  arrowLeft: [
    '<line x1="19" y1="12" x2="5" y2="12"/>',
    '<polyline points="12 19 5 12 12 5"/>',
  ],
  phone: [
    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
  ],
  search: [
    '<circle cx="11" cy="11" r="7"/>',
    '<line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  ],
  bell: [
    '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>',
    '<path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  ],
  home: [
    '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    '<polyline points="9 22 9 12 15 12 15 22"/>',
  ],
  routes: [
    '<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>',
    '<line x1="9" y1="3" x2="9" y2="18"/>',
    '<line x1="15" y1="6" x2="15" y2="21"/>',
  ],
  ticket: [
    '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>',
    '<path d="M13 5v2"/>',
    '<path d="M13 11v2"/>',
    '<path d="M13 17v2"/>',
  ],
  accessibility: [
    '<circle cx="12" cy="4" r="2"/>',
    '<path d="M12 6v8"/>',
    '<path d="m8.5 8.5 3.5 1 3.5-1"/>',
    '<path d="m9 21 3-7 3 7"/>',
  ],
  locate: [
    '<line x1="2" y1="12" x2="5" y2="12"/>',
    '<line x1="19" y1="12" x2="22" y2="12"/>',
    '<line x1="12" y1="2" x2="12" y2="5"/>',
    '<line x1="12" y1="19" x2="12" y2="22"/>',
    '<circle cx="12" cy="12" r="6"/>',
  ],
  sliders: [
    '<line x1="4" y1="21" x2="4" y2="14"/>',
    '<line x1="4" y1="10" x2="4" y2="3"/>',
    '<line x1="12" y1="21" x2="12" y2="12"/>',
    '<line x1="12" y1="8" x2="12" y2="3"/>',
    '<line x1="20" y1="21" x2="20" y2="16"/>',
    '<line x1="20" y1="12" x2="20" y2="3"/>',
    '<line x1="1" y1="14" x2="7" y2="14"/>',
    '<line x1="9" y1="8" x2="15" y2="8"/>',
    '<line x1="17" y1="16" x2="23" y2="16"/>',
  ],
  star: ['<polygon points="12 2 15.1 8.6 22 9.5 17 14.5 18.2 21.5 12 18 5.8 21.5 7 14.5 2 9.5 8.9 8.6"/>'],
} as const;

export type IconName = keyof typeof icons;

export function iconMarkup(name: IconName, size = 24): string {
  const a = iconDefaults;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="${a.viewBox}" fill="${a.fill}" stroke="${a.stroke}" ` +
    `stroke-width="${a.strokeWidth}" stroke-linecap="${a.strokeLinecap}" ` +
    `stroke-linejoin="${a.strokeLinejoin}">${icons[name].join("")}</svg>`
  );
}
