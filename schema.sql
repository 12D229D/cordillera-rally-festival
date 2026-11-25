-- Cordillera Rally Festival - Esquema SQLite Declarativo
-- Persistencia de Leaderboard, Rutas Comunitarias y Garaje del Jugador

CREATE TABLE IF NOT EXISTS player_profile (
    id TEXT PRIMARY KEY,
    pilot_name TEXT NOT NULL,
    festival_reputation INTEGER DEFAULT 0,
    selected_vehicle_id TEXT DEFAULT 'vicuna_rally_rs',
    total_distance_km REAL DEFAULT 0.0,
    races_won INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_garage (
    vehicle_id TEXT PRIMARY KEY,
    unlocked INTEGER DEFAULT 1,
    tuning_stage INTEGER DEFAULT 1,
    tire_type TEXT DEFAULT 'all_terrain', -- 'asphalt_slick', 'rally_gravel', 'mud_terrain'
    custom_color TEXT,
    miles_driven_km REAL DEFAULT 0.0,
    wins INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL,
    pilot_name TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    time_ms INTEGER NOT NULL,
    weather_condition TEXT NOT NULL,
    track_erosion_pct REAL DEFAULT 0.0,
    date_recorded TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_routes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    creator_name TEXT NOT NULL,
    difficulty TEXT DEFAULT 'Medio', -- 'Fácil', 'Medio', 'Experto'
    weather_preset TEXT DEFAULT 'sunny', -- 'sunny', 'mist', 'rain'
    checkpoints_json TEXT NOT NULL,
    length_km REAL NOT NULL,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS erosion_state (
    chunk_coord TEXT PRIMARY KEY,
    damage_layer_data TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_leaderboard_event_time ON leaderboard (event_id, time_ms ASC);
CREATE INDEX IF NOT EXISTS idx_community_routes_votes ON community_routes (upvotes DESC);
