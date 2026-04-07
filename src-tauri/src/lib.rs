mod catalog;
mod db;

use std::{
    io::Write,
    net::{SocketAddr, TcpStream},
    time::Duration,
};

const DEFAULT_PRINTER_PORT: u16 = 9100;
const CONNECT_TIMEOUT_MS: u64 = 3_000;
const WRITE_TIMEOUT_MS: u64 = 3_000;
const ESC: u8 = 0x1B;
const GS: u8 = 0x1D;

fn build_kitchen_ticket_payload(content: &str) -> Vec<u8> {
    let sanitized = content.replace("\r\n", "\n");
    let mut payload = Vec::with_capacity(sanitized.len() + 32);

    payload.extend_from_slice(&[ESC, b'@']);
    payload.extend_from_slice(&[ESC, b'a', 0x00]);
    payload.extend_from_slice(&[GS, b'!', 0x11]);
    payload.extend_from_slice(b"CUISINE\n");
    payload.extend_from_slice(&[GS, b'!', 0x00]);
    payload.extend_from_slice(b"------------------------------\n");
    payload.extend_from_slice(sanitized.as_bytes());

    if !sanitized.ends_with('\n') {
        payload.push(b'\n');
    }

    payload.extend_from_slice(b"\n\n");
    payload.extend_from_slice(&[GS, b'V', 0x00]);

    payload
}

fn connect_to_printer(printer_ip: &str, printer_port: u16) -> Result<TcpStream, String> {
    let address = format!("{printer_ip}:{printer_port}");
    let socket_addr: SocketAddr = address
        .parse()
        .map_err(|_| format!("Adresse IP imprimante invalide: {printer_ip}"))?;

    let stream =
        TcpStream::connect_timeout(&socket_addr, Duration::from_millis(CONNECT_TIMEOUT_MS))
            .map_err(|error| {
                format!(
            "Impossible de se connecter a l'imprimante {printer_ip}:{printer_port}: {error}"
        )
            })?;

    stream
        .set_write_timeout(Some(Duration::from_millis(WRITE_TIMEOUT_MS)))
        .map_err(|error| format!("Impossible de configurer le timeout d'ecriture: {error}"))?;

    Ok(stream)
}

#[tauri::command]
fn print_to_kitchen(printer_ip: &str, printer_port: Option<u16>, content: &str) -> Result<(), String> {
    if printer_ip.trim().is_empty() {
        return Err("L'adresse IP de l'imprimante est requise.".to_string());
    }

    if content.trim().is_empty() {
        return Err("Le ticket a imprimer est vide.".to_string());
    }

    let port = printer_port.unwrap_or(DEFAULT_PRINTER_PORT);

    if port == 0 {
        return Err("Le port de l'imprimante doit etre superieur a 0.".to_string());
    }

    let payload = build_kitchen_ticket_payload(content);
    let mut stream = connect_to_printer(printer_ip.trim(), port)?;

    stream
        .write_all(&payload)
        .map_err(|error| format!("Echec d'envoi du ticket vers l'imprimante: {error}"))?;

    stream
        .flush()
        .map_err(|error| format!("Echec de finalisation d'impression: {error}"))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let database_state = db::DatabaseState::new();
    tauri::async_runtime::block_on(db::warm_up_database(&database_state));

    tauri::Builder::default()
        .manage(database_state)
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            print_to_kitchen,
            db::initialize_database,
            db::database_status,
            catalog::list_catalog,
            catalog::create_category,
            catalog::update_category,
            catalog::delete_category,
            catalog::create_product,
            catalog::update_product,
            catalog::delete_product
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::build_kitchen_ticket_payload;

    #[test]
    fn payload_contains_ticket_body_and_cut_command() {
        let payload = build_kitchen_ticket_payload("Hello Restaurant");

        assert!(payload.starts_with(&[0x1B, b'@']));
        assert!(payload
            .windows("Hello Restaurant".len())
            .any(|window| window == b"Hello Restaurant"));
        assert!(payload.ends_with(&[0x1D, b'V', 0x00]));
    }

    #[test]
    fn payload_ensures_ticket_ends_with_newline_before_cut() {
        let payload = build_kitchen_ticket_payload("Burger x2");

        assert!(payload.windows(4).any(|window| window == b"x2\n\n"));
    }
}
