# Les KPI — comment ils sont calculés et gérés

> D'où viennent les chiffres de l'onglet KPI, quelle méthodologie ils suivent,
> et quoi répondre quand le jury creuse.
> **Toutes les valeurs de ce document ont été relevées sur l'API le 25/08/2026.**

---

## 1. Ce que « KPI » recouvre dans LogiChain

Trois familles, dans le module `dashboard` de l'API :

| Endpoint | Rôle | Accès |
|---|---|---|
| `GET /dashboard/events/:id/carbon-footprint` | **L'empreinte carbone** — le KPI métier | tout compte authentifié |
| `POST /dashboard/allocations/check` | Aide à la décision d'allocation | admin, responsable logistique |
| `GET /dashboard/metrics` | Latences de l'API (exploitation) | admin seul |

L'application mobile n'affiche que le premier. Les deux autres existent côté
API et se démontrent au navigateur ou via `/docs`.

---

## 2. L'empreinte carbone — le calcul

### Rien n'est stocké

Le rapport est **recalculé à chaque appel** par `CarbonFootprintService`, qui
relit les équipements et les routes de l'événement. Pas de table d'agrégats,
donc aucun risque de chiffre périmé après un scan. Le coût est acceptable :
l'événement de démo tient en 51 équipements et 3 routes, et la pagination
interne monte par pages de 100.

Le total se décompose en **deux termes indépendants**.

### Terme 1 — la fabrication, amortie

Un projecteur n'a pas coûté son carbone à *ce* festival : il a été fabriqué une
fois et servira des années. On lui impute donc uniquement la part qui
correspond à la durée de l'événement.

```
(manufacturingCo2Kg / lifespanYears) × (duréeÉvénementJours / 365)
```

**Exemple réel**, la Barrière Vauban `LC-FENCE-009` :

| Donnée | Valeur |
|---|---|
| CO₂ de fabrication | 75 kg |
| Durée de vie | 20 ans |
| Amortissement annuel | 75 / 20 = **3,75 kg/an** |
| Durée du Festival Vert 2026 | 4 jours |
| **Imputé à l'événement** | 3,75 × 4/365 = **0,041 kg** |

Deux garde-fous dans le code, tous deux testés :

- `Math.max(item.lifespanYears, 0.1)` — une durée de vie à zéro provoquerait une
  division par zéro
- `Math.max(eventDurationDays, 0)` — une durée négative donnerait un crédit
  carbone, ce qui n'a aucun sens

### Terme 2 — le transport

Formule canonique de la Base Carbone® ADEME :

```
distanceKm × tonnes × facteurÉmission[mode]
```

Un détail qui compte : la distance utilisée est

```ts
public get distanceUsedForCarbonKm(): number {
  return this._actualDistanceKm ?? this._plannedDistanceKm;
}
```

**La distance réellement parcourue prime sur la distance prévue.** C'est le
transporteur qui la saisit en fin de tournée (`POST /routes/:id/distance`, un
des deux gestes qui lui sont propres). Tant qu'il ne l'a pas fait, on calcule
sur le prévisionnel — et le chiffre se corrige tout seul quand la donnée
arrive.

### L'agrégation

Le service somme les deux termes et ventile le résultat :

- `byCategory` — la fabrication par catégorie d'équipement
- `byTransportMode` — le transport par mode

Tout est arrondi à deux décimales au dernier moment.

---

## 3. Les facteurs d'émission viennent de l'ADEME, en direct

C'est le point le plus solide à défendre : **les facteurs ne sont pas des
constantes écrites en dur, ils sont récupérés sur l'API Open Data de l'ADEME.**

### Relevé réel sur l'API

```
truck            0.058      ademe-live   id=28030
rail             0.00401    ademe-live   id=43732
electric_truck   0.02       fallback
van              0.082      fallback
bike_cargo       0          fallback
```

Deux facteurs sur cinq arrivent **en temps réel** de
`data.ademe.fr/data-fair/api/v1/datasets/base-carboner`.

### Ciblés par identifiant, pas par libellé

```ts
truck: { query: '28030', match: matchById('28030') },
rail:  { query: '43732', match: matchById('43732') },
```

Chercher « camion » dans un jeu de données public serait fragile : un
renommage casserait tout. L'identifiant ADEME, lui, est stable.

Un filtre complète le ciblage : seules les lignes `Type_Ligne = Elément`,
statut `Valide générique`, `France continentale`, unité `kgCO2e/t.km` sont
retenues.

### Le pattern : stale-while-revalidate + repli

