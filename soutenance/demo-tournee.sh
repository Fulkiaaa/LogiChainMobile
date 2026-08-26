#!/usr/bin/env bash
#
# Banc d'essai « faire une tournée » — soutenance MP4.
#
#   ./demo-tournee.sh etat      où en sont les 4 équipements de la tournée
#   ./demo-tournee.sh prepare   les remet tous en « Alloué » → tournée à faire
#
# La tournée RTE-2026-02 (camion électrique, Le Havre → Backstage) porte
# quatre projecteurs. `prepare` les ramène à l'état de départ pour rejouer le
# parcours complet : chargement, puis livraison.
#
# Remise à zéro en deux temps, imposée par la machine à états : `deployed` ne
# revient pas directement à `allocated`. On repasse donc par le stock
# (POST /items/:id/return, qui détache l'événement), puis on réalloue le lot en
# UNE transaction ACID (POST /events/:id/allocate) — l'endpoint du MP3.
#
# Après le test, les équipements restent « Déployé » : c'est l'état normal
# d'une tournée réussie. Relancer `prepare` pour rejouer.
#
#   LOGICHAIN_API=http://localhost:3000/api/v1 ./demo-tournee.sh etat   # API locale

set -euo pipefail

API="${LOGICHAIN_API:-https://api-logichain.fulkia.fr/api/v1}"
EMAIL="${LOGICHAIN_EMAIL:-responsable@logichain.fr}"
PASSWORD="${LOGICHAIN_PASSWORD:-LogiChain2026!}"

# Les quatre équipements affectés aux étapes de RTE-2026-02.
QR_CODES=(LC-LIGHT-007 LC-LIGHT-009 LC-LIGHT-011 LC-LIGHT-012)

rouge() { printf '\033[31m%s\033[0m\n' "$*"; }
vert()  { printf '\033[32m%s\033[0m\n' "$*"; }
gras()  { printf '\033[1m%s\033[0m\n' "$*"; }
jq_get() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)"; }

body=$(curl -sS -m 15 -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(printf '%s' "$body" | jq_get 'd.get("token","")')
if [ -z "$TOKEN" ]; then rouge "Connexion refusée pour $EMAIL sur $API"; exit 1; fi

EV=$(curl -sS -m 15 -H "Authorization: Bearer $TOKEN" "$API/events?limit=20" \
  | jq_get '([e for e in d["data"] if e["status"]=="active"] or d["data"])[0]["id"]')

fiche() {
  curl -sS -m 15 -H "Authorization: Bearer $TOKEN" "$API/items/by-qr/$1" \
    | python3 -c '
import sys,json
d=json.load(sys.stdin)
LABELS={"in_stock":"En stock","allocated":"Alloué","in_transit":"En transit",
        "deployed":"Déployé","in_maintenance":"Maintenance","lost":"Perdu"}
print("  %-14s %-24s %-12s v%s" % (d["qrCode"], d["label"][:24], LABELS.get(d["status"],d["status"]), d["version"]))'
}

etat() { gras "Les 4 équipements de RTE-2026-02"; for qr in "${QR_CODES[@]}"; do fiche "$qr"; done; }

case "${1:-etat}" in

  etat) etat ;;

  prepare)
    gras "AVANT"; etat; echo

    gras "1/2 — retour au stock"
    for qr in "${QR_CODES[@]}"; do
      id=$(curl -sS -m 15 -H "Authorization: Bearer $TOKEN" "$API/items/by-qr/$qr" | jq_get 'd.get("id","")')
      [ -z "$id" ] && { rouge "  $qr introuvable"; continue; }
      CODE=$(curl -sS -m 20 -o /tmp/lc-ret.json -w '%{http_code}' -X POST "$API/items/$id/return" \
        -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
      if [ "$CODE" = "200" ]; then vert "  $qr → En stock"
      else rouge "  $qr : HTTP $CODE"; cat /tmp/lc-ret.json; echo; fi
    done

    echo
    gras "2/2 — réallocation du lot (transaction ACID)"
    IDS=()
    for qr in "${QR_CODES[@]}"; do
      id=$(curl -sS -m 15 -H "Authorization: Bearer $TOKEN" "$API/items/by-qr/$qr" | jq_get 'd.get("id","")')
      [ -n "$id" ] && IDS+=("\"$id\"")
    done
    CODE=$(curl -sS -m 20 -o /tmp/lc-alloc.json -w '%{http_code}' -X POST "$API/events/$EV/allocate" \
      -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
      -d "{\"itemIds\":[$(IFS=,; echo "${IDS[*]}")]}")
    if [ "$CODE" = "200" ] || [ "$CODE" = "201" ]; then
      vert "  HTTP $CODE — les 4 sont alloués à l'événement, en un seul commit"
    else
      rouge "  Refusé (HTTP $CODE) — rollback complet, aucun n'est alloué."
      cat /tmp/lc-alloc.json; echo; exit 1
    fi

    echo; gras "APRÈS"; etat
    echo
    echo "  Sur le téléphone : Synchro → « Retélécharger le secteur »,"
    echo "  puis suis la procédure de tournee-test.html."
    ;;

  *) echo "Usage: $0 {etat|prepare}" >&2; exit 2 ;;
esac
