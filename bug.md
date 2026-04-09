PS C:\Users\USER\Desktop\oraura-app> p tauri dev
Running BeforeDevCommand (`pnpm dev`)

> oraura-app@0.1.0 dev C:\Users\USER\Desktop\oraura-app
> vite

VITE v7.3.2 ready in 2380 ms

➜ Local: http://localhost:1420/
Running DevCommand (`cargo  run --no-default-features --color always --`)
Info Watching C:\Users\USER\Desktop\oraura-app\src-tauri for changes...
Compiling oraura-app v0.1.0 (C:\Users\USER\Desktop\oraura-app\src-tauri)
Finished `dev` profile [unoptimized + debuginfo] target(s) in 1m 50s
Running `target\debug\oraura-app.exe`

thread 'main' (13568) panicked at src\lib.rs:105:14:
Impossible d'initialiser la base de donnees SQLite.: "Execution des migrations SQL impossible: while executing migration 2: error returned from database: (code: 1) near \"EXISTS\": syntax error"
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
error: process didn't exit successfully: `target\debug\oraura-app.exe` (exit code: 101)
 ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "tauri dev" not found

Did you mean "pnpm tauri"?
