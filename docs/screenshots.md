# Régénérer les captures du README

```bash
npm start            # terminal 1 — Metro doit tourner
npm run screenshots  # terminal 2
```

Le script rejoue le parcours de démonstration dans le simulateur iOS et réécrit
les huit images de `docs/screenshots/`. Compter une minute.

## Prérequis

| | |
|---|---|
| **Maestro** | l'outil qui pilote l'app. Installation ci-dessous. |
| **JDK 17+** | Maestro tourne sur la JVM. `brew install openjdk@17` |
| **L'app installée** | `npm run ios` au moins une fois sur le simulateur visé. |
| **Metro** | `npm start` dans un autre terminal. |

### Installer Maestro

Maestro n'est pas dans le dépôt Homebrew officiel. Son *tap* tiers fonctionne
(`brew tap mobile-dev-inc/tap && brew trust mobile-dev-inc/tap && brew install
maestro`), mais `brew trust` accorde une confiance **durable** à ce dépôt : tout
ce qu'il publiera ensuite s'installera sans question. L'archive seule, vérifiée,
suffit :

```bash
curl -fLo /tmp/maestro.zip \
  https://github.com/mobile-dev-inc/maestro/releases/download/cli-2.10.0/maestro.zip

# La somme est celle qu'Homebrew épingle lui-même pour cette version.
shasum -a 256 /tmp/maestro.zip
# → 29b675e10cc12080e445e9bfb2e2b4e4dfb9c0f2e30d5884120d258b5e1cd991

unzip -q /tmp/maestro.zip -d /tmp/maestro-extrait
mkdir -p ~/.maestro && cp -R /tmp/maestro-extrait/*/. ~/.maestro/
```

`scripts/screenshots.sh` ajoute lui-même `~/.maestro/bin` et le JDK d'Homebrew
au `PATH` : rien à mettre dans le `.zshrc`.

## Ce que fait le script, et pourquoi

**Il gèle la barre d'état** (`simctl status_bar override`) à 9:41, wifi plein,
batterie chargée. Sans ça, l'heure change à chaque exécution : Git verrait huit
images modifiées alors que l'interface n'a pas bougé d'un pixel, et les diffs
deviendraient illisibles. C'est la ligne la plus importante du script.

**Il impose le dossier de sortie de Maestro** (`--debug-output`) puis rapatrie
les PNG. Maestro écrit ses captures sous son propre dossier de run horodaté ;
le chemin donné à `takeScreenshot` n'est qu'un nom de fichier.

**Il recompte les images à la fin.** Maestro sort en code 0 même quand une
capture est noire. Le script vérifie qu'il y a bien huit fichiers de plus de
10 ko — ce qui attrape l'écran noir et l'écran d'erreur, mais **pas** une
capture simplement fausse. D'où la dernière ligne qu'il affiche : relis-les.

## Quand ça casse

Le parcours s'accroche à des **textes visibles**, l'app ne déclarant aucun
`testID`. Un libellé renommé fait échouer le flow — bruyamment, ce qui est le
comportement voulu : une capture périmée dans le README est pire qu'une
capture manquante. Trois pièges déjà rencontrés, tous commentés dans
`.maestro/screenshots.yaml` :

- **Maestro ancre ses regex.** `tapOn: "Profil"` échoue : iOS expose l'onglet
  comme « Profil, tab, 5 of 5 ». Il faut `'Profil, tab.*'`.
- **`clearState` ne vide pas le Keychain**, où vit le jeton de session. Sans
  `clearKeychain`, l'app rouvre déjà connectée.
- **iOS propose d'enregistrer le mot de passe** une seconde après la connexion.
  Cette alerte *système* rend toute la hiérarchie de l'app inatteignable :
  les assertions échouent alors sur des éléments pourtant visibles à l'écran.

Pour voir ce que Maestro voyait au moment de l'échec :

```bash
ls -t ~/.maestro/tests | head -1        # le dernier run
# puis regarder screenshots/ et maestro.log dedans
```

Et pour lister les sélecteurs réellement disponibles à l'écran :

```bash
maestro --device <UDID> hierarchy
```

## Ce qui n'est pas capturé

**Le mode hors-ligne** — pourtant le moment fort de la démonstration. Maestro ne
sait pas basculer le mode avion d'un simulateur iOS. À faire à la main si on y
tient.

**Le thème sombre.** Le parcours ne capture que le thème clair. L'ajouter
demanderait de repasser sur les huit écrans après avoir touché l'apparence dans
le profil — faisable, mais le dépôt doublerait de poids en images.

## Déterminisme

Les captures montrent les données réelles de l'API visée par
`src/config/env.ts` (la production par défaut). Rejouer le seed côté API change
les chiffres du tableau de bord et des KPI : ce n'est pas une panne, il faut
juste régénérer.
