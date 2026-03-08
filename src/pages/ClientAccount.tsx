import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ClientAccount.css';

export default function ClientAccount() {
  const { user, updateMe, logout } = useAuth();
  const [name,   setName]  = useState(user?.name  || '');
  const [email,  setEmail] = useState(user?.email || '');
  const [saved,  setSaved] = useState(false);
  const [err,    setErr]   = useState('');
  const nav = useNavigate();

  if (!user) { nav('/'); return null; }

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setSaved(false);
    try { await updateMe({ name: name.trim()||undefined, email: email.trim()||undefined }); setSaved(true); setTimeout(()=>setSaved(false),3000); }
    catch(ex){ setErr(ex instanceof Error?ex.message:'Erreur'); }
  };

  return (
    <div className="acc-wrap">
      <div className="acc-card">
        <h1>Mon compte</h1>
        <p className="acc-phone">📱 {user.phone}</p>
        <form onSubmit={save}>
          {err    && <div className="acc-err">{err}</div>}
          {saved  && <div className="acc-ok">Profil mis à jour !</div>}
          <label>Nom <small>(optionnel)</small><input value={name}  onChange={e=>setName(e.target.value)}  placeholder="Votre nom"/></label>
          <label>Email <small>(optionnel)</small><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.com"/></label>
          <button type="submit">Enregistrer</button>
        </form>
        <button className="acc-logout" onClick={()=>{logout();nav('/');}}>Se déconnecter</button>
      </div>
    </div>
  );
}
