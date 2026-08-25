# LogiChain — Procédure de démarrage (soutenance)

> Comment lancer les trois briques du projet, dans l'ordre, avec les commandes
> exactes et ce qu'on doit voir à chaque étape.
> **Toutes les commandes de ce document ont été exécutées et vérifiées le 25/08/2026.**

---

## 1. Ce qu'on démarre, et pourquoi dans cet ordre

Le projet est composé de trois briques indépendantes qui se branchent l'une sur
l'autre :

```
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│  MongoDB         │◄───────│  API REST        │◄───────│  App mobile      │
│  (Docker)        │        │  Node/Express    │  HTTPS │  React Native    │
│  replica set rs0 │        │  port 3000       │  JSON  │  iOS simulateur  │
└──────────────────┘        └──────────────────┘        └──────────────────┘
      1er                          2e                          3e
```

L'ordre n'est pas décoratif :

- **Mongo d'abord** — l'API refuse de démarrer si elle ne peut pas se connecter
  à la base. Elle doit en plus être en *replica set* (`rs0`), sinon les
  transactions ACID et les Change Streams (notifications SSE) sont indisponibles.
- **L'API ensuite** — elle expose `/health`, `/docs` et `/api/v1/**`.
- **L'app mobile en dernier** — elle consomme l'API. Elle démarre quand même si
  l'API est éteinte (mode offline), mais on ne verra rien de la démo.

**Deux terminaux restent ouverts pendant toute la soutenance** : un pour l'API
(`npm run dev`), un pour Metro (le bundler React Native). Ne pas les fermer.

---

## 2. Prérequis — état vérifié sur cette machine

| Outil | Requis | Installé ici | Statut |
|---|---|---|---|
| Node.js | ≥ 22.11 (mobile) / ≥ 20 (API) | v24.16.0 | OK |
| npm | — | 11.13.0 | OK |
| Docker Desktop | pour Mongo | conteneur `logichain-mongo` healthy | OK |
| Xcode | pour iOS | 26.6 (build 17F113) | OK |
| Simulateurs iOS | iPhone 17 / 17 Pro / Air… | présents (iOS 26.4.1 et 26.5) | OK |
| CocoaPods | via Bundler | `vendor/bundle` déjà installé | OK |
| JDK + SDK Android | pour Android | **absents** | ⚠️ voir §7 |

> **À retenir pour le jury** : la démo se fait **sur iOS**. Android n'est pas
> installé sur cette machine — c'est un choix assumé, le code est cross-platform
> mais une seule plateforme a été outillée.

---

## 3. Le chemin rapide (5 commandes)

Si tout est déjà installé — c'est le cas de cette machine — voici la séquence
minimale. Chaque bloc = un terminal.

**Terminal 1 — base + API**

```bash
cd ~/Cours/projet_logichain/logichain-api
docker compose up -d mongo      # démarre Mongo, attend le PRIMARY
npm run seed                    # (re)charge le jeu de démo — optionnel
npm run dev                     # API sur http://localhost:3000
```

**Terminal 2 — application mobile**

```bash
cd ~/Cours/projet_logichain/logichain-front/LogiChainMobile
npm run ios                     # build + lance le simulateur + démarre Metro
```

C'est tout. Le reste du document explique chaque étape, ce qu'on doit voir, et
quoi faire quand ça coince.

---

## 4. Démarrage détaillé

### 4.1 — MongoDB (Docker)

```bash
cd ~/Cours/projet_logichain/logichain-api
docker compose up -d mongo
```

Le `docker-compose.yml` fait deux choses non triviales :

1. Il lance Mongo avec `--replSet rs0`. Un Mongo standalone ne supporte ni les
   transactions multi-documents ni les Change Streams — deux fonctionnalités
   dont l'API se sert (allocation en lot, notifications SSE).
2. Son *healthcheck* **initialise le replica set tout seul** au premier
   démarrage (`rs.initiate`), puis attend que le nœud soit PRIMARY. On n'a donc
   aucune commande `mongosh` à taper à la main.

Le port est publié sur `127.0.0.1:27017` uniquement — jamais exposé au réseau.

**Vérifier :**

```bash
docker ps --format '{{.Names}}\t{{.Status}}'
# → logichain-mongo   Up X minutes (healthy)
```

Attendre le `(healthy)`. Tant qu'il affiche `(health: starting)`, l'API
échouera à se connecter. Compter ~20 à 30 s au premier démarrage.

