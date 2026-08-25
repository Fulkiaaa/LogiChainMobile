# Le scan — d'un QR code à la base de données

> Pourquoi le scan existe, ce qu'il écrit réellement, ce qu'il déclenche en
> aval, et qui a le droit de scanner quoi. La page unique qui remplace la
> lecture croisée de `scan-qr.md` et `roles-et-permissions.md`.
> **Chiffres relevés et vérifiés le 25/08/2026 sur l'API locale.**

---

## 1. Ce que le sujet demande

Le scan n'est pas une idée de conception, c'est une exigence écrite. Elle
apparaît dans les deux parties du sujet.

**Partie 1 — API, § agents de terrain :**

> *« Scan des équipements pour validation des étapes de livraison, de mouvement
> ou de maintenance (mode connecté ou déconnecté). Déclaration d'anomalies
> géolocalisées avec mise à jour immédiate de l'état de l'item. »*

**Partie 2 — mobile, § module de scan industriel :**

> *« Interface optimisée pour la lecture rapide et **en rafale** d'identifiants
> matériels, avec retour haptique et sonore pour valider l'action **sans
> regarder l'écran**. »*

Trois mots de ces deux phrases commandent tout le reste du design :

| Le mot du sujet | Ce qu'il impose dans le code |
|---|---|
| **rafale** | anti-doublon glissant de 1,5 s (`ScanService.ts`) |
| **sans regarder l'écran** | bip de succès / d'échec + vibration (`feedback.ts`) |
| **déconnecté** | résolution locale SQLite + file d'attente (`OutboxService.ts`) |

Et côté back, le sujet ajoute : *« assurer la résilience et la charge face à des
pics d'utilisation simultanés (**scans massifs** lors des phases de montage) »* —
c'est ce que mesure `tests/load/scan.load.js`.

---

## 2. À quoi ça sert, en une phrase

Un festival, c'est du matériel qui se déplace entre un entrepôt, des camions et
des zones. Sans traçabilité, personne ne sait **où est quoi, à quel moment, sous
la responsabilité de qui**. Le QR code est l'identifiant physique qui relie
l'objet réel à sa fiche en base — et le scan est le seul geste qui alimente
cette fiche depuis le terrain.

---

## 3. Ce qu'un scan écrit vraiment

Un scan pousse **un document imbriqué** dans le tableau `history` de l'item.

```js
// item.model.ts — movementSchema
{ at, type, fromStatus, toStatus, location /* GeoJSON Point */, operatorId, note }
```

Ce petit objet répond à lui seul à trois exigences distinctes du sujet :

| Exigence du sujet | Ce que le mouvement y répond |
|---|---|
| « documents imbriqués pour l'historisation » | chaque scan pousse un mouvement dans `history` |
| « structures GeoJSON pour la cartographie » | `location` est un `Point`, indexé `2dsphere` |
| « supervision des transferts de responsabilité » | `operatorId`, extrait du JWT |
| « validation des étapes » | `fromStatus → toStatus`, contrôlé par la machine à états |

**Le point le plus fort à défendre : `operatorId` vient du token, pas d'une
saisie.** `item.controller.ts:60` passe `req.user!.id`. L'agent ne déclare pas
qui il est — le serveur le sait. Un scan est donc une **preuve**, pas une
déclaration.

Les sept types de mouvement possibles en base : `scan`, `allocation`, `transit`,
`deploy`, `maintenance`, `anomaly`, `return`. L'application mobile en déclenche
quatre — `scan`, `transit`, `deploy`, `anomaly`. L'allocation et le retour au
stock sont des gestes de bureau, pas de terrain.

---

## 4. Le parcours complet

