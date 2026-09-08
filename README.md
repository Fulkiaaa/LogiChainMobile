# LogiChainMobile

> Application mobile terrain de la plateforme logistique événementielle
> **LogiChain** (React Native pur — sans Expo, offline-first).
> Projet noté — Module MP3.

## Prérequis

- Node.js ≥ 22.11.0 (`engines.node` dans `package.json` — l'adaptateur de
  test `node:sqlite` l'exige)
- npm (fourni avec Node)
- Pour iOS : Xcode + CocoaPods (`bundle install` puis `bundle exec pod
  install`)
- Pour Android : Android Studio + un SDK/émulateur configuré
- `git`, et [`gh`](https://cli.github.com/) authentifié pour les commandes
  de passation (`CONTRIBUTING.md`, § 8)
- Suivre au préalable le guide officiel
  [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment)

## Installation locale

```bash
npm install

# iOS uniquement, à la première installation ou après mise à jour des
# dépendances natives :
bundle install
bundle exec pod install

npm start        # démarre Metro (bundler JS)
npm run ios       # ou : npm run android
```

## Variables d'environnement

L'application elle-même ne lit pas de fichier `.env` au runtime : la cible
API est un simple basculement de constante dans `src/config/env.ts`
(`ENV.API_BASE_URL`, entre `API_ENDPOINTS.LOCAL` et `API_ENDPOINTS.PROD`).

Les scripts de test et d'outillage (suite `parcours`, génération de QR) lisent
en revanche ces variables d'environnement :

| Variable            | Obligatoire | Défaut                              | Description                                              |
|----------------------|:-----------:|--------------------------------------|-------------------------------------------------------------|
| `LOGICHAIN_API`       | non         | `http://localhost:3000/api/v1`       | URL de base de l'API LogiChain ciblée par les tests/scripts |
| `LOGICHAIN_EMAIL`     | non         | `sofia@logichain.fr`                 | Compte utilisé par les scripts de démo/test d'intégration   |
| `LOGICHAIN_PASSWORD`  | non         | `LogiChain2026!`                     | Mot de passe associé à `LOGICHAIN_EMAIL`                    |

> Ne jamais committer de véritable identifiant de production dans ces
> variables — ce dépôt est **public**. Les valeurs par défaut ci-dessus sont
> celles du jeu de données de démonstration.

## Commandes utiles

| Commande                | Effet                                                        |
|--------------------------|----------------------------------------------------------------|
| `npm start`               | Démarre Metro (bundler JS)                                     |
| `npm run android`         | Build + lance l'app sur émulateur/téléphone Android            |
| `npm run ios`             | Build + lance l'app sur simulateur/téléphone iOS                |
| `npm run lint`            | ESLint                                                          |
| `npm test`                | Tests unitaires Jest                                            |
| `npm run parcours`        | Tests d'intégration (`LOGICHAIN_API` doit être joignable)       |
| `npm run scan`            | Sous-ensemble d'intégration ciblé sur le scan QR                |
| `npm run qr`              | Génère des QR codes de démonstration                            |

## Contribution & passation

Ce dépôt suit un modèle Gitflow (`main` ← `develop` ← `feature/*`), avec des
règles de protection GitHub actives sur `main` et `develop` (checks CI
obligatoires, historique linéaire sur `main`, pas d'acteur de contournement).

Voir [`CONTRIBUTING.md`](./CONTRIBUTING.md) pour : le détail du modèle de
branches, la convention de commit (Conventional Commits), le cycle de vie
d'une Pull Request, la checklist de revue, et la **procédure de passation**
à une future équipe (notamment le passage de la revue obligatoire de 0 à 1
approbation).

Pour l'exploitation et le déploiement de l'infrastructure (VM, Ansible,
sauvegardes, procédures d'incident), voir le
[`RUNBOOK.md`](https://github.com/Fulkiaaa/logichain-infra/blob/main/RUNBOOK.md)
du dépôt `logichain-infra` — déjà écrit et testé (924 lignes, 10 sections).
Le lien ci-dessus pointe vers `main` : il deviendra valide après la fusion
de la branche `develop` de l'infra, aujourd'hui à jour du Runbook.

---

## Documentation React Native (gabarit d'origine)

This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Intégration continue

Le workflow `.github/workflows/ci.yml` exécute `npm run lint` et `npm test` (tests unitaires
`jest`) sur les push et pull requests visant `develop` et `main`.

Deux suites sont volontairement exclues de cette CI :

- **`npm run parcours`** (`jest.integration.config.js`) : exige un jeu de données seedé (un
  compte utilisateur existant) que le playbook Ansible de `logichain-infra` ne pose pas. La
  faire tourner sur une machine fraîchement provisionnée produirait un échec sans valeur.
  Elle n'est donc jouée par aucun pipeline, ni cette CI applicative ni la CD de l'infra, et se
  lance à la main contre une API déjà peuplée. Ce que le déploiement continu de l'infra vérifie
  à sa place, ce sont trois tests de fumée bout-en-bout contre l'API que le playbook vient
  d'installer — dont un `POST /auth/login` qui renvoie 401 au format d'erreur métier, preuve
  que MongoDB est réellement interrogé et pas seulement que Node répond.
- **Le build Android** : long, et dépendant de secrets de signature qui n'ont pas leur place
  dans une CI de qualité de code — hors périmètre du sujet académique.

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
