# Instructions pour Claude CLI — atelier_Suivi

@AGENTS.md

## Objectif
Application web de suivi quotidien de la suite Atelier : tâches ponctuelles ou récurrentes (sport, cure, ménage…),
habitudes sur 7 jours, et lien avec **atelier_Trésorerie** : cocher une tâche liée prépare une ligne de dépense,
envoyée à Trésorerie par le script du Mac (ou exportée en CSV). Même pile et mêmes conventions qu'Atelier Dates.

## Architecture (à respecter)
- **Next.js 16** (App Router, Cache Components) : `src/proxy.ts` remplace `middleware.ts`. Toute lecture de session ou de
  données se fait dans un composant async placé sous `<Suspense>` ; `params` / `searchParams` sont des Promises.
- **Accès aux données** : toujours via `getUserContext()` (`src/lib/dal.ts`), client Supabase agissant avec la session
  (soumis à RLS). Jamais de clé `service_role` dans l'app. Lectures communes dans `src/lib/queries.ts` (pagination
  au-delà de 1 000 lignes).
- **Server Actions** : un `actions.ts` par onglet ; validation Zod (`src/lib/validation/schemas.ts`) ; erreurs Postgres
  traduites par `fromDbError` ; `refresh()` (next/cache) après chaque écriture. Côté client : `useFormAction` ou `<ActionForm>`.
- **Règles de récurrence** : `src/lib/recurrence.ts`, fonctions pures sur des jours « AAAA-MM-JJ » (UTC), testées.
  « Aujourd'hui » = `todayInTimezone()` (fuseau `NEXT_PUBLIC_APP_TIMEZONE`).
- **Base** : toute évolution = nouvelle migration dans `supabase/migrations/` + `src/lib/supabase/database.types.ts`
  + scénarios dans `supabase/tests/rls.mjs`. Chaque ligne porte `user_id` ; les tables enfants référencent leur parent
  par `(id, user_id)`. Cocher / décocher passe par `complete_task()` / `uncomplete_task()` (atomiques, sous RLS).
  Droits UPDATE accordés colonne par colonne (jamais `user_id`).
