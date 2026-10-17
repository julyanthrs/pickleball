CREATE TABLE room_organizers (room_id TEXT PRIMARY KEY REFERENCES rooms(id), token_hash TEXT NOT NULL UNIQUE);
