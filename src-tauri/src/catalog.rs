use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use tauri::{AppHandle, Emitter, State};

use crate::{db::DatabaseState, ids::generate_id};

const CATALOG_UPDATED_EVENT: &str = "oraura://catalog-updated";

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CatalogCategory {
    pub id: String,
    pub name: String,
    pub description: String,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CatalogProduct {
    pub id: String,
    pub name: String,
    pub category_id: String,
    pub price: f64,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogPayload {
    pub categories: Vec<CatalogCategory>,
    pub products: Vec<CatalogProduct>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCategoryInput {
    pub name: String,
    pub description: String,
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCategoryInput {
    pub name: String,
    pub description: String,
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProductInput {
    pub name: String,
    pub category_id: String,
    pub price: f64,
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProductInput {
    pub name: String,
    pub category_id: String,
    pub price: f64,
    pub is_active: bool,
}

async fn fetch_catalog(pool: &SqlitePool) -> Result<CatalogPayload, String> {
    let categories = sqlx::query_as::<_, CatalogCategory>(
        "SELECT id, name, description, is_active
         FROM categories
         ORDER BY name ASC",
    )
    .fetch_all(pool)
    .await
    .map_err(|error| format!("Chargement des categories impossible: {error}"))?;

    let products = sqlx::query_as::<_, CatalogProduct>(
        "SELECT id, name, category_id, CAST(price AS REAL) AS price, is_active
         FROM products
         ORDER BY name ASC",
    )
    .fetch_all(pool)
    .await
    .map_err(|error| format!("Chargement des produits impossible: {error}"))?;

    Ok(CatalogPayload {
        categories,
        products,
    })
}

fn validate_category_name(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Le nom de categorie est requis.".to_string());
    }
    Ok(trimmed.to_string())
}

fn validate_product_name(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Le nom du produit est requis.".to_string());
    }
    Ok(trimmed.to_string())
}

fn validate_category_id(category_id: &str) -> Result<String, String> {
    let trimmed = category_id.trim();
    if trimmed.is_empty() {
        return Err("La categorie du produit est requise.".to_string());
    }
    Ok(trimmed.to_string())
}

fn validate_price(price: f64) -> Result<f64, String> {
    if !price.is_finite() || price < 0.0 {
        return Err("Le prix doit etre un nombre positif.".to_string());
    }
    Ok(price)
}

async fn emit_catalog_updated(app: &AppHandle) -> Result<(), String> {
    app.emit(CATALOG_UPDATED_EVENT, ())
        .map_err(|error| format!("Emission evenement catalogue impossible: {error}"))
}

#[tauri::command]
pub async fn list_catalog(state: State<'_, DatabaseState>) -> Result<CatalogPayload, String> {
    let pool = state.ensure_pool().await?;
    fetch_catalog(&pool).await
}

#[tauri::command]
pub async fn create_category(
    app: AppHandle,
    state: State<'_, DatabaseState>,
    input: CreateCategoryInput,
) -> Result<CatalogCategory, String> {
    let pool = state.ensure_pool().await?;
    let name = validate_category_name(&input.name)?;
    let description = input.description.trim().to_string();
    let id = generate_id("cat");

    let created = sqlx::query_as::<_, CatalogCategory>(
        "INSERT INTO categories (id, name, description, is_active)
         VALUES (?, ?, ?, ?)
         RETURNING id, name, description, is_active",
    )
    .bind(id)
    .bind(name)
    .bind(description)
    .bind(input.is_active)
    .fetch_one(&pool)
    .await
    .map_err(|error| format!("Creation de categorie impossible: {error}"))?;

    emit_catalog_updated(&app).await?;
    Ok(created)
}

#[tauri::command]
pub async fn update_category(
    app: AppHandle,
    state: State<'_, DatabaseState>,
    category_id: String,
    input: UpdateCategoryInput,
) -> Result<CatalogCategory, String> {
    let pool = state.ensure_pool().await?;
    let name = validate_category_name(&input.name)?;
    let description = input.description.trim().to_string();

    let updated = sqlx::query_as::<_, CatalogCategory>(
        "UPDATE categories
         SET name = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
         RETURNING id, name, description, is_active",
    )
    .bind(name)
    .bind(description)
    .bind(input.is_active)
    .bind(category_id)
    .fetch_optional(&pool)
    .await
    .map_err(|error| format!("Mise a jour de categorie impossible: {error}"))?
    .ok_or_else(|| "Categorie introuvable.".to_string())?;

    emit_catalog_updated(&app).await?;
    Ok(updated)
}

#[tauri::command]
pub async fn delete_category(
    app: AppHandle,
    state: State<'_, DatabaseState>,
    category_id: String,
) -> Result<(), String> {
    let pool = state.ensure_pool().await?;

    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| format!("Ouverture transaction impossible: {error}"))?;

    sqlx::query("DELETE FROM products WHERE category_id = ?")
        .bind(&category_id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("Suppression des produits de categorie impossible: {error}"))?;

    let deleted = sqlx::query("DELETE FROM categories WHERE id = ?")
        .bind(&category_id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("Suppression de categorie impossible: {error}"))?;

    if deleted.rows_affected() == 0 {
        return Err("Categorie introuvable.".to_string());
    }

    transaction
        .commit()
        .await
        .map_err(|error| format!("Validation transaction impossible: {error}"))?;

    emit_catalog_updated(&app).await?;
    Ok(())
}

#[tauri::command]
pub async fn create_product(
    app: AppHandle,
    state: State<'_, DatabaseState>,
    input: CreateProductInput,
) -> Result<CatalogProduct, String> {
    let pool = state.ensure_pool().await?;
    let name = validate_product_name(&input.name)?;
    let category_id = validate_category_id(&input.category_id)?;
    let price = validate_price(input.price)?;
    let id = generate_id("prod");

    let created = sqlx::query_as::<_, CatalogProduct>(
        "INSERT INTO products (id, name, category_id, price, is_active)
         VALUES (?, ?, ?, ?, ?)
         RETURNING id, name, category_id, CAST(price AS REAL) AS price, is_active",
    )
    .bind(id)
    .bind(name)
    .bind(category_id)
    .bind((price * 100.0).round() / 100.0)
    .bind(input.is_active)
    .fetch_one(&pool)
    .await
    .map_err(|error| format!("Creation de produit impossible: {error}"))?;

    emit_catalog_updated(&app).await?;
    Ok(created)
}

#[tauri::command]
pub async fn update_product(
    app: AppHandle,
    state: State<'_, DatabaseState>,
    product_id: String,
    input: UpdateProductInput,
) -> Result<CatalogProduct, String> {
    let pool = state.ensure_pool().await?;
    let name = validate_product_name(&input.name)?;
    let category_id = validate_category_id(&input.category_id)?;
    let price = validate_price(input.price)?;

    let updated = sqlx::query_as::<_, CatalogProduct>(
        "UPDATE products
         SET name = ?, category_id = ?, price = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
         RETURNING id, name, category_id, CAST(price AS REAL) AS price, is_active",
    )
    .bind(name)
    .bind(category_id)
    .bind((price * 100.0).round() / 100.0)
    .bind(input.is_active)
    .bind(product_id)
    .fetch_optional(&pool)
    .await
    .map_err(|error| format!("Mise a jour de produit impossible: {error}"))?
    .ok_or_else(|| "Produit introuvable.".to_string())?;

    emit_catalog_updated(&app).await?;
    Ok(updated)
}

#[tauri::command]
pub async fn delete_product(
    app: AppHandle,
    state: State<'_, DatabaseState>,
    product_id: String,
) -> Result<(), String> {
    let pool = state.ensure_pool().await?;
    let deleted = sqlx::query("DELETE FROM products WHERE id = ?")
        .bind(product_id)
        .execute(&pool)
        .await
        .map_err(|error| format!("Suppression de produit impossible: {error}"))?;

    if deleted.rows_affected() == 0 {
        return Err("Produit introuvable.".to_string());
    }

    emit_catalog_updated(&app).await?;
    Ok(())
}
