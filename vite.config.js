import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// ---------------------------------------------------------------------------
// CRA → Vite migration config (surgical — preserves existing prod behaviour).
//
//  • build.outDir = 'build'      → server serves ../build (app.js:3791), so the
//                                  Node server and Render config are untouched.
//  • build.assetsDir = 'static'  → hashed JS/CSS land under /static/ exactly
//                                  like CRA, so public/service-worker.js
//                                  (STRATEGY 1 keys on `/static/`) keeps working
//                                  byte-for-byte.
//  • REACT_APP_* names preserved → Render dashboard env vars untouched.
//  • process.env.* is baked in   → CRA's webpack shimmed process.env (unknown
//                                  keys === undefined); Vite does NOT, so a bare
//                                  process.env.X in the browser throws
//                                  "process is not defined". Defining the full
//                                  set (verified by grep across src/) keeps
//                                  runtime behaviour identical.
//  • esbuild jsx loader on .js   → every component is a .js file containing JSX.
// ---------------------------------------------------------------------------

// The complete set of process.env.* keys referenced anywhere under src/
// (verified via grep). Anything not listed here would become a runtime crash
// under Vite, so this list must stay in sync if new process.env reads are added.
const PASSTHROUGH_ENV_KEYS = [
  'REACT_APP_API_URL',
  'REACT_APP_API',
  'REACT_APP_YOUTUBE_OAUTH_CLIENT_ID',
  'REACT_APP_MIXPANEL_TOKEN',
  'REACT_APP_DISCORD_CLIENT_ID',
  // Read in src/services/NotificationService.js. These have no REACT_APP_
  // prefix, so CRA never exposed them to the client either → they resolve to
  // `undefined` in the browser today, and continue to after migration.
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
];

export default defineConfig(({ mode }) => {
  // Empty prefix => loadEnv merges real process.env (Render's build-time vars)
  // in addition to .env files. We only read the specific keys below into the
  // bundle, so no unintended secrets are exposed.
  const env = loadEnv(mode, process.cwd(), '');

  const define = {
    'process.env.NODE_ENV': JSON.stringify(
      mode === 'production' ? 'production' : 'development'
    ),
  };
  for (const key of PASSTHROUGH_ENV_KEYS) {
    // Present → literal value; absent → literal `undefined` (matches CRA).
    define[`process.env.${key}`] =
      env[key] !== undefined ? JSON.stringify(env[key]) : 'undefined';
  }

  return {
    base: '/',
    plugins: [react()],
    define,
    // Components are .js files containing JSX. Tell esbuild to parse src/**/*.js
    // as JSX during transform (build) and dependency pre-bundling (dev).
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.js$/,
      exclude: [],
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: { '.js': 'jsx' },
      },
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: 'build',
      assetsDir: 'static',
      sourcemap: false,
      rollupOptions: {
        output: {
          // Peel heavy, independent vendor libs into their own chunks. They
          // cache separately (a deploy that doesn't touch tfjs/firebase won't
          // force a re-download) and the initial JS parse is spread across
          // files instead of one ~3 MB monolith. Group by whole package so a
          // single library is never split across chunks.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@tensorflow')) return 'vendor-tfjs';
            if (id.includes('@mediapipe')) return 'vendor-mediapipe';
            if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase';
            if (
              id.includes('chart.js') ||
              id.includes('recharts') ||
              id.includes('react-chartjs-2') ||
              id.includes('d3-') ||
              id.includes('victory-vendor')
            ) {
              return 'vendor-charts';
            }
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/') ||
              id.includes('react-router')
            ) {
              return 'vendor-react';
            }
            return undefined;
          },
        },
      },
    },
  };
});
