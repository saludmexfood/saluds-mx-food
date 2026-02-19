#!/usr/bin/env bash
# smoke_test_api.sh — Local API smoke test
# Usage: ADMIN_PASSWORD=yourpassword bash scripts/smoke_test_api.sh
# Optional: BACKEND_URL=http://localhost:8010 (defaults to http://localhost:8010)
set -euo pipefail

BACKEND_URL=${BACKEND_URL:-http://localhost:${BACKEND_PORT:-8010}}
ADMIN_PASSWORD=${ADMIN_PASSWORD:?Environment variable ADMIN_PASSWORD is required}

pass() { echo "✅ $*"; }
fail() { echo "❌ $*" >&2; exit 1; }
info() { echo "🟢 $*"; }

# ── 1. Health check ────────────────────────────────────────────────────────
info "Health check at $BACKEND_URL/health"
health_body=$(curl -sf "$BACKEND_URL/health") || fail "Health check HTTP error"
echo "$health_body" | jq -e '.status == "ok"' > /dev/null || fail "Health check body unexpected: $health_body"
pass "Health check: $health_body"

# ── 2. OpenAPI sanity ──────────────────────────────────────────────────────
info "Checking OpenAPI for required endpoints"
openapi=$(curl -sf "$BACKEND_URL/openapi.json") || fail "Could not fetch /openapi.json"
echo "$openapi" | grep -q '/admin/auth/login' || fail "/admin/auth/login not in OpenAPI"
echo "$openapi" | grep -q '/api/public/menu' || fail "/api/public/menu not in OpenAPI"
pass "OpenAPI contains /admin/auth/login and /api/public/menu"

# ── 3. Admin login ─────────────────────────────────────────────────────────
info "Admin login"
login_resp=$(curl -sf -X POST "$BACKEND_URL/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"${ADMIN_PASSWORD}\"}")
token=$(echo "$login_resp" | jq -r '.access_token')
[ -n "$token" ] && [ "$token" != "null" ] || fail "Login failed: $login_resp"
pass "Login succeeded, token acquired"

AUTH=(-H "Authorization: Bearer $token")


# ── 3b. Admin queue endpoint ───────────────────────────────────────────────
info "Fetching admin queues"
queues_resp=$(curl -sf "$BACKEND_URL/api/queues" "${AUTH[@]}")
echo "$queues_resp" | jq -e '.queues | type == "object"' > /dev/null || fail "Queues response invalid: $queues_resp"
pass "Admin queues endpoint ok"


# ── 3c. /api/queues requires auth ──────────────────────────────────────────
info "Verifying /api/queues requires Bearer token"
unauth_status=$(curl -s -o /tmp/smoke_queues_unauth.json -w "%{http_code}" "$BACKEND_URL/api/queues")
case "$unauth_status" in
  401|403|422) pass "Unauthenticated /api/queues rejected with status $unauth_status" ;;
  *) fail "Expected auth rejection status (401/403/422) for /api/queues, got $unauth_status" ;;
esac

# ── 4. Create menu week ────────────────────────────────────────────────────
info "Creating a menu week"
week_resp=$(curl -sf -X POST "$BACKEND_URL/admin/menu/weeks/" \
  -H "Content-Type: application/json" "${AUTH[@]}" \
  -d '{"selling_days":"Mon,Wed","status":"OPEN","published":false,"starts_at":"2026-06-01T00:00:00"}')
week_id=$(echo "$week_resp" | jq -r '.id')
[ -n "$week_id" ] && [ "$week_id" != "null" ] || fail "MenuWeek creation failed: $week_resp"
pass "MenuWeek created (ID: $week_id)"


# ── 4b. List menu weeks ───────────────────────────────────────────────────
info "Listing menu weeks"
weeks_list_resp=$(curl -sf "$BACKEND_URL/admin/menu/weeks/" "${AUTH[@]}")
echo "$weeks_list_resp" | jq -e 'type == "array"' > /dev/null || fail "Menu weeks list is not an array: $weeks_list_resp"
echo "$weeks_list_resp" | jq -e ".[] | select(.id == $week_id)" > /dev/null || fail "Created week not found in list: $weeks_list_resp"
pass "Menu weeks list endpoint ok"

