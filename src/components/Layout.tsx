import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="topbar-brand">
          <span className="topbar-logo">🩺</span>
          <span>RésaPro</span>
        </Link>
        <div className="topbar-nav">
          {user ? (
            user.role === 'ADMIN' ? (
              <>
                <Link to="/admin/dashboard" className="nav-link">Tableau de bord</Link>
                <button className="btn-logout" onClick={() => { logout(); nav('/'); }}>Déconnexion</button>
              </>
            ) : (
              <>
                <Link to="/account" className="nav-link">Mon compte</Link>
                <button className="btn-logout" onClick={() => { logout(); nav('/'); }}>Déconnexion</button>
              </>
            )
          ) : (
            <Link to="/admin" className="nav-pro">Espace professionnel</Link>
          )}
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
