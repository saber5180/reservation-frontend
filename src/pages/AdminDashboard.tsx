import { useState, useEffect } from 'react';
import { api } from '../api/client';
import './AdminDashboard.css';

interface Rdv { id:string; slotStart:string; slotEnd:string; status:string; proposedSlotStart:string|null; proposedSlotEnd:string|null; client:{name:string|null;email:string|null;phone:string|null}|null; guestName:string|null; guestPhone:string|null; }
interface Prof { id:string; slug:string; bookingLink:string; specialty:string; bio:string|null; }
interface Av   { dayOfWeek:number; startTime:string; endTime:string; }

const DAYS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const BADGE: Record<string,{t:string;cls:string}> = {
  PENDING:        {t:'En attente',    cls:'badge-yellow'},
  CONFIRMED:      {t:'Confirmé',      cls:'badge-green'},
  REJECTED:       {t:'Refusé',        cls:'badge-red'},
  CHANGE_PROPOSED:{t:'Proposé',       cls:'badge-purple'},
};

const hm  = (iso:string) => new Date(iso).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
const dmy = (iso:string) => new Date(iso).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'});

export default function AdminDashboard() {
  const [tab,     setTab]     = useState<'rdvs'|'avail'|'qr'>('rdvs');
  const [rdvs,    setRdvs]    = useState<Rdv[]>([]);
  const [prof,    setProf]    = useState<Prof|null>(null);
  const [qr,      setQr]      = useState('');
  const [avail,   setAvail]   = useState<Av[]>([]);
  const [propose, setPropose] = useState('');
  const [propSlot,setPropSlot]= useState({start:'',end:''});
  const [filter,  setFilter]  = useState('ALL');

  useEffect(()=>{
    api.get<Rdv[]>('/reservations').then(setRdvs).catch(()=>{});
    api.get<Prof>('/professionals/me').then(setProf).catch(()=>{});
  },[]);

  useEffect(()=>{
    if (prof) api.get<Av[]>(`/availability/professional/${prof.id}`).then(setAvail).catch(()=>{});
  },[prof]);

  const refresh = () => api.get<Rdv[]>('/reservations').then(setRdvs).catch(()=>{});

  const accept  = async (id:string) => { await api.patch(`/reservations/${id}/accept`);  refresh(); };
  const reject  = async (id:string) => { await api.patch(`/reservations/${id}/reject`);  refresh(); };
  const propose2= async (id:string) => {
    if (!propSlot.start||!propSlot.end) return;
    await api.patch(`/reservations/${id}/propose`,{proposedSlotStart:propSlot.start,proposedSlotEnd:propSlot.end});
    setPropose(''); setPropSlot({start:'',end:''}); refresh();
  };

  const loadQr = async () => {
    if (!prof) return;
    const r = await api.get<{dataUrl:string}>(`/professionals/${prof.slug}/qr`);
    setQr(r.dataUrl);
  };

  const saveAvail = async () => {
    if (!prof) return;
    await api.post(`/availability/professional/${prof.id}`,{slots:avail});
    alert('Disponibilités enregistrées !');
  };

  const patientName = (r:Rdv) => r.client?.name||r.guestName||'Patient';
  const patientContact = (r:Rdv) => r.client?.phone||r.guestPhone||r.client?.email||'';

  const filtered = filter==='ALL' ? rdvs : rdvs.filter(r=>r.status===filter);

  return (
    <div className="adm">
      <div className="adm-head">
        <div>
          <h1>Tableau de bord</h1>
          {prof && <p className="adm-sub"><span>{prof.specialty}</span> — <a href={prof.bookingLink} target="_blank" rel="noreferrer">{prof.bookingLink}</a></p>}
        </div>
      </div>

      <div className="adm-tabs">
        <button className={tab==='rdvs' ?'adm-tab active':'adm-tab'} onClick={()=>setTab('rdvs')}>📋 Réservations <span className="adm-cnt">{rdvs.filter(r=>r.status==='PENDING').length}</span></button>
        <button className={tab==='avail'?'adm-tab active':'adm-tab'} onClick={()=>setTab('avail')}>🗓 Disponibilités</button>
        <button className={tab==='qr'   ?'adm-tab active':'adm-tab'} onClick={()=>{setTab('qr');loadQr();}}>📱 QR Code</button>
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
                      <div className="adm-btns">
                        <button className="btn-accept" onClick={()=>accept(r.id)}>✓ Accepter</button>
                        <button className="btn-reject" onClick={()=>reject(r.id)}>✗ Refuser</button>
                        {propose===r.id ? (
                          <div className="adm-propose">
                            <input type="datetime-local" value={propSlot.start} onChange={e=>setPropSlot(s=>({...s,start:e.target.value}))}/>
                            <input type="datetime-local" value={propSlot.end}   onChange={e=>setPropSlot(s=>({...s,end:e.target.value}))}/>
                            <button className="btn-propose" onClick={()=>propose2(r.id)}>Proposer</button>
                            <button className="btn-cancel"  onClick={()=>setPropose('')}>Annuler</button>
                          </div>
                        ):(
                          <button className="btn-propose-link" onClick={()=>setPropose(r.id)}>Proposer un autre créneau</button>
                        )}
                      </div>
                    )}
                    {r.status==='CHANGE_PROPOSED'&&r.proposedSlotStart&&(
                      <p className="adm-proposed">Proposition envoyée : {new Date(r.proposedSlotStart).toLocaleString('fr-FR')}</p>
                    )}
                  </div>
                );
              })
          }
        </div>
      )}

      {/* ── AVAILABILITY ── */}
      {tab==='avail' && (
        <div className="adm-avail">
          <p className="adm-avail-hint">Définissez vos horaires par jour de la semaine (créneaux de 30 min).</p>
          {avail.map((a,i)=>(
            <div key={i} className="avail-row">
              <select value={a.dayOfWeek} onChange={e=>setAvail(av=>av.map((x,j)=>j===i?{...x,dayOfWeek:+e.target.value}:x))}>
                {DAYS.map((d,idx)=><option key={idx} value={idx}>{d}</option>)}
              </select>
              <input type="time" value={a.startTime} onChange={e=>setAvail(av=>av.map((x,j)=>j===i?{...x,startTime:e.target.value}:x))}/>
              <span>→</span>
              <input type="time" value={a.endTime}   onChange={e=>setAvail(av=>av.map((x,j)=>j===i?{...x,endTime:e.target.value}:x))}/>
              <button className="avail-del" onClick={()=>setAvail(av=>av.filter((_,j)=>j!==i))}>✕</button>
            </div>
          ))}
          <div className="avail-footer">
            <button className="btn-add" onClick={()=>setAvail(av=>[...av,{dayOfWeek:1,startTime:'09:00',endTime:'17:00'}])}>+ Ajouter</button>
            <button className="btn-save" onClick={saveAvail}>Enregistrer</button>
          </div>
        </div>
      )}

      {/* ── QR ── */}
      {tab==='qr' && (
        <div className="adm-qr">
          {qr
            ? <>
                <img src={qr} alt="QR Code"/>
                <p>Affichez ce code dans votre cabinet.</p>
                <a href={qr} download="qr-rdv.png" className="btn-dl">Télécharger</a>
              </>
            : <div className="adm-empty">Chargement...</div>
          }
        </div>
      )}
    </div>
  );
}
