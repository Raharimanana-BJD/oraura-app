use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use tauri::{AppHandle, Emitter, State};

use crate::{db::DatabaseState, ids::generate_id};

const ORDERS_UPDATED_EVENT: &str = "oraura://orders-updated";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderLine {
    pub id: String,
    pub product_id: String,
    pub name: String,
    pub category: String,
    pub unit_price: f64,
    pub quantity: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalOrder {
    pub id: String,
    pub order_number: String,
    pub customer_name: String,
    pub order_mode: String,
    pub notes: String,
    pub lines: Vec<OrderLine>,
    pub total_amount: f64,
    pub total_items: i32,
    pub kitchen_status: String,
    pub payment_status: String,
    pub payment_method: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateOrderLineInput {
    pub product_id: String,
    pub quantity: i32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateOrderInput {
    pub order_number: String,
    pub customer_name: String,
    pub order_mode: String,
    pub notes: String,
    pub lines: Vec<CreateOrderLineInput>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletePaymentInput {
    pub payment_method: String,
}

fn validate_non_empty(value: &str, message: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(message.to_string());
    }
    Ok(trimmed.to_string())
}

fn validate_order_mode(value: &str) -> Result<String, String> {
    match value.trim() {
        "sur-place" | "a-emporter" | "livraison" => Ok(value.trim().to_string()),
        _ => Err("Mode de commande invalide.".to_string()),
    }
}

fn validate_payment_method(value: &str) -> Result<String, String> {
    match value.trim() {
        "CASH" | "CARD" | "MOBILE_MONEY" => Ok(value.trim().to_string()),
        _ => Err("Mode de paiement invalide.".to_string()),
    }
}

#[derive(Debug)]
struct PreparedOrderLine {
    product_id: String,
    name: String,
    category: String,
    unit_price: f64,
    quantity: i32,
}

fn round_currency(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

async fn prepare_order_lines(
    pool: &PgPool,
    lines: Vec<CreateOrderLineInput>,
) -> Result<(Vec<PreparedOrderLine>, f64, i32), String> {
    let mut prepared_lines = Vec::with_capacity(lines.len());
    let mut total_amount = 0.0;
    let mut total_items = 0;

    for line in lines {
        let product_id = validate_non_empty(&line.product_id, "Produit de ligne requis.")?;

        if line.quantity <= 0 {
            return Err("Quantite invalide dans la commande.".to_string());
        }

        let snapshot = sqlx::query_as::<_, (String, String, f64, bool)>(
            "SELECT products.name,
                    categories.name,
                    products.price::double precision,
                    products.is_active
             FROM products
             INNER JOIN categories ON categories.id = products.category_id
             WHERE products.id = $1",
        )
        .bind(&product_id)
        .fetch_optional(pool)
        .await
        .map_err(|error| format!("Lecture produit impossible: {error}"))?
        .ok_or_else(|| format!("Produit introuvable: {product_id}"))?;

        let (name, category, unit_price, is_active) = snapshot;

        if !is_active {
            return Err(format!(
                "Le produit {name} est inactif et ne peut pas etre commande."
            ));
        }

        total_amount += unit_price * f64::from(line.quantity);
        total_items += line.quantity;
        prepared_lines.push(PreparedOrderLine {
            product_id,
            name,
            category,
            unit_price,
            quantity: line.quantity,
        });
    }

    Ok((prepared_lines, round_currency(total_amount), total_items))
}

async fn emit_orders_updated(app: &AppHandle) -> Result<(), String> {
    app.emit(ORDERS_UPDATED_EVENT, ())
        .map_err(|error| format!("Emission evenement commandes impossible: {error}"))
}

async fn fetch_lines_by_order_id(pool: &PgPool, order_id: &str) -> Result<Vec<OrderLine>, String> {
    let rows = sqlx::query_as::<_, (String, String, String, String, f64, i32)>(
        "SELECT id, product_id, name, category, unit_price::double precision, quantity
         FROM order_items
         WHERE order_id = $1
         ORDER BY created_at ASC, id ASC",
    )
    .bind(order_id)
    .fetch_all(pool)
    .await
    .map_err(|error| format!("Chargement des lignes de commande impossible: {error}"))?;

    Ok(rows
        .into_iter()
        .map(
            |(id, product_id, name, category, unit_price, quantity)| OrderLine {
                id,
                product_id,
                name,
                category,
                unit_price,
                quantity,
            },
        )
        .collect())
}

async fn fetch_order_by_id(pool: &PgPool, order_id: &str) -> Result<LocalOrder, String> {
    let row = sqlx::query_as::<
        _,
        (
            String,
            String,
            String,
            String,
            String,
            f64,
            i32,
            String,
            String,
            Option<String>,
            String,
            String,
        ),
    >(
        "SELECT id, order_number, customer_name, order_mode::text, notes,
                total_amount::double precision, total_items, kitchen_status::text,
                payment_status::text, payment_method::text, created_at::text, updated_at::text
         FROM orders
         WHERE id = $1",
    )
    .bind(order_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| format!("Chargement de commande impossible: {error}"))?
    .ok_or_else(|| "Commande introuvable.".to_string())?;

    let lines = fetch_lines_by_order_id(pool, &row.0).await?;

    Ok(LocalOrder {
        id: row.0,
        order_number: row.1,
        customer_name: row.2,
        order_mode: row.3,
        notes: row.4,
        lines,
        total_amount: row.5,
        total_items: row.6,
        kitchen_status: row.7,
        payment_status: row.8,
        payment_method: row.9,
        created_at: row.10,
        updated_at: row.11,
    })
}

#[tauri::command]
pub async fn list_orders(state: State<'_, DatabaseState>) -> Result<Vec<LocalOrder>, String> {
    let pool = state.ensure_pool().await?;
    let rows = sqlx::query_as::<
        _,
        (
            String,
            String,
            String,
            String,
            String,
            f64,
            i32,
            String,
            String,
            Option<String>,
            String,
            String,
        ),
    >(
        "SELECT id, order_number, customer_name, order_mode::text, notes,
                total_amount::double precision, total_items, kitchen_status::text,
                payment_status::text, payment_method::text, created_at::text, updated_at::text
         FROM orders
         ORDER BY created_at DESC, order_number DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|error| format!("Chargement des commandes impossible: {error}"))?;

    let mut orders = Vec::with_capacity(rows.len());
    for row in rows {
        let lines = fetch_lines_by_order_id(&pool, &row.0).await?;
        orders.push(LocalOrder {
            id: row.0,
            order_number: row.1,
            customer_name: row.2,
            order_mode: row.3,
            notes: row.4,
            lines,
            total_amount: row.5,
            total_items: row.6,
            kitchen_status: row.7,
            payment_status: row.8,
            payment_method: row.9,
            created_at: row.10,
            updated_at: row.11,
        });
    }

    Ok(orders)
}

#[tauri::command]
pub async fn create_order(
    app: AppHandle,
    state: State<'_, DatabaseState>,
    input: CreateOrderInput,
) -> Result<LocalOrder, String> {
    let pool = state.ensure_pool().await?;

    if input.lines.is_empty() {
        return Err("La commande doit contenir au moins une ligne.".to_string());
    }

    let order_number = validate_non_empty(&input.order_number, "Numero de commande requis.")?;
    let customer_name = input.customer_name.trim().to_string();
    let order_mode = validate_order_mode(&input.order_mode)?;
    let notes = input.notes.trim().to_string();
    let (prepared_lines, total_amount, total_items) =
        prepare_order_lines(&pool, input.lines).await?;

    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| format!("Ouverture transaction impossible: {error}"))?;

    let order_id = generate_id("ord");

    sqlx::query(
        "INSERT INTO orders (
            id, order_number, customer_name, order_mode, notes,
            total_amount, total_items, kitchen_status, payment_status, payment_method
         ) VALUES (
            $1, $2, $3, CAST($4 AS order_mode), $5,
            $6, $7, 'PREPARING', 'PENDING', NULL
         )",
    )
    .bind(&order_id)
    .bind(order_number)
    .bind(customer_name)
    .bind(order_mode)
    .bind(notes)
    .bind(total_amount)
    .bind(total_items)
    .execute(&mut *transaction)
    .await
    .map_err(|error| format!("Creation de commande impossible: {error}"))?;

    for line in prepared_lines {
        sqlx::query(
            "INSERT INTO order_items (
                id, order_id, product_id, name, category, quantity, unit_price
             ) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        )
        .bind(generate_id("line"))
        .bind(&order_id)
        .bind(line.product_id)
        .bind(line.name)
        .bind(line.category)
        .bind(line.quantity)
        .bind(round_currency(line.unit_price))
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("Creation de ligne de commande impossible: {error}"))?;
    }

    transaction
        .commit()
        .await
        .map_err(|error| format!("Validation transaction impossible: {error}"))?;

    let created = fetch_order_by_id(&pool, &order_id).await?;
    emit_orders_updated(&app).await?;
    Ok(created)
}

