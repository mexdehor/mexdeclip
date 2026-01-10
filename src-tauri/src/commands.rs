use crate::clipboard::ClipboardManager;
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub async fn read_clipboard(manager: State<'_, ClipboardManager>) -> Result<String, String> {
    manager.read().await
}

#[tauri::command]
pub async fn write_clipboard(
    text: String,
    manager: State<'_, ClipboardManager>,
) -> Result<(), String> {
    manager.write(text).await
}

#[tauri::command]
pub async fn reinitialize_clipboard(manager: State<'_, ClipboardManager>) -> Result<(), String> {
    manager.reinitialize()
}

#[tauri::command]
pub fn show_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
pub fn hide_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

#[tauri::command]
pub fn toggle_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(visible) = window.is_visible() {
            if visible {
                let _ = window.hide();
            } else {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    }
}

#[tauri::command]
pub fn is_wayland_session(manager: State<'_, ClipboardManager>) -> bool {
    manager.is_wayland()
}

#[tauri::command]
pub fn is_cosmic_data_control_enabled() -> bool {
    std::env::var("COSMIC_DATA_CONTROL_ENABLED")
        .map(|v| v == "1")
        .unwrap_or(false)
}
