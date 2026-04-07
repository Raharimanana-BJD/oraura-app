use std::{
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

static ID_COUNTER: AtomicU64 = AtomicU64::new(0);

pub fn generate_id(prefix: &str) -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time before unix epoch")
        .as_nanos();
    let counter = ID_COUNTER.fetch_add(1, Ordering::Relaxed);

    format!("{prefix}-{nanos:032x}-{counter:016x}")
}
