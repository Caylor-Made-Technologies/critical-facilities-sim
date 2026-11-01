/** Small inline SVG icon set (original artwork, stroke-based, inherits currentColor). */
import type { ReactElement } from 'react';

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
  className: 'icon',
};

export type IconName =
  | 'bolt'
  | 'list'
  | 'clipboard'
  | 'layers'
  | 'book'
  | 'wrench'
  | 'shield'
  | 'change'
  | 'play'
  | 'pause'
  | 'reset'
  | 'plus'
  | 'minus'
  | 'fit'
  | 'sun'
  | 'moon'
  | 'skip'
  | 'arrow-right'
  | 'arrow-up'
  | 'arrow-left'
  | 'close'
  | 'info'
  | 'help'
  | 'warning'
  | 'check'
  | 'search'
  | 'home'
  | 'target'
  | 'scale'
  | 'pulse'
  | 'chat'
  | 'menu'
  | 'star'
  | 'lock'
  | 'eye'
  | 'stop'
  | 'people'
  | 'flame'
  | 'print'
  | 'command'
  | 'calc'
  | 'clock';

const paths: Record<IconName, ReactElement> = {
  clipboard: <path d="M9 4h6v3H9zM7 5.5H5V21h14V5.5h-2M8.5 12h7M8.5 16h5" />,
  list: <path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />,
  layers: <path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  book: (
    <>
      <path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z" />
      <path d="M8 7h8M8 11h6" />
    </>
  ),
  wrench: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />,
  shield: (
    <>
      <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  change: (
    <>
      <path d="M4 7h13l-3-3M20 17H7l3 3" />
    </>
  ),
  play: <path d="M7 5v14l12-7z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  reset: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  fit: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />,
  skip: <path d="M5 5v14l9-7zM18 5v14" />,
  'arrow-up': <path d="M12 19V5M6 11l6-6 6 6" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 1-1 1.7M12 17v.5" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3 2 20h20z" />
      <path d="M12 10v4M12 17v.5" />
    </>
  ),
  check: <path d="m5 12 4 4 10-10" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  home: (
    <>
      <path d="M3 11 12 4l9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  scale: (
    <>
      <path d="M12 3v18M7 21h10M5 7h14" />
      <path d="m5 7-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z" />
    </>
  ),
  pulse: <path d="M3 12h4l2-5 4 10 2-5h6" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  lock: <path d="M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 15v2.5" />,
  eye: <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12zM12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z" />,
  stop: <path d="M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3zM8 12h8" />,
  people: <path d="M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.8a3.2 3.2 0 0 1 0 6M17.5 14.3c2.1.7 3.5 2.9 3.5 5.7" />,
  flame: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.6 1.4-4 2.5-5.2.2 1.7 1 2.7 2 3.2C11 8.5 11.3 5.5 12 3z" />,
  print: <path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z" />,
  command: <path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z" />,
  calc: <path d="M6 3h12v18H6zM9 7h6M9 11h.01M12 11h.01M15 11h.01M9 14.5h.01M12 14.5h.01M15 14.5V18M9 18h.01M12 18h.01" />,
  clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2" />,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
};

export function Icon({ name }: { name: IconName }) {
  return <svg {...base}>{paths[name]}</svg>;
}
