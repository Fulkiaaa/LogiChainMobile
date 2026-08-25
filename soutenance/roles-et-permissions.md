# Rôles et permissions — qui peut faire quoi

> Le parcours de chaque rôle dans LogiChain, la façon dont l'interdiction est
> rendue visible à l'écran, et les tests qui prouvent que tout cela tient.
> **Relevé et vérifié le 25/08/2026 sur l'API locale ET sur la production.**

---

## 1. Le principe : l'API décide, l'app anticipe

Il faut tenir les deux phrases ensemble, c'est le cœur de la réponse au jury.

**L'API est l'autorité.** Chaque endpoint sensible porte une garde
`requireRole(...)`. Un client qui contourne l'interface — curl, Postman, une app
modifiée — se heurte quand même au 403. La sécurité ne dépend pas du client.

**L'application anticipe cette décision** pour ne jamais proposer un geste voué
à l'échec. Elle ne *remplace* pas la garde serveur, elle évite d'envoyer une
requête dont on connaît déjà l'issue.

Pourquoi c'est nécessaire ici, et pas seulement confortable : un **403 n'est pas
traité comme un conflit** par `decideReconcile` (seuls 409 et 422
`item.invalid_transition` le sont). Il tombe donc dans la branche « réessayer ».
L'action est rejouée **cinq fois** avec backoff, puis abandonnée et l'affichage
remis d'aplomb. Résultat sans garde côté app : **l'utilisateur voit son scan
disparaître, sans un mot d'explication.**

---

## 2. Le parcours de chaque rôle

Six gestes existent dans l'application mobile. Voici ce que chacun peut faire.

### Administrateur — 6 gestes sur 6

- Pointer un équipement
- Déclarer un chargement / transit
- Déployer sur site
- Signaler une anomalie
- Déclarer une perte
- **Créer des comptes utilisateurs** ← lui seul

### Responsable logistique — 5 sur 6

- Pointer, transit, déployer, anomalie, perte
- **Pas** la création de comptes

### Agent de terrain — 5 sur 6

- Pointer, transit, déployer, anomalie, perte
- **Pas** la création de comptes

> C'est le persona pour lequel l'app a été conçue : il a accès à tous les gestes
> métier, et à rien d'administratif.

### Transporteur — 4 sur 6

- Pointer, transit, anomalie, perte
- **Pas le déploiement** — il achemine, il n'installe pas sur site
- **Pas** la création de comptes

> Le constat d'anomalie et de perte lui reste ouvert : il est le mieux placé pour
> signaler une casse survenue pendant l'acheminement. Lui fermer ce geste ferait
> perdre l'information.

**Ce qui distingue vraiment les rôles dans l'app :** le déploiement sépare le
transporteur des trois autres ; la création de comptes isole l'admin. Les quatre
gestes de constat terrain sont ouverts à tous — et c'est délibéré.

---

## 3. Comment l'interdiction se voit à l'écran

Le principe retenu : **ne jamais masquer, toujours expliquer.** Un bouton qui
disparaît n'apprend rien — l'utilisateur ignore que la fonction existe, et ne
sait pas à qui s'adresser.

### Dans l'écran Scan

Le mode « Déploiement » reste affiché pour un transporteur, mais :

- **cadenas** à la place de l'icône du mode
- **bordure en pointillés** et libellé atténué — le pointillé se lit même en
  niveaux de gris, contrairement à une simple baisse d'opacité
- l'appui **ne fait rien** (aucune requête n'est émise)
- une ligne d'explication apparaît sous le sélecteur :

  > **Réservé à : Administrateur, Responsable logistique, Agent de terrain.
  > Vous êtes Transporteur.**

Cette phrase nomme les deux moitiés de l'information : **qui a le droit**, et
**ce que vous êtes**. Sans les deux, l'utilisateur sait qu'il est bloqué mais pas
pourquoi.

**Accessibilité** : le chip porte `accessibilityState={{disabled: true}}` et un
libellé explicite, mais reste un `Pressable`. Un `Pressable` réellement
`disabled` est ignoré par VoiceOver — l'utilisateur non-voyant ne saurait même
pas que le mode existe. C'est le *handler* qui refuse, pas le composant.

### Dans l'onglet Profil

Une section **Permissions** liste les six gestes :

- geste autorisé → coche verte
- geste interdit → cadenas, libellé **barré**, et la raison en dessous

Le barré double l'information portée par la couleur : lisible en niveaux de gris
et pour un daltonien.

C'est le parcours du rôle rendu visible **dans l'application elle-même** —
l'utilisateur peut à tout moment savoir ce que son compte lui permet.

---

## 4. Les tests — trois niveaux

### Niveau 1 — l'API : la matrice est verrouillée

`logichain-api/tests/unit/middlewares/permissionMatrix.test.ts`

Ce test **relit les gardes réellement branchées sur les routeurs Express** et les
compare à la matrice attendue. Il ne redocumente pas les permissions à côté du
code — il les extrait du code lui-même. Toute ouverture ou fermeture de droit
devient un échec de test explicite.

Il contient notamment :

```ts
it('field_agent et transporter ne sont plus interchangeables', () => { ... })
```

### Niveau 2 — l'app : la matrice locale et son rendu

| Fichier | Ce qu'il couvre | Tests |
|---|---|---|
| `src/domain/capabilities.test.ts` | la matrice, `can`, `whyNot`, le parcours de chaque rôle | 18 |
| `src/components/ModeSelector.test.tsx` | le mode interdit reste visible, n'émet rien, explique | 7 |
| `src/components/RolePermissions.test.tsx` | la liste complète, autorisés et interdits | 7 |

Le test de parcours est écrit comme une table lisible : ouvrir un droit sans
mettre la table à jour fait échouer le test.

