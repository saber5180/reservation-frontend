/** Icônes stroke — couleur via currentColor (style proche Lucide, traits plus nets) */

const common = {
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} {...common} aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function IconListRdv({ className }: { className?: string }) {
  return (
    <svg className={className} {...common} aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconClipboard({ className }: { className?: string }) {
  return (
    <svg className={className} {...common} aria-hidden>
      <path d="M9 2h6l1 2h4a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4l1-2z" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

export function IconCalendarClock({ className }: { className?: string }) {
  return (
    <svg className={className} {...common} aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <circle cx="12" cy="15" r="3.5" />
      <path d="M12 13.25V15l1.25 1.25" />
    </svg>
  );
}

export function IconQr({ className }: { className?: string }) {
  return (
    <svg className={className} {...common} aria-hidden>
      <path d="M3 3h6v6H3V3zM15 3h6v6h-6V3zM3 15h6v6H3v-6z" />
      <path d="M15 15h2v2h-2v-2zM19 15h2v2h-2v-2zM15 19h2v2h-2v-2zM19 19h2v2h-2v-2z" />
    </svg>
  );
}

/** Grille 2×2 — tableau de bord */
export function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} {...common} aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

/** Cabinet — lieu professionnel (silhouette type « institution ») */
export function IconCabinet({ className }: { className?: string }) {
  return (
    <svg className={className} {...common} aria-hidden>
      <path d="M3 21h18" />
      <path d="M5 21V8l7-4 7 4v13" />
      <path d="M9 21v-5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5" />
    </svg>
  );
}

/** Compte patient */
export function IconUserCircle({ className }: { className?: string }) {
  return (
    <svg className={className} {...common} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 20.5c1.5-2.5 4.5-3.5 5-3.5s3.5 1 5 3.5" />
    </svg>
  );
}

export function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={className} {...common} aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
