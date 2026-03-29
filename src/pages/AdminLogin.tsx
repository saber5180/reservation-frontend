import { Navigate } from 'react-router-dom';

/** Même connexion que /account (téléphone + OTP) ; praticien : numéro cabinet configuré (ex. 123456). */
export default function AdminLogin() {
  return <Navigate to="/account" replace />;
}
