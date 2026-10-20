# Reclub roster import

Implemented: Players → Import Players and setup step 3 → Import from Reclub / Import CSV. Organizer-owned or authorized CSV/TSV and pasted rosters are parsed locally, previewed, explicitly confirmed and saved with the session. No Reclub credentials are collected. Optional event links are source references, not access grants.

Direct link fetching is deliberately disabled. No approved participant-roster API contract or credentials have been supplied. Public or private event accessibility is not inferred from URL validity. `/api/reclub` validates known event-link formats, reports integration unavailability and makes no outgoing request. It is available in both the local server and Vercel. No background synchronization is implemented.

Official sources checked 2026-10-20:

- https://reclub.co/terms-of-service — sections 6.2 and 8.5 require Developer Partner approval or written approval for automated API access. The Developer Partner Program has per-partner data scopes. Contact engineering@reclub.co to apply; licensing requests go to help@reclub.co with subject DATA ACCESS REQUEST.
- https://help.reclub.co/hc/reclub-help/articles/1765846630-invite-players-to-your-meet-competition — copying a Meet/Competition share link.

To enable real retrieval later, first obtain approval for participant identities, official endpoint/response documentation and server-side authentication. Implement an adapter with strict event-domain/redirect allowlists, response limits, timeouts, and scoped credentials. Do not enable the button merely because credentials exist: the approved adapter and its error handling must work first. No event page scraping, private API discovery, or arbitrary URL proxy is present.

Import identity: stable participant ID plus optional event reference; when no source ID is provided, a SHA-256 content fingerprint supports retrying the same roster (including reordered rows). Changed no-ID files flag normalized-name matches for explicit Skip / Link / Separate review. Name matches never silently link people. Imported identifiers stay in session player metadata and survive local saves, session exports and shared state. Linking leaves player names, attendance and match records intact. New players are not checked in unless the organizer chooses it. Missing source ratings require an explicit organizer starting-rating selection, retained separately from source data.
