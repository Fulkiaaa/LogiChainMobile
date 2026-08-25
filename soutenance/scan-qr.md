# Scanner un QR code — à quoi s'attendre

> Ce qui se passe exactement quand un code passe devant la caméra, les cinq
> raisons pour lesquelles un scan peut être refusé, et la liste des QR à
> utiliser pendant la démonstration.
> **Relevé et vérifié le 25/08/2026 sur l'API locale.**

---

## 1. Le chemin d'un scan, étape par étape

Tout se joue **hors réseau**. `useScanner` enchaîne cinq contrôles, dans cet
ordre, et le premier qui échoue arrête tout.

```
   QR détecté par la caméra
            │
            ▼
   ① Anti-doublon (1,5 s) ──────── déjà vu ─────►  RIEN (silencieux)
            │
            ▼
   ② Cache SQLite : findByQrCode ── inconnu ─────►  ✗ bip d'échec, ligne rouge
            │
            ▼
   ③ Position GPS ──────────────── indisponible ►  ✗ « (pas de GPS) »
            │
            ▼
   ④ Machine à états ───────────── interdite ────►  ✗ « in_stock → deployed interdit »
            │
            ▼
   ⑤ Outbox : file locale + statut appliqué      ►  ✓ bip de succès, vibration, +1
```

Un sixième contrôle vient **avant** tout ça : le rôle. Un transporteur ne peut
pas sélectionner le mode Déploiement — le mode est verrouillé, cadenassé, avec
sa raison affichée. Voir `roles-et-permissions.md`.

### Ce que tu perçois dans chaque cas

| Cas | Son | Écran | Compteur |
|---|---|---|---|
| Doublon (< 1,5 s) | **rien** | **rien** | inchangé |
| QR inconnu | bip d'échec | `✗ LC-XXXX-000` en rouge | inchangé |
| GPS indisponible | bip d'échec | `✗ Enceinte façade (pas de GPS)` | inchangé |
| Transition interdite | bip d'échec | `✗ Barrière — in_stock → deployed interdit` | inchangé |
| **Succès** | bip de succès + vibration | `✓ Barrière Vauban 2m` en vert | **+1**, « en attente » +1 |

> Le bip passe par `Sound.setCategory('Playback')` et non `'Ambient'` : un
> scanner de terrain doit rester audible même sonnerie coupée.

### Deux subtilités qui surprennent

**L'anti-doublon est silencieux.** C'est volontaire. La fenêtre de 1,5 s court
depuis la **dernière vue** du code, pas depuis le dernier scan accepté : tant
que le QR reste dans le champ, chaque image repousse l'échéance. Il faut que le
code sorte du champ pendant 1,5 s pour être réaccepté. Sans ça, viser un QR en
continu le réenfilait plusieurs fois par seconde.

**Le statut change immédiatement, avant toute synchro.** L'affichage est
optimiste : l'outbox mémorise le statut précédent (`previousStatus`) pour
pouvoir revenir en arrière si la synchronisation échoue définitivement.

---

## 2. La matrice — statut × mode

C'est la table à connaître. Elle découle directement de `ALLOWED_TRANSITIONS`.

| Statut de l'équipement | Pointage | Transit | Déploiement |
|---|---|---|---|
| En stock | ✓ | ✗ | ✗ |
| Alloué | ✓ | **✓** | ✗ |
| En transit | ✓ | ✗ | **✓** |
| Déployé | ✓ | **✓** | ✗ |
| Maintenance | ✓ | ✗ | ✗ |
| Perdu | ✓ | ✗ | ✗ |

Trois choses à en retenir :

**Le Pointage marche toujours.** Il ne change aucun statut — il enregistre juste
un passage dans l'historique. C'est le mode le plus sûr pour une démonstration.

**Le Déploiement n'accepte qu'un équipement `En transit`.** C'est le mode le
plus restrictif : sur les 51 équipements du secteur, **10 seulement** y sont
éligibles. Scanner au hasard en mode Déploiement a donc 4 chances sur 5
d'échouer.

**On ne peut pas redéployer.** `deployed → deployed` n'existe pas dans la
machine à états : rescanner en Déploiement un équipement déjà posé est un geste
sans effet, donc refusé.

Le Pointage reste accepté sur un équipement **perdu**, et c'est voulu : pointer
du matériel déclaré perdu qu'on vient de retrouver doit laisser une trace.

---

## 3. ⚠️ Le piège : 15 QR codes existent mais ne sont pas dans l'app

L'application ne synchronise **que les équipements de l'événement assigné**
(`itemsApi.listByEvent` → `/items?eventId=…`).

| | |
|---|---|
| Équipements dans l'API | **66** |
| Rattachés au Festival Vert 2026 → **dans le cache** | **51** |
| Sans événement assigné → **invisibles pour l'app** | **15** |

Scanner un de ces 15 affiche **« QR inconnu »** en rouge. Ce n'est pas un bug :
un agent de terrain n'a pas à toucher au matériel d'un autre secteur. Mais il
faut le savoir avant la soutenance.

**Les 15 à éviter :**

```
LC-FENCE-001   LC-FENCE-003   LC-FENCE-006   LC-FENCE-008   LC-LIGHT-008
LC-POWER-001   LC-POWER-003   LC-SOUND-001   LC-SOUND-003   LC-SOUND-006
LC-SOUND-008   LC-STAGE-001   LC-STAGE-006   LC-STAGE-008   LC-TENT-005
```

