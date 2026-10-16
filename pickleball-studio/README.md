# Pickleball Studio

A working, responsive pickleball open-play application inspired by the supplied soft neumorphic reference, with the requested warm white and pastel green palette.

## Run locally

Requires Node.js 22 or later. Run these commands from the main `PickleBall Open play` folder or from `pickleball-studio`:

```sh
npm install
npm run dev
```

Open http://localhost:4173. Development mode automatically refreshes the browser when files in `dist/` change. An open edit dialog delays refresh until it closes. Session data persists across refreshes. `npm start` runs the same app without development live reload. No build step is needed.

Run `npm test` for the rotation and scoring checks, or `npm run check` for JavaScript syntax checks.

If port 4173 is occupied, development mode automatically tries the next available port and prints the actual Local URL. Use that printed link. Stop your development server with Ctrl+C before restarting it.

`npm run dev` opens the app in your default browser after startup. The terminal stays occupied while the server is running; this is normal. Use a separate terminal for other commands. To skip opening the browser, run `npm run dev -- --no-open`.

## Implemented workflows

- Live session with responsive court grid, court statuses, timers, operational counts, and a persistent desktop queue.
- Navigation on desktop and mobile includes Live session, Players, Results, and Session Settings. The Session Settings navigation item opens General, Matchmaking, Courts, and Saved Sessions within the existing Live Session destination. Advanced matchmaking rules and backup tools are collapsed until opened.
- Mobile bottom navigation, queue sheet, scoring sheets, and player actions.
- Deterministic matchmaking with game count and waiting-time priorities; balanced skill and social modes; all three doubles pairings; strict partner, rest, encounter, and skill constraints.
- Generate, review, edit, regenerate, reserve, start, score, cancel, and abandon matches. Manage Session handles court naming, adding/removing courts, and availability. Assigned courts must finish or release their match before removal.
- Full scores, quick winners, casual results, corrections, and derived win/loss/participation statistics.
- Player check-in, breaks, checkout, ratings, partner locks, queue overrides, bulk entry, and CSV import/export.
- Preparing → start → live/pause → completed states, with a frozen duration and no waiting queue or generation controls after completion.
- Create, duplicate, and open saved sessions; restore unfinished matches with intact lineups and settings. Unfinished sessions open paused for review. Older results-only archives open as completed sessions.
- Workspace backup/restore, activity log, and one-step undo. Switching sessions preserves all prior records.
- Browser-local persistence with reload recovery and revision checks for edits in another tab.

## Data and scope

Every fresh app opening starts at a session-first welcome screen with Create New Session, Load Saved Session, and Import Session, plus optional Explore Demo Session. The main navigation and operational panels appear only after a session is selected. Existing saved sessions are preserved. Organizer saves remain in this browser. Enabling Invite Players creates a shared session in the player portal's D1 database. An authenticated organizer proxy synchronizes roster, courts, queue and results; player credentials allow only session-specific reading and joining. Club creation or administration, multiple clubs, event calendars or recurring scheduling, online registration, fees, payments, financial reports, and club-wide analytics are excluded from the product scope. This application focuses on active open-play sessions and their history. QR joining, personal player dashboards and the QR presentation tab are implemented. Organizer saved-session discovery across devices and cloud accounts are not implemented. Google Fonts is used for typography with system-font fallbacks.

The supplied PickleMix demo was inspected as a public workflow reference. This workspace contained no existing application source, so this is a new implementation rather than a modification of PickleMix or another existing app. No competitor code or assets were copied.

## Design

Shared tokens use `#F5F7F2`, `#FFFFFF`, `#EAF2E6`, `#DCEFD5`, `#A8D989`, `#79AC77`, and `#365C3B`. White beveled borders, diffused light and shadow, inset score/lineup surfaces, 20–26 px main card corners, and 12–16 px control corners create tactile depth. Solid panels are used throughout. Reduced-motion preferences, native dialog focus containment, semantic labels, and visible keyboard focus are supported.

## Verification

