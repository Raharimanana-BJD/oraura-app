use std::net::Ipv4Addr;

use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::State;

use crate::db::DatabaseState;

const APP_SETTINGS_ROW_ID: &str = "default";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub business_name: String,
    pub order_prefix: String,
    pub currency_symbol: String,
    pub support_phone: String,
    pub kitchen_printer_enabled: bool,
    pub kitchen_printer_name: String,
    pub kitchen_printer_ip: String,
    pub kitchen_printer_port: u16,
    pub cashier_printer_enabled: bool,
    pub cashier_printer_name: String,
    pub cashier_printer_ip: String,
    pub cashier_printer_port: u16,
    pub auto_print_kitchen: bool,
    pub print_customer_receipt: bool,
    pub default_order_mode: String,
    pub kitchen_refresh_ms: u32,
    pub checkout_refresh_ms: u32,
    pub sound_alerts_enabled: bool,
    pub language: String,
    pub test_ticket_message: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            business_name: "OR'AURA Fast Food".to_string(),
            order_prefix: "A".to_string(),
            currency_symbol: "Ar".to_string(),
            support_phone: "+261 34 00 000 00".to_string(),
            kitchen_printer_enabled: true,
            kitchen_printer_name: "Cuisine principale".to_string(),
            kitchen_printer_ip: "192.168.1.100".to_string(),
            kitchen_printer_port: 9100,
            cashier_printer_enabled: true,
            cashier_printer_name: "Caisse principale".to_string(),
            cashier_printer_ip: "192.168.1.101".to_string(),
            cashier_printer_port: 9100,
            auto_print_kitchen: true,
            print_customer_receipt: true,
            default_order_mode: "sur-place".to_string(),
            kitchen_refresh_ms: 3000,
            checkout_refresh_ms: 3000,
            sound_alerts_enabled: true,
            language: "fr".to_string(),
            test_ticket_message:
                "Ticket de test OR'AURA\n1 x Burger Classic\n1 x Frites\nMerci et bon service."
                    .to_string(),
        }
    }
}

