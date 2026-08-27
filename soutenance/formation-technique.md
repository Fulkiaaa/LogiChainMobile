# LogiChain Mobile — fiche technique et préparation à la soutenance

> À quoi sert ce document : comprendre **d'où sort chaque fonctionnalité**, savoir
> répondre « je fais appel à quoi ? » pour n'importe quelle brique, et arriver
> devant le jury en ayant déjà entendu ses questions.
>
> Il se lit dans l'ordre, mais la partie 8 (les questions du jury) se révise seule.

**Sommaire**

| | |
|---|---|
| §1 | Ce que fait l'application, en une page |
| §2 | La stack : chaque dépendance et pourquoi elle est là |
| §3 | L'architecture en couches — la règle du sujet |
| §4 | Trois traversées complètes, de l'écran à la base |
| §5 | Les mécanismes qui font la valeur du projet |
| §6 | Fonctionnalité par fonctionnalité : où ça vit |
| §7 | La carte en détail |
| §7bis | Les KPI carbone en détail |
| §7ter | Les deux mises en situation de la démonstration |
| §8 | **Les questions du jury, avec les réponses** |
| §9 | Les faiblesses assumées — **dont deux devenues fausses dans le PPT** |
| — | Glossaire des sigles |

---

## 1. Ce que fait l'application, en une page

LogiChain suit le **matériel événementiel** (structures scéniques, son, lumière,
tentes, clôtures, groupes électrogènes) sur des sites de festival. L'application
mobile est l'outil des **agents de terrain** : ils scannent des QR codes, déclarent
des déploiements, signalent des anomalies géolocalisées — souvent **sans réseau**,
parce qu'un site de festival est plein de zones blanches.

Le projet compte quatre briques :

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  MongoDB         │◄────│  API REST        │◄────│  App mobile      │
│  replica set rs0 │     │  Node / Express  │ JSON│  React Native    │
│                  │     │  port 3000       │ SSE │  iOS             │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

**La phrase à retenir :** l'application n'est pas une vitrine qui affiche l'API.
C'est un **client autonome** qui possède sa propre base de données, prend des
décisions seule, et se réconcilie avec le serveur quand elle le peut.

### La continuité avec le MP3 — le fil conducteur de la soutenance

C'est la **deuxième moitié** du projet. En MP3 tu as présenté l'API REST ; ici tu
présentes l'application qui la consomme. Le jury s'attend à ce que les deux se
répondent, et plusieurs slides sont construites en miroir de celles du MP3.

Les quatre ponts explicites entre les deux soutenances :

| Notion du MP3 | Où elle atterrit dans le mobile |
|---|---|
| Verrouillage optimiste, le `__v` | La colonne `baseVersion` d'une table SQLite sur le téléphone |
| Machine à états de `ItemEntity` | `ALLOWED_TRANSITIONS`, rejouée côté client |
| `requireRole` et les 4 rôles | `domain/capabilities.ts`, miroir vérifié par sonde |
| Flux SSE alimenté par les Change Streams MongoDB | `useNotificationsSSE`, le consommateur |

**« L'API n'a-t-elle vraiment pas bougé ? »** — une seule modification, tardive et
documentée : `GET /auth/me` renvoyait le contenu du jeton, il renvoie désormais le
**profil complet**, pour afficher le nom de l'agent. Le contrat OpenAPI l'annonçait
déjà. Sache la citer : prétendre « zéro modification » et se faire contredire coûte
plus cher que d'annoncer l'exception.

**Cinq onglets :** Tableau de bord · Synchro · Scan · KPI · Profil.
**Trois écrans hors onglets**, empilés par-dessus : Fiche équipement, Carte, Tournées.

---

## 2. La stack : chaque dépendance et pourquoi elle est là

Question type du jury : « pourquoi cette librairie et pas une autre ? ». Chaque
ligne ci-dessous doit pouvoir être justifiée en une phrase.

| Besoin | Choix | Pourquoi celui-là |
|---|---|---|
| Framework | **React Native 0.86**, CLI communautaire | Imposé par le sujet. **Pas Expo** : le scan intensif et le SQLite embarqué demandent des modules natifs qu'Expo Go ne fournit pas |
| Langage | **TypeScript** strict | Le sujet exige un « typage fort de bout en bout » : les types du front sont le miroir des DTO de l'API |
| Base locale | **`@op-engineering/op-sqlite`** | SQLite embarqué, **API synchrone grâce à JSI** — pas de pont asynchrone, donc un `SELECT` répond dans la même frame et le bip part immédiatement. Avec une base asynchrone, l'agent sentirait le délai |
| Navigation | **React Navigation 7** (`native-stack` + `bottom-tabs`) | Le standard de fait. `native-stack` utilise les transitions natives iOS, pas une réimplémentation JS |
| État serveur | **TanStack Query 5** | Cache, revalidation, états `isLoading`/`isError` sans les écrire à la main. Utilisé **uniquement** pour ce qui vient du réseau |
| Caméra | **`react-native-vision-camera` 4.7** | Le seul à offrir un `useCodeScanner` natif performant, adapté au scan en rafale |
| Géolocalisation | **`react-native-geolocation-service`** | Contrôle fin de la précision et du timeout ; le module RN d'origine est déprécié |
| Cartographie | **`react-native-maps` 1.29** | Bibliothèque de référence ; en `PROVIDER_DEFAULT` elle utilise **Apple MapKit** sur iOS — pas de clé d'API à gérer |
| Secrets | **`react-native-keychain`** | Les JWT vont dans le **Trousseau iOS**, chiffré par le système. Jamais dans AsyncStorage, qui est en clair |
| Temps réel | **`react-native-sse`** | SSE plutôt que WebSocket : le besoin est **unidirectionnel** (le serveur pousse des alertes). Plus simple, reconnexion automatique, passe les proxys |
| Réseau | **`@react-native-community/netinfo`** | Détecte les transitions en ligne / hors ligne, qui déclenchent la synchro |
| Validation | **Zod 4** | Valide les entrées **avant** de les empiler dans la file : une donnée invalide ne doit jamais atteindre la file d'attente |
| Icônes | **`lucide-react-native`** | Monoline, cohérent, `strokeWidth` réglable — le logo de l'app est dessiné sur la même grille |
| Retour terrain | **`react-native-haptic-feedback`** + **`react-native-sound`** | Le sujet demande un retour « sans regarder l'écran » pendant le scan |
| SVG | **`react-native-svg`** | Rend le logo et la barre de répartition carbone |

