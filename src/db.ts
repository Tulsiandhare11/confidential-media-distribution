import Database from 'better-sqlite3';

export const db = new Database('vault.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  verify_code TEXT,
  verify_expires INTEGER,
  kem_public TEXT,
  kem_secret_enc TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT,
  cloud_public_id TEXT,
  enc_path TEXT,
  wrapped_key TEXT,
  sha256 TEXT,
  phash TEXT,
  signature TEXT,
  faces_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_id INTEGER NOT NULL REFERENCES photos(id),
  viewer_id INTEGER NOT NULL REFERENCES users(id),
  tier TEXT NOT NULL CHECK (tier IN ('full','blurred','low')),
  blur_faces_json TEXT,
  revoked INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  UNIQUE (photo_id, viewer_id)
);

CREATE TABLE IF NOT EXISTS access_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_id INTEGER NOT NULL,
  viewer_id INTEGER NOT NULL,
  at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
`);