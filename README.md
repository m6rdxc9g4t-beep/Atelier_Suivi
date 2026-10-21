# atelier_Suivi

Suivi quotidien de la suite Atelier : tes tâches du jour, ponctuelles ou récurrentes (sport, cure, ménage, rappels…),
tes habitudes sur la semaine, et le lien avec **atelier_Trésorerie** : quand tu coches une tâche liée (un médicament
acheté en pharmacie, un abonnement payé), une ligne de dépense est préparée puis envoyée dans tes comptes.

**Stack :** Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres,
Auth, RLS) · Zod · Lucide · Vercel. Même base qu'Atelier Dates ; couleur signature : cyan `#15AABF`.

Installable comme une app : Safari → *Partager → Sur l'écran d'accueil* (iPhone), *Fichier → Ajouter au Dock* (Mac).

---

## Fonctionnalités

| Onglet | Rôle |
| --- | --- |
| **Aujourd'hui** | Tâches du jour par moment (matin, midi, après-midi, soir, à tout moment), anneau de progression, séries en cours, ajout rapide. Navigation jour par jour ; les jours passés se cochent aussi. |
| **Semaine** | Taux de réalisation, meilleure série, montants partis vers Trésorerie, barres par jour et grille d'habitudes (fait / manqué / prévu) avec taux sur 30 jours. |
| **Tâches** | Création et modification : une fois (date facultative), chaque jour, certains jours, tous les N jours, chaque mois ; date de fin (cure) ; pause ; lien Trésorerie (montant fixe ou demandé à chaque coche, dépense ou recette, libellé, catégorie, compte). |
| **Trésorerie** | Lignes en attente (modifiables), export CSV, historique des lignes envoyées, état du script du Mac. |
| **Paramètres** | Thème clair / sombre, prénom, clés de synchronisation, déconnexion. |

Le prototype d'origine (page autonome, sans serveur) est gardé dans `docs/prototype/atelier_suivi.html`.

## 1. Installation locale

