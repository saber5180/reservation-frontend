import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAdminRealtime } from '../context/AdminRealtimeContext';
import { IconClipboard, IconCalendarClock, IconQr } from '../components/TabIcons';
import {
  WORKING_DAYS,
  WORKING_DAY_LABELS,
  ALL_SLOT_TIMES,
  slotKey,
  availRowsToSelection,
  selectionToAvailSlots,
  formatSlotLabel,
} from '../lib/availabilitySlots';
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

  const filtered = filter==='ALL' ? rdvs : rdvs.filter(r=>r.status===filter);

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

      <div className="adm-tabs" role="tablist" aria-label="Sections du tableau de bord">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'rdvs'}
          className={tab === 'rdvs' ? 'adm-tab active' : 'adm-tab'}
          onClick={() => setTab('rdvs')}
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
          aria-selected={tab === 'avail'}
          className={tab === 'avail' ? 'adm-tab active' : 'adm-tab'}
          onClick={() => setTab('avail')}
        >
          <span className="adm-tab__ic" aria-hidden>
            <IconCalendarClock />
          </span>
          <span className="adm-tab__label">Disponibilités</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'qr'}
          className={tab === 'qr' ? 'adm-tab active' : 'adm-tab'}
          onClick={() => {
            setTab('qr');
            loadQr();
          }}
        >
          <span className="adm-tab__ic" aria-hidden>
            <IconQr />
          </span>
          <span className="adm-tab__label">QR code</span>
        </button>
      </div>

      {/* ── RESERVATIONS ── */}
      {tab==='rdvs' && (
        <div>
          <div className="adm-filters">
            {['ALL','PENDING','CONFIRMED','REJECTED','CHANGE_PROPOSED'].map(f=>(
              <button key={f} className={`f-btn${filter===f?' active':''}`} onClick={()=>setFilter(f)}>
                {f==='ALL'?'Tous':BADGE[f]?.t||f}
              </button>
            ))}
          </div>
          {filtered.length===0
            ? <div className="adm-empty">Aucune réservation.</div>
            : filtered.map(r=>{
                const b=BADGE[r.status]||{t:r.status,cls:''};
                return (
                  <div key={r.id} className="adm-card">
                    <div className="adm-card-top">
                      <div className="adm-patient">
                        <span className="adm-pname">{patientName(r)}</span>
                        {patientContact(r)&&<span className="adm-pcontact">{patientContact(r)}</span>}
                      </div>
                      <div className="adm-time">{dmy(r.slotStart)} · {hm(r.slotStart)} – {hm(r.slotEnd)}</div>
                      <span className={`badge ${b.cls}`}>{b.t}</span>
                    </div>

                    {r.status==='PENDING' && (
                      <div className="adm-btns adm-btns-stack">
                        <div className="adm-btns-row">
                          <button type="button" className="btn-accept" onClick={()=>accept(r.id)}>Accepter ce créneau</button>
                          <button type="button" className="btn-reject" onClick={()=>reject(r.id)}>Refuser la demande</button>
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
                          <button type="button" className="btn-propose-link" onClick={() => openPropose(r)}>
                            Proposer un autre horaire
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
              })
          }
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