### 4.2 — Le fichier `.env` de l'API

Le fichier `.env` **existe déjà** sur cette machine, il n'y a rien à faire.
Pour information (ou pour rejouer le projet ailleurs) :

```bash
cp .env.example .env
```

Les variables sont validées au démarrage par Zod (`src/config/env.ts`) : si
l'une manque ou est invalide, l'API refuse de démarrer avec un message explicite
plutôt que de planter plus tard. Les deux à connaître :

| Variable | Rôle | Contrainte |
|---|---|---|
| `MONGO_URI` | connexion à la base | doit commencer par `mongodb` |
| `JWT_SECRET` | signature des tokens | **≥ 32 caractères** (`openssl rand -base64 64`) |

Le reste (`PORT`, `CORS_ORIGIN`, `BCRYPT_ROUNDS`, limites de rate-limiting…) a
des valeurs par défaut raisonnables.

### 4.3 — Le jeu de données de démo (seed)

```bash
npm run seed
```

⚠️ **Le seed vide les collections avant de les recréer** (`deleteMany` sur
users, events, items, routes). C'est voulu — on veut une démo reproductible —
mais ça veut dire qu'on le lance **avant** la soutenance, pas pendant.

Il recrée :

- **8 utilisateurs** (mot de passe commun `LogiChain2026!`)
- **1 événement** « Festival Vert 2026 », 5 zones géographiques (polygones
  GeoJSON réels, sur la Forêt de Montgeon au Havre)
- **~66 équipements** répartis sur tous les statuts, positionnés avec un
  décalage pseudo-aléatoire **déterministe** — deux exécutions du seed donnent
  exactement la même carte, ce qui est indispensable pour répéter la démo
- **3 feuilles de route** (camion terminé / camion électrique en cours / rail
  planifié)

Le script affiche un récapitulatif complet à la fin, comptes inclus.

### 4.4 — Lancer l'API

```bash
npm run dev
```

`tsx watch` recompile à chaud : on peut modifier un fichier TypeScript devant le
jury, l'API redémarre seule.

**Ce qu'on doit voir dans les logs :**

```
INFO: Mongo connecté
INFO: Notifications temps réel actives (Change Streams + SSE)
INFO: LogiChain API démarrée
    port: 3000
    env: "development"
INFO: Facteurs ADEME rafraîchis
```

La ligne *Change Streams + SSE* est la preuve que le replica set fonctionne. Si
elle manque, Mongo n'est pas en `rs0`.

**Vérifier depuis un autre terminal :**

```bash
curl -s http://localhost:3000/health
# → {"status":"ok","service":"logichain-api","timestamp":"..."}
```

