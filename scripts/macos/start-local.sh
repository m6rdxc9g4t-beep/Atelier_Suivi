#!/bin/bash
# =============================================================================
# atelier_Suivi en local sur ce Mac, en une commande :   npm run local
#
#   1. vérifie Node.js et Docker (Docker Desktop ou OrbStack, à lancer avant) ;
#   2. démarre la base Supabase locale (1re fois : téléchargement de quelques minutes),
#      ce qui applique les migrations de supabase/migrations/ ;
#   3. écrit .env.local, crée ton compte local et des tâches d'exemple ;
#   4. lance l'app sur http://127.0.0.1:3030 et l'ouvre dans le navigateur.
#
# Arrêter : Ctrl+C pour l'app, puis « npm run local:stop » pour la base (tes données sont gardées).
# Tout reste sur le Mac : rien n'est envoyé en ligne.
# =============================================================================
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

say() { printf "\n\033[1;36m▸ %s\033[0m\n" "$1"; }
fail() { printf "\n\033[1;31m✗ %s\033[0m\n" "$1" >&2; exit 1; }

say "Vérifications"
command -v node >/dev/null || fail "Node.js est introuvable. Installe-le (nodejs.org ou « brew install node ») puis relance."
node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 20 ? 0 : 1)' || fail "Node.js 20 ou plus récent est nécessaire (installé : $(node -v))."
command -v docker >/dev/null || fail "Docker est introuvable. Installe Docker Desktop (docker.com) ou OrbStack (orbstack.dev), lance-le, puis relance."
docker info >/dev/null 2>&1 || fail "Docker n'est pas démarré. Ouvre Docker Desktop (ou OrbStack), attends qu'il soit prêt, puis relance."
[ -d node_modules ] || { say "Installation des dépendances"; npm install --no-audit --no-fund; }

say "Base Supabase locale (la 1re fois, téléchargement de quelques minutes)"
npx -y supabase start

if [ -z "${SUIVI_EMAIL:-}" ] && [ ! -f .env.local.account ]; then
  say "Ton compte local"
  read -r -p "  Adresse e-mail : " SUIVI_EMAIL
  while :; do
    read -r -s -p "  Mot de passe (6 caractères minimum) : " SUIVI_PASSWORD; echo
    [ "${#SUIVI_PASSWORD}" -ge 6 ] && break
    echo "  Trop court, recommence."
  done
  export SUIVI_EMAIL SUIVI_PASSWORD
fi

say "Configuration de l'app"
node scripts/local-setup.mjs
# Le compte est créé une fois : on ne redemande plus l'e-mail aux lancements suivants
[ -n "${SUIVI_EMAIL:-}" ] && echo "$SUIVI_EMAIL" > .env.local.account

say "atelier_Suivi → http://127.0.0.1:3030   (Ctrl+C pour arrêter)"
echo "  Tableau de bord de la base : http://127.0.0.1:54423"
( sleep 6 && open "http://127.0.0.1:3030" >/dev/null 2>&1 || true ) &
npm run dev