### Le coût du choix « React Native pur », à raconter comme une histoire

C'est la meilleure anecdote d'ingénieure du dossier, et le jury aime les décisions
documentées **avec leur coût** :

1. **Contrainte posée au premier jour :** bare workflow, pas d'Expo — parce que le
   projet a besoin d'accès natifs pointus (caméra en scanner continu, trousseau,
   SQLite en JSI) et qu'on veut garder la main sur le projet Xcode.
2. **Le problème surgit des semaines plus tard :** la génération actuelle de
   `react-native-vector-icons` déclare `@expo/config-plugins` en dépendance de
   pair. Inutilisable ici.
3. **La solution s'avère meilleure :** bascule sur **Lucide + react-native-svg**.
   Les icônes SVG **héritent de la couleur**, donc elles suivent le thème
   clair/sombre sans une ligne de code supplémentaire.

**La morale à énoncer :** une contrainte d'architecture posée tôt ferme des portes
plus tard. Le travail n'est pas d'éviter ça, c'est de savoir quelle porte on ferme
et de vérifier qu'il existe une autre issue.

> Si on demande « Expo aurait marché ? » — oui, probablement, avec un *development
> build*. Mais le sujet impose React Native et sur un scan caméra en continu, c'est
> dans le projet natif que se jouent les performances.

---

## 3. L'architecture en couches — la règle du sujet

Le sujet interdit explicitement le « vibe coding » et le code spaghetti. La règle
appliquée est une **séparation stricte en quatre couches**, et le sens des flèches
ne s'inverse jamais :

```
   screens/          ← rendu + capture des événements. AUCUN fetch, AUCUN SQL.
       │
       ▼
   hooks/            ← état React, cycle de vie, abonnements
       │
       ▼
   services/         ← accès aux données : API REST et SQLite
       │
       ▼
   domain/           ← logique métier PURE. Ni React, ni réseau, ni base.
```

### Ce que contient chaque couche

**`screens/`** — dix écrans. Ils lisent des hooks, affichent, et appellent des
fonctions. Un écran ne sait pas si une donnée vient du réseau ou du cache.

**`components/`** — les briques réutilisables : `StatusTile`, `StatusBadge`,
`FilterSheet`, `ReportSheet`, `ModeSelector`, `ConnectivityBadge`, `BrandMark`.

**`hooks/`** — le pont entre React et les services. `useAuth`, `useItems`,
`useSync`, `useScanner`, `useConnectivity`, `useTheme`, `useNotificationsSSE`.

**`services/`** — cinq familles :
- `api/` — le client HTTP, les endpoints, le magasin de jetons
- `db/` — les migrations et un *repository* par table
- `sync/` — le moteur de synchronisation et la file d'attente
- `geo/`, `scan/` — les accès matériels
- `store/` — le bus de changements

**`domain/`** — **c'est ici que se trouve la valeur du projet.** Vingt-trois
modules de logique pure : machine à états, réconciliation, filtres, calcul de
contraste, géométrie de carte, répartition carbone… Aucun n'importe React ni
SQLite, donc **tous se testent sans monter d'application ni de base**.

> **À dire au jury :** « J'ai sorti la logique métier des composants pour qu'elle
> soit testable sans simulateur. C'est pour ça que 633 tests tournent en une
> seconde. »

---

## 4. Trois traversées complètes, de l'écran à la base

C'est le format de question le plus fréquent : « que se passe-t-il quand… ».
Apprends ces trois-là, elles couvrent presque tout.

### 4.1 — Un scan en zone blanche

```
ScanScreen                        l'agent vise un QR code
   │
   ▼ useCodeScanner (VisionCamera) lit le code → chaîne
   │
   ▼ useScanner(mode)             ← C'EST ICI QUE TOUT S'ORCHESTRE
   │
   ├─① createScanDeduper          anti-doublon, fenêtre de 1,5 s
   │                                (services/scan/ScanService.ts)
   ├─② itemsRepo.findByQrCode()   résolution LOCALE, index SQLite, zéro réseau
   │                                restreinte au secteur assigné
   ├─③ getCurrentPosition()       GPS — fonctionne sans réseau
   │
   ├─④ outboxService.enqueueScan()
   │      ├── scanAction.ts       quel geste pour ce mode ? (domaine pur)
   │      ├── itemStateMachine.ts la transition est-elle permise ?
   │      ├── itemsRepo.update()  OPTIMISTIC UI : le statut change tout de suite
   │      └── outboxRepo.enqueue() l'action est empilée dans la file
   │
   └─⑤ feedbackSuccess()          vibration + son : validé sans regarder l'écran
   │
   ▼ changeBus.emit('items')
tous les écrans ouverts se rafraîchissent
```

**Trois refus possibles, chacun avec son retour haptique distinct :** QR inconnu
du secteur, GPS indisponible, ou transition interdite par la machine à états.
Dans les trois cas, `feedbackReject()` et une ligne rouge dans les derniers
résultats — l'agent sait immédiatement, sans lire l'écran.

