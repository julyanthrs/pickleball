# Pickleball Studio player portal

This public Worker serves session-specific QR joining and read-only player dashboards. D1 stores shared sessions and hashed player identities. Organizer-only endpoints require a server-only secret shared with the owner-private organizer Worker.

Runtime: D1 binding DB; secret PORTAL_API_KEY. Set secrets through Sites tools. Never put secret values in source or browser code.

Run npm install and npm run build. The build embeds portal assets in one Worker module and packages the schema-only Drizzle migrations. Run npm run validate to verify the artifact. Once deployed, migrations are immutable; append new migrations for later schema changes.

The canonical implementation is maintained in the organizer repository's portal directory. Its scripts/sync-player-portal.mjs copies a self-contained source snapshot here before builds. This repository builds independently from that committed snapshot.

The organizer Site's audience remains private. This player Site is public so QR participants do not need an account. Player data requires an unguessable, session-specific bearer credential; invite links alone reveal only join metadata.
