# Frontend - Réservation en ligne

Interface React pour le système de réservation.

## Lancer le projet

```bash
npm install
npm run dev
```

Ouvre http://localhost:5173

## Prérequis

Le backend NestJS doit tourner sur http://localhost:3000

```bash
cd ../reservation-system
npm run start:dev
```

## Pages

- `/` - Accueil
- `/login` - Connexion
- `/register` - Inscription
- `/booking/:slug` - Page de réservation (lien du QR code)
- `/dashboard` - Tableau de bord professionnel
- `/my-reservations` - Mes réservations
- `/create-professional` - Créer un profil professionnel