- **Lien Trésorerie** : montants en **centimes entiers**, négatif = dépense (comme Trésorerie). Une ligne `pending`
  disparaît si on décoche ; une ligne `sent` est conservée. `scripts/sync-tresorerie.mjs` (Node, sans dépendance) lit
  les lignes avec une clé (`sync_pending_lines`, SECURITY DEFINER, seule l'empreinte SHA-256 est stockée), les crée par
  `POST /api/transactions` de Trésorerie (en-tête `X-Requested-With`, compte et catégorie retrouvés par leur nom), puis
  `sync_mark_sent`. Marque `[suivi:<id>]` dans les notes : jamais de doublon. Catégories proposées = celles de
  Trésorerie (`TRESORERIE_CATEGORIES` dans `src/lib/meta.ts`). L'export CSV (`src/lib/csv.ts`) suit l'import de
  relevés de Trésorerie (Date ; Libellé ; Montant ; Catégorie).

## Design
Charte Atelier v2 « Linear » (règles : `Atelier_Deploy/DESIGN.md`, `Atelier_Projets/docs/SUITE.md` §1) : structure neutre
commune en gris froids, clair et sombre, plate au repos, traits de 1 px, police Inter. La signature de Suivi, le **cyan #008295**
(`--atelier-sig-suivi`, activée par `data-atelier-app="suivi"` sur `<html>`), ne sert qu'à l'accent : bouton principal, case
cochée, sélection, focus, liens, barres d'une seule mesure. Pas de halo, de lueur, de grille de fond, de `text-shadow`, de barre de
couleur sur le côté, ni de surtitre au-dessus des titres.
`src/styles/atelier-brand/` est une copie exacte du kit (source : Atelier_Projets/design-system/brand/ : `atelier-brand.css`,
`atelier-theme.js`, Inter + licence) : ne jamais la modifier ici (ignorée par ESLint).
Thème : `atelier-theme.js` est lu comme texte (règle Turbopack de `next.config.ts`) et posé en ligne dans `<head>` par
`src/components/theme/theme-script.tsx` ; préférence commune de la suite (Système / Clair / Sombre) par
`window.atelierTheme.set()`, cookie `atelier_theme` sur le VPS, sinon `localStorage["atelier:theme"]` ; pose `class="dark"` et
`data-theme`. L'ancienne clé `atelier-suivi-theme` est reprise une fois puis effacée.
Coquille comme le portail : barre latérale de 232 px (marque, navigation, thème en pied), barre haute de 44 px posée par
`PageHeader` (contexte / titre, actions), listes en lignes de 40 px séparées d'un filet, en-têtes de groupe `GroupHeader`.
Marque : `.atelier-brand__tile` avec l'icône Lucide `list-checks`, « Atelier Suivi ».
Icônes : sources `docs/brand/icone-suivi.svg` (carré arrondi : PWA, app Mac) et `docs/brand/icone-suivi-plein-cadre.svg`
(écran d'accueil iPhone / Mac, « maskable ») ; PNG et `mac/AppIcon.icns` par `node scripts/icones.mjs` (sharp). La distinction
iPhone / autres appareils reste servie par `src/proxy.ts` et `src/components/theme/iphone-icons.tsx`. Favicon : `src/app/icon.svg`.
Jetons Tailwind (`globals.css`) : `bg-paper`, `bg-sidebar`, `bg-surface`, `bg-sunken` (survol), `bg-selected` (courant), `text-ink`,
`text-ink-2`, `text-muted`, `text-faint`, `border-edge`, `border-edge-soft`, `border-line`, `bg-accent` / `text-accent-ink`,
`bg-accent-soft`, `text-accent-strong`, `shadow-pop` (seulement ce qui flotte), `focus-ring`. Tailles : `text-meta`, `text-small`,
`text-ui` (13 px sur ordinateur, 15 px sur téléphone), `text-strong`, `text-title`, `text-page`, `text-input` (16 px sur téléphone :
pas de zoom iOS). Rayons `rounded-xs|sm|md|lg` = 4 / 5 / 7 / 10 px. Chiffres en `tabular-nums` (pas de police mono hors code).
Couleurs qui portent un sens, jamais la signature : `good` / `bad` / `warn`, `cat-*` (catégories) et `treso` (bleu de Trésorerie,
pour tout ce qui part vers elle). Pas de couleurs ni d'ombres en dur. `cn()` ne fusionne pas les classes : pour surcharger une
classe de `buttonClasses()`, passer par une variante (`max-sm:`, `max-lg:`) ou le suffixe `!`.
Sur téléphone, la barre d'onglets est fixe : le `main` garde une marge basse
(`pb-[calc(7.5rem+env(safe-area-inset-bottom))]`) pour que rien ne passe dessous ; aucun `backdrop-filter` sur un
ancêtre d'un élément `fixed`. Zones tactiles ≥ 44 px (contrôles denses sur ordinateur à partir de `lg:`). Textes en français, tutoiement.

## Commandes utiles
- `npm run local` — version locale complète sur le Mac (Supabase dans Docker, ports 54421…, app sur 3030)
- `npm run dev` — serveur de développement (http://127.0.0.1:3030)
- `npm test` — tests unitaires (récurrence, CSV, schémas)
- `npm run test:rls` — migrations dans PGlite + règles de sécurité
- `npm run test:sync` — pont vers Trésorerie (faux serveurs)
- `npm run typecheck && npm run lint`
- `npm run sync:tresorerie` — un passage d'envoi vers Trésorerie (sur le Mac configuré)

## Git
Commits au format Conventional Commits en français (`feat(ui): …`, `fix(sync): …`), une branche par fonctionnalité.
