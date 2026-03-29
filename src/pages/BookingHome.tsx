import { useState, useEffect, useCallback, type ComponentType } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  createRealtimeSocket,
  requestNotifyPermission,
  showBrowserNotification,
} from '../lib/realtime';
import Calendar from '../components/Calendar';
import OtpLogin from '../components/OtpLogin';
import {
  IconCalendar,
  IconListRdv,
  IconFilterPending,
  IconFilterConfirmed,
  IconFilterRejected,
  IconFilterPatientWait,
} from '../components/TabIcons';
import './BookingHome.css';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  bio: string | null;
  slug: string;
  phone?: string | null;
  email?: string | null;
}
interface Slot   { start:string; end:string; }
interface Rdv    { id:string; slotStart:string; slotEnd:string; status:string; proposedSlotStart:string|null; proposedSlotEnd:string|null; }

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
const hm  = (iso:string) => new Date(iso).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
const dmy = (iso:string) => new Date(iso+'T00:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});

const BADGE: Record<string,{t:string;cls:string}> = {
  PENDING:        {t:'En attente',              cls:'badge-yellow'},
  CONFIRMED:      {t:'Confirmé',                cls:'badge-green'},
  REJECTED:       {t:'Refusé',                  cls:'badge-red'},
  CHANGE_PROPOSED:{t:'Action requise', cls:'badge-purple'},
};

const STATUS_BADGE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  PENDING: IconFilterPending,
  CONFIRMED: IconFilterConfirmed,
  REJECTED: IconFilterRejected,
  CHANGE_PROPOSED: IconFilterPatientWait,
};

