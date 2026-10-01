# Lyrics Finder Mobile (Capacitor)

Application Android qui transforme ton Lyrics Finder web en APK native avec bouton d'écoute Shazam-like.

## Fonctionnalités

- 🔍 Recherche de paroles par artiste + titre
- 🎤 Écoute micro : enregistre 10 sec, transcrit avec Whisper, identifie la chanson et affiche les paroles
- 📱 Interface mobile optimisée
- 🚀 Prêt à être compilé en APK avec Capacitor
- 🏗️ Build automatique CI (GitHub Actions)

## Prérequis

- Node.js 18+
- Android Studio
- Java SDK 17+
- SDK Android 34

## Installation

```bash
cd mobile
npm install
```

## Générer le projet Android

```bash
npx cap add android
npx cap sync
```

## Ajouter le bouton flottant natif

Pour avoir un vrai bouton flottant au-dessus des autres applications (comme Shazam), suis le guide :

👉 [FLOATING_BUTTON_ANDROID.md](./FLOATING_BUTTON_ANDROID.md)

## Builder l'APK en local

```bash
npx cap open android
# Dans Android Studio : Build > Build Bundle(s) / APK(s) > Build APK(s)
```

Ou en ligne de commande :

```bash
cd android
./gradlew assembleDebug
```

L'APK debug se trouve dans :
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## Build automatique via GitHub Actions

Un workflow GitHub Actions build automatiquement l'APK à chaque push sur `main`.

**Lancer un build manuel :**
1. Ouvrir l'onglet **Actions** du repo
2. Sélectionner **Build Android APK**
3. Cliquer **Run workflow**
4. Télécharger l'APK dans les artifacts.

## Configuration de l'API

Par défaut, l'app utilise :
```
https://lyrics-api.hounmetinjeremy.workers.dev
```

Pour changer, modifie la variable `API_BASE` dans `www/js/app.js`.
