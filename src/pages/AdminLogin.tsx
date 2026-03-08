import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminLogin.css';

export default function AdminLogin() {
  const { adminLogin, user } = useAuth();
  const [email,   setEmail]   = useState('');
  const [pw,      setPw]      = useState('');
  const [err,     setErr]     = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => { if (user?.role==='ADMIN') nav('/admin/dashboard'); }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try { await adminLogin(email, pw); nav('/admin/dashboard'); }
    catch(ex){ setErr(ex instanceof Error ? ex.message : 'Identifiants invalides'); }
    finally  { setLoading(false); }
  };

  return (
    <div className="al-wrap">
      <div className="al-card">
        <div className="al-icon">🦷</div>
        <h1>Espace Dentiste</h1>
        <p>Connectez-vous pour gérer vos rendez-vous</p>
        <form onSubmit={submit}>
          {err && <div className="al-err">{err}</div>}
          <label>
            Adresse e-mail
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/>
          </label>
          <label>
            Mot de passe
            <input type="password" value={pw} onChange={e=>setPw(e.target.value)} autoComplete="current-password" required/>
          </label>
          <button type="submit" disabled={loading}>{loading ? 'Connexion…' : 'Se connecter'}</button>
        </form>
        <p className="al-hint">admin@cabinet.com — mot de passe: Admin123!</p>
      </div>
    </div>
  );
}