**Les points à souligner :** la résolution du QR est **locale** (index SQLite sur
`qrCode`), donc instantanée et fonctionnelle hors réseau. L'interface est mise à
jour **avant** toute confirmation serveur — c'est l'*optimistic UI* exigé par le
sujet. L'action part dans la file, pas sur le réseau.

### 4.2 — Le retour du réseau

```
NetInfo détecte la connexion
   │
   ▼ useSync + domain/autoSync.ts
shouldAutoSync({online, freshCount, syncing})   ← décision pure, testée
   │
   ▼ SyncEngine.flush()
pour chaque ligne `pending` de l'outbox :
   │
   ├── sendAction(row)              POST /items/:id/scan|transit|deploy…
   ├── decideReconcile(réponse)     ← domaine pur
   │      2xx                       → success  : on applique la réponse serveur, on retire la ligne
   │      409                       → conflict : verrouillage optimiste, VERSION dépassée
   │      422 invalid_transition    → conflict : le serveur refuse la transition
   │      autre                     → retry    : on réessaiera
   │
   └── si retry et tentatives > 5   → ROLLBACK visuel puis abandon
```

**Le verrouillage optimiste :** chaque équipement porte un champ `version`.
L'application envoie la version sur laquelle elle a travaillé. Si le serveur a une
version plus récente — un autre agent est passé avant — il répond **409**. On ne
tranche pas à la place de l'utilisateur : la ligne passe en `conflict` et
apparaît dans le Centre de synchronisation, où il choisit **Rejouer** ou
**Abandonner**.

**Pourquoi l'ordre FIFO n'est pas cosmétique :** une transition dépend de la
précédente. « Chargement » doit être rejoué **avant** « Déploiement », sinon le
serveur refuse une transition pourtant parfaitement légitime. C'est pour ça que
`listPending()` trie par `createdAt`.

**Où la version est-elle capturée ?** Au moment où l'action entre dans la file,
pas au moment de l'envoi. `buildOutboxRow({ baseVersion: item.version })` fige la
version sur laquelle l'agent a réellement travaillé — c'est le cœur du
verrouillage optimiste. Une ligne posée hier part avec la version d'hier, et le
serveur peut donc détecter que quelqu'un est passé entre-temps.

**Le rollback :** si une action échoue définitivement, l'interface ne doit pas
continuer d'afficher un état que le serveur n'a jamais accepté. Pour pouvoir
annuler, la ligne d'outbox **mémorise l'état d'avant** (`previousStatus`) au
moment de l'empilement — sans cette précaution, on saurait qu'il faut annuler
mais pas vers quoi revenir. `rollbackRow()` restaure cet état avant de retirer la
ligne.

> **Question probable :** « pourquoi stocker `previousStatus` alors que le serveur
> connaît la vérité ? » Parce qu'en cas d'échec définitif, il n'y a justement
> **pas** de réponse serveur exploitable — l'action n'est jamais passée. La seule
> source pour revenir en arrière est locale.

### 4.3 — L'ouverture de la carte

Détaillée en §7.

---

## 5. Les mécanismes qui font la valeur du projet

### 5.1 — L'offline-first, et pourquoi ce n'est pas juste « un cache »

Deux réservoirs de nature différente, décrits dans `data/cacheManifest.ts` :

| | Miroir du secteur | File d'attente (outbox) |
|---|---|---|
| Contenu | équipements, événements, zones, tournées | actions non encore parties |
| Sens | serveur → terminal | terminal → serveur |
| Durée | **persistant**, jamais purgé | **éphémère**, vidé après envoi réussi |
| Écriture | `upsert` à la synchro | `enqueue` à chaque geste |

Le manifeste est **déclaratif** : il liste les champs mis en cache et ceux qu'on
laisse tomber (`history`, `purchasePriceEur`, `manufacturingCo2Kg`). On ne
recopie pas l'API en entier sur le terminal — seulement ce dont l'interface a
besoin hors réseau.

> **L'argument à faire passer :** quand la stratégie de cache est éparpillée dans
> dix fichiers, personne ne sait plus ce qui survit à une déconnexion. Là, il y a
> **un fichier à lire**.

**Les trois index, et pourquoi :**

```sql
CREATE INDEX idx_items_qrCode  ON items(qrCode);   -- le scan tape ici : ~1 ms
CREATE INDEX idx_items_status  ON items(status);   -- les six tuiles du tableau de bord
CREATE INDEX idx_items_eventId ON items(eventId);  -- le filtrage par secteur
```

Sans l'index sur `qrCode`, chaque code lu déclencherait un balayage complet de la
table : la promesse du scan en rafale ne tiendrait pas.

**Les migrations sont idempotentes** (`IF NOT EXISTS`) et rejouées à chaque
ouverture. Une application terrain ne peut pas se permettre un échec de migration
à 6 h du matin sur un parking.

**L'atomicité du geste :** un scan écrit **deux choses dans une même transaction**
— le nouveau statut local et la ligne d'outbox. Les deux ensemble, ou aucune des
deux. Si le statut changeait sans que la ligne soit écrite, l'agent verrait
« déployé » à l'écran et le serveur ne l'apprendrait jamais. C'est le pire cas
possible sur le terrain : **une donnée perdue qui a l'air enregistrée.**

### 5.2 — Le `changeBus`, et pourquoi il existe

**C'est LE point technique subtil du projet.** SQLite via op-sqlite est
**synchrone** et vit **hors de React**. Écrire dans la base ne provoque donc
**aucun rendu** : une fiche laissée ouverte afficherait indéfiniment l'état
d'avant le scan.

