import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import './RdvDateNavigator.css';

type Props = {
  value: string;
  onChange: (isoDate: string) => void;
};

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseIso(iso: string): { y: number; m: number; d: number } {
  const p = iso.split('-').map(Number);
  return {
    y: p[0] || new Date().getFullYear(),
    m: Math.min(Math.max(p[1] || 1, 1), 12),
    d: Math.min(Math.max(p[2] || 1, 1), 31),
  };
}

function toIso(y: number, m: number, d: number): string {
  const dt = new Date(y, m - 1, d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function addDays(iso: string, delta: number): string {
  const { y, m, d } = parseIso(iso);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return toIso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

/** Lun, Mar… en 2 lettres type maquette */
const WD2: Record<number, string> = {
  0: 'DI',
  1: 'LU',
  2: 'MA',
  3: 'ME',
  4: 'JE',
  5: 'VE',
  6: 'SA',
};

function formatLine(iso: string): string {
  const { y, m, d } = parseIso(iso);
  const dt = new Date(y, m - 1, d);
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${dd}/${mm} ${WD2[dt.getDay()]}`;
}

function buildDateList(centerIso: string): string[] {
  const { y, m, d } = parseIso(centerIso);
  const base = new Date(y, m - 1, d);
  const out: string[] = [];
  for (let i = -18; i <= 45; i++) {
    const dt = new Date(base);
    dt.setDate(dt.getDate() + i);
    out.push(toIso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()));
  }
  return out;
}

export default function RdvDateNavigator({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLLIElement>(null);
  const today = localToday();

  const dates = useMemo(() => buildDateList(value), [value]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      selectedRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
    });
  }, [open, value]);

  const pick = (iso: string) => {
    onChange(iso);
    close();
  };

  return (
    <div className="rdv-dnav" ref={rootRef}>
      <div className="rdv-dnav__pill">
        <button
          type="button"
          className="rdv-dnav__seg rdv-dnav__seg--chev"
          aria-label="Jour précédent"
          onClick={() => onChange(addDays(value, -1))}
        >
          <span className="rdv-dnav__chev" aria-hidden>
            ‹
          </span>
        </button>
        <button
          type="button"
          className="rdv-dnav__seg rdv-dnav__seg--main"
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="rdv-dnav__cal" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </span>
          <span className="rdv-dnav__date">{formatLine(value)}</span>
        </button>
        <button
          type="button"
          className="rdv-dnav__seg rdv-dnav__seg--chev rdv-dnav__seg--chev-right"
          aria-label="Jour suivant"
          onClick={() => onChange(addDays(value, 1))}
        >
          <span className="rdv-dnav__chev" aria-hidden>
            ›
          </span>
        </button>
      </div>

      {open && (
        <div className="rdv-dnav__panel" role="presentation">
          <ul
            className="rdv-dnav__list"
            role="listbox"
            aria-label="Choisir une date"
          >
            {dates.map((iso) => {
              const isToday = iso === today;
              const isSelected = iso === value;
              return (
                <li
                  key={iso}
                  ref={isSelected ? selectedRef : undefined}
                  role="presentation"
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={
                      'rdv-dnav__opt' +
                      (isToday ? ' rdv-dnav__opt--today' : '') +
                      (!isToday && isSelected ? ' rdv-dnav__opt--sel' : '')
                    }
                    onClick={() => pick(iso)}
                  >
                    {isToday ? "Aujourd'hui" : formatLine(iso)}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
