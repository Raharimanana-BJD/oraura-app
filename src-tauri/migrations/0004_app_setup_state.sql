CREATE TABLE IF NOT EXISTS app_setup_state (
  id TEXT PRIMARY KEY,
  setup_completed BOOLEAN NOT NULL DEFAULT FALSE,
  operator_name TEXT NOT NULL DEFAULT '',
  operator_role TEXT NOT NULL DEFAULT 'manager',
  station_name TEXT NOT NULL DEFAULT 'Poste principal',
  completed_at TIMESTAMPTZ
);