```
 ① SUR LE TERRAIN — SANS RÉSEAU
 ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐
 │  Caméra  │─▶│ Anti-doublon │─▶│  SQLite  │─▶│   GPS    │─▶│ Machine états │
 │LC-FENCE-7│  │    1,5 s     │  │findByQr… │  │ position │  │  transition ? │
 └──────────┘  └──────────────┘  └──────────┘  └──────────┘  └───────┬───────┘
                                                                     │
 ┌───────────────────────────────────────────────┐                   │
 │ UI optimiste : statut appliqué · bip · +1     │◀──────────────────┤
 └───────────────────────────────────────────────┘                   ▼
                                                            ┌────────────────┐
                                                            │     OUTBOX     │
                                                            │ SQLite pending │
                                                            └───────┬────────┘
 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ plus tard, au retour du réseau ─ ─ ─ ─ ─ ─ │ ─ ─ ─ ─
                                                                    ▼
 ② L'API — N-tier strict
    requireAuth → requirePasswordChanged → requireRole → validate
        → controller → service → ItemEntity.assertTransition()
        → repository.updateWithVersion(__v)          ← verrouillage optimiste
                                                                    ▼
 ③ MONGODB
    history.push({ at, type, from → to, location, operatorId })
                                                                    ▼
 ④ CHANGE STREAM → NotificationService → SSE      (anomalie et perte SEULEMENT)
```

### Étage ① — cinq contrôles, aucun réseau

`useScanner.ts` enchaîne cinq gardes ; la première qui échoue arrête tout.

| # | Contrôle | En cas d'échec |
|---|---|---|
| 1 | **Anti-doublon 1,5 s** | **rien** — rejet silencieux, volontaire |
| 2 | **Résolution SQLite** (`findByQrCode`) | ✗ bip d'échec, `LC-XXXX-000` en rouge |
| 3 | **Position GPS** | ✗ `Enceinte façade (pas de GPS)` |
| 4 | **Machine à états** | ✗ `in_stock → deployed interdit` |
| 5 | **Outbox + statut optimiste** | ✓ bip de succès, vibration, compteur +1 |

Deux subtilités qui surprennent :

**L'anti-doublon est silencieux, et sa fenêtre est glissante.** Elle court depuis
la *dernière vue* du code, pas depuis le dernier scan accepté : tant que le QR
reste dans le champ, chaque image repousse l'échéance. Sans ça, la caméra
produisant des dizaines d'images par seconde, viser un QR en continu
l'enregistrerait toutes les 1,5 s.

**Le statut change avant toute synchro.** L'affichage est optimiste ; l'outbox
mémorise `previousStatus` pour pouvoir revenir en arrière si la synchronisation
échoue définitivement.

### Étage ② — la synchronisation

`SyncEngine.flush()` dépile la file. Trois issues, décidées par
`decideReconcile` :

| Réponse | Décision | Suite |
|---|---|---|
| 2xx | succès | l'item du serveur écrase le cache, la ligne est supprimée |
| **409** version stale | conflit | l'utilisateur arbitre dans le Centre de synchro |
| **422 `item.invalid_transition`** | conflit | idem — le serveur a bougé pendant qu'on était hors ligne |
| tout le reste | réessai | backoff, 5 tentatives, puis abandon + **rollback visuel** |

### Étage ③ — l'API rejoue la règle

L'entité rejoue la machine à états (`assertTransition`) côté serveur.
**La règle métier est donc vérifiée deux fois** : sur le téléphone pour ne pas
faire perdre son temps à l'agent, sur le serveur parce que c'est lui l'autorité.

Puis `repo.save()` passe par `updateWithVersion()` —
`findOneAndUpdate({ _id, __v: expected })`. C'est le **verrouillage optimiste**
exigé par le sujet : deux agents qui scannent le même item au même instant, le
second reçoit un `409`.

---

## 5. Les trois modes de scan

Le même geste physique fait trois choses différentes selon le mode sélectionné
(`ModeSelector.tsx`).

| Mode | Endpoint | Effet sur le statut |
|---|---|---|
| **Pointage** | `POST /items/:id/scan` | **aucun** — enregistre un passage, met à jour la position |
| **Transit** | `POST /items/:id/transit` | → `in_transit` (chargé dans le camion) |
| **Déploiement** | `POST /items/:id/deploy` | → `deployed` (installé dans la zone) |