`services/store/changeBus.ts` est un émetteur minimal : après chaque écriture,
le repository émet `items` ou `outbox`, et les écrans abonnés relisent le cache.

> **Question piège possible :** « pourquoi ne pas utiliser Redux ou Zustand ? »
> Réponse : la source de vérité locale est **SQLite**, pas un magasin en mémoire.
> Dupliquer l'état dans un store créerait deux vérités à garder synchronisées.
> Le bus signale simplement « relis la base ».

### 5.3 — Le miroir des permissions

`domain/capabilities.ts` reproduit côté client les `requireRole()` de l'API. Un
geste interdit à un rôle n'est pas proposé — il n'échouera donc pas en 403.

Détail d'accessibilité assumé, dans `ModeSelector` : un mode verrouillé reste
**focusable**. Un `Pressable` désactivé est ignoré par VoiceOver, et l'utilisateur
ne saurait même pas que le mode existe. C'est le handler qui refuse, pas le
composant qui disparaît.

### 5.4 — Le temps réel, sans vider la batterie

L'application s'abonne au flux **SSE** que l'API expose déjà — celui alimenté par
les *Change Streams* MongoDB, présenté en MP3, avec une latence mesurée d'environ
**7 ms** entre l'action terrain et la réception.

```
GET /notifications/stream     jeton passé en paramètre, l'API l'accepte pour ce flux
```

**Le flux est fermé dès que l'application passe en arrière-plan.** Une connexion
ouverte en permanence sur une journée de montage, c'est de la batterie pour rien.

Une anomalie déclarée par un agent apparaît chez les autres **sans qu'aucun ne
rafraîchisse quoi que ce soit**. Il n'y a de *polling* nulle part dans
l'application : elle réagit à des événements (retour du réseau, alerte poussée,
geste de l'agent) au lieu d'interroger en boucle.

### 5.5 — L'authentification

- Les JWT vont dans le **Trousseau iOS** (`react-native-keychain`), chiffré.
- `services/api/client.ts` intercepte les **401** : il rejoue la requête une fois
  avec un jeton rafraîchi, de façon transparente.
- Trois états de session : `anon`, `must_change_password`, `authed`.
  `RootNavigator` ne **déclare** que les routes de l'état courant — l'écran de
  changement de mot de passe n'est donc pas contournable, ni par un retour
  arrière ni par une navigation profonde.

---

## 6. Fonctionnalité par fonctionnalité : où ça vit

| Fonctionnalité | Écran | Hook | Service | Domaine |
|---|---|---|---|---|
| Connexion | `LoginScreen` | `useAuth` | `auth.api`, `tokenStore` | `session`, `passwordChange` |
| Tableau de bord | `DashboardScreen` | `useItems`, `useSync`, `useNotificationsSSE` | `items.repo` | `itemFilter`, `alert` |
| Scan | `ScanScreen` | `useScanner` (orchestre), `useScanMode` | `ScanService` (anti-doublon), `feedback`, `location`, `OutboxService` | `scanAction`, `itemStateMachine` |
| Fiche équipement | `ItemDetailScreen` | — (TanStack Query) | `items.api`, `items.repo` | `itemDetail`, `itemHistory` |
| Signalement | `ReportSheet` | — | `OutboxService`, `location` | `anomaly` |
| Carte | `MapScreen` | `useItems` | `zones.repo`, `routes.repo` | `mapGeometry`, `mapFraming` |
| Tournées | `RoutesScreen` | — | `routes.repo` | `route` |
| Centre de synchro | `SyncCenterScreen` | `useSync`, `useConnectivity` | `SyncEngine`, `outbox.repo` | `reconcile`, `syncError`, `outboxLabel` |
| KPI carbone | `KpiScreen` | — (TanStack Query) | `dashboard.api` | `carbonSplit` |
| Profil, thème | `ProfileScreen` | `useTheme`, `useAuth` | `meta.repo` | `roles`, `capabilities`, `theme` |

---

## 7. La carte en détail

> « La maps, je fais appel à quoi ? » — voici la réponse complète.

### 7.1 — La brique cartographique

**`react-native-maps` en `PROVIDER_DEFAULT`.** Sur iOS, cela signifie **Apple
MapKit** : le fond de carte est celui de l'app Plans. Conséquences directes :

- **Aucune clé d'API à gérer**, aucun quota, aucune facturation — contrairement à
  Google Maps qui exigerait une clé et une carte bancaire.
- Le fond de carte demande du réseau, **mais iOS sert ses propres tuiles en
  cache** : une zone déjà consultée reste visible hors ligne.
- **Tout le reste de l'écran est local.** Zones, équipements et tracés viennent
  de SQLite. Sans réseau, on perd le fond de carte, jamais les données.

### 7.2 — Ce qui est dessiné, et d'où ça vient

| Élément | Composant | Source | Table |
|---|---|---|---|
| Polygones de zones | `<Polygon>` | GeoJSON `Polygon` | `zones` |
| Marqueurs d'équipement | `<Marker>` | `lat` / `lng` | `items` |
| Tracé de tournée | `<Polyline>` | étapes ordonnées | `routes` |
| Étapes | `<Marker>` | `location` de l'étape | `routes` |
| Position de l'agent | `showsUserLocation` | MapKit + CoreLocation | — |

### 7.3 — Le piège des coordonnées, et comment il est neutralisé

**GeoJSON ordonne les couples en `[longitude, latitude]`. `react-native-maps`
attend `{latitude, longitude}`.** C'est l'erreur classique : elle envoie les
marqueurs à l'autre bout du monde sans rien casser visiblement.