> C'est d'ailleurs une bonne démonstration en soi : scanne volontairement
> `LC-SOUND-001` pour montrer le rejet, puis explique que le cache local ne
> contient que le secteur de l'agent. Ça prouve que la résolution se fait
> **hors ligne, en local**, et pas par un appel réseau.

---

## 4. Les QR à scanner pendant la soutenance

Ceux-ci sont dans le cache **et** dans un état compatible.

### Mode Déploiement — 10 équipements éligibles

```
LC-FENCE-007     En transit     Barrière Vauban 2m
LC-FURN-003      En transit     Table pliante pro
LC-LIGHT-005     En transit     Projecteur LED 200W
```

### Mode Transit — 41 équipements éligibles

```
LC-FENCE-002     Déployé        Barrière Vauban 2m
LC-FENCE-004     Alloué         Barrière Vauban 2m
LC-FENCE-005     Déployé        Barrière Vauban 2m
```

### Mode Pointage — les 51 du secteur

N'importe lequel fonctionne.

### Le scénario de démonstration recommandé

1. **`LC-FENCE-007` en mode Déploiement** → ✓ vert, le statut passe à Déployé
2. **Le même, rescanné tout de suite** → rien, l'anti-doublon l'absorbe
3. **Le même après 2 s, toujours en Déploiement** → ✗ « in_transit → deployed
   interdit »… non : il est maintenant `deployed`, donc « deployed → deployed
   interdit ». On ne redéploie pas ce qui est posé.
4. **`LC-SOUND-001`** → ✗ « QR inconnu » — le cache ne contient que le secteur
5. **Mode avion, puis `LC-FENCE-004` en Transit** → ✓ vert quand même, le
   compteur « en attente » monte

---

## 5. Les QR codes physiques : `npm run qr`

Les QR codes n'existaient nulle part — ce sont de simples chaînes en base
(`LC-FENCE-007`). Cette commande en fabrique de vrais :

```bash
npm run qr          # depuis l'API locale
npm run qr:prod     # depuis la production
```

Elle écrit **`soutenance/qr-codes.html`** : une planche autonome, avec les QR
en SVG intégré. Aucune requête réseau à l'ouverture — elle marche hors ligne et
à l'impression.

Trois sections :

| Section | Contenu |
|---|---|
| **Planche de démonstration** | 7 codes en grand : 3 pour le Déploiement, 3 pour le Transit, 1 hors secteur marqué « DOIT ÊTRE REJETÉ » |
| **Parc du secteur** | les 51 équipements connus de l'app |
| **Hors secteur** | les 15 qui donneront « QR inconnu », encadrés en rouge |

Chaque vignette porte le code, le libellé, le statut courant et **les modes qui
fonctionnent**, en vert ou barrés. Les statuts sont calculés avec la même
fonction `resolveScanAction` que l'application : la planche ne peut pas annoncer
un résultat que l'app ne produirait pas.

**Deux façons de s'en servir :**

- ouvrir la page sur le Mac et scanner l'écran avec l'iPhone — le plus simple,
  et ça marche très bien ;
- l'imprimer et coller les vignettes sur des objets, pour une démonstration plus
  proche du terrain.

> Le fond est forcé en blanc quel que soit le thème du système : un QR code se
> lit sombre sur clair, et l'inverse fait échouer beaucoup de lecteurs.
> La correction d'erreur est au niveau **H** (30 %), pour résister aux reflets
> d'écran et à un scan de biais.

> ⚠️ La planche reflète les statuts **au moment où elle est générée**. Après un
> `npm run seed` ou une démonstration qui a modifié des statuts, relance
> `npm run qr`.

---

## 6. La simulation : `npm run scan`

Pour ne rien apprendre par cœur, une simulation imprime tout ça à partir des
**vraies données** :

```bash
cd ~/Cours/projet_logichain/logichain-front/LogiChainMobile
npm run scan        # contre l'API locale
npm run scan:prod   # contre la production
```

Elle appelle la **vraie fonction `resolveScanAction`**, celle que l'application
exécute — sa sortie ne peut donc pas diverger du comportement réel. Elle
imprime :

- la matrice statut × mode
- les QR à utiliser, par mode
- le détail QR par QR, pour les 51 du secteur
- la liste des équipements hors secteur

Elle porte aussi **une assertion qui compte vraiment** :

```
mode Déploiement : au moins un QR permet de le démontrer
```

Si un reseed laissait le parc sans aucun équipement `En transit`, le mode
Déploiement deviendrait indémontrable — et le test échouerait **avant** la
soutenance plutôt que devant le jury.

---

## 7. Les tests

```bash
npm test                        # 32 suites, la matrice incluse
npm run scan                    # la simulation (API requise)
```

`src/domain/scanAction.test.ts` couvre désormais **les 18 cas** de la matrice
(6 statuts × 3 modes), plus le contenu exact de l'action envoyée à l'outbox et
le texte du motif de refus — celui qui s'affiche sous la caméra doit dire
*pourquoi*, pas seulement *que* ça a échoué.

Avant, ce fichier n'avait que 3 tests. Les 18 cas passent tous : le code est
conforme à la machine à états, aucun écart trouvé.

---

## Annexe — sur simulateur, sans caméra

Le simulateur iOS n'a pas de caméra. L'écran Scan le détecte et affiche
*« Caméra indisponible (permission refusée ou simulateur). Utilisez la saisie
manuelle. »*

Le champ en bas d'écran accepte le code au clavier, et **tout le reste du
parcours est identique** : anti-doublon, résolution locale, machine à états,
outbox, synchronisation. La caméra n'est qu'une source d'entrée parmi d'autres.
