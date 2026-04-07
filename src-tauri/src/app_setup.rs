use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::DatabaseState;

const APP_SETUP_ROW_ID: &str = "default";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSetupState {
    pub setup_completed: bool,
    pub operator_name: String,
    pub operator_role: String,
    pub station_name: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompleteAppSetupInput {
    pub operator_name: String,
    pub operator_role: String,
    pub station_name: String,
}

impl Default for AppSetupState {
    fn default() -> Self {
        Self {
            setup_completed: false,
            operator_name: String::new(),
            operator_role: "manager".to_string(),
            station_name: "Poste principal".to_string(),
            completed_at: None,
        }
    }
}

fn validate_required(
    value: &str,
    field_name: &str,
    min_len: usize,
    max_len: usize,
) -> Result<String, String> {
    let trimmed = value.trim();

    if trimmed.len() < min_len {
        return Err(format!("{field_name} est trop court."));
    }

    if trimmed.len() > max_len {
        return Err(format!("{field_name} est trop long."));
    }

    Ok(trimmed.to_string())
}

fn validate_role(value: &str) -> Result<String, String> {
    match value.trim() {
        "manager" | "cashier" | "server" | "kitchen" => Ok(value.trim().to_string()),
        _ => Err("Role operateur invalide.".to_string()),
    }
}

async fn load_setup_state(pool: &sqlx::PgPool) -> Result<AppSetupState, String> {
    let row = sqlx::query_as::<_, (bool, String, String, String, Option<String>)>(
        "SELECT setup_completed,
                operator_name,
                operator_role,
                station_name,
                completed_at::text
         FROM app_setup_state
         WHERE id = $1",
    )
    .bind(APP_SETUP_ROW_ID)
    .fetch_optional(pool)
    .await
    .map_err(|error| format!("Lecture de l'etat d'installation impossible: {error}"))?;

    Ok(match row {
        Some((setup_completed, operator_name, operator_role, station_name, completed_at)) => {
            AppSetupState {
                setup_completed,
                operator_name,
                operator_role,
                station_name,
                completed_at,
            }
        }
        None => AppSetupState::default(),
    })
}

#[tauri::command]
pub async fn get_app_setup_state(state: State<'_, DatabaseState>) -> Result<AppSetupState, String> {
    let pool = state.ensure_pool().await?;
    load_setup_state(&pool).await
}

#[tauri::command]
pub async fn complete_app_setup(
    state: State<'_, DatabaseState>,
    input: CompleteAppSetupInput,
) -> Result<AppSetupState, String> {
    let pool = state.ensure_pool().await?;
    let operator_name = validate_required(&input.operator_name, "Le nom operateur", 2, 80)?;
    let operator_role = validate_role(&input.operator_role)?;
    let station_name = validate_required(&input.station_name, "Le nom du poste", 2, 80)?;

    sqlx::query(
        "INSERT INTO app_setup_state (
            id,
            setup_completed,
            operator_name,
            operator_role,
            station_name,
            completed_at
         ) VALUES ($1, TRUE, $2, $3, $4, NOW())
         ON CONFLICT (id) DO UPDATE
         SET setup_completed = TRUE,
             operator_name = EXCLUDED.operator_name,
             operator_role = EXCLUDED.operator_role,
             station_name = EXCLUDED.station_name,
             completed_at = NOW()",
    )
    .bind(APP_SETUP_ROW_ID)
    .bind(operator_name)
    .bind(operator_role)
    .bind(station_name)
    .execute(&pool)
    .await
    .map_err(|error| format!("Finalisation de l'installation impossible: {error}"))?;

    load_setup_state(&pool).await
}
