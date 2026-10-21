-- =============================================================================
-- atelier_Suivi — schéma initial
-- Application personnelle : chaque ligne appartient à UN utilisateur (user_id).
-- RLS n'autorise que son propriétaire. Les tables enfants référencent leur parent
-- par (id, user_id) : impossible de rattacher une coche ou une ligne Trésorerie
-- à la tâche de quelqu'un d'autre.
-- Montants en CENTIMES entiers (comme atelier_Trésorerie) : < 0 = dépense, > 0 = recette.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.task_category   as enum ('sante', 'sport', 'maison', 'achats', 'bien_etre', 'autre');
create type public.task_moment     as enum ('matin', 'midi', 'apres_midi', 'soir', 'journee');
create type public.recurrence_kind as enum ('once', 'daily', 'weekdays', 'interval', 'monthly');
create type public.money_kind      as enum ('depense', 'recette');
create type public.line_status     as enum ('pending', 'sent');

-- ---------------------------------------------------------------------------
-- Profils
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  created_at   timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tâches (ponctuelles ou récurrentes) et leur lien Trésorerie
-- ---------------------------------------------------------------------------
create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  category    public.task_category not null default 'autre',
  moment      public.task_moment not null default 'journee',
  note        text check (note is null or char_length(note) <= 300),

  recurrence  public.recurrence_kind not null default 'once',
  due_on      date,                                                   -- « une fois » : date facultative
  weekdays    smallint[] check (weekdays is null or weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),  -- 1 = lundi
  every_days  smallint check (every_days is null or every_days between 1 and 365),
  month_day   smallint check (month_day is null or month_day between 1 and 31),
  starts_on   date not null default current_date,
  ends_on     date,
  paused      boolean not null default false,
  done_on     date,                                                   -- « une fois » : jour où elle a été faite

  finance_enabled      boolean not null default false,
  finance_ask          boolean not null default false,               -- demander le montant à chaque coche
  finance_amount_cents integer check (finance_amount_cents is null or finance_amount_cents > 0),
  finance_kind         public.money_kind not null default 'depense',
  finance_label        text check (finance_label is null or char_length(finance_label) <= 120),
  finance_category     text check (finance_category is null or char_length(finance_category) <= 60),
  finance_account      text check (finance_account is null or char_length(finance_account) <= 60),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (id, user_id),
  constraint tasks_dates_order check (ends_on is null or ends_on >= starts_on),
  constraint tasks_recurrence_fields check (
    (recurrence <> 'weekdays' or coalesce(cardinality(weekdays), 0) >= 1)
    and (recurrence <> 'interval' or every_days is not null)
    and (recurrence <> 'monthly' or month_day is not null)
  ),
  constraint tasks_finance_amount check (not finance_enabled or finance_ask or finance_amount_cents is not null)
);
create index tasks_user_idx on public.tasks (user_id, paused);
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Coches : une tâche faite un jour donné
-- ---------------------------------------------------------------------------
create table public.completions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid(),
  task_id    uuid not null,
  day        date not null,
  created_at timestamptz not null default now(),
  unique (task_id, day),
  unique (id, user_id),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade
);
create index completions_user_day_idx on public.completions (user_id, day);

-- ---------------------------------------------------------------------------
-- Lignes préparées pour atelier_Trésorerie
-- ---------------------------------------------------------------------------
create table public.treso_lines (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  task_id        uuid,
  completion_id  uuid unique,
  day            date not null,
  label          text not null check (char_length(label) between 1 and 200),
  amount_cents   integer not null check (amount_cents <> 0 and abs(amount_cents) < 100000000),
  category       text check (category is null or char_length(category) <= 60),
  account        text check (account is null or char_length(account) <= 60),
  task_title     text check (task_title is null or char_length(task_title) <= 120),
  status         public.line_status not null default 'pending',
  sent_at        timestamptz,
  tresorerie_id  integer,                                            -- id de la transaction côté Trésorerie
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- La tâche ou la coche supprimée : la ligne reste (elle a peut-être déjà été envoyée)
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete set null (task_id),
  foreign key (completion_id, user_id) references public.completions (id, user_id) on delete set null (completion_id)
);
create index treso_lines_user_status_idx on public.treso_lines (user_id, status, day);
create trigger treso_lines_touch before update on public.treso_lines
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Clés de synchronisation (script du Mac → atelier_Trésorerie)
-- Seule l'empreinte SHA-256 est stockée ; la clé n'est montrée qu'une fois.
-- ---------------------------------------------------------------------------
create table public.sync_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  label        text not null default 'Mac' check (char_length(label) between 1 and 60),
  token_hash   text not null unique,
  hint         text not null,                                         -- 4 derniers caractères, pour la reconnaître
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

