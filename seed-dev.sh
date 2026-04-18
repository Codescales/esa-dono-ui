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

# --- Rewards ---
echo "==> Creating rewards..."
R_SHOUT=$(curl -sf -X POST $BASE/api/admin/rewards \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d '{"title":"Shoutout on Stream","description":"Get shouted out live during the broadcast","type":"SHOUTOUT","cost_cents":500,"is_active":true}' | jq -r .id)

R_DISC=$(curl -sf -X POST $BASE/api/admin/rewards \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d '{"title":"Exclusive Discord Role","description":"Permanent donor role in the ESA Discord","type":"DIGITAL","cost_cents":1000,"quantity_total":50,"is_active":true}' | jq -r .id)

R_SHIRT=$(curl -sf -X POST $BASE/api/admin/rewards \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d '{"title":"ESA T-Shirt","description":"Official ESA charity event t-shirt, shipped to you","type":"PHYSICAL","cost_cents":2500,"quantity_total":20,"is_active":true}' | jq -r .id)

R_GAME=$(curl -sf -X POST $BASE/api/admin/rewards \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d '{"title":"Pick the Next Game","description":"Choose the next game the runners play","type":"CUSTOM","cost_cents":5000,"quantity_total":1,"is_active":true,"custom_type_label":"Your game pick"}' | jq -r .id)

echo "   Rewards: $R_SHOUT $R_DISC $R_SHIRT $R_GAME"

# --- Polls ---
echo "==> Creating polls..."
P1_JSON=$(curl -sf -X POST $BASE/api/admin/polls \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d '{"title":"Which game should be the finale run?","description":"Vote with your donor balance — $1 = 1 vote","is_active":true,"options":[{"label":"Celeste"},{"label":"Hollow Knight"},{"label":"Hades"},{"label":"Disco Elysium"}]}')
P2_JSON=$(curl -sf -X POST $BASE/api/admin/polls \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d '{"title":"Bonus challenge for the speedrun?","description":"Pick what happens during the bonus block","is_active":true,"options":[{"label":"Blindfolded segment"},{"label":"Developers commentary"},{"label":"Donation war: blinds vs. no blinds"},{"label":"Community race"}]}')

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
echo "==> Creating goals..."
G1=$(curl -sf -X POST $BASE/api/admin/goals \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d '{"title":"Unlock Bonus Couch Stream","description":"Hit this goal and the team does an extra 2-hour couch commentary stream","target_cents":100000,"is_active":true}' | jq -r .id)

G2=$(curl -sf -X POST $BASE/api/admin/goals \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d '{"title":"Runner Pizza Fund","description":"Keep the runners fed throughout the event","target_cents":25000,"is_active":true}' | jq -r .id)

G3=$(curl -sf -X POST $BASE/api/admin/goals \
  -H "Content-Type: application/json" -H "X-Admin-Key: $KEY" \
  -d '{"title":"Charity Milestone — $5,000 Total","description":"Overall donation milestone for the event","target_cents":500000,"is_active":true}' | jq -r .id)

echo "   Goals: $G1 $G2 $G3"

# --- Donations (creates donors) ---
echo "==> Firing donation webhooks..."
for payload in \
  '{"type":"donation.completed","data":{"id":"fake-001","donor_email":"alice@example.com","donor_name":"Alice Speedrun","amount":{"value":"100.00"},"comment":"Love what you all do!"}}' \
  '{"type":"donation.completed","data":{"id":"fake-002","donor_email":"bob@example.com","donor_name":"Bob Gamer","amount":{"value":"50.00"},"comment":"Go go go!"}}' \
  '{"type":"donation.completed","data":{"id":"fake-003","donor_email":"carol@example.com","donor_name":"Carol Plays","amount":{"value":"25.00"},"comment":"First time donating, hyped!"}}' \
  '{"type":"donation.completed","data":{"id":"fake-004","donor_email":"dave@example.com","donor_name":"Dave","amount":{"value":"200.00"},"comment":""}}' \
  '{"type":"donation.completed","data":{"id":"fake-005","donor_email":"eve@example.com","donor_name":"Eve the Runner","amount":{"value":"75.00"},"comment":"Keep the runners fed!"}}' \
  '{"type":"donation.completed","data":{"id":"fake-006","donor_email":"alice@example.com","donor_name":"Alice Speedrun","amount":{"value":"30.00"},"comment":"Second donation, lets go!"}}'; do
  curl -sf -X POST $BASE/api/webhooks/tiltify -H "Content-Type: application/json" --data-raw "$payload" > /dev/null
done
echo "   6 donations created."

# --- Fetch donor tokens ---
DONATIONS=$(curl -sf $BASE/api/admin/donations -H "X-Admin-Key: $KEY")
ALICE=$(echo $DONATIONS | jq -r '[.[] | select(.donor.email=="alice@example.com")] | .[0].donor.magic_token')
BOB=$(echo $DONATIONS   | jq -r '[.[] | select(.donor.email=="bob@example.com")]   | .[0].donor.magic_token')
CAROL=$(echo $DONATIONS | jq -r '[.[] | select(.donor.email=="carol@example.com")] | .[0].donor.magic_token')
DAVE=$(echo $DONATIONS  | jq -r '[.[] | select(.donor.email=="dave@example.com")]  | .[0].donor.magic_token')
EVE=$(echo $DONATIONS   | jq -r '[.[] | select(.donor.email=="eve@example.com")]   | .[0].donor.magic_token')

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
echo "Alice wallet: $BASE/wallet?token=$ALICE"
echo "Dave wallet:  $BASE/wallet?token=$DAVE"
echo "Admin panel:  ${BASE/3001/5173}/admin  (key: $KEY)"