Deux autres gestes partent du même écran, avec une note obligatoire :
**anomalie** (`/anomaly`, ne change pas le statut) et **perte** (`/lost`, état
terminal).

---

## 6. Qui peut scanner quoi — trois filtres qui se superposent

C'est là que la plupart des explications se perdent : **il y a trois filtres
indépendants**, et un seul dépend du rôle.

### Filtre 1 — le rôle (`requireRole`, côté API)

| Endpoint | admin | logistics_manager | field_agent | transporter |
|---|:---:|:---:|:---:|:---:|
| `POST /items/:id/scan` | ✓ | ✓ | ✓ | ✓ |
| `POST /items/:id/transit` | ✓ | ✓ | ✓ | ✓ |
| **`POST /items/:id/deploy`** | ✓ | ✓ | ✓ | **403** |
| `POST /items/:id/anomaly` | ✓ | ✓ | ✓ | ✓ |
| `POST /items/:id/lost` | ✓ | ✓ | ✓ | ✓ |
| `POST /items/:id/return` | ✓ | ✓ | ✓ | **403** |
| `POST /items/:id/allocate` | ✓ | ✓ | **403** | **403** |
| `POST /items` · `PATCH /items/:id` | ✓ | ✓ | **403** | **403** |
| `DELETE /items/:id` | ✓ | **403** | **403** | **403** |

**Une seule règle de rôle touche le scan de terrain : le transporteur achemine,
il n'installe pas.** Dans l'app, le mode Déploiement reste affiché mais
cadenassé, avec la phrase qui nomme les deux moitiés de l'information :

> **Réservé à : Administrateur, Responsable logistique, Agent de terrain.
> Vous êtes Transporteur.**

L'anomalie et la perte lui restent ouvertes — il est le mieux placé pour signaler
une casse survenue pendant l'acheminement. Lui fermer ce geste ferait perdre
l'information.

### Filtre 2 — le statut de l'équipement (indépendant du rôle)

`ALLOWED_TRANSITIONS` ne connaît pas les rôles. Un admin n'a **pas** plus de
droits qu'un agent sur cette table.

| Statut | Pointage | Transit | Déploiement | Nombre dans l'app |
|---|:---:|:---:|:---:|---:|
| Alloué | ✓ | **✓** | ✗ | 10 |
| En transit | ✓ | ✗ | **✓** | 10 |
| Déployé | ✓ | **✓** | ✗ | 31 |
| En stock · maintenance · perdu | ✓ | ✗ | ✗ | 0 *(hors secteur)* |

D'où, chiffres vérifiés : **51 QR scannables en Pointage, 41 en Transit, 10
seulement en Déploiement.** Scanner au hasard en mode Déploiement a donc quatre
chances sur cinq d'échouer.

Trois choses à retenir : le **Pointage marche toujours** (il ne change aucun
statut) ; le **Déploiement n'accepte qu'un `in_transit`** ; et **on ne redéploie
pas** — `deployed → deployed` n'existe pas.

### Filtre 3 — le périmètre (le secteur assigné)

```
GET /api/v1/items?limit=100   (admin, API locale, 25/08/2026)
  total en base .................... 66
  rattachés au Festival Vert 2026 ... 51   ← ce que l'app synchronise
  sans événement .................... 15   ← « QR inconnu » dans l'app
```

`initialSync.ts` ne télécharge que les items de l'événement assigné
(`itemsApi.listByEvent`). Les 15 restants — les `in_stock`, `in_maintenance` et
`lost` que le seed laisse sans événement — affichent **« QR inconnu »** en rouge.

Ce n'est pas un bug, c'est la *« mise en cache du secteur assigné »* du sujet :
un agent de terrain n'a pas à toucher au matériel d'un autre secteur. Et c'est
une bonne démonstration en soi — scanner volontairement `LC-SOUND-001` prouve que
la résolution se fait **en local**, sans appel réseau.

---

## 7. Ce que le scan déclenche en aval