fn validate_required_string(
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

fn validate_optional_string(
    value: &str,
    field_name: &str,
    max_len: usize,
) -> Result<String, String> {
    let trimmed = value.trim();

    if trimmed.len() > max_len {
        return Err(format!("{field_name} est trop long."));
    }

    Ok(trimmed.to_string())
}

fn validate_ipv4(value: &str, field_name: &str) -> Result<String, String> {
    let trimmed = value.trim();
    trimmed
        .parse::<Ipv4Addr>()
        .map_err(|_| format!("{field_name} est invalide."))?;
    Ok(trimmed.to_string())
}

fn validate_order_mode(value: &str) -> Result<String, String> {
    match value.trim() {
        "sur-place" | "a-emporter" | "livraison" => Ok(value.trim().to_string()),
        _ => Err("Mode de commande par defaut invalide.".to_string()),
    }
}

fn validate_language(value: &str) -> Result<String, String> {
    match value.trim() {
        "fr" | "en" => Ok(value.trim().to_string()),
        _ => Err("Langue invalide.".to_string()),
    }
}

fn validate_refresh_ms(value: u32, field_name: &str) -> Result<u32, String> {
    if !(1000..=60000).contains(&value) {
        return Err(format!("{field_name} doit etre entre 1000 et 60000 ms."));
    }

    Ok(value)
}

impl AppSettings {
    fn validate(self) -> Result<Self, String> {
        Ok(Self {
            business_name: validate_required_string(
                &self.business_name,
                "Le nom de l'etablissement",
                2,
                80,
            )?,
            order_prefix: validate_required_string(
                &self.order_prefix,
                "Le prefixe de commande",
                1,
                6,
            )?,
            currency_symbol: validate_required_string(&self.currency_symbol, "La devise", 1, 12)?,
            support_phone: validate_optional_string(
                &self.support_phone,
                "Le telephone support",
                30,
            )?,
            kitchen_printer_enabled: self.kitchen_printer_enabled,
            kitchen_printer_name: validate_required_string(
                &self.kitchen_printer_name,
                "Le nom de l'imprimante cuisine",
                2,
                60,
            )?,
            kitchen_printer_ip: validate_ipv4(
                &self.kitchen_printer_ip,
                "L'adresse IP de l'imprimante cuisine",
            )?,
            kitchen_printer_port: self.kitchen_printer_port,
            cashier_printer_enabled: self.cashier_printer_enabled,
            cashier_printer_name: validate_required_string(
                &self.cashier_printer_name,
                "Le nom de l'imprimante caisse",
                2,
                60,
            )?,
            cashier_printer_ip: validate_ipv4(
                &self.cashier_printer_ip,
                "L'adresse IP de l'imprimante caisse",
            )?,
            cashier_printer_port: self.cashier_printer_port,
            auto_print_kitchen: self.auto_print_kitchen,
            print_customer_receipt: self.print_customer_receipt,
            default_order_mode: validate_order_mode(&self.default_order_mode)?,
            kitchen_refresh_ms: validate_refresh_ms(
                self.kitchen_refresh_ms,
                "Le rafraichissement cuisine",
            )?,
            checkout_refresh_ms: validate_refresh_ms(
                self.checkout_refresh_ms,
                "Le rafraichissement caisse",
            )?,
            sound_alerts_enabled: self.sound_alerts_enabled,
            language: validate_language(&self.language)?,
            test_ticket_message: validate_required_string(
                &self.test_ticket_message,
                "Le message de test",
                5,
                500,
            )?,
        })
    }
}

async fn upsert_settings(pool: &SqlitePool, settings: &AppSettings) -> Result<(), String> {
    let payload = serde_json::to_value(settings)
        .map_err(|error| format!("Serialisation des parametres impossible: {error}"))?;

    sqlx::query(
        "INSERT INTO app_settings (id, payload)
         VALUES (?, ?)
         ON CONFLICT(id) DO UPDATE
         SET payload = excluded.payload,
             updated_at = CURRENT_TIMESTAMP",
    )
    .bind(APP_SETTINGS_ROW_ID)
    .bind(payload)
    .execute(pool)
    .await
    .map_err(|error| format!("Enregistrement des parametres impossible: {error}"))?;

    Ok(())
}

async fn load_settings(pool: &SqlitePool) -> Result<AppSettings, String> {
    let payload = sqlx::query_scalar::<_, serde_json::Value>(
        "SELECT payload
         FROM app_settings
         WHERE id = $1",
    )
    .bind(APP_SETTINGS_ROW_ID)
    .fetch_optional(pool)
    .await
    .map_err(|error| format!("Lecture des parametres impossible: {error}"))?;

    match payload {
        Some(payload) => serde_json::from_value::<AppSettings>(payload)
            .map_err(|error| format!("Parametres en base invalides: {error}"))
            .and_then(AppSettings::validate),
        None => {
            let settings = AppSettings::default();
            upsert_settings(pool, &settings).await?;
            Ok(settings)
        }
    }
}

#[tauri::command]
pub async fn get_app_settings(state: State<'_, DatabaseState>) -> Result<AppSettings, String> {
    let pool = state.ensure_pool().await?;
    load_settings(&pool).await
}

#[tauri::command]
pub async fn save_app_settings(
    state: State<'_, DatabaseState>,
    input: AppSettings,
) -> Result<AppSettings, String> {
    let pool = state.ensure_pool().await?;
    let validated = input.validate()?;
    upsert_settings(&pool, &validated).await?;
    Ok(validated)
}

#[tauri::command]
pub async fn reset_app_settings(state: State<'_, DatabaseState>) -> Result<AppSettings, String> {
    let pool = state.ensure_pool().await?;
    let defaults = AppSettings::default();
    upsert_settings(&pool, &defaults).await?;
    Ok(defaults)
}