#[tauri::command]
pub async fn mark_order_ready(
    app: AppHandle,
    state: State<'_, DatabaseState>,
    order_id: String,
) -> Result<LocalOrder, String> {
    let pool = state.ensure_pool().await?;
    let updated = sqlx::query(
        "UPDATE orders
         SET kitchen_status = 'READY', updated_at = NOW()
         WHERE id = $1 AND payment_status = 'PENDING'",
    )
    .bind(&order_id)
    .execute(&pool)
    .await
    .map_err(|error| format!("Mise a jour du statut cuisine impossible: {error}"))?;

    if updated.rows_affected() == 0 {
        return Err("Commande introuvable ou deja reglee.".to_string());
    }

    let order = fetch_order_by_id(&pool, &order_id).await?;
    emit_orders_updated(&app).await?;
    Ok(order)
}

#[tauri::command]
pub async fn complete_order_payment(
    app: AppHandle,
    state: State<'_, DatabaseState>,
    order_id: String,
    input: CompletePaymentInput,
) -> Result<LocalOrder, String> {
    let pool = state.ensure_pool().await?;
    let payment_method = validate_payment_method(&input.payment_method)?;

    let updated = sqlx::query(
        "UPDATE orders
         SET payment_status = 'COMPLETED',
             payment_method = CAST($2 AS payment_method),
             updated_at = NOW()
         WHERE id = $1 AND payment_status = 'PENDING'",
    )
    .bind(&order_id)
    .bind(payment_method)
    .execute(&pool)
    .await
    .map_err(|error| format!("Encaissement de commande impossible: {error}"))?;

    if updated.rows_affected() == 0 {
        return Err("Commande introuvable ou deja reglee.".to_string());
    }

    let order = fetch_order_by_id(&pool, &order_id).await?;
    emit_orders_updated(&app).await?;
    Ok(order)
}
