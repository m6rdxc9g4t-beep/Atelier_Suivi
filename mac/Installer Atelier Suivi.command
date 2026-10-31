#!/bin/bash
# Construit l'app Mac « Atelier Suivi » (fenêtre native WebKit, icône = logo complet) à partir de ce dossier
# et l'installe dans ~/Desktop/Atelier/Apps (là où le panneau Ateliers la cherche), sinon dans /Applications.
# L'adresse ouverte est celle de adresse.txt ; si l'app est déjà installée, son adresse actuelle est gardée.
# Même identifiant (fr.atelier-suivi.launcher) : le panneau Ateliers l'ouvre comme avant.
# Journal : installation.log (à côté de ce fichier, ignoré par git)

DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="$DIR/installation.log"
: >"$LOG"
exec > >(tee -a "$LOG") 2>&1

if [ -d "$HOME/Desktop/Atelier/Apps" ]; then DEST="$HOME/Desktop/Atelier/Apps"; else DEST="/Applications"; fi
APP="$DEST/Atelier Suivi.app"
TMP="$(mktemp -d)"
BUILD="$TMP/Atelier Suivi.app"
LSREG=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister

fail() { printf '\033[1;31m✘ %s\033[0m\n' "$1"; echo "RESULTAT: ECHEC $1"; exit 1; }

printf '\033[1;36m▶ Compilateur Swift\033[0m\n'
xcrun --find swiftc >/dev/null 2>&1 || fail "outils Apple absents (lance « xcode-select --install » puis relance ce fichier)"
xcrun swiftc --version 2>&1 | head -2

printf '\033[1;36m▶ Compilation\033[0m\n'
mkdir -p "$BUILD/Contents/MacOS" "$BUILD/Contents/Resources"
xcrun swiftc -O -parse-as-library -target "$(uname -m)-apple-macos12.0" \
  "$DIR/AtelierSuivi.swift" -o "$BUILD/Contents/MacOS/AtelierSuivi" || fail "compilation"

printf '\033[1;36m▶ Assemblage\033[0m\n'
cp "$DIR/Info.plist" "$BUILD/Contents/Info.plist" || fail "Info.plist"
cp "$DIR/AppIcon.icns" "$BUILD/Contents/Resources/" || fail "icône"
if [ -f "$APP/Contents/Resources/adresse.txt" ]; then
  cp "$APP/Contents/Resources/adresse.txt" "$BUILD/Contents/Resources/" || fail "adresse"
else
  cp "$DIR/adresse.txt" "$BUILD/Contents/Resources/" || fail "adresse"
fi
echo "Adresse : $(head -1 "$BUILD/Contents/Resources/adresse.txt")"
codesign --force --deep -s - "$BUILD" || fail "signature"

printf '\033[1;36m▶ Installation dans %s\033[0m\n' "$DEST"
pkill -f "Atelier Suivi.app/Contents/MacOS/" 2>/dev/null; sleep 1
rm -rf "$APP" && /usr/bin/ditto "$BUILD" "$APP" || fail "copie"
/usr/bin/xattr -cr "$APP" 2>/dev/null
touch "$APP"   # le Finder et le Dock relisent l'icône
"$LSREG" -f "$APP" >/dev/null 2>&1
rm -rf "$TMP"

open "$APP" || fail "ouverture"
printf '\033[1;32m✔ Atelier Suivi installé et ouvert\033[0m\n'
echo "RESULTAT: OK"
