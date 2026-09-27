# Lyrics Finder Mobile (Capacitor)

Application Android qui transforme ton Lyrics Finder web en APK native avec bouton d'écoute Shazam-like.

## Fonctionnalités

- 🔍 Recherche de paroles par artiste + titre
- 🎤 Écoute micro : enregistre 10 sec, transcrit avec Whisper, identifie la chanson et affiche les paroles
- 📱 Interface mobile optimisée
- 🚀 Prêt à être compilé en APK avec Capacitor

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

## Builder l'APK

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

## Configuration de l'API

Par défaut, l'app utilise :
```
https://lyrics-api.hounmetinjeremy.workers.dev
```

Pour changer, modifie la variable `API_BASE` dans `www/js/app.js`.