Et tester une vraie authentification :

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"sofia@logichain.fr","password":"LogiChain2026!"}'
# → {"token":"eyJ...","refreshToken":"eyJ...", ...}
```

**La documentation interactive** (utile à montrer au jury) :

- <http://localhost:3000/docs> — interface Scalar, on peut jouer les endpoints
- <http://localhost:3000/openapi.json> — le contrat OpenAPI brut

En local ces deux URLs sont ouvertes ; en production elles sont protégées par
Basic Auth (`DOCS_USER` / `DOCS_PASSWORD`).

### 4.5 — Lancer l'application mobile

```bash
cd ~/Cours/projet_logichain/logichain-front/LogiChainMobile
npm run ios
```

Cette seule commande enchaîne quatre choses : elle démarre **Metro** (le
bundler JavaScript), compile le projet Xcode, boote le simulateur, installe
puis lance l'app.

**Durée** : ~8 minutes au premier build (compilation de tous les pods natifs —
VisionCamera, op-sqlite, react-native-maps…). Les builds suivants, tant qu'on ne
touche pas au natif, prennent quelques dizaines de secondes.

> **À faire la veille** : lancer un build complet une fois, pour que le cache
> Xcode (`DerivedData`) soit chaud. Le jour J, `npm run ios` repart en quelques
> secondes.

Pour choisir un appareil précis :

```bash
npx react-native run-ios --simulator "iPhone 17 Pro"
```

**Ce qu'on doit voir à la fin :**

```
info Installing ".../LogiChainMobile.app"
info Launching "org.reactjs.native.example.LogiChainMobile"
success Successfully launched the app
```

Puis, sur le simulateur : l'écran de connexion **LogiChain / Terrain**, avec les
champs Email et Mot de passe.

**Vérifier que Metro tourne :**

```bash
curl -s http://localhost:8081/status
# → packager-status:running
```

Si les deux terminaux sont déjà ouverts et que l'app est installée, on peut
relancer sans rebuilder : `npm start` (Metro seul) puis lancer l'app depuis le
simulateur.

---

## 5. API locale ou API de production ?

C'est le point à décider **avant** la soutenance.

Par défaut, l'app pointe sur la **production** — voir `src/config/env.ts` :

```ts
export const ENV = {
  API_BASE_URL: 'https://api-logichain.fulkia.fr/api/v1',
  ...
};
```

L'API de prod est en ligne et répond (vérifié) :

```bash
curl -s https://api-logichain.fulkia.fr/health
# → {"status":"ok","service":"logichain-api", ...}
```

| | API de production | API locale |
|---|---|---|
| **Réglage** | rien à faire, c'est le défaut | éditer `src/config/env.ts` |
| **Avantage** | zéro dépendance sur le poste, montre un vrai déploiement HTTPS + Traefik + Let's Encrypt | on maîtrise les données, on peut reseeder à volonté, on montre les logs de l'API en direct |
| **Risque** | dépend du wifi de la salle | rien, mais il faut penser à lancer Docker + l'API |

**Recommandation** : rester sur la **production** pour la démo (c'est plus
impressionnant, et ça prouve que le déploiement existe), mais garder Docker +
l'API locale lancés en secours. Si le wifi lâche, on bascule en une ligne.

Pour basculer en local :

```ts
// src/config/env.ts
API_BASE_URL: 'http://localhost:3000/api/v1',
```

Metro recharge tout seul (Fast Refresh). Pas besoin de rebuilder.

> **Détail technique qui peut être demandé** : appeler du `http://` en clair
> depuis iOS est normalement bloqué par App Transport Security. Le
> `Info.plist` du projet déclare `NSAllowsLocalNetworking = true`, ce qui
> autorise précisément `localhost` **sans** ouvrir la porte à tout le trafic non
> chiffré (`NSAllowsArbitraryLoads` reste à `false`). C'est l'exception
> minimale, pas la désactivation globale.

---

## 6. Comptes de démonstration

Mot de passe commun : **`LogiChain2026!`**

| Rôle | Email | À montrer |
|---|---|---|
| `admin` | `admin@logichain.fr` | accès complet |
| `logistics_manager` | `responsable@logichain.fr` | pilotage, allocation |
| `field_agent` | `sofia@logichain.fr` | **le compte de la démo terrain** |
| `field_agent` | `yanis@logichain.fr` | second agent (utile pour les conflits) |
| `field_agent` | `ines@logichain.fr` | |
| `transporter` | `transports-vert@logichain.fr` | vue transporteur |
| `transporter` | `ecofret@logichain.fr` | |
| `field_agent` | `nouvelle-recrue@logichain.fr` | **mot de passe temporaire** → force le passage par l'écran de changement de mot de passe |

Le dernier compte est isolé exprès : il sert à démontrer au jury le parcours
« l'admin vient de créer un compte », sans casser la fluidité des 7 autres qui
se connectent directement.

**QR codes à utiliser en démonstration**, vérifiés le 25/08/2026 :

| Code | Statut | Mode qui fonctionne |
|---|---|---|
| `LC-FENCE-007` | En transit | **Déploiement** (et Pointage) |
| `LC-FURN-003` | En transit | **Déploiement** (et Pointage) |
| `LC-FENCE-004` | Alloué | **Transit** (et Pointage) |
| `LC-FENCE-002` | Déployé | **Transit** (et Pointage) |

