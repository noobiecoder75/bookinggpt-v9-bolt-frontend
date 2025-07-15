#!/bin/bash

# Simple curl test for subscription API
echo "🧪 Testing Subscription API with curl"
echo "====================================="

# Get access token
echo "🔐 Getting access token..."

# Create a temporary Node.js script to get the token
cat > get-token.js << 'EOF'
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function getToken() {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'info@bookinggpt.ca',
      password: 'admin123'
    });
    
    if (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
    
    console.log(data.session.access_token);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

getToken();
EOF

TOKEN=$(node get-token.js)
rm get-token.js

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get access token"
  exit 1
fi

echo "✅ Token obtained (length: ${#TOKEN})"

# Test endpoints
echo ""
echo "🌐 Testing subscription endpoints..."

echo ""
echo "1. GET /api/subscriptions/current"
curl -s -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     "http://localhost:3001/api/subscriptions/current" | jq .

echo ""
echo "2. GET /api/subscriptions/usage"
curl -s -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     "http://localhost:3001/api/subscriptions/usage" | jq .

echo ""
echo "3. POST /api/subscriptions/check-access (advanced_analytics)"
curl -s -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"feature": "advanced_analytics"}' \
     "http://localhost:3001/api/subscriptions/check-access" | jq .

echo ""
echo "4. POST /api/subscriptions/check-access (quotes)"
curl -s -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"feature": "quotes"}' \
     "http://localhost:3001/api/subscriptions/check-access" | jq .

echo ""
echo "5. GET /api/health (no auth)"
curl -s "http://localhost:3001/api/health" | jq .

echo ""
echo "✅ All tests completed!"