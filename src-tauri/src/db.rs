use std::{
    env,
    sync::Mutex,
    time::Duration,
};

use serde::Serialize;
use sqlx::{postgres::PgPoolOptions, PgPool};

const DATABASE_CONNECT_TIMEOUT_SECS: u64 = 5;
const DATABASE_MAX_CONNECTIONS: u32 = 5;

pub struct DatabaseState {
    pool: Mutex<Option<PgPool>>,
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

    pub fn current_pool(&self) -> Option<PgPool> {
        self.pool
            .lock()
            .expect("database state lock poisoned")
            .clone()
    }

    fn set_pool(&self, pool: PgPool) {
        *self.pool.lock().expect("database state lock poisoned") = Some(pool);
        *self.last_error.lock().expect("database state lock poisoned") = None;
    }

    fn set_error(&self, message: String) {
        *self.last_error.lock().expect("database state lock poisoned") = Some(message);
    }

    fn last_error(&self) -> Option<String> {
        self.last_error
            .lock()
            .expect("database state lock poisoned")
            .clone()
    }

    pub async fn ensure_pool(&self) -> Result<PgPool, String> {
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

async fn connect_pool() -> Result<PgPool, String> {
    dotenvy::dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .map_err(|_| "DATABASE_URL est absente. Configure le fichier .env avant de continuer.".to_string())?;

    let pool = PgPoolOptions::new()
        .max_connections(DATABASE_MAX_CONNECTIONS)
        .acquire_timeout(Duration::from_secs(DATABASE_CONNECT_TIMEOUT_SECS))
        .connect(&database_url)
        .await
        .map_err(|error| format!("Connexion PostgreSQL impossible: {error}"))?;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|error| format!("Execution des migrations SQL impossible: {error}"))?;

    Ok(pool)
}

async fn ping_pool(pool: &PgPool) -> Result<(), String> {
    sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(pool)
        .await
        .map(|_| ())
        .map_err(|error| format!("Base PostgreSQL indisponible: {error}"))
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
        message: "Connexion PostgreSQL active et migrations appliquees.".to_string(),
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
            message: "Connexion PostgreSQL active.".to_string(),
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