```ts
const PARCOURS: Record<UserRole, readonly AppCapability[]> = {
  admin: ['scan', 'transit', 'deploy', 'anomaly', 'lost', 'manageUsers'],
  logistics_manager: ['scan', 'transit', 'deploy', 'anomaly', 'lost'],
  field_agent: ['scan', 'transit', 'deploy', 'anomaly', 'lost'],
  transporter: ['scan', 'transit', 'anomaly', 'lost'],
};
```

### Niveau 3 — la simulation : l'app et l'API disent-elles la même chose ?

`src/domain/parcours.integration.test.ts` — **c'est la pièce à montrer.**

Il se connecte réellement avec les 4 comptes de démo, tente chacun des 6 gestes,
et **compare la réponse du serveur à la matrice locale**. Si l'un des deux
dérive, le test casse.

```bash
npm run parcours        # contre l'API locale
npm run parcours:prod   # contre https://api-logichain.fulkia.fr
```

**Les deux passent : 24 tests, 24 verts.**

Sortie :

```
PARCOURS PAR RÔLE — relevé sur http://localhost:3000/api/v1

                        Administrate  Responsable   Agent de ter  Transporteur
  ──────────────────────────────────────────────────────────────────────────────
  Pointer un équipement permis 400    permis 400    permis 400    permis 400
  Déclarer un chargemen permis 404    permis 404    permis 404    permis 404
  Déployer sur site     permis 400    permis 400    permis 400    INTERDIT 403
  Signaler une anomalie permis 400    permis 400    permis 400    permis 400
  Déclarer une perte    permis 404    permis 404    permis 404    permis 404
  Créer des comptes uti permis 400    INTERDIT 403  INTERDIT 403  INTERDIT 403
```

#### Pourquoi la sonde n'abîme pas le jeu de démo

C'est le détail que le jury peut demander, et il est joli.

Toutes les requêtes visent un **identifiant d'équipement volontairement
inexistant**. Les middlewares Express s'exécutent dans l'ordre :

```
requireRole  →  validate  →  contrôleur  →  service  →  repository
```

Un rôle interdit est donc rejeté **avant toute lecture ou écriture en base**. Un
rôle autorisé, lui, traverse la garde et retombe sur un 400 (validation) ou un
404 (introuvable) — sans rien modifier non plus.

D'où la lecture :

| Code | Signification |
|---|---|
| **403** | refusé par la garde de rôle |
| 400 / 404 / 422 | la garde a laissé passer — c'est la validation ou le métier qui bloque |

> Première version de la sonde : elle envoyait un corps vide sur un **vrai**
> équipement. `transit` et `lost` l'ont accepté et l'item est passé de
> `deployed` v3 à `lost` v5. Le jeu de démo était abîmé. D'où l'identifiant
> inexistant — la garde de rôle se prononce quand même, et rien ne bouge.

#### Le test détecte-t-il vraiment une dérive ?

Vérifié en le cassant volontairement. En ajoutant `transporter` aux rôles
autorisés à déployer dans `capabilities.ts` :

```
✕ transporter · deploy : le serveur tranche comme la matrice de l'app
Tests: 1 failed, 23 passed, 24 total
```

Exactement le test attendu, et lui seul.

---

## 5. Où vit la matrice

**Une seule source de vérité côté app** : `src/domain/capabilities.ts`.

```ts
const ALLOWED: Record<AppCapability, readonly UserRole[] | null> = {
  scan: null,        // null = ouvert à tout compte authentifié
  transit: null,
  anomaly: null,
  lost: null,
  deploy: ['admin', 'logistics_manager', 'field_agent'],
  manageUsers: ['admin'],
};
```

`canManageUsers()` dans `roles.ts` délègue désormais à `can(role, 'manageUsers')`
au lieu de tester `role === 'admin'` de son côté : une règle, un endroit.

**Fermé par défaut** : tant que `/auth/me` n'a pas répondu, `role` vaut
`undefined` et `can()` renvoie `false`. Mieux vaut un geste grisé une seconde de
trop qu'un geste proposé puis rejeté par le serveur.

---

## 6. À dire au jury, en trois phrases

1. **« L'autorisation est portée par l'API »** — `requireRole` sur chaque
   endpoint sensible, et une matrice verrouillée par un test qui relit les
   gardes réellement branchées sur les routeurs.
2. **« L'application anticipe pour ne pas mentir à l'utilisateur »** — elle
   n'émet pas une requête dont elle connaît le refus, et surtout elle explique
   visuellement pourquoi le geste est fermé.
3. **« Et je prouve que les deux sont d'accord »** — `npm run parcours` compare
   les deux matrices contre une API réelle. Ça tourne aussi contre la
   production.

### Si on vous demande « et si quelqu'un modifie l'app ? »

La bonne réponse : **rien ne change.** Le grisage est du confort d'usage, pas une
mesure de sécurité. Le token JWT porte le rôle, il est signé côté serveur, et la
garde `requireRole` s'exécute sur chaque requête. Un client modifié se prend le
403 comme les autres.

---

## Annexe — commandes

| Commande | Où | Effet |
|---|---|---|
| `npm run parcours` | `LogiChainMobile` | simulation des 4 rôles contre l'API locale |
| `npm run parcours:prod` | `LogiChainMobile` | idem contre la production |
| `npm test` | `LogiChainMobile` | 158 tests (le parcours en est exclu : il lui faut une API) |
| `npm test` | `logichain-api` | 59 tests, dont la matrice de permissions |

> Le limiteur anti brute-force du login autorise **10 tentatives par 5 minutes**.
> Chaque exécution de `npm run parcours` consomme 4 connexions : deux lancements
> rapprochés passent, le troisième se heurte à un 429. Le test le signale
> explicitement au lieu d'échouer sans raison lisible.
