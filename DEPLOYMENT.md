# Vercel deployment

Deploy the repository root, with Framework Preset **Other** and Root Directory left empty. `vercel.json` installs the workspaces, builds the browser QR library, and serves `pickleball-studio/dist/index.html` and its assets. Do not choose the root `dist` folder: it contains only an old QR bundle.

The application and player service source files must be ordinary tracked files in this repository, not Git links without submodule URLs. A fresh checkout must contain `pickleball-studio/package.json` and `pickleball-studio/dist/index.html`.

## Live player sharing

The Vercel function at /api/live receives /api/portal requests through a rewrite and forwards them to the public player service. Organizers have a cryptographically random, session-specific bearer token, generated in their browser and saved with the session. The backend stores its hash in D1 and verifies ownership for every read, edit and join approval. Players never receive organizer tokens. Creation is rate limited. No service-wide key or extra Vercel environment variable is needed.

The existing private organizer continues using its original authenticated proxy. The public scoped API cannot claim those sessions or another organizer’s sessions. Organizer session exports contain the access token and should be treated as private recovery files. Browser storage clearing loses organizer access unless an export is retained.

## Local verification

From a clean checkout, run `npm ci`, `npm run build`, `npm test` and `npm run check`. The built frontend entry is `pickleball-studio/dist/index.html`. `npm run dev` starts the local app and SQLite-backed test portal.
