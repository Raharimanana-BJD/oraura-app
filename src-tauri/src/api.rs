use std::{net::SocketAddr, sync::Arc, time::Duration};

use axum::{
    extract::{Extension, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use futures_util::{SinkExt, StreamExt};
use sqlx::SqlitePool;
use tokio::sync::broadcast;
use tower_http::services::ServeDir;

use crate::orders::{self, CreateOrderInput};

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    pub broadcaster: broadcast::Sender<String>,
}

#[derive(serde::Serialize)]
struct ApiStatus {
    status: &'static str,
    message: String,
}

#[derive(serde::Serialize)]
struct ApiError {
    error: String,
}

pub async fn run_server(state: AppState) -> Result<(), String> {
    let shared_state = Arc::new(state);

    let app = Router::new()
        .route("/api/ping", get(ping))
        .route("/api/orders", post(create_order))
        .route("/api/ws", get(ws_handler))
        .nest_service("/", ServeDir::new("../dist").append_index_html_on_directories(true))
        .layer(Extension(shared_state.clone()))
        .with_state(shared_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    println!("Serveur tablette demarre sur {addr}");
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|error| format!("Impossible d'ouvrir le port HTTP 3000: {error}"))?;

    axum::serve(listener, app)
        .await
        .map_err(|error| format!("Serveur Axum interrompu: {error}"))
}

async fn ping() -> impl IntoResponse {
    (StatusCode::OK, Json(ApiStatus { status: "ok", message: "Serveur Axum actif".to_string() }))
}

async fn create_order(
    Extension(state): Extension<Arc<AppState>>,
    Json(payload): Json<CreateOrderInput>,
) -> impl IntoResponse {
    match orders::create_order_http(&state.pool, payload).await {
        Ok(order) => {
            let _ = state.broadcaster.send("order_created".to_string());
            (StatusCode::CREATED, Json(serde_json::json!(order))).into_response()
        }
        Err(error) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!(ApiError { error })),
        )
            .into_response(),
    }
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let mut receiver = state.broadcaster.subscribe();
    let (mut sender, mut receiver_socket) = socket.split();

    let mut send_task = tokio::spawn(async move {
        while let Ok(message) = receiver.recv().await {
            if sender.send(Message::Text(message.into())).await.is_err() {
                break;
            }
        }
    });

    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver_socket.next().await {
            if let Message::Text(text) = msg {
                let _ = state.broadcaster.send(format!("client: {}", text));
            }
        }
    });

    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    }
}

pub async fn announce_mdns() -> Result<(), String> {
    let mdns = mdns_sd::ServiceDaemon::new().map_err(|error| format!("Impossible de demarrer mDNS: {error}"))?;
    let service_info = mdns_sd::ServiceInfo::new(
        "_http._tcp.local.",
        "oraura",
        "oraura.local.",
        (),
        3000,
        [("path", "/")].as_slice(),
    )
    .map_err(|error| format!("Impossible de creer le service mDNS: {error}"))?;

    mdns.register(service_info)
        .map_err(|error| format!("Impossible d'enregistrer le service mDNS: {error}"))?;

    loop {
        tokio::time::sleep(Duration::from_secs(3600)).await;
    }
}
