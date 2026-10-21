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
Charte Atelier « néon monochrome » : toute l'app dans sa couleur signature, le **cyan #15AABF** (posé dans
`src/app/globals.css` sur `html[data-atelier-app="suivi"]`, en attendant `--atelier-sig-suivi` dans la source du kit,
Atelier_Projets/design-system/brand/). `src/styles/atelier-brand/atelier-brand.css` est une copie exacte du kit :
ne jamais la modifier ici. Jetons Tailwind (`globals.css`) : `bg-paper`, `bg-surface`, `bg-sunken`, `text-ink`,
`text-ink-soft`, `border-edge`, `border-edge-soft`, `divide-line`, `bg-accent` / `text-accent-ink`, `bg-accent-soft`,
`text-accent-strong`, `neon-panel`, `glow-accent`, `neon-title`, `eyebrow`. Couleurs qui portent un sens, jamais la
signature : `good` / `bad`, `cat-*` (catégories) et `treso` (bleu roi de Trésorerie, pour tout ce qui part vers elle).
Polices : `font-display` (Nunito du kit, titres), `font-sans` (Nunito Sans), `font-mono` (JetBrains Mono, chiffres).
Pas de couleurs ni d'ombres en dur. Sur téléphone, la barre d'onglets est fixe : le `main` garde une marge basse
(`pb-[calc(7.5rem+env(safe-area-inset-bottom))]`) pour que rien ne passe dessous ; aucun `backdrop-filter` sur un
ancêtre d'un élément `fixed`. Zones tactiles ≥ 44 px. Textes en français, tutoiement.

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
