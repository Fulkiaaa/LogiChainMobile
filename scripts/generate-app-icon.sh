#!/usr/bin/env bash
#
# Génère l'icône iOS à partir de assets/brand/logichain-mark.svg.
#
# N'utilise que des outils fournis par macOS — `qlmanage` pour rasteriser le
# SVG, `sips` pour rééchantillonner — afin de ne pas ajouter de dépendance au
# projet pour un asset généré trois fois par an.
#
#   ./scripts/generate-app-icon.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=assets/brand/logichain-mark.svg
DEST=ios/LogiChainMobile/Images.xcassets/AppIcon.appiconset
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

[ -f "$SRC" ] || { echo "source absente : $SRC — lancer d'abord node scripts/build-brand-svg.mjs"; exit 1; }

echo "Rastérisation de ${SRC}…"
qlmanage -t -s 1024 -o "$TMP" "$SRC" >/dev/null 2>&1
BASE="$TMP/$(basename "$SRC").png"
[ -f "$BASE" ] || { echo "échec de la rastérisation"; exit 1; }

# taille en points : échelle -> nom de fichier
declare -a ICONS=(
  "40:icon-20@2x.png"   "60:icon-20@3x.png"
  "58:icon-29@2x.png"   "87:icon-29@3x.png"
  "80:icon-40@2x.png"   "120:icon-40@3x.png"
  "120:icon-60@2x.png"  "180:icon-60@3x.png"
  "1024:icon-1024.png"
)

mkdir -p "$DEST"
for entree in "${ICONS[@]}"; do
  px="${entree%%:*}"; nom="${entree##*:}"
  cp "$BASE" "$DEST/$nom"
  sips -z "$px" "$px" "$DEST/$nom" >/dev/null
  # iOS refuse une icône avec canal alpha : on aplatit sur du blanc, ce qui ne
  # change rien puisque le fond du SVG est déjà un aplat opaque.
  sips -s format png --setProperty hasAlpha false "$DEST/$nom" >/dev/null 2>&1 || true
  printf "  %-18s %4s×%-4s\n" "$nom" "$px" "$px"
done
echo "Icône générée dans $DEST"
