import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OtpLogin from '../components/OtpLogin';
import './ClientAccount.css';

export default function ClientAccount() {
  const { user, updateMe, logout } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    if (user?.role === 'ADMIN') nav('/admin/dashboard', { replace: true });
  }, [user, nav]);

  useEffect(() => {
    if (user?.role === 'CLIENT') {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  if (user?.role === 'ADMIN') return null;

  if (!user) {
    return (
      <div className="acc-wrap acc-wrap--login acc-wrap--login-dark">
        <div className="acc-login-dark-ambient" aria-hidden />
        <div className="acc-login-dark-card">
          <header className="acc-login-dark-head">
            <img
              src="/nav-bar-logo.png"
              alt=""
              className="acc-login-dark-logo"
              width="120"
              height="64"
            />
            <h1 className="acc-login-dark-title">Connexion</h1>
            <p className="acc-login-dark-sub">
              Accédez à votre espace : code par SMS. Praticiens : numéro d’accès cabinet accepté.
            </p>
          </header>
          <div className="acc-login-dark-form-surface">
            <OtpLogin
              layout="hero"
              allowCabinetAccess
              onSuccess={(info) => {
                if (info?.role === 'CLIENT') {
                  nav('/', { replace: true, state: { focusBooking: true } });
                }
              }}
            />
          </div>
          <p className="acc-login-dark-foot">
            Vos rendez-vous dentaires en ligne, simplement.
          </p>
        </div>
      </div>
    );
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setSaved(false);
    try {
      await updateMe({ name: name.trim() || undefined, email: email.trim() || undefined });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Erreur');
    }
  };

  return (
    <div className="acc-wrap">
      <div className="acc-card">
        <img
          src="/dentardv-logo.png"
          alt=""
          className="acc-logo"
          width="200"
          height="48"
        />
        <h1>Mon compte</h1>
        <p className="acc-phone">📱 {user.phone}</p>
        <form onSubmit={save}>
          {err && <div className="acc-err">{err}</div>}
          {saved && <div className="acc-ok">Profil mis à jour !</div>}
          <label>
            Nom <small>(optionnel)</small>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" />
          </label>
          <label>
            Email <small>(optionnel)</small>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" />
          </label>
          <button type="submit">Enregistrer</button>
        </form>
        <button
          type="button"
          className="acc-logout"
          onClick={() => {
            logout();
            nav('/');
          }}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