1. Au démarrage, l'API interroge l'ADEME pour les modes concernés
2. Les valeurs vivent en cache mémoire **24 h**
3. À chaque `getFactor(mode)` :
   - cache à jour → renvoyé immédiatement
   - cache périmé → **la valeur connue est renvoyée quand même**, et un
     rafraîchissement part en arrière-plan
   - rien en cache → constante de repli, et tentative de rafraîchissement
4. Si l'ADEME est injoignable, on garde les dernières valeurs connues

**Conséquence : LogiChain calcule toujours, même si l'ADEME est en panne.**
Aucun calcul ne dépend du réseau au moment où il s'exécute.

### Pourquoi trois modes restent en repli

Ce n'est pas de la paresse, et c'est le genre de détail qui fait la différence
à l'oral :

| Mode | Raison |
|---|---|
| `van` | Le facteur ADEME pour un utilitaire est exprimé en **kgCO₂e par km-véhicule**, pas par tonne.km. Il ne se compose pas avec la formule `tonnes × km` — l'utiliser donnerait un chiffre faux. |
| `electric_truck` | Aucun facteur « Valide générique / France continentale » disponible en mai 2026. L'estimation de repli inclut le mix électrique amont. |
| `bike_cargo` | Émissions négligeables, aucun facteur nécessaire. Le service ne rappelle même pas l'API. |