Prérequis : Node.js ≥ 20.9 et un compte [Supabase](https://supabase.com).

```bash
npm install
cp .env.example .env.local   # puis renseigne les valeurs (étape 2)
npm run dev                   # http://localhost:3000
```

## 2. Préparer Supabase

1. **Créer un projet** (région Europe — Paris ou Francfort).
2. **Appliquer le schéma** : *SQL Editor* → coller `supabase/migrations/20261021000000_init.sql` et l'exécuter
   (ou `npx supabase link --project-ref <ref> && npx supabase db push`).
3. **Clés** : *Project Settings → API* → URL et clé `publishable` dans `.env.local`.
4. **Auth → URL Configuration** : *Site URL* `http://localhost:3000` (puis l'URL Vercel) ; *Redirect URLs*
   `http://localhost:3000/**` et `https://<ton-projet>.vercel.app/**`.
5. **Auth → Email Templates → Magic Link** (pour que le lien marche ouvert sur un autre appareil) :
   ```html
   <h2>Ton lien pour atelier_Suivi</h2>
   <p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">Ouvrir mon suivi</a></p>
   ```

## 3. Déployer sur Vercel

1. Vercel → *Add New Project* → importer `Atelier_Suivi`.
2. Variables : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` (URL de prod),
   `NEXT_PUBLIC_APP_TIMEZONE=Europe/Paris`.
3. *Settings → Functions → Region* : celle de la base Supabase.
4. Reporter l'URL de prod dans Supabase (*Site URL* + *Redirect URLs*).

## 4. Lien avec atelier_Trésorerie

Trésorerie est une application **locale** (Flask, http://127.0.0.1:5050) : rien ne sort de ton Mac. Suivi, lui, est
en ligne pour être utilisé depuis le téléphone. Le pont entre les deux est un petit script qui tourne sur le Mac :

```
iPhone : je coche « Acheter le sirop » → montant 8,90 €
   └─► Supabase : ligne « Pharmacie : sirop · −8,90 € · Santé · Compte courant » (en attente)
Mac, toutes les 15 min : scripts/sync-tresorerie.mjs
   ├─► lit les lignes en attente (avec ta clé de synchronisation)
   ├─► POST http://127.0.0.1:5050/api/transactions   (compte et catégorie retrouvés par leur nom)
   └─► marque la ligne « envoyée » avec le n° de transaction Trésorerie
```

**Installation** : Suivi → *Paramètres → Synchronisation* → *Créer une clé*. La page affiche une commande toute
prête ; colle-la dans le Terminal, depuis le dossier de ce projet sur le Mac :

```bash
SUIVI_SUPABASE_URL="…" SUIVI_SUPABASE_KEY="sb_publishable_…" SUIVI_SYNC_TOKEN="suivi_…" bash scripts/macos/install-sync.sh
```

- Configuration : `~/.config/atelier-suivi/sync.env` (lisible par toi seul) · Journal : `~/Library/Logs/Atelier_Suivi/sync.log`
- Envoi immédiat : `npm run sync:tresorerie` · Désinstaller : `bash scripts/macos/install-sync.sh --uninstall`
- Trésorerie arrêtée : le script n'envoie rien et réessaie au passage suivant.
- **Jamais de doublon** : chaque transaction porte `[suivi:<id>]` dans ses notes ; un envoi interrompu est retrouvé.
- Compte introuvable par son nom : `TRESORERIE_DEFAULT_ACCOUNT` dans la configuration, sinon le premier compte courant.
- La clé ne donne accès qu'aux lignes Trésorerie de son propriétaire ; seule son empreinte est stockée. Supprimer la
  clé dans Paramètres coupe l'accès immédiatement.

**Sans le script** : *Trésorerie → Exporter en CSV*, puis dans Trésorerie *Transactions → Importer* (colonnes
Date ; Libellé ; Montant ; Catégorie reconnues automatiquement), puis *J'ai importé le CSV* dans Suivi.

## 5. Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run typecheck` / `npm run lint` | Types et ESLint |
| `npm test` | Tests unitaires (Vitest) : récurrences, séries, export CSV, schémas Zod |
| `npm run test:rls` | Applique les migrations dans un Postgres embarqué (PGlite) et vérifie l'isolation RLS, les coches et les clés |
| `npm run test:sync` | Pont vers Trésorerie avec de faux serveurs : envoi, anti-doublon, Trésorerie arrêtée, ligne refusée |
| `npm run sync:tresorerie` | Un passage d'envoi vers Trésorerie |

## 6. Arborescence

```
src/
├── proxy.ts                        # rafraîchit la session, protège les routes
├── app/
│   ├── layout.tsx  globals.css     # polices, thème, jetons de la charte Atelier (cyan)
│   ├── connexion/  auth/callback/  # mot de passe ou lien magique
│   └── (app)/
│       ├── aujourdhui/             # liste du jour, coche optimiste, fenêtre de montant, ajout rapide
│       ├── semaine/                # statistiques et grille d'habitudes
│       ├── taches/  [id]/          # liste, création, modification, suppression
│       ├── tresorerie/  export/    # lignes en attente, export CSV, historique
│       └── parametres/             # thème, profil, clés de synchronisation
├── components/                     # ui/ (Button, Field, Panel…), nav/, theme/
├── styles/atelier-brand/           # kit de marque commun (copie exacte, ne pas modifier) + Nunito (OFL)
└── lib/
    ├── recurrence.ts               # règles de récurrence, séries, taux (pures, testées)
    ├── csv.ts                      # export au format d'import de Trésorerie
    ├── dal.ts  queries.ts          # accès aux données sous RLS
    ├── validation/                 # schémas Zod
    └── supabase/                   # clients navigateur / serveur / proxy + types
scripts/
├── sync-tresorerie.mjs             # pont Suivi → Trésorerie (Node ≥ 20, sans dépendance)
├── macos/install-sync.sh           # agent launchd (toutes les 15 min)
└── tests/                          # tests du pont
supabase/
├── migrations/20261021000000_init.sql
└── tests/rls.mjs
docs/prototype/atelier_suivi.html   # prototype d'origine
```

## 7. Sécurité des données

- Chaque table porte un `user_id` ; **RLS** n'autorise que son propriétaire. Clés étrangères composites `(id, user_id)` :
  impossible de cocher la tâche de quelqu'un d'autre ou d'y rattacher une ligne.
- Droits de modification accordés colonne par colonne : personne ne change le propriétaire d'une ligne.
- Coches et lignes Trésorerie créées ensemble par `complete_task()` (atomique) ; décocher retire la ligne si elle
  n'est pas encore envoyée, la conserve sinon.
- Clés de synchronisation : générées par la base, montrées une seule fois, stockées sous forme d'empreinte SHA-256 ;
  les fonctions du script ne lisent et ne marquent que les lignes du propriétaire de la clé.

## 8. Prochaines étapes suggérées

- Ajouter `--atelier-sig-suivi: #15aabf` au kit de marque dans Atelier_Projets, puis recopier le kit partout.
- Logo atelier_Suivi suivant le gabarit de la charte, et fenêtre « À propos ».
- Rappels push à l'heure du moment choisi (matin, soir…), comme les notifications d'Atelier Dates.
