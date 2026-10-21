-- =============================================================================
-- Profils pour les comptes qui existaient avant Suivi.
-- La base Supabase est partagée avec Atelier Cuisine (offre gratuite limitée à
-- deux projets) : les personnes déjà inscrites n'ont pas reçu de profil Suivi par
-- le déclencheur on_auth_user_created. Sans profil, getUserContext() renverrait
-- vers /connexion en boucle. Idempotent.
-- =============================================================================
insert into public.profiles (id, display_name)
select u.id, coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;
