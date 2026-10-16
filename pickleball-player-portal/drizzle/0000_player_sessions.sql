CREATE TABLE rooms (
  id TEXT PRIMARY KEY, client_session_id TEXT NOT NULL UNIQUE, invite TEXT NOT NULL UNIQUE,
  state_json TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, mutation_id TEXT NOT NULL,
  require_approval INTEGER NOT NULL DEFAULT 0, joins_open INTEGER NOT NULL DEFAULT 1,
  organizer_seen_at INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE identities (
  id TEXT PRIMARY KEY, room_id TEXT NOT NULL REFERENCES rooms(id), token_hash TEXT NOT NULL UNIQUE,
  player_id TEXT NOT NULL, name TEXT NOT NULL, rating REAL NOT NULL, status TEXT NOT NULL,
  duplicate_player_id TEXT, created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX identities_room ON identities(room_id);
--> statement-breakpoint
CREATE TABLE changes (room_id TEXT NOT NULL REFERENCES rooms(id), version INTEGER NOT NULL, source TEXT NOT NULL, PRIMARY KEY(room_id,version));
--> statement-breakpoint
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 1);