L'inversion est **isolée dans `domain/mapGeometry.ts`**, dans deux fonctions —
`pointToLatLng` et `polygonToLatLng` — et couverte par des tests. Aucun écran ne
manipule un couple brut.

### 7.4 — Le cadrage

`domain/mapFraming.ts` décide, à l'ouverture :

1. **Une cible explicite l'emporte.** Arrivée depuis « Voir sur la carte » ou
   depuis une tournée : on cadre sur ce qui a été demandé.
2. **Sinon, on se recentre sur l'agent.** La carte s'affiche d'abord sur le
   secteur, puis glisse vers la position dès que le GPS répond.
3. **Sauf si l'agent a déjà bougé la carte.** `onRegionChangeComplete` fournit
   `isGesture`, qui distingue un geste au doigt de nos propres animations.
4. **Et seulement quand MapKit est prêt.** `animateToRegion` transmet la commande
   au natif **sans aucune garde** : émise pendant la mise en page initiale, elle
   est ignorée. D'où la condition `onMapReady`.

`boundingRegion` calcule le cadre englobant avec une marge de 1,35, et
`focusRegion` un cadre serré en mètres — en divisant par le cosinus de la
latitude, sinon l'échelle horizontale ment dès qu'on s'éloigne de l'équateur.

### 7.5 — La batterie

**Aucun suivi continu.** La position est relevée au plus deux fois par visite :
une à l'ouverture, une par appui sur le bouton cible. Le sujet impose de gérer la
décharge des terminaux professionnels — c'est la réponse.

Même logique pour la caméra : `isActive={isFocused}` l'éteint dès que l'onglet
Scan passe en arrière-plan.

---

## 7bis. Les KPI carbone en détail

C'est la partie que le jury a le plus interrogée en répétition. Elle mérite d'être
sue par cœur.

### Ce qui est calculé, et où

**Rien n'est calculé dans l'application.** Tout vient d'un pipeline d'agrégation
`$facet` côté MongoDB, présenté en MP3. L'app **affiche**, elle ne recalcule pas.

La méthode ADEME, en deux termes :

| Terme | Formule |
|---|---|
| **Fabrication amortie** | CO₂ de fabrication ÷ durée de vie × prorata des jours d'événement |
| **Transport** | tonnes × kilomètres × facteur d'émission |

Les **facteurs d'émission viennent en direct de l'API Open Data de l'ADEME**, avec
un repli codé en dur si elle est indisponible.

### Pourquoi les KPI ne fonctionnent PAS hors ligne

**C'est délibéré, et c'est la bonne réponse à donner.** Un indicateur consolidé
calculé sur un cache partiel serait **faux**. Or un chiffre faux sur un tableau de
bord est pire qu'un chiffre absent : **il sera utilisé pour décider.**

Hors réseau, l'écran dit ce qu'il en est plutôt que d'afficher une valeur périmée
sans le signaler.

