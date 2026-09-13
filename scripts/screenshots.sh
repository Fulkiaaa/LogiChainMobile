#!/usr/bin/env bash
#
# Régénère les captures d'écran du README depuis l'application réelle.
#
# Maestro sait naviguer et photographier ; il ne sait pas préparer le terrain.
# Ce script fait le reste : trouver un simulateur, vérifier que l'app et Metro
# sont là, et surtout GELER LA BARRE D'ÉTAT — sans quoi chaque exécution
# changerait l'heure affichée et Git verrait huit images modifiées pour rien.
#
# Usage :  npm run screenshots
#          SIMULATEUR="iPhone 17 Pro" npm run screenshots
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RACINE"

SORTIE="docs/screenshots"
FLOW=".maestro/screenshots.yaml"
APP_ID="org.reactjs.native.example.LogiChainMobile"
SIMULATEUR="${SIMULATEUR:-iPhone 17 Pro}"

echec() { printf '\n\033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }
etape() { printf '\033[36m→ %s\033[0m\n' "$1"; }

# ---------------------------------------------------------------- prérequis

# Maestro s'installe dans ~/.maestro, qui n'est pas dans le PATH par défaut :
# on l'y ajoute nous-mêmes plutôt que d'exiger une ligne dans le .zshrc, sinon
# le script marche chez celui qui l'a écrit et nulle part ailleurs.
[ -d "$HOME/.maestro/bin" ] && PATH="$HOME/.maestro/bin:$PATH"

command -v maestro >/dev/null 2>&1 || echec \
  "Maestro n'est pas installé. Voir docs/screenshots.md"

# Maestro tourne sur la JVM. macOS n'expose aucun java par défaut, et l'openjdk
# d'Homebrew est « keg-only » — installé, mais délibérément hors du PATH pour
# ne pas entrer en conflit avec un JDK système. On le désigne explicitement.
if ! java -version >/dev/null 2>&1; then
  for jdk in /opt/homebrew/opt/openjdk@17 /opt/homebrew/opt/openjdk; do
    [ -x "$jdk/bin/java" ] && { export JAVA_HOME="$jdk"; PATH="$jdk/bin:$PATH"; break; }
  done
fi
java -version >/dev/null 2>&1 || echec \
  "Aucun JDK trouvé (Maestro en a besoin).  brew install openjdk@17"

# --- Un simulateur démarré, sinon on en démarre un.
UDID="$(xcrun simctl list devices booted -j \
  | python3 -c 'import json,sys
d=json.load(sys.stdin)["devices"]
print(next((a["udid"] for v in d.values() for a in v), ""))')"

if [ -z "$UDID" ]; then
  etape "Aucun simulateur démarré, démarrage de « $SIMULATEUR »"
  xcrun simctl boot "$SIMULATEUR" >/dev/null 2>&1 || echec \
    "Impossible de démarrer « $SIMULATEUR ». Liste : xcrun simctl list devices available"
  open -a Simulator
  UDID="$(xcrun simctl list devices booted -j \
    | python3 -c 'import json,sys
d=json.load(sys.stdin)["devices"]
print(next((a["udid"] for v in d.values() for a in v), ""))')"
fi
etape "Simulateur : $UDID"

# --- L'app doit être installée. La construire ici prendrait 8 minutes et
#     masquerait la vraie cause quand le build échoue : on préfère le dire.
xcrun simctl get_app_container "$UDID" "$APP_ID" >/dev/null 2>&1 || echec \
  "L'application n'est pas installée sur ce simulateur. Lance d'abord : npm run ios"

# --- Metro sert le JS en debug. Sans lui, l'app s'ouvre sur un écran rouge et
#     les captures seraient huit photos d'une erreur.
if ! curl -s -m 2 http://localhost:8081/status 2>/dev/null | grep -q 'packager-status:running'; then
  echec "Metro ne tourne pas. Dans un autre terminal : npm start"
fi
etape "Metro répond sur 8081"

# ------------------------------------------------------- barre d'état figée

# 9:41 est l'heure des présentations Apple depuis 2007 ; ce qui compte ici est
# surtout qu'elle soit CONSTANTE. Le `trap` la restaure même si Maestro échoue :
# laisser un simulateur figé à 9:41 après un échec serait déroutant.
restaurer() { xcrun simctl status_bar "$UDID" clear >/dev/null 2>&1 || true; }
trap restaurer EXIT

xcrun simctl status_bar "$UDID" override \
  --time "9:41" \
  --dataNetwork wifi \
  --wifiMode active \
  --wifiBars 3 \
  --cellularMode active \
  --cellularBars 4 \
  --batteryState charged \
  --batteryLevel 100
etape "Barre d'état figée (9:41, wifi plein, batterie 100 %)"

# ------------------------------------------------------------------ capture

mkdir -p "$SORTIE"
etape "Parcours Maestro en cours…"

# Maestro ne sait pas écrire ailleurs que dans son dossier de run, dont le nom
# est horodaté (~/.maestro/tests/2026-09-12_111139/…). Plutôt que de deviner ce
# nom après coup, on impose le dossier — et on le rapatrie nous-mêmes.
DEBUG_DIR="$(mktemp -d)"
nettoyer() { restaurer; rm -rf "$DEBUG_DIR"; }
trap nettoyer EXIT

maestro --device "$UDID" test --debug-output "$DEBUG_DIR" "$FLOW"

# On CHERCHE le dossier plutôt que de coder son chemin : même avec
# `--debug-output`, Maestro y recrée une arborescence horodatée
# (<dir>/.maestro/tests/2026-09-12_111428/screenshots/takeScreenshot/). Coder
# ce nid en dur, c'est signer pour le réparer à la prochaine version.
CAPTURES="$(find "$DEBUG_DIR" -type d -name takeScreenshot | head -1)"
[ -n "$CAPTURES" ] || echec \
  "Maestro n'a produit aucun dossier « takeScreenshot » sous $DEBUG_DIR.
   Son arborescence de sortie a changé : regarde ce dossier et adapte la
   recherche ci-dessus."

rm -f "$SORTIE"/*.png
cp "$CAPTURES"/*.png "$SORTIE"/
etape "Captures rapatriées dans $SORTIE/"

# ----------------------------------------------------------- vérifications

# Maestro sort en 0 même quand une capture est vide : on recompte nous-mêmes.
# Ancré sur « ^- » : le flow PARLE aussi de takeScreenshot dans ses commentaires,
# et un compteur qui les inclut attendrait une capture de plus qu'il n'en existe.
ATTENDUES="$(grep -c '^- takeScreenshot:' "$FLOW")"
OBTENUES="$(find "$SORTIE" -name '*.png' -size +10k | wc -l | tr -d ' ')"

[ "$OBTENUES" -eq "$ATTENDUES" ] || echec \
  "$OBTENUES capture(s) exploitable(s) sur $ATTENDUES attendues dans $SORTIE/.
   Une image manquante ou sous 10 ko est le symptôme d'un écran noir ou d'un
   écran d'erreur : ouvre $SORTIE/ et regarde."

printf '\n\033[32m✓ %s captures dans %s/\033[0m\n' "$OBTENUES" "$SORTIE"
ls -la "$SORTIE"/*.png | awk '{printf "  %-46s %6.0f ko\n", $9, $5/1024}'

printf '\n  Relis-les avant de committer : le script vérifie leur poids,\n'
printf '  pas leur contenu.\n'
