# App Mac « Atelier Suivi »

Fenêtre native (WebKit) qui ouvre atelier_Suivi, avec le logo complet `public/brand/logo-atelier-suivi.png`
comme icône (Dock, Finder, Launchpad), comme les autres apps de la suite. La session (cookies) est gardée
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

Le logo complet, sans fond, centré dans 1024 px (950 px de côté), puis `AppIcon.icns`
(Pillow : `Image.save("AppIcon.icns", sizes=[(16,16)…(1024,1024)])`).
L'iPhone garde la petite icône « onde » (`public/icons/apple-icon-iphone.png`).
