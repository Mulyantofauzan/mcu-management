#!/bin/bash
# Inject environment variables into env-config.js

echo "🔧 Injecting environment variables..."

cat > env-config.js << ENVJS
// Environment configuration injected by Netlify build
window.ENV = {
  SUPABASE_URL: '${SUPABASE_URL}',
  SUPABASE_ANON_KEY: '${SUPABASE_ANON_KEY}'
};

console.log('📦 Environment variables loaded');
ENVJS

echo "✅ Environment variables injected successfully"
cat env-config.js
