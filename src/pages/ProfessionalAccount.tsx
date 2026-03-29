import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import './ClientAccount.css';

interface ProfMe {
  id: string;
  slug: string;
  bookingLink: string;
  specialty: string;
  bio: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
}

export default function ProfessionalAccount() {
  const { user, updateMe, logout } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [bio, setBio] = useState('');
  const [bookingLink, setBookingLink] = useState('');
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      nav('/admin');
      return;
    }
    api
      .get<ProfMe>('/professionals/me')
      .then((p) => {
        setName(p.name || '');
        setPhone(p.phone || '');
        setEmail(p.email || '');
        setSpecialty(p.specialty || '');
        setBio(p.bio || '');
        setBookingLink(p.bookingLink);
      })
      .catch(() => setErr('Impossible de charger le profil cabinet.'))
      .finally(() => setLoading(false));
  }, [user, nav]);

  if (!user || user.role !== 'ADMIN') return null;

  if (loading) {
    return (
      <div className="acc-wrap">
        <div className="acc-card acc-card-wide">
          <div className="loading">Chargement...</div>
        </div>
      </div>
    );
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setSaved(false);
    const spec = specialty.trim();
    if (spec.length < 2) {
      setErr('La spécialité doit contenir au moins 2 caractères.');
      return;
    }
    try {
      await updateMe({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim(),
      });
      await api.patch('/professionals/me', {
        specialty: spec,
        bio: bio.trim(),
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Erreur');
    }
  };

  return (
    <div className="acc-wrap">
      <div className="acc-card acc-card-wide">
        <img
          src="/dentardv-logo.png"
          alt=""
          className="acc-logo"
          width="200"
          height="48"
        />
        <h1>Mon cabinet</h1>
        <p className="acc-lead">
          Nom et coordonnées affichés sur votre page de réservation publique ; l’email sert aussi à la connexion
          espace professionnel.
        </p>

        <form onSubmit={save}>
          {err && <div className="acc-err">{err}</div>}
          {saved && <div className="acc-ok">Modifications enregistrées.</div>}

          <div className="acc-section">
            <h2 className="acc-section-title">Identité & contact</h2>
            <label>
              Nom du praticien <small>(visible par les patients)</small>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr …"
                autoComplete="name"
              />
            </label>
            <label>
              Téléphone du cabinet <small>(optionnel)</small>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex. 06 12 34 56 78"
                autoComplete="tel"
              />
            </label>
            <label>
              Email professionnel
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cabinet@exemple.fr"
                autoComplete="email"
              />
            </label>
          </div>

          <div className="acc-section">
            <h2 className="acc-section-title">Page publique de réservation</h2>
            <label>
              Spécialité
              <input
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Ex. Chirurgien-dentiste"
              />
            </label>
            <label>
              Présentation <small>(optionnel)</small>
              <textarea
                className="acc-textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Quelques lignes sur votre cabinet…"
                rows={4}
              />
            </label>
            <div className="acc-readonly">
              <span className="acc-readonly-label">Lien de réservation</span>
              <a href={bookingLink} target="_blank" rel="noreferrer" className="acc-readonly-link">
                {bookingLink}
              </a>
              <p className="acc-readonly-hint">
                Le lien et le QR code du tableau de bord pointent vers cette adresse.
              </p>
            </div>
          </div>

          <button type="submit">Enregistrer</button>
        </form>

        <Link to="/admin/dashboard" className="acc-back">
          ← Tableau de bord
        </Link>
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
