# Vercel deployment

Deploy the repository root, with Framework Preset **Other** and Root Directory left empty. `vercel.json` installs the workspaces, builds the browser QR library, and serves `pickleball-studio/dist/index.html` and its assets. Do not choose the root `dist` folder: it contains only an old QR bundle.

The application and player service source files must be ordinary tracked files in this repository, not Git links without submodule URLs. A fresh checkout must contain `pickleball-studio/package.json` and `pickleball-studio/dist/index.html`.

## Live player sharing

This Vercel deployment serves the organizer frontend and browser-local saved sessions. The existing shared player service remains on its Cloudflare Worker and D1 database. The original organizer proxy also depends on authenticated identity supplied by its private host; Vercel does not provide that identity header.

For cross-device QR joining, use the existing private organizer at https://pickleball-studio-green.julyanthrs.chatgpt.site/. Its Invite Players action creates public session-specific player links. A future Vercel backend integration needs organizer authentication and a server-only connection to the player service. Never put the portal API key in browser JavaScript or expose an unauthenticated organizer proxy.

## Local verification

From a clean checkout, run `npm ci`, `npm run build`, `npm test` and `npm run check`. The built frontend entry is `pickleball-studio/dist/index.html`. `npm run dev` starts the local app and SQLite-backed test portal.
