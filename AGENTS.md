# AGENTS.md — Centre de Soutien Scolaire (Gestion)

Mémo de référence pour tous les agents travaillant sur ce projet. À lire intégralement avant toute modification.

## 1. Contexte métier

Application web de gestion d'un centre de soutien scolaire au Maroc. **Interface en FRANÇAIS**, **code / variables / tables en ANGLAIS**.

- **Un seul utilisateur** : l'administrateur. Login sécurisé, **aucun système de rôles multiples**.
- **Matières (Subject)** : Maths, PC, Français, Anglais, etc.
- **Niveaux (Level)** : dépendent du type de matière.
  - Matières scolaires (`SCHOOL`) : 1ère Bac, 2ème Bac, etc.
  - Langues (`LANGUAGE`) : A1, A2, B1, B2, etc.
- **Groupes (Group)** : 1 à 3 par niveau selon l'affluence. Chaque groupe a un **tarif mensuel** et une **capacité**.
- **Élèves (Student)** : un élève peut être inscrit à **plusieurs matières/groupes** (Enrollment).
- **Paiement** : uniquement en **ESPÈCES**, **mensuel**, **par inscription** (donc par matière/groupe).
  - **RÈGLE CLÉ** : le paiement du mois est **indépendant de la présence**. Un élève absent doit quand même payer son mois.
- **Séances (Session)** : planning hebdomadaire fixe (Schedule : jour + heures). L'admin peut modifier une séance ponctuelle :
  - `RESCHEDULED` — DÉCALÉE : changement d'heure le même jour (ou déplacement).
  - `POSTPONED` — REPORTÉE : autre date (rattrapage), via `replacementDate`.
  - `CANCELLED` — ANNULÉE.
- **Présence (Attendance)** : appel par séance, `PRESENT` | `ABSENT`, unique par (session, élève).

## 2. Stack technique

- **Next.js (App Router)** + **TypeScript** (strict, pas de `any`)
- **PostgreSQL** + **Prisma**
- **Tailwind CSS** + **shadcn/ui**
- **Auth.js (NextAuth) credentials** — admin unique
- **Zod** (validation serveur sur toute entrée) + **React Hook Form**
- **TanStack Table** pour les tableaux
- **Recharts** pour les graphiques
- **Approche API unique** : Server Actions **ou** API routes — choisir une seule approche et s'y tenir de façon cohérente.

## 3. Modèle de données (Prisma) — référence

- `Subject`: id, name, type (`SCHOOL` | `LANGUAGE`)
- `Level`: id, name, subjectId
- `Group`: id, name, levelId, monthlyFee, capacity, isActive
- `Schedule`: id, groupId, dayOfWeek (0–6), startTime, endTime
- `Session`: id, groupId, date, startTime, endTime, status (`PLANNED` | `DONE` | `POSTPONED` | `CANCELLED` | `RESCHEDULED`), replacementDate?, note?
- `Student`: id, fullName, phone, parentName?, parentPhone?, registeredAt, isActive
- `Enrollment`: id, studentId, groupId, startDate, endDate?, discount (montant), isActive
- `Attendance`: id, sessionId, studentId, status (`PRESENT` | `ABSENT`), unique(sessionId, studentId)
- `Payment`: id, enrollmentId, month (`YYYY-MM`), amountDue, amountPaid, status (`UNPAID` | `PARTIAL` | `PAID`), paidAt?, note?, unique(enrollmentId, month)
- `User`: id, email, passwordHash

### Règles de modélisation

- **Montants en `Decimal`**, jamais en `float`.
- **Index sur toutes les clés étrangères**.
- `onDelete` adapté et réfléchi : **ne jamais supprimer l'historique financier** → préférer `isActive` / soft delete pour les entités métier.
- Contraintes d'unicité explicites : `(sessionId, studentId)` sur Attendance, `(enrollmentId, month)` sur Payment.

## 4. Règles de développement

- Code propre, **typé strictement** (`strict: true`), **pas de `any`**.
- **Validation Zod côté serveur** sur toute entrée (formulaires, actions/routes).
- **Toutes les routes sauf `/login` sont protégées** par le middleware.
- **Interface responsive** (mobile / tablette utilisable pour faire l'appel).
- **Design moderne, sobre, premium** : sidebar à gauche, cartes, tableaux propres, **mode clair** uniquement.
- **Messages d'erreur et libellés en français**.
- **Dates au format français** `JJ/MM/AAAA`.
- **Monnaie en MAD** affichée `XX,XX DH`.
- **Commits logiques et petits.** Après chaque phase : vérifier que `npm run build` passe.
- **Ne rien ajouter hors périmètre sans demander** à l'utilisateur.

## 5. Flux de travail

1. L'utilisateur fournit le prompt d'une phase.
2. Implémenter uniquement le périmètre de la phase.
3. Vérifier `npm run build` (+ typecheck/lint si configurés).
4. Commits petits et descriptifs (en anglais, conventionnels).
5. Résumer ce qui a été fait, en français, et attendre la phase suivante.