> Pour les scanner pour de vrai : `npm run qr` génère
> `soutenance/qr-codes.html`, une planche imprimable (ou scannable depuis
> l'écran) avec tous les codes étiquetés.

> ⚠️ **Ne pas utiliser `LC-SOUND-001`, `LC-SOUND-003`, `LC-STAGE-001`** ni les
> 12 autres équipements sans événement assigné : ils existent dans l'API mais
> **pas dans le cache de l'application**, et le scan affiche « QR inconnu ».
> La liste complète et la matrice statut × mode sont dans
> **`soutenance/scan-qr.md`** ; `npm run scan` la régénère depuis les vraies
> données.

---

## 7. Caméra : simulateur ou vrai téléphone ?

**Le simulateur iOS n'a pas de caméra.** L'écran Scan le détecte et affiche :

> *Caméra indisponible (permission refusée ou simulateur). Utilisez la saisie
> manuelle.*

Un champ de saisie manuelle est disponible en bas de l'écran : on y tape un code
(`LC-FENCE-007` en mode Déploiement) et on valide. **Tout le reste du parcours est identique** —
machine à états, écriture dans l'outbox SQLite, synchronisation, KPI. C'est
volontaire : la caméra est une source d'entrée parmi d'autres, pas le cœur du
système.

**Pour scanner un vrai QR code**, il faut l'iPhone physique. Le projet est
signé avec un **Apple ID gratuit** (team `N8U8DJ435V`, bundle id laissé au
défaut `org.reactjs.native.example.LogiChainMobile` — **ne pas le changer**, son
App ID est déjà enregistré et un nouveau consommerait un des 10 slots
disponibles par tranche de 7 jours).

```bash
npm start                                                   # terminal dédié
npx react-native run-ios --udid 00008150-00021CD23687801C   # iPhone 17 Pro de Clara
```

### ⚠️ Le rituel des 7 jours — à faire impérativement la veille

**Le certificat d'un Apple ID gratuit expire tous les 7 jours.** Passé ce délai,
l'app installée refuse de s'ouvrir. Il faut la réinstaller, puis **refaire
confiance au profil** :

1. `npm start` dans un terminal
2. `npx react-native run-ios --udid 00008150-00021CD23687801C`
3. Sur l'iPhone : *Réglages → Général → VPN et gestion de l'appareil* → faire
   confiance au profil développeur

Cette confiance tombe avec le certificat : elle est à redonner **à chaque
re-signature**, pas seulement la première fois.

> **Piège vérifié** : `run-ios` sort en **code 0 même quand le lancement a
> échoué** faute de confiance accordée. Ne pas se fier au code de retour —
> toujours lire la fin du log, et surtout : **ouvrir l'app sur le téléphone pour
> vérifier de ses yeux.**

> **Second piège** : sur appareil physique, le bundle JavaScript est **embarqué
> dans le `.app`** (le script React Native ne saute l'embarquement que pour le
> simulateur). Donc **toute modification JS exige un rebuild complet** — le
> Fast Refresh et le reload sont inopérants tant que le téléphone ne joint pas
> Metro. Ne rien modifier dans le code après le dernier build de la veille.

> **Conseil** : préparer les deux. Le simulateur comme base fiable (projeté au
> vidéoprojecteur, lisible par le jury) — là, Fast Refresh fonctionne et rien
> n'expire. Le téléphone pour le moment « et maintenant je scanne vraiment ».

### Et Android ?

**Non lançable en l'état sur cette machine** : ni JDK ni SDK Android installés
(`java -version` échoue, `ANDROID_HOME` est vide). Il faudrait installer Android
Studio + un JDK 17, puis `npm run android`. À ne pas tenter la veille de la
soutenance.

---

## 8. Déroulé de démo proposé

Une trame en 9 temps, qui suit les onglets de l’app.

1. **Connexion** — `sofia@logichain.fr`. Montrer que le token est stocké dans le
   Keychain iOS, pas dans du stockage en clair.
2. **Tableau de bord** — la liste des équipements du secteur, les badges de
   statut, le badge de connectivité en haut.
3. **Scan** — choisir le mode **Déploiement**, saisir `LC-FENCE-007`, valider.
   Le compteur « scannés » s'incrémente, le résultat s'affiche en vert.
   Enchaîner avec `LC-SOUND-001` pour montrer le rejet « QR inconnu » : il
   existe dans l'API mais pas dans le cache du secteur — la preuve que la
   résolution est locale. Voir `soutenance/scan-qr.md`.
4. **Le moment fort — le mode avion.** Activer le mode avion sur l'appareil, puis
   refaire deux ou trois scans. Le badge de connectivité passe hors-ligne, le
   compteur « en attente » monte : les actions partent dans une file locale
   SQLite (*outbox*), l'app reste pleinement utilisable.
5. **Synchro** — onglet *Synchro*. Montrer la file d'attente. Couper le mode
   avion, appuyer sur **Forcer la synchro** : la file se vide, les statuts
   remontent au serveur.
6. **Conflits** — la section *Conflits* du même écran. Expliquer le
   verrouillage optimiste : chaque action embarque la version (`baseVersion`) de
   l'objet ; si le serveur a une version plus récente, il répond **409** et
   l'action bascule en conflit, rejouable ou abandonnable à la main. C'est le
   point d'architecture le plus intéressant à défendre.
7. **Carte & fiche équipement** — la carte du secteur, les zones GeoJSON, la
   position des équipements. Ouvrir une fiche.
8. **Permissions** — onglet *Profil*, section *Permissions* : la liste des six
   gestes, cochés ou barrés selon le rôle. Se reconnecter en
   `transports-vert@logichain.fr` pour montrer le mode « Déploiement » verrouillé
   dans l'écran Scan, cadenas et raison affichée. Voir
   `soutenance/roles-et-permissions.md`.
9. **KPI** — l'empreinte carbone consolidée. Le chiffre à savoir défendre : le
   rail émet le plus (26,72 kg) malgré le facteur le plus faible, parce qu'il
   fait 680 km contre 19,5. En camion, ce trajet coûterait 386,51 kg — soit
   93 % d'économie. Détail complet : **`soutenance/kpi-empreinte-carbone.md`**.
   Puis basculer sur <http://localhost:3000/docs> pour montrer que ces chiffres
   viennent d'endpoints documentés et testables.

**Bonus si le temps le permet** : se connecter avec
`nouvelle-recrue@logichain.fr` pour montrer l'écran de changement de mot de passe
imposé — non contournable, car c'est la **seule route déclarée** dans cet état de
navigation (`RootNavigator.tsx`). Ni retour arrière, ni deep link ne permettent
de le sauter.

---

## 9. Les tests (à montrer, ça compte)

Les deux suites passent. Chiffres vérifiés le 25/08/2026.

**API :**

```bash
cd ~/Cours/projet_logichain/logichain-api
npm test
# → Test Suites: 8 passed, 8 total
#   Tests:       59 passed, 59 total
```

**Application mobile :**

```bash
cd ~/Cours/projet_logichain/logichain-front/LogiChainMobile
npm test
# → Test Suites: 27 passed, 27 total
#   Tests:       158 passed, 158 total
```

**La simulation des rôles** — la pièce à montrer, elle appelle une vraie API :

```bash
npm run parcours        # contre l'API locale
npm run parcours:prod   # contre la production
# → Tests: 24 passed, 24 total (les deux)
```

Elle se connecte avec les 4 comptes de démo, tente les 6 gestes de l'app et
vérifie que ce que l'app grise correspond exactement à ce que l'API refuse.
Détail complet : **`soutenance/roles-et-permissions.md`**.

Soit **217 tests au total**, en moins de 7 secondes cumulées. Les tests mobiles
portent sur la logique métier pure (`src/domain/`) et les services de
synchronisation (`src/services/sync/`) — machine à états, réconciliation,
backoff, outbox. C'est délibéré : cette logique est testable sans simulateur,
donc rapide et fiable en CI.

Autres commandes utiles :

```bash
npm run test:coverage   # API — rapport HTML dans coverage/
npm run typecheck       # API — TypeScript strict, sans émission
npm run lint            # les deux projets
```

---

## 10. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| L'API sort `Configuration invalide — vérifie ton .env` | variable manquante ou `JWT_SECRET` < 32 caractères | régénérer : `openssl rand -base64 64` |
| L'API ne se connecte pas à Mongo | conteneur pas encore `healthy` | `docker ps` puis attendre ; relancer `docker compose up -d mongo` |
| Pas de ligne « Change Streams + SSE » | Mongo n'est pas en replica set | `docker compose down` puis `up -d mongo` (le healthcheck réinitialise `rs0`) |
| `EADDRINUSE :3000` | une API tourne déjà | `lsof -ti:3000 \| xargs kill` |
| `EADDRINUSE :8081` | un Metro tourne déjà | `lsof -ti:8081 \| xargs kill` |
| L'app affiche un écran rouge « Could not connect to development server » | Metro éteint | `npm start` dans le dossier mobile |
| Écran blanc, ou modification JS non prise en compte | cache Metro corrompu | `npm start -- --reset-cache` |
| Le build iOS échoue après un `npm install` | pods désynchronisés | `cd ios && bundle exec pod install` |
| Le build iOS échoue sans raison claire | `DerivedData` corrompu | `rm -rf ios/build ~/Library/Developer/Xcode/DerivedData/LogiChainMobile-*` puis rebuild (~8 min) |
| Login refusé alors que le mot de passe est bon | rate-limiting anti brute-force (10 tentatives / 5 min) | attendre 5 minutes, ou relancer l'API en local |
| L'app ne voit aucune donnée | pointe sur la prod alors que la démo est locale (ou l'inverse) | vérifier `API_BASE_URL` dans `src/config/env.ts` |
| **Sur iPhone : l'app refuse de s'ouvrir** | certificat Apple ID gratuit expiré (7 jours) | rituel §7 : réinstaller + refaire confiance au profil |
| Sur iPhone : une modification JS n'apparaît pas | le bundle est embarqué dans le `.app` | rebuild complet — Fast Refresh ne marche pas sur device |