# ── 5. Create menu item ────────────────────────────────────────────────────
info "Creating a menu item"
item_resp=$(curl -sf -X POST "$BACKEND_URL/admin/menu/items/" \
  -H "Content-Type: application/json" "${AUTH[@]}" \
  -d "{\"menu_week_id\":$week_id,\"name\":\"Smoke Test Taco\",\"description\":\"CI item\",\"price_cents\":1000,\"available\":true}")
item_id=$(echo "$item_resp" | jq -r '.id')
[ -n "$item_id" ] && [ "$item_id" != "null" ] || fail "MenuItem creation failed: $item_resp"
pass "MenuItem created (ID: $item_id)"


# ── 5b. List items for week ───────────────────────────────────────────────
info "Listing items for menu week"
week_items_resp=$(curl -sf "$BACKEND_URL/admin/menu/weeks/$week_id/items" "${AUTH[@]}")
echo "$week_items_resp" | jq -e 'type == "array"' > /dev/null || fail "Week items response is not an array: $week_items_resp"
echo "$week_items_resp" | jq -e ".[] | select(.id == $item_id)" > /dev/null || fail "Created item not found in week items response: $week_items_resp"
pass "Menu week items endpoint ok"

# ── 6. Publish menu week ───────────────────────────────────────────────────
info "Publishing menu week"
pub_resp=$(curl -sf -X PATCH "$BACKEND_URL/admin/menu/weeks/$week_id" \
  -H "Content-Type: application/json" "${AUTH[@]}" \
  -d '{"published":true}')
published=$(echo "$pub_resp" | jq -r '.published')
[ "$published" = "true" ] || fail "Publication failed: $pub_resp"
pass "MenuWeek published"

# ── 7. Fetch public menu ───────────────────────────────────────────────────
info "Fetching public menu"
menu_resp=$(curl -sf "$BACKEND_URL/api/public/menu/")
fetched_id=$(echo "$menu_resp" | jq -r '.id')
[ -n "$fetched_id" ] && [ "$fetched_id" != "null" ] || fail "Public menu returned no week: $menu_resp"
echo "$menu_resp" | jq -e ".published == true" > /dev/null || fail "Public menu is not published: $menu_resp"
pass "Public menu returned a published week (ID: $fetched_id)"

# ── 8. Create order ────────────────────────────────────────────────────────
info "Creating a public order"
order_payload=$(cat <<EOF
{
  "phone": "555-000-0000",
  "pickup_or_delivery": "pickup",
  "total_cents": 1000,
  "items": [{"menu_item_id": $item_id, "qty": 1, "line_total_cents": 1000}]
}
EOF
)
order_resp=$(curl -sf -X POST "$BACKEND_URL/api/public/orders/" \
  -H "Content-Type: application/json" \
  -d "$order_payload")
order_id=$(echo "$order_resp" | jq -r '.id')
order_status=$(echo "$order_resp" | jq -r '.status')
[ -n "$order_id" ] && [ "$order_id" != "null" ] || fail "Order creation failed: $order_resp"
[ "$order_status" = "PENDING" ] || fail "Expected status=PENDING, got $order_status"
pass "Order created (ID: $order_id, status: $order_status)"

# ── 9. Stripe checkout session (skip if not configured) ───────────────────
if [ -z "${STRIPE_SECRET_KEY:-}" ]; then
  echo "⏭  SKIP: STRIPE_SECRET_KEY not set — skipping Stripe checkout test"
else
  info "Creating Stripe checkout session for order $order_id"
  stripe_resp=$(curl -sf -X POST "$BACKEND_URL/api/public/checkout/session" \
    -H "Content-Type: application/json" \
    -d "{\"order_id\": $order_id}")
  stripe_url=$(echo "$stripe_resp" | jq -r '.url')
  stripe_sid=$(echo "$stripe_resp" | jq -r '.session_id')
  [ -n "$stripe_url" ] && [ "$stripe_url" != "null" ] || fail "Stripe session creation failed: $stripe_resp"
  pass "Stripe checkout session created (session_id: $stripe_sid)"
fi

echo ""
echo "🎉 API smoke test PASS"
exit 0