> **La phrase à retenir :** on met hors ligne **ce qui doit être capturé** (les
> gestes de l'agent), pas **ce qui doit être exact** (les indicateurs de pilotage).

### « Si les agents scannent toute la journée, pourquoi l'empreinte ne bouge pas ? »

Question déjà posée en répétition. La réponse précise :

**Ce qu'un scan change :** la répartition par statut. Les six tuiles du tableau de
bord se recalculent, et **hors réseau**, parce qu'elles sont dérivées du cache
SQLite. C'est le seul indicateur qui vit en zone blanche.

**Ce qu'un scan ne change pas :** l'empreinte carbone. Le pipeline fait
`$match: { eventId }` et **rien d'autre** — il ne filtre jamais sur le statut.
Déplacer un équipement d'un état à l'autre ne change ni sa fabrication, ni son
transport.

**Ce qui la fait bouger :** l'**allocation**.

```
avant   80,94 kg     51 équipements dans le périmètre
        ↓ POST /events/:id/allocate   (3 équipements, transaction ACID tout-ou-rien)
après   88,34 kg     +7,40 kg
```

dont **+5,84 kg pour le seul groupe électrogène** : 8 000 kg de CO₂ amortis sur
15 ans, au prorata de 4 jours.

**Double bénéfice à annoncer :** l'endpoint d'allocation est la **transaction ACID
du MP3**. Un seul geste prouve à la fois que l'indicateur est vivant et que la
transaction fonctionne.

**Démonstration en direct :** `./demo-kpi.sh alloc`, puis rafraîchir l'onglet KPI
sur le téléphone — le chiffre bouge sous les yeux du jury.
**Penser à lancer `reset` après** : deux des équipements alloués font partie des QR
hors secteur.

### « Et ensuite ? » — le chaînon manquant, identifié

Le pont existe côté API : **`actualDistanceKm`**. Le scan capture déjà une position
GPS horodatée ; en déduire la distance réellement parcourue ferait enfin vivre le
carbone au rythme du terrain.

**Pourquoi ce n'est pas fait :** deux points GPS donnent une distance à vol
d'oiseau, pas des kilomètres routiers. Et un chiffre faux est pire qu'un chiffre
absent.

> Montrer qu'on a identifié le chaînon manquant **et** pourquoi le combler
> naïvement dégraderait la mesure est plus solide que de prétendre que tout est
> branché.

---

## 7ter. Les deux mises en situation de la démonstration

Un geste peut être refusé pour deux raisons très différentes : **l'état de
l'équipement**, ou **le rôle de qui le tient**. Les deux scénarios ont été
construits pour les séparer proprement — sur un équipement pris au hasard, un
refus serait ambigu.

### ① Responsable logistique — un seul QR, le groupe électrogène en transit

| Mode | Résultat |
|---|---|
| Pointage | accepté, ne change rien |
| Déploiement | accepté, `in_transit → deployed` |
| Transit | **refusé**, `in_transit → in_transit` interdit |

Une fois déployé, le même QR **inverse ses réponses**, et un scan en Transit le
ramène à son point de départ : **la démonstration boucle**, elle se rejoue sans
reseed.

**Ce qu'elle prouve :** aucun refus ne vient du rôle — ce compte a six gestes sur
sept. Tous les refus viennent du **statut**.

### ② Transporteur, en mode avion — deux QR

| Geste | Résultat |
|---|---|
| Pointage, Transit | acceptés, **hors réseau** |
| Déploiement | mode **verrouillé**, cadenas visible avant même de scanner |
| Maintenance | bouton **absent** de la fiche, avec sa raison |

Or `in_transit → deployed` et `deployed → in_maintenance` sont deux transitions
**parfaitement légales** : un agent de terrain réussirait sur ces mêmes QR.

**Ce qu'elle prouve :** ici, **seul le rôle bloque**, et il bloque **sans réseau**,
instantanément, sur une matrice embarquée.

> **Règle d'or de la démo hors ligne :** se connecter et télécharger le secteur
> **avant** de couper le réseau. Le login est le seul geste qui exige une
> connexion.

---

## 8. Les questions du jury, avec les réponses

### Sur l'architecture

**« Pourquoi une couche `domain/` séparée ? »**
Parce que le sujet interdit de mêler logique métier, réseau et rendu. Concrètement,
ça me permet de tester la réconciliation, la machine à états ou le calcul de
contraste **sans monter d'application ni de base de données**. Les 633 tests
tournent en une seconde, donc je les lance à chaque modification.

**« Pourquoi pas Redux / Zustand / MobX ? »**
Ma source de vérité locale est SQLite, pas un magasin en mémoire. Un store
dupliquerait l'état et créerait deux vérités à synchroniser. J'utilise un bus de
changements minimal qui dit « relis la base », et TanStack Query pour ce qui vient
du réseau. Chaque donnée a **un seul** propriétaire.

**« Comment garantissez-vous que le front et l'API ne divergent pas ? »**
Les types de `types/api.ts` sont le miroir des DTO. La machine à états et les
permissions sont dupliquées côté client — non par redondance, mais pour ne jamais
proposer un geste qui finirait en 403 ou en 422. Le serveur reste l'autorité :
le client anticipe, il ne décide pas.

### Sur le mode hors ligne

**« Que se passe-t-il exactement si le réseau tombe pendant un scan ? »**
Rien de visible. Le scan ne touche jamais le réseau : il résout le QR dans SQLite,
applique le changement localement et empile l'action dans la file. Le réseau
n'intervient qu'à la synchronisation, plus tard.

**« Et si deux agents scannent le même équipement hors ligne ? »**
C'est le cas du conflit. Chacun travaille sur la version *n*. Le premier à
synchroniser passe, l'équipement devient version *n+1*. Le second reçoit un **409**.
Je ne tranche pas à sa place : l'action passe en `conflict` et apparaît dans le
Centre de synchronisation, où il voit l'erreur et choisit Rejouer ou Abandonner.

**« Pourquoi ne pas résoudre le conflit automatiquement ? »**
Parce qu'aucune règle automatique n'est juste dans tous les cas. « Le dernier
gagne » ferait perdre le travail du premier. L'agent sur place a un contexte que
le code n'a pas.

**« Combien de tentatives avant d'abandonner ? »**
Cinq, avec repli exponentiel (`domain/backoff.ts`). Au-delà, l'action est
considérée définitivement perdue : je fais un **rollback visuel** — l'équipement
retrouve son état réel — puis je retire la ligne. L'interface ne doit jamais
afficher un état que le serveur n'a pas accepté.

### Sur la carte

**« Quelle bibliothèque de cartographie, et pourquoi ? »**
`react-native-maps` en `PROVIDER_DEFAULT`, donc **Apple MapKit** sur iOS. Pas de
clé d'API, pas de quota, pas de facturation, et le rendu est celui que
l'utilisateur connaît déjà. Google Maps aurait imposé une clé et une carte
bancaire pour un bénéfice nul ici.

**« La carte fonctionne-t-elle hors ligne ? »**
Les **données** oui, entièrement : zones, équipements et tournées viennent de
SQLite. Le **fond de carte** demande du réseau, mais iOS met ses tuiles en cache,
donc une zone déjà consultée reste affichée. C'est une limite du fond, pas de
l'application.

**« Comment gérez-vous l'inversion latitude/longitude ? »**
GeoJSON est en `[lng, lat]`, `react-native-maps` attend `{latitude, longitude}`.
J'ai isolé la conversion dans deux fonctions de `mapGeometry.ts`, couvertes par
des tests. Aucun écran ne manipule un couple brut — c'est l'erreur la plus
classique du domaine et je ne voulais pas qu'elle puisse se reproduire à trente
endroits.

### Sur les performances et la batterie

**« Le sujet impose de gérer la batterie. Qu'avez-vous fait ? »**
Trois choses. La caméra ne tourne que si l'onglet Scan est au premier plan
(`isActive={isFocused}`) — sans ça elle continuait de lire des QR depuis un autre
onglet. La position est relevée **ponctuellement**, jamais en continu. Et la
synchro n'est pas un *polling* : elle est déclenchée par un changement de
connectivité ou par une nouvelle action, avec une fenêtre d'attente de 800 ms
pour qu'un scan en rafale ne parte qu'une fois.

**« Comment la liste tient-elle avec des milliers d'équipements ? »**
`FlatList` virtualise le rendu. Les filtres et le tri sont des fonctions pures
mémoïsées. Et le cache ne stocke que les champs nécessaires à l'affichage —
l'historique et les données d'achat sont écartés par le manifeste.

### Sur la qualité

**« Comment testez-vous une application mobile ? »**
À trois niveaux. Le **domaine** en tests unitaires purs — c'est le gros du volume.
Les **composants** avec `react-test-renderer`, en simulant le thème et les icônes.
Et des **garde-fous automatiques** qui relisent le code source : un test refuse
toute couleur sous le seuil WCAG, un autre toute taille de police hors échelle,
un troisième tout bouton sans rôle d'accessibilité.

**« Parlez-moi de l'accessibilité. »**
J'ai mesuré, pas supposé. J'ai implémenté la formule de contraste WCAG 2.1 et
testé les 44 paires de mes deux palettes : douze échouaient, dont la couleur
primaire du thème clair — celle de tous les liens. Je les ai corrigées, et le test
empêche la régression. Les zones tactiles font toutes 44 pt, le minimum des Human
Interface Guidelines, ce qui compte pour une application manipulée debout et
parfois avec des gants.

**« Un cas d'accessibilité dont vous êtes fière ? »**
Les contrôles posés sur l'aperçu caméra. Partout ailleurs je connais le fond ;
au-dessus de la caméra, le fond est l'image filmée — un hangar sombre ou un mur
blanc en plein soleil. J'ai figé une palette dédiée et je vérifie par test que
chaque couleur garde 4,5:1 **sur les deux extrêmes**.

### Questions venues des répétitions

**« Pourquoi ne pas avoir pris une base de données synchronisée toute faite ? »**
Parce que le sujet impose la réconciliation avec une API REST existante et son
verrouillage optimiste. Une solution clé en main aurait imposé son propre modèle de
synchronisation, et je n'aurais rien démontré du mécanisme.

**« Comment démontrez-vous le mode hors ligne ? »**
Mode avion, je scanne trois équipements, je montre le compteur de la file qui monte,
je réactive le réseau, la file se vide et les statuts se mettent à jour.

**« Pourquoi SQLite et pas AsyncStorage ? »**
AsyncStorage est un magasin clé-valeur : il ne sait ni indexer, ni filtrer, ni
trier. Le sujet demande explicitement des requêtes relationnelles sur des milliers
d'enregistrements.

**« Et si le QR n'est pas dans le cache ? »**
Bip rouge, l'équipement est listé comme non identifié. C'est le comportement voulu :
ça arrive pour les 15 QR du jeu de démo qui appartiennent à un autre secteur, et
l'agent ne doit pas manipuler du matériel qui n'est pas le sien.

**« Quelle est la latence du scan ? »**
Je ne l'ai pas instrumentée au millimètre, je l'ai validée à l'usage sur iPhone. Le
facteur limitant est la caméra, pas le code. La résolution du QR elle-même est de
l'ordre de la milliseconde grâce à l'index.

**« Pourquoi refuser un scan sans GPS ? »**
Un scan sert à savoir **où** se trouve un équipement. Sans coordonnées, la donnée
est incomplète et faussement rassurante. Je préfère un refus explicite à une donnée
trompeuse. C'est un choix discutable, je l'assume.

**« Et si quelqu'un modifie l'application pour contourner les rôles ? »**
Il obtiendra des 403 de l'API. La matrice locale n'est **qu'un miroir**, elle
n'accorde aucun droit. L'app n'est pas un dispositif de sécurité — le code est sur
le téléphone de l'utilisateur, il est modifiable. La sécurité, c'est `requireRole`
côté API.

**« Pourquoi le transporteur garde-t-il l'anomalie et la perte ? »**
Il est le mieux placé pour constater une casse survenue pendant l'acheminement. Lui
fermer ce geste ferait perdre l'information.

**« Pourquoi cinq tentatives ? »**
C'est un réglage, pas une loi : `SYNC_MAX_ATTEMPTS` dans `config/env.ts`. Cinq
tentatives couvrent environ 30 secondes de réseau instable ; au-delà, ce n'est plus
un passage sous un pont, c'est un vrai problème qui mérite d'être signalé.

**« Comment prouvez-vous que la règle des couches tient ? »**
`grep -r "services/" src/screens` — l'écran de scan ne connaît que `useScanner`. La
séparation physique des dossiers rend la violation visible en revue de code.

### Questions difficiles — prépare-les vraiment

**« Votre application duplique la logique de l'API. N'est-ce pas un défaut ? »**
C'est un arbitrage assumé. La machine à états est effectivement écrite deux fois.
Sans elle côté client, je ne pourrais ni valider hors ligne, ni masquer les gestes
interdits. Le serveur reste l'autorité — s'il refuse, je le traite comme un
conflit. Le coût est un risque de dérive, que je limite en gardant ces règles dans
un module unique et testé plutôt que dispersées.

**« Pourquoi SSE et pas WebSocket ? »**
Le besoin est unidirectionnel : le serveur pousse des alertes, l'application ne
répond rien sur ce canal. SSE suffit, se reconnecte tout seul, passe les proxys
d'entreprise et coûte moins cher à maintenir. WebSocket aurait été surdimensionné.

**« Que feriez-vous différemment avec plus de temps ? »**
Trois choses. La palette est celle de Tailwind par défaut — elle fonctionne mais
n'appartient pas à LogiChain. Il n'y a pas de tests de bout en bout sur appareil
réel, uniquement des tests unitaires et de composants. Et Android n'est pas
compilé : l'architecture le permet, mais je ne l'ai pas vérifié.

**« Qu'est-ce qui vous a le plus surprise ? »**
Que `SQLite` soit synchrone et vive hors de React. J'écrivais dans la base, la
donnée était bien enregistrée, et l'écran ne bougeait pas. Il a fallu un bus de
changements pour dire à React de relire. C'est le genre de problème qu'on ne voit
dans aucun tutoriel.

---

## 9. Les faiblesses assumées

Les connaître et les nommer **avant** le jury vaut mieux que se les faire
signaler. Un candidat qui dit « je sais, voici pourquoi » est plus solide qu'un
candidat pris en défaut. **Ne t'excuse pas en énonçant ces points : ce sont des
arbitrages.**

### Les limites de périmètre, choisies

**Écrans d'administration absents.** L'app cible l'agent de terrain, pas le
responsable derrière son bureau. Seule la création de compte est disponible, parce
que l'API l'expose déjà.

**Les goulots d'étranglement ne sont pas exposés.** L'algorithme du banquier tourne
côté API et refuse toute allocation qui rendrait l'état non sûr — il protège donc
chaque allocation. Mais son résultat s'adresse à **celui qui décide d'allouer**, et
allouer n'est pas un geste de terrain. L'afficher à un agent qui ne peut pas agir
dessus aurait été un indicateur décoratif. **Ce qui manque, c'est un écran, et cet
écran n'a pas de lecteur dans le périmètre choisi.**

**Pas de « tâches prioritaires » sur le tableau de bord**, alors que le sujet les
mentionne. Le blocage est **en amont, dans le modèle** : rien n'affecte un
équipement à un agent nommé, ni dans les données ni dans l'API. Il aurait fallu
inventer une priorité côté client, donc l'afficher comme une vérité alors qu'elle
n'aurait été qu'une heuristique. Le tableau de bord montre ce qui est réel : l'état
des stocks, les alertes reçues, la file d'attente.

**SIG complet.** On affiche les zones, on ne fait pas de cartographie riche.

### Les limites techniques, assumées

**Résolution de conflit manuelle.** L'app détecte le conflit, affiche l'état local
et l'état serveur, et laisse l'agent trancher. Ce n'est pas de la paresse : sur un
conflit de statut, **seul l'agent qui a l'objet sous les yeux** sait qui a raison.
Une fusion automatique produirait une donnée que personne n'a constatée.

**Machine à états dupliquée.** Deux copies d'une même règle peuvent diverger.
L'API reste l'autorité ; la copie client est une optimisation d'expérience, et
**deux sondes d'intégration comparent les matrices contre l'API réelle** — si elles
divergent, le test casse. Sans validation locale, un agent en zone blanche
scannerait cinquante équipements sans le moindre retour, et découvrirait ses
cinquante refus deux heures plus tard.

**Android non validé.** Le code est cross-platform et ne contient aucune API
spécifique à iOS, mais il n'a été testé que sur iPhone. Ne prétends pas qu'il
tourne : tu ne l'as pas vérifié.

**Pas de tests de bout en bout.** Les tests couvrent le domaine et les composants ;
le parcours réel a été validé à la main sur iPhone. Detox était hors budget temps.

**Certificat Apple gratuit.** Expire tous les 7 jours. Contrainte de compte, pas de
code.

**Palette Tailwind par défaut.** Fonctionnelle et vérifiée en contraste, mais sans
identité propre. C'est un choix d'ingénieure, pas de directrice artistique.

### ⚠️ Deux limites que le PPT annonce et qui ne sont PLUS vraies

**Ces affirmations de la slide 24 sont devenues fausses. Les laisser te ferait
sous-vendre ton travail devant le jury.**

| Le PPT dit | La réalité aujourd'hui |
|---|---|
| « Pas de tests de rendu, `react-native-testing-library` n'est pas installée » | **6 fichiers de tests de composants** avec `react-test-renderer` : `StatusTile`, `FilterSheet`, `ModeSelector`, `ReportSheet`, `RolePermissions`, `BrandMark` |
| « Les contrastes sont validés à la main sur iPhone » | **59 tests de contraste automatisés**, formule WCAG 2.1, sur les 44 paires des deux palettes |

Et trois garde-fous que le PPT ne mentionne nulle part alors qu'ils sont ce que tu
as de plus rare : un test qui **relit le code source** et refuse toute taille hors
échelle, un autre qui **analyse les balises JSX** et refuse tout bouton sans rôle
d'accessibilité, un troisième qui vérifie que **les 9 icônes iOS déclarées existent
avec les bonnes dimensions**.

---

## Glossaire — les sigles à savoir redéfinir

Le jury demande parfois de définir un sigle employé. Ces définitions doivent venir
sans hésitation.

| Sigle | Définition |
|---|---|
| **FIFO** | *First In, First Out* — premier entré, premier sorti. L'ordre de rejeu de la file |
| **SSE** | *Server-Sent Events* — flux poussé par le serveur, unidirectionnel |
| **JSI** | *JavaScript Interface* — ce qui permet à op-sqlite d'être **synchrone**, sans passer par le pont asynchrone |
| **ATS** | *App Transport Security* — la politique HTTPS d'iOS |
| **RBAC** | *Role-Based Access Control* — contrôle d'accès par rôle |
| **HIG** | *Human Interface Guidelines* — les règles d'interface d'Apple (d'où les 44 pt) |
| **WCAG** | *Web Content Accessibility Guidelines* — la norme d'accessibilité, dont les seuils de contraste |
| **GeoJSON** | Le format des données géographiques, en `[longitude, latitude]` |

---

## Les cinq chiffres à retenir

| | |
|---|---|
| **633** | tests, en 48 suites, exécutés en ~1 seconde |
| **23** | modules de logique métier pure, testables sans React ni base |
| **44 pt** | taille minimale de toute zone tactile (HIG Apple) |
| **5** | tentatives avant abandon d'une action, avec repli exponentiel |
| **0** | paire de couleurs sous le seuil WCAG AA |
