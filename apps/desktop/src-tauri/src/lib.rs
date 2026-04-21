//! Minimal Tauri-side library surface for the P1 foundation loop.
//!
//! The production Tauri entrypoint can wrap these modules with `#[tauri::command]`
//! functions later; keeping this crate dependency-light lets the Store/Adapter
//! boundary compile and test independently in the current repository snapshot.

#[tauri::command]
fn p1_window_minimize(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
fn p1_window_maximize(window: tauri::Window) {
    if let Ok(true) = window.is_maximized() {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
}

#[tauri::command]
fn p1_window_close(window: tauri::Window) {
    let _ = window.close();
}

#[tauri::command]
fn p1_window_start_dragging(window: tauri::Window) {
    let _ = window.start_dragging();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            p1_window_minimize,
            p1_window_maximize,
            p1_window_close,
            p1_window_start_dragging,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

pub mod adapters;

pub mod commands {
    pub mod distribution;
    pub mod local_state;
    pub mod local_state_types;
    pub mod path_validation;
    pub mod project_directory;
    pub mod tool_detection;
}

pub mod store;
