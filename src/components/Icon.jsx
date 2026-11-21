// Small line icons (24px grid, 1.8 stroke) so the UI doesn't rely on emoji.
const paths = {
  plus: <path d="M12 5v14M5 12h14" />,
  qr: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" />
    </>
  ),
  send: <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" />,
  move: <path d="M7 7h12l-3-3M17 17H5l3 3" />,
  rule: <path d="M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4" />,
  bell: <path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16zM10 20a2 2 0 004 0" />,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></>,
  more: <path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth="3" />,
  back: <path d="M15 5l-7 7 7 7" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  home: <path d="M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-8z" />,
  compass: <><circle cx="12" cy="12" r="8.5" /><path d="M15 9l-2 4-4 2 2-4 4-2z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  alert: <><path d="M12 4l9 16H3L12 4z" /><path d="M12 10v4M12 17h.01" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  wallet: <><rect x="3.5" y="6" width="17" height="13" rx="2.5" /><path d="M16 12.5h1.5M3.5 9.5h17" /></>,
  pocket: <><path d="M5 5h14v6a7 7 0 01-14 0V5z" /><path d="M9 10l3 3 3-3" /></>,
  unlock:<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 017.5-2" /></>,
};

export default function Icon({ name, size = 20, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