> Note méthodologique à connaître : ces facteurs incluent les émissions
> **amont** (extraction, raffinage, production d'électricité), pas seulement la
> combustion. C'est pourquoi le camion électrique n'est pas à zéro — l'essentiel
> de ses émissions est déplacé vers la production d'électricité et la
> fabrication du véhicule.

### Deux endpoints faits pour la démonstration

```bash
GET  /api/v1/dashboard/emission-factors           # source de chaque facteur
POST /api/v1/dashboard/emission-factors/refresh   # admin — force un refresh
```

Le premier indique pour chaque mode s'il vient de `ademe-live`, `ademe-cached`
ou `fallback`. Le second permet de rafraîchir devant le jury et de prouver que
la valeur vient réellement de l'ADEME.

---

## 4. Lire les chiffres — le piège du rail

**Apprends celui-ci.** C'est la question que le jury va poser.

Rapport réel du Festival Vert 2026 :

```json
{
  "totalCo2Kg": 80.94,
  "manufacturingCo2Kg": 48.33,
  "transportCo2Kg": 32.61,
  "byTransportMode": { "truck": 4.75, "electric_truck": 1.14, "rail": 26.72 },
  "itemCount": 51,
  "routeCount": 3
}
```

**Le rail émet le plus — 26,72 kg — alors que son facteur est 14 fois plus
faible que celui du camion.** Contradiction apparente. La réponse :

```
rail   : 680 km × 9,8 t × 0,00401 = 26,72 kg
truck  : 19,5 km × 4,2 t × 0,058  =  4,75 kg
```

Le trajet ferroviaire fait **35 fois la distance** du camion et transporte
**2,3 fois plus lourd**. Un facteur d'émission ne dit rien tout seul : c'est le
produit `distance × masse × facteur` qui compte.

Et le retournement qui conclut la démonstration :

```
Ce même trajet en camion : 680 × 9,8 × 0,058 = 386,51 kg
Réalisé en train         :                      26,72 kg
                                       → 93 % d'économie
```

**C'est précisément ce que l'outil sert à démontrer** : arbitrer un mode de
transport sur une base chiffrée plutôt qu'à l'intuition.

> Au passage : le trajet camion utilise **19,5 km** et non les 18 km prévus.
> C'est la distance réelle saisie par le transporteur — la preuve que le
> mécanisme `actual ?? planned` fonctionne.

---

## 5. Le tableau de bord d'aide à la décision

`POST /dashboard/allocations/check` — `ResourceAllocationService`.

C'est une **adaptation logistique de l'algorithme du banquier** (Dijkstra,
1965), conçu à l'origine pour éviter les interblocages dans l'allocation de
ressources partagées.

| Vocabulaire système | Équivalent LogiChain |
|---|---|
| processus | événement |
| type de ressource | catégorie d'équipement |
| *max claim* | besoin prévisionnel maximal |
| allocation | équipements déjà alloués |
| *available* | équipements `in_stock` du pool global |

Le service simule l'allocation demandée, puis vérifie qu'il existe encore au
moins une séquence d'événements permettant de satisfaire tous les besoins à
terme (**état sûr**). Si oui il accorde ; sinon il refuse avec un **HTTP 422**.

L'intérêt métier : éviter qu'un montage et un démontage simultanés sur deux
événements partageant le même parc ne se bloquent mutuellement.

---

## 6. Les métriques d'exploitation

`GET /dashboard/metrics` — **admin seulement**, car c'est une donnée technique
et non métier.

Le middleware `requestMetrics` écrit chaque requête dans une collection
**MongoDB Time Series**, et l'endpoint agrège la dernière heure par route :
nombre d'appels, moyenne, **p95** et maximum. Le p95 utilise l'accumulateur
`$percentile` de MongoDB 7.0.

---

## 7. Côté application mobile

`KpiScreen` consomme l'endpoint via TanStack Query :

```ts
const {data, isLoading, isError, refetch} = useQuery({
  queryKey: ['carbon', eventId],
  queryFn: () => dashboardApi.carbonFootprint(eventId as string),
  enabled: Boolean(eventId) && online,
});
```

L'écran affiche le total en grand, puis fabrication / transport / nombre
d'équipements / nombre de trajets, puis la ventilation par catégorie.

### Une limite assumée : les KPI ne fonctionnent pas hors ligne

C'est **le seul écran de l'application** qui exige une connexion, et il vaut
mieux le défendre que le cacher.

Un agrégat porte sur **tous** les équipements et **toutes** les routes de
l'événement. Le miroir local ne contient que le secteur assigné à l'agent, et
ne stocke ni les distances de routes ni les données d'achat. Calculer le KPI
localement donnerait un chiffre partiel — donc faux, et d'autant plus
dangereux qu'il aurait l'air juste.

L'écran affiche donc « Hors ligne — les KPI se chargent en ligne » plutôt que
d'inventer un total.

---

## 8. Les tests

```bash
cd ~/Cours/projet_logichain/logichain-api
npm test
```

**46 tests sur les services**, dont 22 sur les deux services carbone :

**`CarbonFootprintService`** — 13 tests, dont :
- l'amortissement au prorata de la durée
- la protection contre une durée de vie quasi nulle (division par zéro)
- l'usage de la distance réelle quand elle existe
- « le rail émet beaucoup moins qu'un camion équivalent » — le test qui
  verrouille la démonstration du §4
- l'arrondi de la durée au jour supérieur, minimum 1

**`AdemeFactorService`** — 9 tests, tous sur la robustesse :
- garder les replis si l'API ADEME renvoie une erreur
- garder les replis si le fetch lève une exception (timeout, réseau)
- **ignorer une valeur ADEME aberrante** (négative ou hors plage)
- ignorer les lignes qui ne sont pas des facteurs agrégés
- `refresh()` idempotent : deux appels concurrents ne déclenchent qu'un fetch
- `warmup()` ne propage jamais son erreur — un démarrage d'API ne doit pas
  échouer parce que l'ADEME est lente

---

## 9. Ce que le jury va demander

**« Vos facteurs sont-ils à jour ? »**
Ils viennent de l'API Open Data de l'ADEME, rafraîchis toutes les 24 h et
ciblés par identifiant. `GET /dashboard/emission-factors` montre la source de
chaque valeur ; je peux forcer un rafraîchissement en direct.

**« Et si l'ADEME est en panne ? »**
L'API continue de calculer. On sert la dernière valeur connue, et à défaut une
constante de repli documentée. Quatre tests couvrent ce chemin.

**« Pourquoi le train pollue-t-il le plus ? »**
Voir le §4 — 680 km contre 19,5, et 9,8 t contre 4,2. Par tonne-kilomètre il
est 14 fois plus propre, et il évite 360 kg de CO₂ sur ce trajet.

**« Pourquoi amortir la fabrication ? »**
Parce qu'imputer les 75 kg entiers d'une barrière à un festival de 4 jours
serait faux : elle servira 20 ans. On impute au prorata de l'usage.

**« Le calcul est-il rejoué à chaque fois ? »**
Oui, aucun agrégat n'est stocké. Le chiffre ne peut donc jamais être périmé.

**« Pourquoi le van et le camion électrique ne viennent-ils pas de l'ADEME ? »**
Le facteur ADEME du van est en kgCO₂e par km-véhicule, pas par tonne.km : il
est incompatible avec la formule. Pour le camion électrique, aucun facteur
« Valide générique / France continentale » n'existait en mai 2026. Dans les
deux cas c'est documenté dans le code, pas silencieux.

---

## Annexe — commandes de démonstration

```bash
# Se connecter en admin
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@logichain.fr","password":"LogiChain2026!"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')

# La source de chaque facteur
curl -s http://localhost:3000/api/v1/dashboard/emission-factors \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Le rapport carbone de l'événement (remplacer <ID>)
curl -s http://localhost:3000/api/v1/dashboard/events/<ID>/carbon-footprint \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Forcer un rafraîchissement ADEME devant le jury
curl -s -X POST http://localhost:3000/api/v1/dashboard/emission-factors/refresh \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

L'identifiant de l'événement s'obtient par `GET /api/v1/events`.