**Vérifier que les pods sont à jour :**

```bash
diff <(tail -5 ios/Podfile.lock) <(tail -5 ios/Pods/Manifest.lock) \
  && echo "Pods OK" || echo "Pods désynchronisés → bundle exec pod install"
```

---

## 11. Arrêt propre

```bash
# Terminal API et terminal Metro : Ctrl-C
docker compose down          # arrête Mongo, conserve les données (volumes)
docker compose down -v       # ⚠️ supprime aussi les données → il faudra reseeder
```

---

## 12. Checklist

### La veille

- [ ] `docker compose up -d mongo` → attendre `(healthy)`
- [ ] `npm run seed` dans `logichain-api` → données de démo fraîches
- [ ] `npm test` dans les deux projets → 8/8 et 27/27 suites vertes
- [ ] `npm run parcours` → 24/24, la matrice de rôles est alignée sur l'API
- [ ] `npm run scan` → 6/6, et relever les QR à scanner le jour J
- [ ] `npm run qr` → régénérer `soutenance/qr-codes.html`, puis l'ouvrir ou l'imprimer
- [ ] `npm run ios` → **build complet** pour chauffer le cache Xcode (~8 min)
- [ ] Vérifier `https://api-logichain.fulkia.fr/health` → prod en ligne
- [ ] Se connecter une fois dans l'app avec `sofia@logichain.fr` → OK
- [ ] Décider : démo sur la prod ou sur le local (§5)
- [ ] **Si téléphone physique : refaire le rituel des 7 jours (§7)** — réinstaller,
      redonner la confiance au profil, **et ouvrir l'app pour vérifier**