-- ---------------------------------------------------------------------------
-- RLS : chacun ne voit et ne modifie que ses données
-- ---------------------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.tasks       enable row level security;
alter table public.completions enable row level security;
alter table public.treso_lines enable row level security;
alter table public.sync_tokens enable row level security;

create policy "profil : lecture" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profil : modification" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "tâches : propriétaire" on public.tasks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "coches : propriétaire" on public.completions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "lignes : propriétaire" on public.treso_lines for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "clés : lecture" on public.sync_tokens for select to authenticated using (user_id = (select auth.uid()));
create policy "clés : suppression" on public.sync_tokens for delete to authenticated using (user_id = (select auth.uid()));
-- Pas d'insertion directe : une clé se crée uniquement par create_sync_token()

-- Visiteurs non connectés : aucun accès direct aux tables
revoke all on public.profiles, public.tasks, public.completions, public.treso_lines, public.sync_tokens from anon;
-- Personne n'écrit l'empreinte d'une clé à la main ni ne change le propriétaire d'une ligne.
-- (Un droit UPDATE sur la table couvre toutes les colonnes : on le retire puis on liste les colonnes permises.)
revoke insert, update on public.sync_tokens from authenticated;
revoke update on public.profiles, public.tasks, public.completions, public.treso_lines from authenticated;
grant update (display_name) on public.profiles to authenticated;
grant update (
  title, category, moment, note, recurrence, due_on, weekdays, every_days, month_day, starts_on, ends_on,
  paused, done_on, finance_enabled, finance_ask, finance_amount_cents, finance_kind, finance_label,
  finance_category, finance_account
) on public.tasks to authenticated;
grant update (day, label, amount_cents, category, account, status, sent_at) on public.treso_lines to authenticated;

-- ---------------------------------------------------------------------------
-- Cocher / décocher (atomique, sous RLS : SECURITY INVOKER)
-- ---------------------------------------------------------------------------
create or replace function public.complete_task(
  p_task_id      uuid,
  p_day          date,
  p_with_line    boolean default false,
  p_amount_cents integer default null,
  p_kind         public.money_kind default null,
  p_label        text default null,
  p_category     text default null,
  p_account      text default null
)
returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  t          public.tasks;
  v_done_id  uuid;
  v_line_id  uuid;
  v_amount   integer;
  v_kind     public.money_kind;
begin
  select * into t from public.tasks where id = p_task_id;
  if not found then
    raise exception 'Tâche introuvable.' using errcode = 'P0002';
  end if;

  select id into v_done_id from public.completions where task_id = p_task_id and day = p_day;
  if found then
    -- Déjà cochée (double clic, deux appareils) : rien de plus
    return jsonb_build_object('completion_id', v_done_id, 'line_id', null, 'already', true);
  end if;

  insert into public.completions (user_id, task_id, day)
  values (t.user_id, t.id, p_day)
  returning id into v_done_id;

  if t.recurrence = 'once' then
    update public.tasks set done_on = p_day where id = t.id;
  end if;

  if p_with_line then
    v_amount := abs(coalesce(p_amount_cents, t.finance_amount_cents, 0));
    if v_amount = 0 then
      raise exception 'Indique un montant supérieur à 0.' using errcode = 'P0001';
    end if;
    v_kind := coalesce(p_kind, t.finance_kind);
    insert into public.treso_lines (user_id, task_id, completion_id, day, label, amount_cents, category, account, task_title)
    values (
      t.user_id, t.id, v_done_id, p_day,
      left(coalesce(nullif(btrim(p_label), ''), nullif(t.finance_label, ''), t.title), 200),
      case when v_kind = 'recette' then v_amount else -v_amount end,
      coalesce(nullif(btrim(p_category), ''), t.finance_category, 'Divers'),
      coalesce(nullif(btrim(p_account), ''), t.finance_account, 'Compte courant'),
      t.title
    )
    returning id into v_line_id;

    -- Montant demandé à chaque fois : on retient le dernier comme proposition suivante
    if t.finance_ask and p_amount_cents is not null then
      update public.tasks set finance_amount_cents = v_amount where id = t.id;
    end if;
  end if;

  return jsonb_build_object('completion_id', v_done_id, 'line_id', v_line_id, 'already', false);
