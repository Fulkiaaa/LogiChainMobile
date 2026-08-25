#!/usr/bin/env bash
#
# Démonstration « les KPI sont vivants » — soutenance MP4.
#
#   ./demo-kpi.sh etat     état actuel de l'empreinte carbone
#   ./demo-kpi.sh alloc    alloue 3 équipements à l'événement  → le CO2 monte
#   ./demo-kpi.sh reset    les renvoie au stock                → le CO2 redescend
#
# L'allocation passe par POST /events/:id/allocate : une TRANSACTION ACID,
# tout-ou-rien sur le lot — le même endpoint présenté au MP3.
#
# Cible par défaut : la production. Pour viser l'API locale :
#   LOGICHAIN_API=http://localhost:3000/api/v1 ./demo-kpi.sh etat

set -euo pipefail

API="${LOGICHAIN_API:-https://api-logichain.fulkia.fr/api/v1}"
EMAIL="${LOGICHAIN_EMAIL:-responsable@logichain.fr}"
PASSWORD="${LOGICHAIN_PASSWORD:-LogiChain2026!}"

# Les 3 équipements les plus lourds encore en stock. Choisis pour que l'écart
# se voie : le groupe électrogène pèse à lui seul +5,84 kg.
QR_CODES=(LC-POWER-001 LC-SOUND-001 LC-SOUND-006)

rouge()  { printf '\033[31m%s\033[0m\n' "$*"; }
vert()   { printf '\033[32m%s\033[0m\n' "$*"; }
gras()   { printf '\033[1m%s\033[0m\n' "$*"; }

jq_get() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)"; }

login() {
  local body
  body=$(curl -sS -m 15 -X POST "$API/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
  TOKEN=$(printf '%s' "$body" | jq_get 'd.get("token","")')
  if [ -z "$TOKEN" ]; then
    rouge "Connexion refusée pour $EMAIL sur $API"
    printf '%s\n' "$body"
    exit 1
  fi
  # L'allocation est réservée à admin et logistics_manager (requireRole).
  ROLE=$(printf '%s' "$body" | jq_get 'd.get("user",{}).get("role","?")')
}

event_id() {
  curl -sS -m 15 -H "Authorization: Bearer $TOKEN" "$API/events?limit=20" \
    | jq_get '([e for e in d["data"] if e["status"]=="active"] or d["data"])[0]["id"]'
}

# Résout un code QR en identifiant Mongo : les ids diffèrent d'une base à
# l'autre, jamais les codes QR.
item_id() {
  curl -sS -m 15 -H "Authorization: Bearer $TOKEN" "$API/items/by-qr/$1" | jq_get 'd.get("id","")'
}

empreinte() {
  curl -sS -m 15 -H "Authorization: Bearer $TOKEN" "$API/dashboard/events/$1/carbon-footprint" \
    | python3 -c '
import sys,json
d=json.load(sys.stdin)
print("  total        %8.2f kg  (%s, %s jours)" % (d["totalCo2Kg"], d["eventName"], d["eventDurationDays"]))
print("  fabrication  %8.2f kg" % d["manufacturingCo2Kg"])
print("  transport    %8.2f kg" % d["transportCo2Kg"])
print("  équipements  %8d    dans le périmètre" % d["itemCount"])'
}

login
EV=$(event_id)

case "${1:-etat}" in

  etat)
    gras "Empreinte carbone — état actuel"
    empreinte "$EV"
    ;;

  alloc)
    gras "AVANT"
    empreinte "$EV"

    IDS=()
    for qr in "${QR_CODES[@]}"; do
      id=$(item_id "$qr")
      if [ -z "$id" ]; then rouge "Introuvable : $qr"; exit 1; fi
      IDS+=("\"$id\"")
    done
    PAYLOAD="{\"itemIds\":[$(IFS=,; echo "${IDS[*]}")]}"

    echo
    gras "POST /events/$EV/allocate   ($ROLE)"
    echo "  → ${QR_CODES[*]}"
    CODE=$(curl -sS -m 20 -o /tmp/logichain-alloc.json -w '%{http_code}' \
      -X POST "$API/events/$EV/allocate" \
      -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
      -d "$PAYLOAD")
    if [ "$CODE" != "200" ] && [ "$CODE" != "201" ]; then
      rouge "Refusé (HTTP $CODE) — rien n'a été alloué, la transaction a fait un rollback complet."
      cat /tmp/logichain-alloc.json; echo
      exit 1
    fi
    vert "  HTTP $CODE — lot alloué en une transaction"

    echo
    gras "APRÈS"
    empreinte "$EV"
    echo
    echo "  Rafraîchis l'onglet KPI sur le téléphone : le chiffre a bougé."
    echo "  Pour revenir à l'état initial :  ./demo-kpi.sh reset"
    ;;

  reset)
    gras "AVANT"
    empreinte "$EV"
    echo
    gras "Retour au stock (POST /items/:id/return)"
    for qr in "${QR_CODES[@]}"; do
      id=$(item_id "$qr")
      if [ -z "$id" ]; then rouge "  $qr introuvable"; continue; fi
      CODE=$(curl -sS -m 20 -o /tmp/logichain-return.json -w '%{http_code}' \
        -X POST "$API/items/$id/return" \
        -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
      if [ "$CODE" = "200" ]; then
        vert "  $qr → in_stock, détaché de l'événement"
      else
        rouge "  $qr : HTTP $CODE"
        cat /tmp/logichain-return.json; echo
      fi
    done
    echo
    gras "APRÈS"
    empreinte "$EV"
    echo
    echo "  L'empreinte est revenue à sa valeur d'origine."
    echo "  Le numéro de version et l'historique des équipements, eux, gardent la"
    echo "  trace des deux mouvements : c'est de la traçabilité, pas un défaut."
    ;;

  *)
    echo "Usage: $0 {etat|alloc|reset}" >&2
    exit 2
    ;;
esac
