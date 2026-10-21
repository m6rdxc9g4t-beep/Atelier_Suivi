#!/bin/bash
# =============================================================================
# Installe l'envoi automatique atelier_Suivi → atelier_Trésorerie sur ce Mac.
#
# Usage (depuis le dossier du projet atelier_Suivi) :
#   SUIVI_SUPABASE_URL="https://xxx.supabase.co" SUIVI_SUPABASE_KEY="sb_publishable_…" \
#   SUIVI_SYNC_TOKEN="suivi_…" bash scripts/macos/install-sync.sh
#   (commande toute prête dans Suivi → Paramètres → Synchronisation)
#
#   bash scripts/macos/install-sync.sh --uninstall     # tout retirer
#
# Ce que fait le script :
#   - écrit la configuration dans ~/.config/atelier-suivi/sync.env (lisible par toi seul) ;
#   - crée un agent launchd qui lance scripts/sync-tresorerie.mjs au démarrage de la session
#     puis toutes les 15 minutes (Trésorerie arrêtée : il attend le passage suivant) ;
#   - journal : ~/Library/Logs/Atelier_Suivi/sync.log
# =============================================================================
set -euo pipefail

LABEL="fr.atelier.suivi.sync"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
CONFIG_DIR="$HOME/.config/atelier-suivi"
CONFIG="$CONFIG_DIR/sync.env"
LOG_DIR="$HOME/Library/Logs/Atelier_Suivi"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$PROJECT_DIR/scripts/sync-tresorerie.mjs"
INTERVAL="${SUIVI_SYNC_INTERVAL:-900}"

unload() {
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || launchctl unload "$PLIST" 2>/dev/null || true
}

if [[ "${1:-}" == "--uninstall" ]]; then
  unload
  rm -f "$PLIST"
  echo "Envoi automatique retiré. (Configuration conservée : $CONFIG — supprime-la si tu n'en veux plus.)"
  exit 0
fi

if [[ "$(uname)" != "Darwin" ]]; then
  echo "Ce script installe un agent launchd : il est prévu pour macOS." >&2
  exit 1
fi

NODE="$(command -v node || true)"
if [[ -z "$NODE" ]]; then
  echo "Node.js est introuvable. Installe-le (nodejs.org ou « brew install node ») puis relance." >&2
  exit 1
fi
if ! "$NODE" -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 20 ? 0 : 1)'; then
  echo "Node.js 20 ou plus récent est nécessaire (installé : $("$NODE" -v))." >&2
  exit 1
fi

mkdir -p "$CONFIG_DIR" "$LOG_DIR" "$HOME/Library/LaunchAgents"

if [[ -n "${SUIVI_SYNC_TOKEN:-}" ]]; then
  : "${SUIVI_SUPABASE_URL:?SUIVI_SUPABASE_URL manquante}"
  : "${SUIVI_SUPABASE_KEY:?SUIVI_SUPABASE_KEY manquante}"
  umask 077
  cat > "$CONFIG" <<EOF
# atelier_Suivi → atelier_Trésorerie (créé par install-sync.sh)
SUIVI_SUPABASE_URL="$SUIVI_SUPABASE_URL"
SUIVI_SUPABASE_KEY="$SUIVI_SUPABASE_KEY"
SUIVI_SYNC_TOKEN="$SUIVI_SYNC_TOKEN"
TRESORERIE_URL="${TRESORERIE_URL:-http://127.0.0.1:5050}"
TRESORERIE_DEFAULT_ACCOUNT="${TRESORERIE_DEFAULT_ACCOUNT:-}"
EOF
  chmod 600 "$CONFIG"
  echo "Configuration écrite : $CONFIG"
elif [[ ! -f "$CONFIG" ]]; then
  echo "Aucune configuration : crée une clé dans Suivi → Paramètres et utilise la commande proposée." >&2
  exit 1
fi

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>$SCRIPT</string>
  </array>
  <key>WorkingDirectory</key><string>$PROJECT_DIR</string>
  <key>RunAtLoad</key><true/>
  <key>StartInterval</key><integer>$INTERVAL</integer>
  <key>StandardOutPath</key><string>$LOG_DIR/sync.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/sync.log</string>
</dict>
</plist>
EOF

unload
launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>/dev/null || launchctl load "$PLIST"

echo "Premier passage :"
"$NODE" "$SCRIPT" || true
echo
echo "Installé. Envoi automatique toutes les $((INTERVAL / 60)) minutes."
echo "Journal : $LOG_DIR/sync.log · Envoi immédiat : npm run sync:tresorerie"
