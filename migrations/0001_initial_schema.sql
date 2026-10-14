-- Migration: 0001_initial_schema.sql
-- Weather Hub / ClimaStack Core Schema para Cloudflare D1 (SQLite Dialect)

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
    is_blocked INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT
);

-- Tabela de Sessões (Persistência no D1 com cache no Redis)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    user_agent TEXT,
    ip_address TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de Cidades Favoritas dos Usuários
CREATE TABLE IF NOT EXISTS favorite_locations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    city_name TEXT NOT NULL,
    state TEXT,
    country TEXT NOT NULL DEFAULT 'Brasil',
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de Logs de Auditoria de Segurança e IAM
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    actor_name TEXT,
    action TEXT NOT NULL,
    target_id TEXT,
    target_type TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorite_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
