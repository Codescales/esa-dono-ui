#!/usr/bin/env bash
set -e

BASE=${1:-http://172.20.1.103:3001}
KEY=change-me

echo "==> Seeding $BASE"

# Wait for server to be ready
echo -n "Waiting for server..."
for i in $(seq 1 30); do
  curl -sf "$BASE/api/health" > /dev/null 2>&1 && break
  echo -n "."
  sleep 1
done
echo " ready."

# --- Events ---
echo "==> Creating events..."
E_MAIN=$(curl -sf -X POST $BASE/api/admin/events \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d '{"name":"Main Marathon","is_active":true}' | jq -r .id)

E_BONUS=$(curl -sf -X POST $BASE/api/admin/events \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d '{"name":"Bonus Stream","is_active":true}' | jq -r .id)

echo "   Events: $E_MAIN (Main Marathon) $E_BONUS (Bonus Stream)"

# --- Rewards ---
# Shoutouts and the Discord role are left shared (no event_id) — available
# from either event's donate flow. The t-shirt and game pick are scoped to
# the Main Marathon, to demonstrate an event-specific incentive.
echo "==> Creating rewards..."
R_SHOUT=$(curl -sf -X POST $BASE/api/admin/rewards \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d '{"title":"Shoutout on Stream","description":"Get shouted out live during the broadcast","type":"SHOUTOUT","cost_cents":500,"is_active":true}' | jq -r .id)

R_DISC=$(curl -sf -X POST $BASE/api/admin/rewards \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d '{"title":"Exclusive Discord Role","description":"Permanent donor role in the ESA Discord","type":"DIGITAL","cost_cents":1000,"quantity_total":50,"is_active":true}' | jq -r .id)

R_SHIRT=$(curl -sf -X POST $BASE/api/admin/rewards \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d "{\"title\":\"ESA T-Shirt\",\"description\":\"Official ESA charity event t-shirt, shipped to you\",\"type\":\"PHYSICAL\",\"cost_cents\":2500,\"quantity_total\":20,\"is_active\":true,\"event_id\":\"$E_MAIN\"}" | jq -r .id)

R_GAME=$(curl -sf -X POST $BASE/api/admin/rewards \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d "{\"title\":\"Pick the Next Game\",\"description\":\"Choose the next game the runners play\",\"type\":\"CUSTOM\",\"cost_cents\":5000,\"quantity_total\":1,\"is_active\":true,\"custom_type_label\":\"Your game pick\",\"event_id\":\"$E_MAIN\"}" | jq -r .id)

echo "   Rewards: $R_SHOUT $R_DISC $R_SHIRT $R_GAME"

# --- Polls ---
# P1 (pick the finale game) belongs to the Main Marathon; P2 (bonus
# challenge) belongs to the Bonus Stream — each only shows up once its
# event is selected on /donate.
echo "==> Creating polls..."
P1_JSON=$(curl -sf -X POST $BASE/api/admin/polls \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d "{\"title\":\"Which game should be the finale run?\",\"description\":\"Vote with your donor balance — \$1 = 1 vote\",\"is_active\":true,\"event_id\":\"$E_MAIN\",\"options\":[{\"label\":\"Celeste\"},{\"label\":\"Hollow Knight\"},{\"label\":\"Hades\"},{\"label\":\"Disco Elysium\"}]}")
P2_JSON=$(curl -sf -X POST $BASE/api/admin/polls \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d "{\"title\":\"Bonus challenge for the speedrun?\",\"description\":\"Pick what happens during the bonus block\",\"is_active\":true,\"event_id\":\"$E_BONUS\",\"options\":[{\"label\":\"Blindfolded segment\"},{\"label\":\"Developers commentary\"},{\"label\":\"Donation war: blinds vs. no blinds\"},{\"label\":\"Community race\"}]}")

P1=$(echo $P1_JSON | jq -r .id)
P2=$(echo $P2_JSON | jq -r .id)

OPT_CELESTE=$(echo $P1_JSON      | jq -r '.options[] | select(.label=="Celeste")              | .id')
OPT_HOLLOW=$(echo $P1_JSON       | jq -r '.options[] | select(.label=="Hollow Knight")        | .id')
OPT_HADES=$(echo $P1_JSON        | jq -r '.options[] | select(.label=="Hades")                | .id')
OPT_DISCO=$(echo $P1_JSON        | jq -r '.options[] | select(.label=="Disco Elysium")        | .id')
OPT_BLIND=$(echo $P2_JSON        | jq -r '.options[] | select(.label=="Blindfolded segment")  | .id')
OPT_DEV=$(echo $P2_JSON          | jq -r '.options[] | select(.label=="Developers commentary")| .id')
OPT_RACE=$(echo $P2_JSON         | jq -r '.options[] | select(.label=="Community race")       | .id')

echo "   Polls: $P1 $P2"

# --- Goals ---
# G1 (bonus couch stream) belongs to the Bonus Stream; G2 and G3 are left
# shared (fed by donations to either event).
echo "==> Creating goals..."
G1=$(curl -sf -X POST $BASE/api/admin/goals \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d "{\"title\":\"Unlock Bonus Couch Stream\",\"description\":\"Hit this goal and the team does an extra 2-hour couch commentary stream\",\"target_cents\":100000,\"is_active\":true,\"event_id\":\"$E_BONUS\"}" | jq -r .id)

G2=$(curl -sf -X POST $BASE/api/admin/goals \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d '{"title":"Runner Pizza Fund","description":"Keep the runners fed throughout the event","target_cents":25000,"is_active":true}' | jq -r .id)

G3=$(curl -sf -X POST $BASE/api/admin/goals \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d '{"title":"Charity Milestone — $5,000 Total","description":"Overall donation milestone for the event","target_cents":500000,"is_active":true}' | jq -r .id)

echo "   Goals: $G1 $G2 $G3"

# --- Donations (creates donors) ---
# Uses /api/admin/simulate-donation (rather than a raw webhook payload) so
# each donation can carry an event_id, giving the admin dashboard's
# per-event totals something to show. Alice/Dave donate to the Main
# Marathon, Bob/Carol to the Bonus Stream, Eve donates without an event
# (simulating a legacy/direct donation not tied to either).
echo "==> Simulating donations..."
sim_donation() {
  local email=$1 name=$2 cents=$3 event=$4
  local body
  if [ -n "$event" ]; then
    body=$(printf '{"email":"%s","donor_name":"%s","amount_cents":%s,"event_id":"%s"}' "$email" "$name" "$cents" "$event")
  else
    body=$(printf '{"email":"%s","donor_name":"%s","amount_cents":%s}' "$email" "$name" "$cents")
  fi
  curl -sf -X POST $BASE/api/admin/simulate-donation \
    -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
    -d "$body"
}

ALICE=$(sim_donation "alice@example.com" "Alice Speedrun" 10000 "$E_MAIN" | jq -r .token)
BOB=$(sim_donation "bob@example.com" "Bob Gamer" 5000 "$E_BONUS" | jq -r .token)
CAROL=$(sim_donation "carol@example.com" "Carol Plays" 2500 "$E_BONUS" | jq -r .token)
DAVE=$(sim_donation "dave@example.com" "Dave" 20000 "$E_MAIN" | jq -r .token)
EVE=$(sim_donation "eve@example.com" "Eve the Runner" 7500 "" | jq -r .token)
sim_donation "alice@example.com" "Alice Speedrun" 3000 "$E_MAIN" > /dev/null
echo "   6 donations created (Alice/Dave -> Main Marathon, Bob/Carol -> Bonus Stream, Eve -> no event)."

# --- Reward claims ---
echo "==> Claiming rewards..."
curl -sf -X POST "$BASE/api/rewards/$R_SHOUT/claim?token=$ALICE" -H "Content-Type: application/json" \
  -d '{"claim_data":{"message":"Shoutout to my cat Mittens!"}}' > /dev/null
curl -sf -X POST "$BASE/api/rewards/$R_DISC/claim?token=$ALICE"  -H "Content-Type: application/json" \
  -d '{"claim_data":{}}' > /dev/null
curl -sf -X POST "$BASE/api/rewards/$R_SHIRT/claim?token=$DAVE"  -H "Content-Type: application/json" \
  -d '{"claim_data":{"name":"Dave Smith","address":"123 Main St","city":"Portland","country":"US"}}' > /dev/null
curl -sf -X POST "$BASE/api/rewards/$R_GAME/claim?token=$DAVE"   -H "Content-Type: application/json" \
  -d '{"claim_data":{"your_game_pick":"Outer Wilds"}}' > /dev/null
curl -sf -X POST "$BASE/api/rewards/$R_SHOUT/claim?token=$BOB"   -H "Content-Type: application/json" \
  -d '{"claim_data":{"message":"Bob was here!"}}' > /dev/null
echo "   5 claims created."

# --- Poll votes ---
echo "==> Voting on polls..."
curl -sf -X POST "$BASE/api/polls/$P1/vote?token=$ALICE" -H "Content-Type: application/json" -d "{\"poll_option_id\":\"$OPT_CELESTE\",\"amount_cents\":2000}" > /dev/null
curl -sf -X POST "$BASE/api/polls/$P1/vote?token=$DAVE"  -H "Content-Type: application/json" -d "{\"poll_option_id\":\"$OPT_HOLLOW\",\"amount_cents\":3000}" > /dev/null
curl -sf -X POST "$BASE/api/polls/$P1/vote?token=$BOB"   -H "Content-Type: application/json" -d "{\"poll_option_id\":\"$OPT_HADES\",\"amount_cents\":1500}" > /dev/null
curl -sf -X POST "$BASE/api/polls/$P1/vote?token=$CAROL" -H "Content-Type: application/json" -d "{\"poll_option_id\":\"$OPT_CELESTE\",\"amount_cents\":1000}" > /dev/null
curl -sf -X POST "$BASE/api/polls/$P1/vote?token=$EVE"   -H "Content-Type: application/json" -d "{\"poll_option_id\":\"$OPT_DISCO\",\"amount_cents\":2000}" > /dev/null
curl -sf -X POST "$BASE/api/polls/$P2/vote?token=$DAVE"  -H "Content-Type: application/json" -d "{\"poll_option_id\":\"$OPT_BLIND\",\"amount_cents\":5000}" > /dev/null
curl -sf -X POST "$BASE/api/polls/$P2/vote?token=$ALICE" -H "Content-Type: application/json" -d "{\"poll_option_id\":\"$OPT_DEV\",\"amount_cents\":2000}" > /dev/null
curl -sf -X POST "$BASE/api/polls/$P2/vote?token=$EVE"   -H "Content-Type: application/json" -d "{\"poll_option_id\":\"$OPT_RACE\",\"amount_cents\":2500}" > /dev/null
echo "   8 votes cast."

# --- Goal contributions ---
echo "==> Contributing to goals..."
curl -sf -X POST "$BASE/api/goals/$G1/contribute?token=$DAVE"  -H "Content-Type: application/json" -d '{"amount_cents":4000}' > /dev/null
curl -sf -X POST "$BASE/api/goals/$G1/contribute?token=$ALICE" -H "Content-Type: application/json" -d '{"amount_cents":2000}' > /dev/null
curl -sf -X POST "$BASE/api/goals/$G1/contribute?token=$EVE"   -H "Content-Type: application/json" -d '{"amount_cents":1500}' > /dev/null
curl -sf -X POST "$BASE/api/goals/$G2/contribute?token=$BOB"   -H "Content-Type: application/json" -d '{"amount_cents":2000}' > /dev/null
curl -sf -X POST "$BASE/api/goals/$G2/contribute?token=$CAROL" -H "Content-Type: application/json" -d '{"amount_cents":1000}' > /dev/null
curl -sf -X POST "$BASE/api/goals/$G3/contribute?token=$ALICE" -H "Content-Type: application/json" -d '{"amount_cents":2000}' > /dev/null
echo "   6 contributions made."

# --- Summary ---
echo ""
echo "==> Done. Summary:"
curl -sf $BASE/api/admin/stats -H "X-Admin-Key: $KEY" | jq .
echo ""
echo "Events:       Main Marathon ($E_MAIN), Bonus Stream ($E_BONUS)"
echo "Alice wallet: $BASE/wallet?token=$ALICE"
echo "Dave wallet:  $BASE/wallet?token=$DAVE"
echo "Admin panel:  ${BASE/3001/5173}/admin  (key: $KEY)"
