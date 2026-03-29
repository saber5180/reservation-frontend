import { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { useAdminRealtime } from '../context/AdminRealtimeContext';
import type { ComponentType } from 'react';
import {
  IconClipboard,
  IconCalendarClock,
  IconQr,
  IconFilterAll,
  IconFilterPending,
  IconFilterConfirmed,
  IconFilterRejected,
  IconFilterPatientWait,
} from '../components/TabIcons';
import {
  WORKING_DAYS,
  WORKING_DAY_LABELS,
  ALL_SLOT_TIMES,
  slotKey,
  availRowsToSelection,
  selectionToAvailSlots,
  formatSlotLabel,
} from '../lib/availabilitySlots';
import RdvDateNavigator from '../components/RdvDateNavigator';
import './AdminDashboard.css';

interface Rdv { id:string; slotStart:string; slotEnd:string; status:string; proposedSlotStart:string|null; proposedSlotEnd:string|null; client:{name:string|null;email:string|null;phone:string|null}|null; guestName:string|null; guestPhone:string|null; }
interface Prof { id:string; slug:string; bookingLink:string; specialty:string; bio:string|null; }
interface Av   { dayOfWeek:number; startTime:string; endTime:string; }
interface Slot { start:string; end:string; }

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoDateLocal(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const BADGE: Record<string,{t:string;cls:string}> = {
  PENDING:        {t:'En attente',    cls:'badge-yellow'},
  CONFIRMED:      {t:'Confirmé',      cls:'badge-green'},
  REJECTED:       {t:'Refusé',        cls:'badge-red'},
  CHANGE_PROPOSED:{t:'En attente patient', cls:'badge-purple'},
};

const RDV_FILTER_KEYS = ['ALL', 'PENDING', 'CONFIRMED', 'REJECTED', 'CHANGE_PROPOSED'] as const;
type RdvFilterKey = (typeof RDV_FILTER_KEYS)[number];

const RDV_FILTER_ICONS: Record<RdvFilterKey, ComponentType<{ className?: string }>> = {
  ALL: IconFilterAll,
  PENDING: IconFilterPending,
  CONFIRMED: IconFilterConfirmed,
  REJECTED: IconFilterRejected,
  CHANGE_PROPOSED: IconFilterPatientWait,
};

/** Même pictos que les filtres — badge statut sur les cartes (mobile : icône seule) */
const STATUS_BADGE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  PENDING: IconFilterPending,
  CONFIRMED: IconFilterConfirmed,
  REJECTED: IconFilterRejected,
  CHANGE_PROPOSED: IconFilterPatientWait,
};

function rdvFilterLabel(f: RdvFilterKey): string {
  return f === 'ALL' ? 'Tous' : BADGE[f]?.t ?? f;
}

const hm  = (iso:string) => new Date(iso).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
const dmy = (iso:string) => new Date(iso).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'});

export default function AdminDashboard() {
  const { rdvs, refresh } = useAdminRealtime();
  const [tab,     setTab]     = useState<'rdvs'|'avail'|'qr'>('rdvs');
  const [prof,    setProf]    = useState<Prof|null>(null);
  const [qr,      setQr]      = useState('');
  const [avail,   setAvail]   = useState<Av[]>([]);
  const [slotSelection, setSlotSelection] = useState<Record<string, boolean>>({});
  const [propose, setPropose] = useState('');
  const [proposeDate, setProposeDate] = useState('');
  const [proposeSlots, setProposeSlots] = useState<Slot[]>([]);
  const [proposeSlotsBusy, setProposeSlotsBusy] = useState(false);
  const [selectedProposeSlot, setSelectedProposeSlot] = useState<Slot | null>(null);
  const [proposeSubmitting, setProposeSubmitting] = useState(false);
  const [proposeError, setProposeError] = useState<string | null>(null);
  const [filter,  setFilter]  = useState('ALL');
  const [rdvListDate, setRdvListDate] = useState(() => localToday());
  const [toast,   setToast]   = useState<string | null>(null);

  useEffect(() => {
    api.get<Prof>('/professionals/me').then(setProf).catch(() => {});
  }, []);

  useEffect(() => {
    if (!prof) return;
    api
      .get<Av[]>(`/availability/professional/${prof.id}`)
      .then(setAvail)
      .catch(() => {});
  }, [prof]);

  useEffect(() => {
    setSlotSelection(availRowsToSelection(avail));
  }, [avail]);

  useEffect(() => {
    if (!propose || !prof?.slug || !proposeDate) {
      setProposeSlots([]);
      return;
    }
    setProposeSlotsBusy(true);
    setProposeError(null);
    api
      .get<Slot[]>(`/availability/slots/${prof.slug}?date=${proposeDate}`)
      .then((list) => {
        setProposeSlots(list);
        setSelectedProposeSlot(null);
      })
      .catch(() => {
        setProposeSlots([]);
        setProposeError('Impossible de charger les créneaux pour cette date.');
      })
      .finally(() => setProposeSlotsBusy(false));
  }, [propose, prof?.slug, proposeDate]);

  const openPropose = (r: Rdv) => {
    setPropose(r.id);
    const fromReq = isoDateLocal(r.slotStart);
    const today = localToday();
    setProposeDate(fromReq < today ? today : fromReq);
    setSelectedProposeSlot(null);
    setProposeError(null);
  };

  const closePropose = () => {
    setPropose('');
    setProposeDate('');
    setProposeSlots([]);
    setSelectedProposeSlot(null);
    setProposeError(null);
  };

  const accept  = async (id:string) => { await api.patch(`/reservations/${id}/accept`);  refresh(); };
  const reject  = async (id:string) => { await api.patch(`/reservations/${id}/reject`);  refresh(); };
  const submitPropose = async (id: string) => {
    if (!selectedProposeSlot) return;
    setProposeSubmitting(true);
    setProposeError(null);
    try {
      await api.patch(`/reservations/${id}/propose`, {
        proposedSlotStart: selectedProposeSlot.start,
        proposedSlotEnd: selectedProposeSlot.end,
      });
      closePropose();
      refresh();
    } catch (e) {
      setProposeError(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setProposeSubmitting(false);
    }
  };

  const loadQr = async () => {
    if (!prof) return;
    const r = await api.get<{dataUrl:string}>(`/professionals/${prof.slug}/qr`);
    setQr(r.dataUrl);
  };

  const saveAvail = async () => {
    if (!prof) return;
    const sundaySlots = avail
      .filter((a) => a.dayOfWeek === 0)
      .map((a) => ({
        dayOfWeek: 0,
        startTime: a.startTime.slice(0, 5),
        endTime: a.endTime.slice(0, 5),
      }));
    const fromGrid = selectionToAvailSlots(slotSelection);
    const slots = [...sundaySlots, ...fromGrid];
    try {
      await api.post(`/availability/professional/${prof.id}`, { slots });
      const next = await api.get<Av[]>(`/availability/professional/${prof.id}`);
      setAvail(next);
      setToast('Disponibilités enregistrées');
      window.setTimeout(() => setToast(null), 5000);
    } catch {
      setToast('Enregistrement impossible');
      window.setTimeout(() => setToast(null), 5000);
    }
  };

  const toggleAvailSlot = (day: number, time: string) => {
    const k = slotKey(day, time);
    setSlotSelection((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const fillAvailDay = (day: number) => {
    setSlotSelection((prev) => {
      const next = { ...prev };
      for (const t of ALL_SLOT_TIMES) next[slotKey(day, t)] = true;
      return next;
    });
  };

  const clearAvailDay = (day: number) => {
    setSlotSelection((prev) => {
      const next = { ...prev };
      for (const t of ALL_SLOT_TIMES) delete next[slotKey(day, t)];
      return next;
    });
  };

  const patientName = (r:Rdv) => r.client?.name||r.guestName||'Patient';
  const patientContact = (r:Rdv) => r.client?.phone||r.guestPhone||r.client?.email||'';

  const activeRdvFilterKey = filter as RdvFilterKey;
  const FilterSlideIcon = RDV_FILTER_ICONS[activeRdvFilterKey] ?? IconFilterAll;

  const rdvsForSelectedDay = useMemo(() => {
    const byStatus =
      filter === 'ALL' ? rdvs : rdvs.filter((r) => r.status === filter);
    return byStatus
      .filter((r) => isoDateLocal(r.slotStart) === rdvListDate)
      .sort(
        (a, b) =>
          new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime(),
      );
  }, [filter, rdvs, rdvListDate]);

  return (
    <div className="adm">
      {toast && (
        <div className="adm-toast" role="status">
          <span>🔔</span> {toast}
          <button type="button" className="adm-toast-x" onClick={() => setToast(null)} aria-label="Fermer">×</button>
        </div>
      )}
      <div className="adm-head">
        <div>
          <h1>Tableau de bord</h1>
          {prof && <p className="adm-sub"><span>{prof.specialty}</span> — <a href={prof.bookingLink} target="_blank" rel="noreferrer">{prof.bookingLink}</a></p>}
        </div>
      </div>

      <div className="adm-tabs-wrap">
        <div className="adm-tabs" role="tablist" aria-label="Sections du tableau de bord">
          <button
            type="button"
            role="tab"
            id="adm-tab-rdvs"
            aria-selected={tab === 'rdvs'}
            className={tab === 'rdvs' ? 'adm-tab active' : 'adm-tab'}
            onClick={() => setTab('rdvs')}
            aria-label={`Réservations, ${rdvs.filter((r) => r.status === 'PENDING').length} en attente`}
          >
            <span className="adm-tab__ic" aria-hidden>
              <IconClipboard />
            </span>
            <span className="adm-tab__label">Réservations</span>
            <span className="adm-cnt">{rdvs.filter((r) => r.status === 'PENDING').length}</span>
          </button>
          <button
            type="button"
            role="tab"
            id="adm-tab-avail"
            aria-selected={tab === 'avail'}
            className={tab === 'avail' ? 'adm-tab active' : 'adm-tab'}
            onClick={() => setTab('avail')}
            aria-label="Disponibilités"
          >
            <span className="adm-tab__ic" aria-hidden>
              <IconCalendarClock />
            </span>
            <span className="adm-tab__label">Disponibilités</span>
          </button>
          <button
            type="button"
            role="tab"
            id="adm-tab-qr"
            aria-selected={tab === 'qr'}
            className={tab === 'qr' ? 'adm-tab active' : 'adm-tab'}
            onClick={() => {
              setTab('qr');
              loadQr();
            }}
            aria-label="QR code"
          >
            <span className="adm-tab__ic" aria-hidden>
              <IconQr />
            </span>
            <span className="adm-tab__label">QR code</span>
          </button>
        </div>
        <p
          className="adm-tab-current"
          id="adm-tab-current"
          aria-live="polite"
          aria-atomic="true"
        >
          {tab === 'rdvs' && 'Réservations'}
          {tab === 'avail' && 'Disponibilités'}
          {tab === 'qr' && 'QR code'}
        </p>
      </div>

      {/* ── RESERVATIONS ── */}
      {tab==='rdvs' && (
        <div>
          <div
            className="adm-rdv-date-line"
            role="group"
            aria-label="Date des rendez-vous affichés"
          >
            <span className="adm-rdv-date-line__k">Jour affiché</span>
            <RdvDateNavigator value={rdvListDate} onChange={setRdvListDate} />
          </div>

          <div className="adm-filters-wrap">
            <div
              className="adm-filters"
              role="group"
              aria-label="Filtrer les réservations par statut"
            >
              {RDV_FILTER_KEYS.map((f) => {
                const Icon = RDV_FILTER_ICONS[f];
                const label = rdvFilterLabel(f);
                return (
                  <button
                    key={f}
                    type="button"
                    className={`f-btn${filter === f ? ' active' : ''}`}
                    aria-pressed={filter === f}
                    title={label}
                    aria-label={label}
                    onClick={() => setFilter(f)}
                  >
                    <span className="f-btn__ic" aria-hidden>
                      <Icon />
                    </span>
                    <span className="f-btn__txt">{label}</span>
                  </button>
                );
              })}
            </div>
            <div
              key={filter}
              className="adm-filter-slide"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="adm-filter-slide__inner">
                <span className="adm-filter-slide__ic" aria-hidden>
                  <FilterSlideIcon />
                </span>
                <span className="adm-filter-slide__label">
                  {rdvFilterLabel(activeRdvFilterKey)}
                </span>
              </span>
            </div>
          </div>
          {rdvsForSelectedDay.length === 0 ? (
            <div className="adm-empty">
              Aucune réservation pour cette date
              {filter !== 'ALL' ? ' avec le filtre choisi' : ''}. Essayez une autre
              date ou un autre statut.
            </div>
          ) : (
            <div className="adm-rdv-day__list" role="list">
              {rdvsForSelectedDay.map((r) => {
                const b = BADGE[r.status] || { t: r.status, cls: '' };
                const StatusBadgeIcon = STATUS_BADGE_ICONS[r.status];
                return (
                  <div
                    key={r.id}
                    className={`adm-card adm-card--${r.status}`}
                    role="listitem"
                  >
                    <div className="adm-card-top">
                      <div className="adm-card-row1">
                        <div className="adm-patient">
                          <span className="adm-pname">{patientName(r)}</span>
                          {patientContact(r) && (
                            <span className="adm-pcontact">{patientContact(r)}</span>
                          )}
                        </div>
                        <div className="adm-time-wrap" aria-label="Créneau">
                          <span className="adm-time-pill">
                            {hm(r.slotStart)} – {hm(r.slotEnd)}
                          </span>
                        </div>
                      </div>
                      <div className="adm-card-row2">
                        <span
                          className={`badge adm-card-badge ${b.cls}${StatusBadgeIcon ? '' : ' adm-card-badge--fallback'}`}
                          title={b.t}
                          aria-label={b.t}
                        >
                          {StatusBadgeIcon ? (
                            <span className="adm-card-badge__ic" aria-hidden>
                              <StatusBadgeIcon />
                            </span>
                          ) : null}
                          <span className="adm-card-badge__txt">{b.t}</span>
                        </span>
                      </div>
                    </div>

                    {r.status==='PENDING' && (
                      <div className="adm-btns adm-btns-stack">
                        <div className="adm-btns-row">
                          <button
                            type="button"
                            className="btn-accept"
                            aria-label="Accepter ce créneau"
                            onClick={() => accept(r.id)}
                          >
                            <span className="btn-adm-ic" aria-hidden>
                              <IconFilterConfirmed />
                            </span>
                            <span className="btn-adm-txt">Accepter ce créneau</span>
                          </button>
                          <button
                            type="button"
                            className="btn-reject"
                            aria-label="Refuser la demande"
                            onClick={() => reject(r.id)}
                          >
                            <span className="btn-adm-ic" aria-hidden>
                              <IconFilterRejected />
                            </span>
                            <span className="btn-adm-txt">Refuser la demande</span>
                          </button>
                        </div>
                        {propose===r.id ? (
                          <div className="adm-propose-panel">
                            <p className="adm-propose-title">Contre-proposition d’horaire</p>
                            <p className="adm-propose-intro">
                              Demande du patient : <strong>{dmy(r.slotStart)}</strong> · {hm(r.slotStart)} – {hm(r.slotEnd)}
                            </p>
                            <p className="adm-propose-hint">
                              Choisissez une date puis un créneau parmi vos disponibilités enregistrées (même grille que sur la page de réservation).
                            </p>
                            <label className="adm-propose-label" htmlFor={`prop-date-${r.id}`}>Date proposée</label>
                            <input
                              id={`prop-date-${r.id}`}
                              className="adm-propose-date"
                              type="date"
                              min={localToday()}
                              value={proposeDate}
                              onChange={(e) => setProposeDate(e.target.value)}
                            />
                            {proposeSlotsBusy ? (
                              <p className="adm-propose-loading">Chargement des horaires…</p>
                            ) : proposeSlots.length === 0 ? (
                              <p className="adm-propose-empty">Aucun créneau ce jour-là selon vos disponibilités. Changez de date.</p>
                            ) : (
                              <div className="adm-propose-slots" role="group" aria-label="Créneaux disponibles">
                                {proposeSlots.map((s) => (
                                  <button
                                    key={s.start}
                                    type="button"
                                    className={`adm-slot-chip${selectedProposeSlot?.start === s.start ? ' sel' : ''}`}
                                    onClick={() => setSelectedProposeSlot(s)}
                                  >
                                    {hm(s.start)} – {hm(s.end)}
                                  </button>
                                ))}
                              </div>
                            )}
                            {proposeError && <p className="adm-propose-err" role="alert">{proposeError}</p>}
                            <div className="adm-propose-actions">
                              <button
                                type="button"
                                className="btn-propose"
                                disabled={!selectedProposeSlot || proposeSubmitting}
                                onClick={() => submitPropose(r.id)}
                              >
                                {proposeSubmitting ? 'Envoi…' : 'Envoyer au patient'}
                              </button>
                              <button type="button" className="btn-cancel" onClick={closePropose}>
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn-propose-link"
                            aria-label="Proposer un autre horaire"
                            onClick={() => openPropose(r)}
                          >
                            <span className="btn-adm-ic" aria-hidden>
                              <IconCalendarClock />
                            </span>
                            <span className="btn-adm-txt">Proposer un autre horaire</span>
                          </button>
                        )}
                      </div>
                    )}
                    {r.status==='CHANGE_PROPOSED'&&r.proposedSlotStart&&(
                      <p className="adm-proposed">
                        Contre-proposition envoyée au patient :{' '}
                        <strong>
                          {new Date(r.proposedSlotStart).toLocaleString('fr-FR', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </strong>
                        {' — '}
                        en attente de réponse.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── AVAILABILITY ── */}
      {tab === 'avail' && (
        <div className="adm-avail">
          <div className="adm-avail-head">
            <p className="adm-avail-hint">
              <strong>Lundi au samedi</strong> — activez les créneaux de 30 minutes ouverts à la réservation
              (8h00–19h30, dernier rendez-vous jusqu’à 20h00). Les plages continues sont fusionnées
              automatiquement à l’enregistrement. Un horaire éventuel au <strong>dimanche</strong> déjà
              présent en base est conservé si vous enregistrez depuis cet écran.
            </p>
          </div>
          <div className="adm-avail-grid-wrap">
            <div className="adm-avail-grid">
              {WORKING_DAYS.map((day) => (
                <div key={day} className="adm-avail-col">
                  <div className="adm-avail-col-head">
                    <span className="adm-avail-day">{WORKING_DAY_LABELS[day]}</span>
                    <div className="adm-avail-day-actions">
                      <button
                        type="button"
                        className="adm-avail-mini"
                        onClick={() => fillAvailDay(day)}
                      >
                        Tout
                      </button>
                      <button
                        type="button"
                        className="adm-avail-mini"
                        onClick={() => clearAvailDay(day)}
                      >
                        Rien
                      </button>
                    </div>
                  </div>
                  <div className="adm-avail-slots" role="group" aria-label={`Créneaux ${WORKING_DAY_LABELS[day]}`}>
                    {ALL_SLOT_TIMES.map((time) => {
                      const k = slotKey(day, time);
                      const on = !!slotSelection[k];
                      return (
                        <button
                          key={time}
                          type="button"
                          className={`adm-avail-slot${on ? ' on' : ''}`}
                          aria-pressed={on}
                          onClick={() => toggleAvailSlot(day, time)}
                        >
                          {formatSlotLabel(time)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="adm-avail-footer">
            <button type="button" className="btn-save" onClick={saveAvail}>
              Enregistrer les disponibilités
            </button>
          </div>
        </div>
      )}

      {/* ── QR ── */}
      {tab==='qr' && (
        <div className="adm-qr">
          {qr
            ? <>
                <div className="qr-wrapper">
                  <img src={qr} alt="QR Code" className="qr-img"/>
                  <div className="qr-icon">🦷</div>
                </div>
                <p>Affichez ce code dans votre cabinet.</p>
                <p className="qr-link">{prof?.bookingLink}</p>
                <a href={qr} download="qr-rdv.png" className="btn-dl">Télécharger</a>
              </>
            : <div className="adm-empty">Chargement...</div>
          }
        </div>
      )}
    </div>
  );
}