- [ ] Téléphone chargé, câble USB dans le sac
- [ ] **Après le dernier build sur téléphone : ne plus toucher au code JS**

### Le jour J, dans l'ordre

- [ ] Docker Desktop lancé
- [ ] Terminal 1 : `docker compose up -d mongo` → `(healthy)`
- [ ] Terminal 1 : `npm run dev` → « LogiChain API démarrée »
- [ ] `curl http://localhost:3000/health` → `{"status":"ok"}`
- [ ] Terminal 2 : `npm run ios` → écran de connexion visible
- [ ] Onglet navigateur ouvert sur `http://localhost:3000/docs`
- [ ] Mode Ne pas déranger activé sur le Mac
- [ ] Simulateur agrandi et lisible au vidéoprojecteur

---

## Annexe — mémo des commandes

| Où | Commande | Effet |
|---|---|---|
| `logichain-api` | `docker compose up -d mongo` | démarre Mongo (replica set auto) |
| `logichain-api` | `npm run seed` | recharge le jeu de démo (⚠️ efface tout) |
| `logichain-api` | `npm run dev` | API en rechargement à chaud, port 3000 |
| `logichain-api` | `npm test` | 59 tests |
| `logichain-api` | `npm run typecheck` | TypeScript strict |
| `LogiChainMobile` | `npm run ios` | build + simulateur + Metro |
| `LogiChainMobile` | `npm start` | Metro seul |
| `LogiChainMobile` | `npm start -- --reset-cache` | Metro, cache vidé |
| `LogiChainMobile` | `npm test` | 158 tests |
| `LogiChainMobile` | `npm run parcours` | simulation des 4 rôles (API locale) |
| `LogiChainMobile` | `npm run scan` | ce que produit chaque QR code, par mode |
| `LogiChainMobile` | `npm run qr` | génère la planche de QR codes imprimable |
| `LogiChainMobile` | `npm run parcours:prod` | simulation des 4 rôles (production) |
| `LogiChainMobile` | `cd ios && bundle exec pod install` | resynchronise les pods |
