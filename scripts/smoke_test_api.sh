#!/usr/bin/env bash
set -e

# Configuration
BACKEND_URL=${BACKEND_URL:-http://localhost:${BACKEND_PORT:-8011}}
ADMIN_PASSWORD=${ADMIN_PASSWORD:?Environment variable ADMIN_PASSWORD is required}

echo "🟢 Checking /health endpoint at $BACKEND_URL/health"
status=$(curl -s -o /dev/null -w "%{http_code}" -L "$BACKEND_URL/health")
if [ "$status" -ne 200 ]; then
  echo "❌ Health check failed (status $status)"
  exit 1
fi
echo "✅ Health check passed"

echo "🟢 Verifying OpenAPI contains admin auth"
openapi=$(curl -s -L "$BACKEND_URL/openapi.json")
echo "$openapi" | grep -q '/admin/auth/login' || {
  echo "❌ /admin/auth/login not found in OpenAPI. Check BACKEND_URL and port."
  exit 1
}
echo "✅ OpenAPI contains admin auth endpoint"

echo "🟢 Logging in as admin"
login_resp=$(curl -s -L -X POST "$BACKEND_URL/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"${ADMIN_PASSWORD}\"}")
token=$(echo "$login_resp" | jq -r .access_token)
if [ -z "$token" ] || [ "$token" == "null" ]; then
  echo "❌ Login failed:"
  echo "$login_resp"
  exit 1
fi
echo "✅ Login succeeded, token acquired"

echo "🟢 Creating a menu week"
week_resp=$(curl -s -L -X POST "$BACKEND_URL/admin/menu/weeks/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $token" \
  -d '{"selling_days":"Mon,Wed","status":"OPEN","published":false,"starts_at":"2026-02-15T00:00:00"}')
week_id=$(echo "$week_resp" | jq -r .id)
if [ -z "$week_id" ] || [ "$week_id" == "null" ]; then
  echo "❌ MenuWeek creation failed:"
  echo "$week_resp"
  exit 1
fi
echo "✅ MenuWeek created (ID: $week_id)"

echo "🟢 Creating a menu item"
item_resp=$(curl -s -L -X POST "$BACKEND_URL/admin/menu/items/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $token" \
  -d "{\"menu_week_id\":$week_id,\"name\":\"Test Item\",\"description\":\"Smoke test\",\"photo_url\":\"\",\"price_cents\":1000,\"available\":true}")
item_id=$(echo "$item_resp" | jq -r .id)
if [ -z "$item_id" ] || [ "$item_id" == "null" ]; then
  echo "❌ MenuItem creation failed:"
  echo "$item_resp"
  exit 1
fi
echo "✅ MenuItem created (ID: $item_id)"

echo "🟢 Publishing the menu week"
pub_resp=$(curl -s -L -X PATCH "$BACKEND_URL/admin/menu/weeks/$week_id/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $token" \
  -d '{"published":true}')
published=$(echo "$pub_resp" | jq -r .published)
if [ "$published" != "true" ]; then
  echo "❌ Publication failed:"
  echo "$pub_resp"
  exit 1
fi
echo "✅ MenuWeek published"

echo "🟢 Fetching public menu"
public_resp=$(curl -s -L "$BACKEND_URL/api/public/menu")
fetched_id=$(echo "$public_resp" | jq -r .id)
if [ "$fetched_id" != "$week_id" ]; then
  echo "❌ Public menu fetch failed:"
  echo "$public_resp"
  exit 1
fi
echo "✅ Public menu fetch returned the published week"

echo "🎉 API smoke test PASS"
exit 0