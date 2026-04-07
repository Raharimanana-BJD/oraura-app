use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use tauri::{AppHandle, Emitter, State};

use crate::db::DatabaseState;

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

fn build_id(prefix: &str) -> String {
    let millis = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("system time before unix epoch")
        .as_millis();

    format!("{prefix}-{millis}")
}

async fn seed_catalog_if_empty(pool: &PgPool) -> Result<(), String> {
    let category_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM categories")
        .fetch_one(pool)
        .await
        .map_err(|error| format!("Lecture du catalogue impossible: {error}"))?;

    if category_count > 0 {
        return Ok(());
    }

    let seed_categories = [
        ("cat-burgers", "Burgers", "Burgers signatures"),
        ("cat-wraps", "Wraps", "Wraps et tacos"),
        ("cat-sides", "Accompagnements", "Frites et snacks"),
        ("cat-drinks", "Boissons", "Boissons fraiches"),
    ];

    for (id, name, description) in seed_categories {
        sqlx::query(
            "INSERT INTO categories (id, name, description, is_active)
             VALUES ($1, $2, $3, TRUE)
             ON CONFLICT (id) DO NOTHING",
        )
        .bind(id)
        .bind(name)
        .bind(description)
        .execute(pool)
        .await
        .map_err(|error| format!("Insertion categorie impossible: {error}"))?;
    }

    let seed_products = [
        ("burger-classic", "Burger Classic", "cat-burgers", 12000.0),
        ("burger-double", "Double Burger Bacon", "cat-burgers", 19500.0),
        ("wrap-crispy", "Wrap poulet crispy", "cat-wraps", 14500.0),
        ("tacos-xl", "Menu Tacos XL", "cat-wraps", 22000.0),
        ("fries-large", "Frites XL", "cat-sides", 6000.0),
        ("nuggets-12", "Nuggets x12", "cat-sides", 16000.0),
        ("coca-33", "Coca-Cola 33cl", "cat-drinks", 3500.0),
        ("orange-juice", "Jus d'orange", "cat-drinks", 4000.0),
    ];

    for (id, name, category_id, price) in seed_products {
        sqlx::query(
            "INSERT INTO products (id, name, category_id, price, is_active)
             VALUES ($1, $2, $3, $4, TRUE)
             ON CONFLICT (id) DO NOTHING",
        )
        .bind(id)
        .bind(name)
        .bind(category_id)
        .bind(price)
        .execute(pool)
        .await
        .map_err(|error| format!("Insertion produit impossible: {error}"))?;
    }

    Ok(())
}

async fn fetch_catalog(pool: &PgPool) -> Result<CatalogPayload, String> {
    let categories = sqlx::query_as::<_, CatalogCategory>(
        "SELECT id, name, description, is_active
         FROM categories
         ORDER BY name ASC",
    )
    .fetch_all(pool)
    .await
    .map_err(|error| format!("Chargement des categories impossible: {error}"))?;

    let products = sqlx::query_as::<_, CatalogProduct>(
        "SELECT id, name, category_id, price::double precision AS price, is_active
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
    seed_catalog_if_empty(&pool).await?;
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
    let id = build_id("cat");

    let created = sqlx::query_as::<_, CatalogCategory>(
        "INSERT INTO categories (id, name, description, is_active)
         VALUES ($1, $2, $3, $4)
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
         SET name = $2, description = $3, is_active = $4, updated_at = NOW()
         WHERE id = $1
         RETURNING id, name, description, is_active",
    )
    .bind(category_id)
    .bind(name)
    .bind(description)
    .bind(input.is_active)
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

    sqlx::query("DELETE FROM products WHERE category_id = $1")
        .bind(&category_id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("Suppression des produits de categorie impossible: {error}"))?;

    let deleted = sqlx::query("DELETE FROM categories WHERE id = $1")
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
    let id = build_id("prod");

    let created = sqlx::query_as::<_, CatalogProduct>(
        "INSERT INTO products (id, name, category_id, price, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, category_id, price::double precision AS price, is_active",
    )
    .bind(id)
    .bind(name)
    .bind(category_id)
    .bind(price)
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
         SET name = $2, category_id = $3, price = $4, is_active = $5, updated_at = NOW()
         WHERE id = $1
         RETURNING id, name, category_id, price::double precision AS price, is_active",
    )
    .bind(product_id)
    .bind(name)
    .bind(category_id)
    .bind(price)
    .bind(input.is_active)
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
    let deleted = sqlx::query("DELETE FROM products WHERE id = $1")
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