export default function BookingHome() {
  const { slug }         = useParams<{slug?:string}>();
  const location         = useLocation();
  const navigate         = useNavigate();
  const { user, token }  = useAuth();

  const [doc,    setDoc]    = useState<Doctor|null>(null);
  const [err,    setErr]    = useState('');
  const [date,   setDate]   = useState('');
  const [slots,  setSlots]  = useState<Slot[]>([]);
  const [busy,   setBusy]   = useState(false);
  const [slot,   setSlot]   = useState<Slot|null>(null);
  const [otp,    setOtp]    = useState(false);
  const [rdvs,   setRdvs]   = useState<Rdv[]>([]);
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const [bErr,   setBErr]   = useState('');
  const [tab,    setTab]    = useState<'book'|'rdvs'>('book');
  const [toast,  setToast]  = useState<string | null>(null);

  const refreshRdvs = useCallback(() => {
    if (user?.role === 'CLIENT') {
      api.get<Rdv[]>('/reservations').then(setRdvs).catch(() => {});
    }
  }, [user?.role]);

  useEffect(()=>{
    const ep = slug ? `/professionals/${slug}/booking` : '/professionals/default';
    api.get<Doctor>(ep).then(setDoc).catch(()=>setErr('Médecin introuvable.'));
  },[slug]);

  useEffect(() => {
    const st = location.state as { focusBooking?: boolean } | undefined;
    if (!st?.focusBooking) return;
    setTab('book');
    navigate(location.pathname, { replace: true, state: null });
    window.requestAnimationFrame(() => {
      document.getElementById('booking-rdv')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [location.state, location.pathname, navigate]);

  useEffect(()=>{
    if (!doc||!date){setSlots([]);return;}
    setBusy(true); setSlot(null); setOtp(false); setBErr('');
    api.get<Slot[]>(`/availability/slots/${doc.slug}?date=${date}`)
      .then(setSlots).catch(()=>setSlots([])).finally(()=>setBusy(false));
  },[doc,date]);

  useEffect(() => {
    refreshRdvs();
  }, [refreshRdvs]);

  useEffect(() => {
    if (user?.role !== 'CLIENT' || !token) return;
    requestNotifyPermission();
    const socket = createRealtimeSocket(token);
    const onUpdated = () => {
      refreshRdvs();
      setToast('Votre rendez-vous a été mis à jour');
      showBrowserNotification(
        'DentaRDV',
        'Statut ou horaire de votre rendez-vous modifié.',
      );
      window.setTimeout(() => setToast(null), 6000);
    };
    socket.on('reservation:updated', onUpdated);
    return () => {
      socket.off('reservation:updated', onUpdated);
      socket.disconnect();
    };
  }, [user?.role, token, refreshRdvs]);

  const pick = (s:Slot) => { setSlot(s); setBErr(''); if (!token) setOtp(true); else setOtp(false); };

  const book = async () => {
    if (!doc||!slot) return;
    setSaving(true); setBErr('');
    try {
      await api.post('/reservations',{professionalId:doc.id,slotStart:slot.start,slotEnd:slot.end});
      setDone(true); setSlot(null); setDate(''); setSlots([]);
      refreshRdvs();
    } catch(e){ setBErr(e instanceof Error?e.message:'Erreur'); }
    finally   { setSaving(false); }
  };

  const respond = async (id: string, accept: boolean) => {
    try {
      await api.patch(`/reservations/${id}/respond-proposal`, { accept });
      refreshRdvs();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Réponse impossible');
      window.setTimeout(() => setToast(null), 6000);
    }
  };

  if (err)  return <div className="bk-err">{err}</div>;
  if (!doc) return <div className="loading"><div className="spin"/>Chargement...</div>;

  return (
    <div className="bk">
      {toast && (
        <div className="bk-toast" role="status">
          <span>🔔</span> {toast}
          <button type="button" className="bk-toast-x" onClick={() => setToast(null)} aria-label="Fermer">×</button>
        </div>
      )}

      {/* ── Doctor header ── */}
      <div className="bk-doc">
        <div className="bk-brand">
          <img
            src="/dentardv-logo.png"
            alt=""
            className="bk-brand__logo"
            width="140"
            height="52"
          />
        </div>
        <div className="bk-doc-info">
          <h1>{doc.name}</h1>
          <span className="bk-spec">{doc.specialty}</span>
          {doc.bio && <p className="bk-bio">{doc.bio}</p>}
          {(doc.phone || doc.email) && (
            <div className="bk-contact">
              {doc.phone && (
                <a className="bk-contact-line" href={`tel:${doc.phone.replace(/\s/g, '')}`}>
                  {doc.phone}
                </a>
              )}
              {doc.email && (
                <a className="bk-contact-line" href={`mailto:${doc.email}`}>
                  {doc.email}
                </a>
              )}
            </div>
          )}
        </div>
        {user?.role==='CLIENT' && (
          <div className="bk-tabs" role="tablist" aria-label="Navigation réservation">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'book'}
              className={tab === 'book' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setTab('book')}
            >
              <span className="tab-btn__ic" aria-hidden>
                <IconCalendar />
              </span>
              <span className="tab-btn__label">Réserver</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'rdvs'}
              className={tab === 'rdvs' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setTab('rdvs')}
            >
              <span className="tab-btn__ic" aria-hidden>
                <IconListRdv />
              </span>
              <span className="tab-btn__label">Mes RDV</span>
              {rdvs.length > 0 && <span className="bk-cnt">{rdvs.length}</span>}
            </button>
          </div>
        )}
      </div>

      {done && (
        <div className="bk-ok">
          ✅ Rendez-vous envoyé ! Le médecin vous confirmera bientôt.
          <button onClick={()=>{setDone(false);setTab('rdvs');}}>Voir →</button>
        </div>
      )}

      {/* ── RESERVATIONS ── */}
      {tab==='rdvs' && user?.role==='CLIENT' ? (
        <div className="bk-rdvs">
          {rdvs.length===0
            ? <div className="bk-empty">Aucun rendez-vous pour le moment.</div>
            : rdvs.map((r) => {
                const b = BADGE[r.status] || { t: r.status, cls: '' };
                const StatusIco = STATUS_BADGE_ICONS[r.status];
                return (
                  <div key={r.id} className="rdv-card">
                    <div className="rdv-left">
                      {r.status === 'CHANGE_PROPOSED' && r.proposedSlotStart ? (
                        <>
                          <p className="rdv-compare-label">Votre demande</p>
                          <p className="rdv-date">{dmy(r.slotStart.split('T')[0])}</p>
                          <p className="rdv-time">{hm(r.slotStart)} – {hm(r.slotEnd)}</p>
                          <p className="rdv-compare-label rdv-compare-label--prop">Proposition du cabinet</p>
                          <p className="rdv-prop">
                            {new Date(r.proposedSlotStart).toLocaleDateString('fr-FR', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                            })}{' '}
                            · {hm(r.proposedSlotStart)}
                            {r.proposedSlotEnd ? ` – ${hm(r.proposedSlotEnd)}` : ''}
                          </p>
                          <p className="rdv-prop-hint">
                            En acceptant, votre rendez-vous est confirmé sur ce nouvel horaire. Si vous refusez, votre demande d’origine reste en attente auprès du cabinet.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="rdv-date">{dmy(r.slotStart.split('T')[0])}</p>
                          <p className="rdv-time">{hm(r.slotStart)} – {hm(r.slotEnd)}</p>
                        </>
                      )}
                    </div>
                    <div className="rdv-right">
                      <span
                        className={`badge rdv-status-badge ${b.cls}${StatusIco ? '' : ' rdv-status-badge--fallback'}`}
                        title={b.t}
                        aria-label={b.t}
                      >
                        {StatusIco ? (
                          <span className="rdv-status-badge__ic" aria-hidden>
                            <StatusIco />
                          </span>
                        ) : null}
                        <span className="rdv-status-badge__txt">{b.t}</span>
                      </span>
                      {r.status==='CHANGE_PROPOSED'&&r.proposedSlotStart&&(
                        <div className="rdv-actions">
                          <button type="button" className="btn-yes" onClick={()=>respond(r.id,true)}>
                            Accepter ce créneau
                          </button>
                          <button type="button" className="btn-no" onClick={()=>respond(r.id,false)}>
                            Refuser la proposition
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
          }
        </div>

      ) : (

      /* ── BOOKING ── */
      <div className="bk-main" id="booking-rdv">
        {/* Left — calendar */}
        <div className="bk-cal-wrap">
          <p className="bk-step-title"><span className="num">1</span> Choisir une date</p>
          <div className="bk-cal-card">
            <Calendar selected={date} onSelect={d=>{setDate(d);setSlot(null);setDone(false);}} min={localToday()} />
          </div>
        </div>

        {/* Right — slots + confirm */}
        <div className="bk-right">
          <p className="bk-step-title">
            <span className="num">2</span> Horaires disponibles
            {date && <span className="bk-day"> — {dmy(date)}</span>}
          </p>

          <div className="bk-slots-card">
            {!date ? (
              <div className="bk-hint">👈 Cliquez sur une date pour voir les horaires</div>
            ) : busy ? (
              <div className="bk-loader"><div className="spin"/></div>
            ) : slots.length===0 ? (
              <div className="bk-none">
                <span>🗓</span>
                <p>Aucun horaire ce jour-là</p>
                <small>Essayez un autre jour</small>
              </div>
            ) : (
              <div className="slots-grid">
                {slots.map(s=>(
                  <button
                    key={s.start}
                    className={`slot-btn${slot?.start===s.start?' sel':''}`}
                    onClick={()=>pick(s)}
                  >
                    {hm(s.start)}
                    <span>{hm(s.end)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Confirm */}
          {slot && (
            <div className="bk-confirm">
              <p className="bk-step-title"><span className="num">3</span> Confirmer</p>
              <div className="confirm-slot">
                <div>
                  <p className="c-date">{dmy(date)}</p>
                  <p className="c-time">{hm(slot.start)} – {hm(slot.end)}</p>
                </div>
                <button className="c-clear" onClick={()=>setSlot(null)}>✕</button>
              </div>

              {!token ? (
                <div className="c-login">
                  <p>Connectez-vous pour valider ce rendez-vous.</p>
                  {otp
                    ? <OtpLogin onSuccess={()=>setOtp(false)}/>
                    : <button className="c-btn-login" onClick={()=>setOtp(true)}>
                        📱 Se connecter avec mon téléphone
                      </button>
                  }
                </div>
              ) : (
                <>
                  {bErr && <div className="c-err">{bErr}</div>}
                  <button className="c-btn-confirm" onClick={book} disabled={saving}>
                    {saving ? <><div className="spin-sm"/> Envoi…</> : '✓ Confirmer le rendez-vous'}
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      </div>
      )}
    </div>
  );
}