end;
$$;

create or replace function public.uncomplete_task(p_task_id uuid, p_day date)
returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  v_done_id uuid;
  v_removed integer;
  v_kept    integer;
begin
  select id into v_done_id from public.completions where task_id = p_task_id and day = p_day;
  if not found then
    return jsonb_build_object('removed_lines', 0, 'kept_sent_lines', 0);
  end if;

  -- Ligne pas encore envoyée : elle disparaît avec la coche. Déjà envoyée : elle reste.
  delete from public.treso_lines where completion_id = v_done_id and status = 'pending';
  get diagnostics v_removed = row_count;
  select count(*) into v_kept from public.treso_lines where completion_id = v_done_id;

  delete from public.completions where id = v_done_id;
  update public.tasks set done_on = null where id = p_task_id and recurrence = 'once' and done_on = p_day;

  return jsonb_build_object('removed_lines', v_removed, 'kept_sent_lines', v_kept);
end;
$$;

-- ---------------------------------------------------------------------------
-- Clés de synchronisation
-- ---------------------------------------------------------------------------
create or replace function public.create_sync_token(p_label text default 'Mac')
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_token text;
begin
  if v_user is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  if (select count(*) from public.sync_tokens where user_id = v_user) >= 10 then
    raise exception 'Dix clés au maximum : supprime une ancienne clé.' using errcode = 'P0001';
  end if;
  v_token := 'suivi_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.sync_tokens (user_id, label, token_hash, hint)
  values (
    v_user,
    coalesce(nullif(left(btrim(p_label), 60), ''), 'Mac'),
    encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
    right(v_token, 4)
  );
  return v_token;
end;
$$;

-- Propriétaire d'une clé (interne : jamais exposée)
create or replace function public.sync_token_owner(p_token text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
begin
  update public.sync_tokens
     set last_used_at = now()
   where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
  returning user_id into v_user;
  if v_user is null then
    raise exception 'Clé de synchronisation inconnue ou supprimée.' using errcode = '28000';
  end if;
  return v_user;
end;
$$;

-- Lignes en attente du propriétaire de la clé (appelé par scripts/sync-tresorerie.mjs)
create or replace function public.sync_pending_lines(p_token text)
returns table (
  id uuid, day date, label text, amount_cents integer, category text, account text, task_title text
)
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := public.sync_token_owner(p_token);
begin
  return query
    select l.id, l.day, l.label, l.amount_cents, l.category, l.account, l.task_title
      from public.treso_lines l
     where l.user_id = v_user and l.status = 'pending'
     order by l.day, l.created_at
     limit 500;
end;
$$;

-- Marque une ligne comme envoyée, avec l'id de la transaction créée dans Trésorerie
create or replace function public.sync_mark_sent(p_token text, p_line_id uuid, p_tresorerie_id integer)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := public.sync_token_owner(p_token);
begin
  update public.treso_lines
     set status = 'sent', sent_at = now(), tresorerie_id = p_tresorerie_id
   where id = p_line_id and user_id = v_user and status = 'pending';
  return found;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_token_owner(text) from public, anon, authenticated;
revoke execute on function public.complete_task(uuid, date, boolean, integer, public.money_kind, text, text, text) from public, anon;
revoke execute on function public.uncomplete_task(uuid, date) from public, anon;
revoke execute on function public.create_sync_token(text) from public, anon;
grant execute on function public.complete_task(uuid, date, boolean, integer, public.money_kind, text, text, text) to authenticated;
grant execute on function public.uncomplete_task(uuid, date) to authenticated;
grant execute on function public.create_sync_token(text) to authenticated;
-- Le script du Mac n'a pas de session : il s'authentifie par sa clé
grant execute on function public.sync_pending_lines(text) to anon, authenticated;
grant execute on function public.sync_mark_sent(text, uuid, integer) to anon, authenticated;