34 automated tests cover 20 rounds each at 8/2, 10/2, 17/3, 24/4, and 40/6 player/court configurations; assignment uniqueness, fairness, stats, restrictions, deuce scoring, duplicate result prevention, correction, persistence serialization, development server startup when a port is occupied, the 20-player task flow, post-result lineup suggestions, restricted-lineup guidance, and editing a reserved lineup while paused, preparation requirements, completion semantics, saved-session restoration, duplication, legacy archives, court removal, configured drafts, explicit setup start, non-destructive session-file import, settings-impact warnings, and selected-session identity.

Earlier browser checks covered live session, players, results, and the former settings page at 320, 375, 390, 430, 768, 1024, and 1440 px, with no document-level horizontal overflow observed. Interactive checks include invalid-score rejection, result recording, queue movement, valid lineup generation, match start, correction/undo, new session creation, casual scoring, late player registration, paused-session reload recovery, and workspace backup restore. Browser screenshots are retained under `qa/` locally and excluded from the published source.

The complete refinement audit and observed browser checks are documented in [UX-AUDIT.md](UX-AUDIT.md).

The scope simplification was checked at 1440, 768, and 390 px, including the three destinations, contextual settings, saved-data actions, and settings persistence. See UX-AUDIT.md for details.

Current restructuring checks verified the Live Session and all four Manage Session sections on desktop (1440 px) and phone (362/390 px), with no horizontal overflow or unnamed visible buttons observed. Browser workflows covered preparation/start, scoring/rotation, preference and partner-lock saves, court administration, duplication, unfinished-session restore, reload, backup export/restore, and completion. Available cards are about 130 px tall and assigned cards about 274 px in the verified desktop view.

## Session-first entry

Create New Session uses three steps: details/courts/doubles/scoring; matchmaking with collapsed advanced rules; and roster entry/CSV import, optional teammate locks, and final review. Save Draft creates Preparing with a zero timer; Start Session explicitly starts live play. Navigating backward keeps the entered setup values. The setup roster can reuse the previous roster.

Load Saved Session lists the current autosave and archived sessions. Preparing and Completed retain their status; archived unfinished play opens paused for review. Choosing a demo preserves existing records. Import Session accepts a session export or the existing workspace-file format and keeps existing records. Session Settings → Saved Sessions can export a standalone session file. Workspace backup/restore remains separate.

Players and Results show the selected session name. Changing a session in another tab returns this tab to selection, preventing a silent workspace switch. Score or matchmaking changes that affect existing play require a review confirmation, as does renaming a court with active matches or prior results. Playing matches and completed results retain their original score targets.

Browser checks for this entry pass used actual 1280 px desktop and 362 px phone widths. They verified navigation gating before selection, all three setup steps, backwards retention, roster validation and CSV import, fixed teammate pairs, draft save/load with a frozen timer, explicit start, session-file export/import, retained previous sessions, settings warning cancel/apply, scoring after a rule change, completed-session loading, and demo exploration without losing records.

Partner locks are managed from the Players page using the Partner locks action, or from a player’s profile. Session Settings keeps rotation/rest/skill/repeat rules but no longer contains individual pairing controls. Existing pairs are shown on the roster; assigned pairs cannot be changed until released, and completed pairs are read-only.

## QR joining and player portal

Open a session and choose **Invite Players** in the navigation. Copy/share the unique link, download its QR code, or use **Present** on a second display. Optional approval holds new requests outside matchmaking; matching names require organizer approval to reconnect to an existing player. Manual player entry remains available.

The player portal requires no account. It provides Home, Leaderboard and Matches, persistent session-specific identity, a private recovery code, queue position, assignments, current-session statistics and corrected results. It polls every two seconds while visible, with reconnect backoff. Notifications appear inside the open page; closed-browser push is not implemented. Rankings require three scored games and explain their scoring rules. Completed, closed and abandoned sessions reject new joins.

The published organizer uses the public player service and D1, with server-side authorization and hashed player credentials. Local development uses persistent SQLite in the ignored .sites directory and loopback-only links for computer testing. A localhost QR cannot be scanned on a different phone; use the published organizer to create a public session link.

Current verification: 54 automated tests pass, including join concurrency, approval, duplicate reconnect, authorization, result corrections, closed sessions, stale polling and offline approval safeguards. Separate browser clients verified join, queue entry, reload identity, court calls, starts and results. A physical-phone scan remains a manual check.