| Effet | Déclenché par | Mécanisme |
|---|---|---|
| **Notification temps réel** | **anomalie** et **perte uniquement** | Change Stream `items` → `NotificationService` → SSE, filtré par audience |
| Position courante de l'item | tout scan géolocalisé | `_location` mis à jour, requêtable en `$near` (index `2dsphere`) |
| Métrique de latence | toute requête HTTP | collection **Time Series**, lue par `GET /dashboard/metrics` |
| Empreinte carbone | ❌ **pas le scan** | items alloués (fabrication amortie) + routes (distance × tonnage × facteur ADEME) |

Deux nuances que le jury peut chercher :

**Un scan ordinaire ne notifie personne.** Seuls un mouvement `type: 'anomaly'`
(→ sévérité critique, audience admin + responsable + agents) et un passage à
`status: 'lost'` (→ warning, audience admin + responsable) traversent le Change
Stream. C'est délibéré : notifier chaque pointage noierait les alertes réelles.

**Le scan ne nourrit pas le calcul carbone.** C'est le transporteur qui saisit le
kilométrage réel (`POST /routes/:id/distance`), et c'est ça qui alimente
l'ADEME. Ne mélange pas les deux.

---

## 8. Deux points à connaître avant qu'on te les demande

**Le client n'envoie pas sa version.** `outbox.baseVersion` est stocké en SQLite
et affiché dans le Centre de synchro, mais `items.api.ts` ne le transmet à aucun
endpoint. Le `409` vient donc d'une concurrence **serveur** — deux requêtes qui
se croisent — pas d'un cache périmé. Ce qui rattrape réellement le cas hors
ligne, c'est le **`422 item.invalid_transition`**, que `decideReconcile` traite
comme un conflit.

> Si on te demande *« comment détectez-vous qu'un autre agent a bougé l'item
> pendant que vous étiez hors réseau ? »*, la réponse exacte est **« par le refus
> de transition »**, pas « par la version ».

**Le `403` n'est pas traité comme un conflit.** Il tombe dans la branche
« réessayer » : cinq tentatives avec backoff, puis abandon et rollback
silencieux. C'est précisément pour ça que l'app duplique la matrice de rôles —
pour n'émettre aucune requête dont elle connaît déjà le refus. Le grisage est du
**confort d'usage, pas une mesure de sécurité** : un client modifié se prend le
403 comme les autres.

---

## 9. À dire au jury, en trois phrases

1. **« Le scan est le seul point d'entrée des données terrain. »** Il écrit un
   mouvement imbriqué, géolocalisé en GeoJSON, signé par l'`operatorId` du JWT —
   trois exigences du sujet dans un seul objet.
2. **« Il fonctionne sans réseau, et il ne ment jamais à l'utilisateur. »**
   Résolution locale en SQLite, machine à états côté client, file d'attente,
   affichage optimiste avec rollback si la synchro échoue définitivement.
3. **« L'autorisation est portée par l'API, l'app ne fait que l'anticiper. »**
   `requireRole` sur chaque endpoint, une matrice verrouillée par un test qui
   relit les gardes réellement branchées, et `npm run parcours` qui compare les
   deux matrices contre une API réelle.

---

## Annexe — commandes et vérifications

| Commande | Où | Effet |
|---|---|---|
| `npm run scan` | `LogiChainMobile` | simulation : matrice statut × mode sur les vraies données |
| `npm run qr` | `LogiChainMobile` | génère `soutenance/qr-codes.html`, la planche à scanner |
| `npm run parcours` | `LogiChainMobile` | les 4 rôles × 6 gestes comparés à l'API réelle |
| `npm test` | `logichain-api` | 59 tests, dont la matrice de permissions |
| `k6 run tests/load/scan.load.js` | `logichain-api` | pic de scans : les 409 sont comptés à part, ils sont **attendus** |

Voir aussi : `scan-qr.md` (les QR à utiliser pendant la démonstration),
`roles-et-permissions.md` (le détail des tests de permissions), et
`le-scan.html` (le schéma du parcours complet).
