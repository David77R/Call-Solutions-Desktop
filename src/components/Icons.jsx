function Svg({ size = 18, children, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export function SearchIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </Svg>
  );
}

export function CloseIcon(props) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function StarIcon({ filled, ...props }) {
  return (
    <Svg {...props} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
    </Svg>
  );
}

export function CopyIcon(props) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </Svg>
  );
}

export function CheckIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function AlertIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4M12 17.5v.01" />
    </Svg>
  );
}

export function PawIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="6" cy="10" r="1.8" />
      <circle cx="10" cy="6" r="1.8" />
      <circle cx="14" cy="6" r="1.8" />
      <circle cx="18" cy="10" r="1.8" />
      <path d="M8 17c0-2.8 1.8-5 4-5s4 2.2 4 5c0 1.7-1.3 2.5-2.6 2.1-1-.3-1.8-.3-2.8 0C9.3 19.5 8 18.7 8 17z" />
    </Svg>
  );
}

export function BellIcon(props) {
  return (
    <Svg {...props}>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </Svg>
  );
}

export function ClockIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function NoteIcon(props) {
  return (
    <Svg {...props}>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </Svg>
  );
}

export function ChatIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-4.5 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
      <path d="M8 10h8M8 13h5" />
    </Svg>
  );
}

export function CatIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5 4l3 4.5M19 4l-3 4.5" />
      <path d="M5 4v7a7 7 0 0 0 14 0V4" />
      <path d="M9.5 12.5h.01M14.5 12.5h.01" />
      <path d="M11 15.5l1 .8 1-.8" />
      <path d="M3 14.5l4-.5M3 17l4-1M21 14.5l-4-.5M21 17l-4-1" />
    </Svg>
  );
}

export function ToothIcon(props) {
  return (
    <Svg {...props}>
      <path d="M7.5 3C5 3 3.5 5 3.5 7.6c0 2.2.9 3.6 1.5 5.4.6 1.9.6 3.6 1.1 5.7.4 1.6 1 2.3 1.8 2.3 1.3 0 1.5-1.8 2-3.7.3-1.3.9-2.1 2.1-2.1s1.8.8 2.1 2.1c.5 1.9.7 3.7 2 3.7.8 0 1.4-.7 1.8-2.3.5-2.1.5-3.8 1.1-5.7.6-1.8 1.5-3.2 1.5-5.4C20.5 5 19 3 16.5 3c-1.9 0-2.9 1.1-4.5 1.1S9.4 3 7.5 3z" />
      <path d="M9 6.5c1 .5 2 .7 3 .7" />
    </Svg>
  );
}

export function CoatIcon(props) {
  return (
    <Svg {...props}>
      <path d="M3 9c2.5-2.5 5.5-2.5 9 0s6.5 2.5 9 0" />
      <path d="M3 15c2.5-2.5 5.5-2.5 9 0s6.5 2.5 9 0" />
    </Svg>
  );
}

export function GemIcon({ gem, size = 16, ...props }) {
  if (!gem) return null;
  if (gem.round) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...props}>
        <circle cx="12" cy="12" r="9" fill={gem.color} stroke={gem.dark} strokeWidth="1.2" />
        <circle cx="12" cy="12" r="9" fill="url(#pearl-sheen)" opacity="0.5" />
        <defs>
          <radialGradient id="pearl-sheen" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#f6d7e6" stopOpacity="0.4" />
            <stop offset="100%" stopColor={gem.dark} stopOpacity="0.6" />
          </radialGradient>
        </defs>
        <ellipse cx="9" cy="8.5" rx="2.6" ry="1.6" fill="#ffffff" opacity="0.9" transform="rotate(-30 9 8.5)" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M7 3.5h10l4.5 5.5L12 21 2.5 9z" fill={gem.color} stroke={gem.dark} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M2.5 9h19" stroke={gem.dark} strokeWidth="1" opacity="0.7" />
      <path d="M7 3.5 9.5 9 12 21l2.5-12L17 3.5" fill="none" stroke={gem.dark} strokeWidth="1" strokeLinejoin="round" opacity="0.7" />
      <path d="M9.5 9 12 3.5 14.5 9z" fill={gem.light} opacity="0.85" />
      <path d="M2.5 9 7 3.5 9.5 9z" fill={gem.light} opacity="0.45" />
    </svg>
  );
}
