# Centre Prime — Gestion du centre de soutien scolaire

Application de gestion pour un centre de soutien scolaire : élèves, matières et groupes,
planning des séances, présences et paiements mensuels en espèces.

Interface en français. Une seule administratrice ou un seul administrateur (Auth.js, identifiants).

## Stack

- Next.js 16 (App Router) + TypeScript strict
- PostgreSQL + Prisma 7
- Tailwind CSS 4 + shadcn/ui
- Auth.js v5 (Credentials)
- Zod + React Hook Form
- TanStack Table, Recharts

## Démarrage

### 1. Prérequis

- Node.js 20+
- Une base PostgreSQL accessible

### 2. Variables d'environnement

Copier `.env.example` vers `.env`, puis renseigner :

```bash
cp .env.example .env
```

| Variable         | Description                                              |
| ---------------- | -------------------------------------------------------- |
| `DATABASE_URL`   | Chaîne de connexion PostgreSQL                            |
| `AUTH_SECRET`    | Secret Auth.js (`openssl rand -base64 32`)                |
| `ADMIN_EMAIL`    | E-mail du compte administrateur créé par le seed          |
| `ADMIN_PASSWORD` | Mot de passe du compte administrateur créé par le seed    |

### 3. Base de données

```bash
npm install
npx prisma migrate dev   # applique les migrations
npx prisma db seed       # données de démonstration + compte admin
```

### 4. Lancer l'application

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000), puis se connecter avec
`ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Scripts

| Commande             | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Serveur de développement                 |
| `npm run build`      | Build de production (génère le client Prisma) |
| `npm run start`      | Serveur de production                    |
| `npm run lint`       | ESLint                                   |
| `npm run typecheck`  | Vérification TypeScript                  |
| `npm run db:migrate` | Crée/applique une migration              |
| `npm run db:seed`    | Réinitialise les données de démonstration |
| `npm run db:studio`  | Prisma Studio                            |

## Base de données de démonstration

Le seed fournit 4 matières, 8 niveaux, 8 groupes, 30 élèves et 47 inscriptions,
ainsi que le compte administrateur défini dans `.env`.
