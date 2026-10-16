# QR joining and player portal

The organizer stays on the existing owner-private Site. A separate public Site serves only the player portal and its token-authorized APIs. The public service uses D1; the private Worker proxies organizer requests with a server-only secret. No organizer credential is sent to browsers.

## Runtime configuration

- Organizer Site: `PLAYER_PORTAL_ORIGIN` and secret `PORTAL_API_KEY`.
- Player Site: the same secret `PORTAL_API_KEY`; D1 binding `DB`.
- Configure production values through Sites tools, never source or hosting.json.

Only sessions explicitly shared through Invite players are uploaded. Local archives and audit logs remain in the organizer browser. Each player receives a random 256-bit credential stored on their device; only its SHA-256 hash is stored in D1. The recovery code is that credential and must remain private. Names alone cannot reclaim an existing player: an organizer must approve duplicate-name reconnect requests.

Live updates poll the shared backend every two seconds, retry automatically, and show connection state. They work while the page is open; browser push and closed-browser delivery are not implemented. Inactive organizers are shown as offline after 90 seconds; new joining expires after 24 hours without organizer activity. Existing participants retain read-only access to completed results.

Organizer writes use optimistic versions. Joining/approval additions merge without interrupting matches. Conflicting organizer writes load the winning shared state and retain a local recovery copy rather than silently replacing shared results. Pending uploads persist in local storage for reconnection. Server-side validation protects court assignments and results. Approval is optional; duplicate reconnects always require approval.

Rankings are current-session only: at least three scored games; 3 points per win and 1 per loss, then win rate, wins, and alphabetical name. Casual games count as played but earn no ranking points.

## Development

`npm install` from the workspace root installs both workspaces. The existing development server includes a local SQLite-backed portal, accessible through the generated local Invite players link. Production uses D1, not the local SQLite file. Database files and deployment output are ignored.

Build the organizer with `npm run build`. Synchronize the independent portal source with `node scripts/sync-player-portal.mjs`, then build in the player-portal workspace. Schema migrations are append-only once deployed. Never run schema DDL in hosted request handling.

Real-phone testing must be done by a human with a separate phone. Automated and independent-browser checks do not substitute for that physical-device verification.
