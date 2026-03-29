import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AdminRealtimeProvider,
  AdminRealtimeToastHost,
  useAdminPendingCount,
} from '../context/AdminRealtimeContext';
import {
  IconDashboard,
  IconCabinet,
  IconUserCircle,
  IconLogout,
} from './TabIcons';
import './Layout.css';

function navPillClass({ isActive }: { isActive: boolean }) {
  return ['nav-pill', isActive ? 'nav-pill--active' : ''].filter(Boolean).join(' ');
}

function LayoutInner() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const pendingDash = useAdminPendingCount();

  return (
    <>
      <AdminRealtimeToastHost />
      <header className="topbar">
        <Link
          to="/"
          className="topbar-brand"
          title="DentaRDV — Accueil"
          aria-label="DentaRDV — Accueil"
        >
          <img
            src="/dentardv-logo.png"
            alt=""
            className="topbar-logo-img"
            width="64"
            height="40"
          />
          <span className="topbar-brand-text">
            <span className="topbar-brand-denta">Denta</span>
            <span className="topbar-brand-rdv">RDV</span>
          </span>
        </Link>
        <nav className="topbar-nav" aria-label="Navigation principale">
          {user ? (
            user.role === 'ADMIN' ? (
              <div className="topbar-cluster">
                <div className="topbar-segment" role="group" aria-label="Espace professionnel">
                  <NavLink
                    to="/admin/dashboard"
                    className={({ isActive }) =>
                      [
                        navPillClass({ isActive }),
                        'nav-pill--badge-anchor',
                      ]
                        .filter(Boolean)
                        .join(' ')
                    }
                    end
                    title="Tableau de bord"
                  >
                    <span className="nav-pill__ic" aria-hidden>
                      <IconDashboard />
                    </span>
                    <span className="nav-pill__txt">Tableau de bord</span>
                    {pendingDash > 0 && (
                      <span className="nav-pill__cnt" aria-label={`${pendingDash} demande(s) en attente`}>
                        {pendingDash > 99 ? '99+' : pendingDash}
                      </span>
                    )}
                  </NavLink>
                  <NavLink
                    to="/admin/account"
                    className={navPillClass}
                    title="Mon cabinet"
                  >
                    <span className="nav-pill__ic" aria-hidden>
                      <IconCabinet />
                    </span>
                    <span className="nav-pill__txt">Mon cabinet</span>
                  </NavLink>
                </div>
                <button
                  type="button"
                  className="nav-pill nav-pill--logout"
                  title="Déconnexion"
                  onClick={() => {
                    logout();
                    nav('/');
                  }}
                >
                  <span className="nav-pill__ic" aria-hidden>
                    <IconLogout />
                  </span>
                  <span className="nav-pill__txt">Déconnexion</span>
                </button>
              </div>
            ) : (
              <div className="topbar-cluster">
                <div className="topbar-segment" role="group" aria-label="Compte">
                  <NavLink to="/account" className={navPillClass} title="Mon compte">
                    <span className="nav-pill__ic" aria-hidden>
                      <IconUserCircle />
                    </span>
                    <span className="nav-pill__txt">Mon compte</span>
                  </NavLink>
                </div>
                <button
                  type="button"
                  className="nav-pill nav-pill--logout"
                  title="Déconnexion"
                  onClick={() => {
                    logout();
                    nav('/');
                  }}
                >
                  <span className="nav-pill__ic" aria-hidden>
                    <IconLogout />
                  </span>
                  <span className="nav-pill__txt">Déconnexion</span>
                </button>
              </div>
            )
          ) : (
            <Link to="/admin" className="nav-pro">
              Espace professionnel
            </Link>
          )}
        </nav>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}

export default function Layout() {
  const { user } = useAuth();

  return (
    <div className="app">
      {user?.role === 'ADMIN' ? (
        <AdminRealtimeProvider>
          <LayoutInner />
        </AdminRealtimeProvider>
      ) : (
        <LayoutInner />
      )}
    </div>
  );
}
