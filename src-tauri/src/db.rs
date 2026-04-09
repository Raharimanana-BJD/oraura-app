use std::{env, fs, path::PathBuf, sync::Mutex, time::Duration};

use serde::Serialize;
use sqlx::{sqlite::SqliteConnectOptions, sqlite::SqlitePoolOptions, SqlitePool};

const DATABASE_FILE_NAME: &str = "oraura.db";
const DATABASE_CONNECT_TIMEOUT_SECS: u64 = 5;
const DATABASE_MAX_CONNECTIONS: u32 = 5;

pub struct DatabaseState {
    pool: Mutex<Option<SqlitePool>>,
    last_error: Mutex<Option<String>>,
}

#[derive(Serialize)]
pub struct DatabaseStatus {
    pub connected: bool,
    pub message: String,
}

impl DatabaseState {
    pub fn new() -> Self {
        Self {
            pool: Mutex::new(None),
            last_error: Mutex::new(None),
        }
    }

    pub fn current_pool(&self) -> Option<SqlitePool> {
        self.pool
            .lock()
            .expect("database state lock poisoned")
            .clone()
    }

    pub fn set_pool(&self, pool: SqlitePool) {
        *self.pool.lock().expect("database state lock poisoned") = Some(pool);
        *self
            .last_error
            .lock()
            .expect("database state lock poisoned") = None;
    }

    fn set_error(&self, message: String) {
        *self
            .last_error
            .lock()
            .expect("database state lock poisoned") = Some(message);
    }

    fn last_error(&self) -> Option<String> {
        self.last_error
            .lock()
            .expect("database state lock poisoned")
            .clone()
    }

    pub async fn ensure_pool(&self) -> Result<SqlitePool, String> {
        if let Some(pool) = self.current_pool() {
            ping_pool(&pool).await?;
            return Ok(pool);
        }

        let pool = connect_pool().await?;
        ping_pool(&pool).await?;
        self.set_pool(pool.clone());
        Ok(pool)
    }
}

fn database_file_path() -> Result<PathBuf, String> {
    if let Ok(database_file) = env::var("DATABASE_FILE") {
        return Ok(PathBuf::from(database_file));
    }

    let mut data_dir = dirs::data_local_dir().ok_or_else(|| {
        "Impossible de determiner le dossier local de l'application.".to_string()
    })?;

    data_dir.push("oraura-app");
    fs::create_dir_all(&data_dir)
        .map_err(|error| format!("Impossible de creer le dossier de la base: {error}"))?;
    data_dir.push(DATABASE_FILE_NAME);
    Ok(data_dir)
}

pub async fn connect_pool() -> Result<SqlitePool, String> {
    dotenvy::dotenv().ok();

    let database_path = database_file_path()?;

    let connect_options = SqliteConnectOptions::new()
        .filename(&database_path)
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(DATABASE_MAX_CONNECTIONS)
        .acquire_timeout(Duration::from_secs(DATABASE_CONNECT_TIMEOUT_SECS))
        .connect_with(connect_options)
        .await
        .map_err(|error| format!("Connexion SQLite impossible: {error}"))?;

    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&pool)
        .await
        .map_err(|error| format!("Impossible d'activer les foreign keys: {error}"))?;

    sqlx::query("PRAGMA journal_mode = WAL")
        .execute(&pool)
        .await
        .map_err(|error| format!("Impossible d'activer WAL: {error}"))?;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|error| format!("Execution des migrations SQL impossible: {error}"))?;

    Ok(pool)
}

async fn ping_pool(pool: &SqlitePool) -> Result<(), String> {
    sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(pool)
        .await
        .map(|_| ())
        .map_err(|error| format!("Base SQLite indisponible: {error}"))
}

#[tauri::command]
pub async fn initialize_database(
    state: tauri::State<'_, DatabaseState>,
) -> Result<DatabaseStatus, String> {
    let pool = connect_pool().await?;
    ping_pool(&pool).await?;
    state.set_pool(pool);

    Ok(DatabaseStatus {
        connected: true,
        message: "Connexion SQLite active et migrations appliquees.".to_string(),
    })
}

#[tauri::command]
pub async fn database_status(
    state: tauri::State<'_, DatabaseState>,
) -> Result<DatabaseStatus, String> {
    if let Some(pool) = state.current_pool() {
        ping_pool(&pool).await?;

        return Ok(DatabaseStatus {
            connected: true,
            message: "Connexion SQLite active.".to_string(),
        });
    }

    if let Some(error) = state.last_error() {
        return Ok(DatabaseStatus {
            connected: false,
            message: error,
        });
    }

    Ok(DatabaseStatus {
        connected: false,
        message: "Base non initialisee dans cette session.".to_string(),
    })
}

pub async fn warm_up_database(state: &DatabaseState) {
    match connect_pool().await {
        Ok(pool) => state.set_pool(pool),
        Err(error) => state.set_error(error),
    }
}
