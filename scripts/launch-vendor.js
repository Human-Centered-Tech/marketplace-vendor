const { execSync } = require('child_process');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = process.env.VITE_MEDUSA_BACKEND_URL || 'http://localhost:9000';

async function fetchPublishableKey() {
  return new Promise((resolve, reject) => {
    const url = `${BACKEND_URL}/key-exchange`;
    const client = url.startsWith('https') ? https : http;
    
    console.log('Fetching publishable API key from:', url);
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.publishableApiKey) {
            console.log('✓ Publishable API key fetched successfully');
            resolve(json.publishableApiKey);
          } else {
            console.log('⚠ No publishable API key found in response');
            resolve('');
          }
        } catch (error) {
          console.error('Error parsing response:', error);
          resolve('');
        }
      });
    }).on('error', (error) => {
      console.error('Error fetching API key:', error.message);
      resolve('');
    });
  });
}

async function launch() {
  console.log('🚀 Launching vendor panel...\n');
  
  // Fetch the publishable API key
  const apiKey = await fetchPublishableKey();
  
  if (apiKey) {
    process.env.VITE_PUBLISHABLE_API_KEY = apiKey;
    console.log('✓ API key set in environment\n');
  }
  
  // Ensure a production build exists. It is normally produced during the image
  // build (`pnpm build`); build here as a fallback if it's missing.
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    console.log('No production build found — running `vite build`...\n');
    execSync('vite build', { stdio: 'inherit', env: process.env });
  }

  // Inject runtime config into the static build so the backend URL and the
  // publishable key fetched above take effect without rebuilding the app.
  const runtimeConfig = {
    backendUrl: BACKEND_URL,
    publishableApiKey: apiKey || '',
    // Shows the "Connect via the Shopify App Store" button on /imports.
    // Off until Shopify approves the app (unreviewed public apps can't be
    // installed on real merchant stores); flip the env var on Railway — no
    // rebuild needed. The Shopify-initiated ?claim= flow works regardless.
    shopifyConnectEnabled: process.env.SHOPIFY_CONNECT_ENABLED === 'true',
    // Shows the "Connect with a custom app" form on /imports — the merchant
    // creates a custom app on their own Shopify store and pastes its Client
    // ID + Secret (client-credentials grant). Independent of the App Store
    // button above; flip via the env var on Railway, no rebuild needed.
    shopifyCustomAppConnectEnabled:
      process.env.SHOPIFY_CUSTOM_APP_CONNECT_ENABLED === 'true',
  };
  fs.writeFileSync(
    path.join(distDir, 'runtime-config.js'),
    `window.__RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig)};\n`
  );
  console.log('✓ Runtime config written to dist/runtime-config.js\n');

  // Serve the production build (hashed static assets + SPA fallback). This
  // replaces the previous Vite dev server, which—when used to serve production
  // traffic—caused slow on-demand module compiles and HMR-driven full-page
  // reloads (clicking a nav item reloaded the page instead of navigating).
  const port = process.env.PORT || '4173';
  console.log(`Serving production build via vite preview on port ${port}...\n`);
  try {
    execSync(`vite preview --host 0.0.0.0 --port ${port}`, {
      stdio: 'inherit',
      env: process.env,
    });
  } catch (error) {
    console.error('Error starting preview server:', error.message);
    process.exit(1);
  }
}

launch();
