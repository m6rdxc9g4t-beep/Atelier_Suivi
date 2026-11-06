# App Mac « Atelier Suivi »

Fenêtre native (WebKit) qui ouvre Atelier Suivi, avec l'icône carrée de l'app (charte v2 « Linear » : dégradé
cyan #15aabf, glyphe Lucide `list-checks` blanc) dans le Dock, le Finder et Launchpad, comme les autres apps de la suite. La session (cookies) est gardée
par l'app, à part de Safari ; les exports CSV vont dans Téléchargements.

## Installer ou mettre à jour

Double-clic sur `Installer Atelier Suivi.command` (il faut les outils Apple : `xcode-select --install`).
Le script compile `AtelierSuivi.swift`, assemble l'app et l'installe dans `~/Desktop/Atelier/Apps`
(dossier du panneau Ateliers), ou dans `/Applications` si ce dossier n'existe pas.

## Adresse ouverte

`adresse.txt` (une ligne). Par défaut la version Vercel ; pour la version du VPS, mets
`https://suivi.<domaine>` dans `Atelier Suivi.app/Contents/Resources/adresse.txt` (l'installeur garde
ensuite cette adresse à chaque mise à jour).

## Icône

Source `docs/brand/icone-suivi.svg`, rendue par `node scripts/icones.mjs` en `mac/icon-1024.png` (carré de 824 px
centré dans 1024, grille de macOS), puis `AppIcon.icns` (Pillow : `Image.save("AppIcon.icns", sizes=[(16,16)…(1024,1024)])`,
commande complète en tête du script). Les icônes de l'app web (iPhone compris) sortent du même script.
