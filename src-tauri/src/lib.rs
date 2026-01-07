use arboard::Clipboard;
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager, State};

// Detect if we're running on Wayland
fn is_wayland() -> bool {
    std::env::var("WAYLAND_DISPLAY").is_ok()
}

// Check if COSMIC data control is enabled (allows unfocused clipboard access)
fn has_data_control() -> bool {
    std::env::var("COSMIC_DATA_CONTROL_ENABLED")
        .map(|v| v == "1")
        .unwrap_or(false)
}

// Clipboard manager that handles both X11 (arboard) and Wayland (wl-clipboard)
struct ClipboardManager {
    clipboard: Arc<Mutex<Option<Clipboard>>>,
    is_wayland: bool,
    has_data_control: bool,
}

impl ClipboardManager {
    fn new() -> Self {
        let is_wayland = is_wayland();
        let has_data_control = has_data_control();

        if is_wayland {
            eprintln!("Wayland detected - will use wl-clipboard commands");
            if has_data_control {
                eprintln!(
                    "COSMIC_DATA_CONTROL_ENABLED detected - background clipboard access available!"
                );
            } else {
                eprintln!(
                    "COSMIC_DATA_CONTROL_ENABLED not set - clipboard access requires window focus"
                );
                eprintln!("To enable background access, set COSMIC_DATA_CONTROL_ENABLED=1 in /etc/environment.d/clipboard.conf");
            }
        } else {
            eprintln!("X11 detected - will use arboard");
        }

        Self {
            clipboard: Arc::new(Mutex::new(None)),
            is_wayland,
            has_data_control,
        }
    }

    fn ensure_clipboard(&self) -> Result<(), String> {
        // Only needed for X11/arboard
        if self.is_wayland {
            return Ok(());
        }

        let mut clipboard_guard = self
            .clipboard
            .lock()
            .map_err(|e| format!("Failed to acquire clipboard lock: {}", e))?;

        if clipboard_guard.is_none() {
            *clipboard_guard = Some(
                Clipboard::new()
                    .map_err(|e| format!("Failed to create clipboard instance: {}", e))?,
            );
        }

        Ok(())
    }

    async fn read_wayland(&self) -> Result<String, String> {
        // Try wl-paste command
        match Command::new("wl-paste").arg("--no-newline").output() {
            Ok(output) => {
                if output.status.success() {
                    String::from_utf8(output.stdout)
                        .map_err(|e| format!("Invalid UTF-8 in clipboard: {}", e))
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    // Empty clipboard or no text content is not an error
                    if stderr.contains("No selection") || stderr.is_empty() {
                        Ok(String::new())
                    } else {
                        Err(format!("wl-paste failed: {}", stderr))
                    }
                }
            }
            Err(e) => Err(format!(
                "Failed to execute wl-paste (is wl-clipboard installed?): {}",
                e
            )),
        }
    }

    async fn write_wayland(&self, text: String) -> Result<(), String> {
        // Use wl-copy command
        match Command::new("wl-copy").arg("--").arg(&text).output() {
            Ok(output) => {
                if output.status.success() {
                    Ok(())
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    Err(format!("wl-copy failed: {}", stderr))
                }
            }
            Err(e) => Err(format!(
                "Failed to execute wl-copy (is wl-clipboard installed?): {}",
                e
            )),
        }
    }

    async fn read_x11(&self) -> Result<String, String> {
        const MAX_RETRIES: u32 = 3;
        const INITIAL_DELAY_MS: u64 = 50;

        for attempt in 0..MAX_RETRIES {
            if attempt > 0 {
                let delay_ms = INITIAL_DELAY_MS * (1 << (attempt - 1));
                tokio::time::sleep(Duration::from_millis(delay_ms)).await;
            }

            // Ensure clipboard instance exists
            if let Err(e) = self.ensure_clipboard() {
                if attempt < MAX_RETRIES - 1 {
                    continue;
                } else {
                    return Err(format!("Failed to create clipboard: {}", e));
                }
            }

            // Try to read from clipboard
            let result = {
                let mut clipboard_guard = self
                    .clipboard
                    .lock()
                    .map_err(|e| format!("Failed to acquire clipboard lock: {}", e))?;

                match clipboard_guard.as_mut() {
                    Some(clipboard) => clipboard.get_text(),
                    None => {
                        return Err("Clipboard instance is None".to_string());
                    }
                }
            };

            match result {
                Ok(text) => return Ok(text),
                Err(e) => {
                    let error_str = e.to_string();

                    // Empty clipboard is not an error
                    if error_str.contains("empty") || error_str.contains("not available") {
                        return Ok(String::new());
                    }

                    if attempt < MAX_RETRIES - 1 {
                        // Invalidate clipboard on error
                        if let Ok(mut guard) = self.clipboard.lock() {
                            *guard = None;
                        }
                        continue;
                    } else {
                        return Err(format!("Failed to read clipboard: {}", error_str));
                    }
                }
            }
        }

        Err("Unexpected error in read_x11".to_string())
    }

    async fn write_x11(&self, text: String) -> Result<(), String> {
        const MAX_RETRIES: u32 = 3;
        const INITIAL_DELAY_MS: u64 = 50;

        for attempt in 0..MAX_RETRIES {
            // Ensure clipboard instance exists
            if let Err(e) = self.ensure_clipboard() {
                if attempt < MAX_RETRIES - 1 {
                    let delay_ms = INITIAL_DELAY_MS * (1 << attempt);
                    tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                    continue;
                } else {
                    return Err(format!("Failed to ensure clipboard: {}", e));
                }
            }

            // Try to write to clipboard
            let result = {
                let mut clipboard_guard = self
                    .clipboard
                    .lock()
                    .map_err(|e| format!("Failed to acquire clipboard lock: {}", e))?;

                match clipboard_guard.as_mut() {
                    Some(clipboard) => clipboard.set_text(text.clone()),
                    None => {
                        return Err("Clipboard instance is None".to_string());
                    }
                }
            };

            match result {
                Ok(_) => return Ok(()),
                Err(e) => {
                    if attempt < MAX_RETRIES - 1 {
                        // Invalidate the clipboard instance
                        if let Ok(mut guard) = self.clipboard.lock() {
                            *guard = None;
                        }
                        let delay_ms = INITIAL_DELAY_MS * (1 << attempt);
                        tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                        continue;
                    } else {
                        return Err(format!("Failed to write clipboard: {}", e));
                    }
                }
            }
        }

        Err("Unexpected error in write_x11".to_string())
    }

    async fn read(&self) -> Result<String, String> {
        if self.is_wayland {
            self.read_wayland().await
        } else {
            self.read_x11().await
        }
    }

    async fn write(&self, text: String) -> Result<(), String> {
        if self.is_wayland {
            self.write_wayland(text).await
        } else {
            self.write_x11(text).await
        }
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn read_clipboard(manager: State<'_, ClipboardManager>) -> Result<String, String> {
    manager.read().await
}

#[tauri::command]
async fn write_clipboard(text: String, manager: State<'_, ClipboardManager>) -> Result<(), String> {
    manager.write(text).await
}

#[tauri::command]
async fn reinitialize_clipboard(manager: State<'_, ClipboardManager>) -> Result<(), String> {
    // For Wayland, there's nothing to reinitialize
    if manager.is_wayland {
        return Ok(());
    }

    // For X11, reset the clipboard instance
    if let Ok(mut guard) = manager.clipboard.lock() {
        *guard = None;
    }
    manager.ensure_clipboard()
}

#[tauri::command]
fn show_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn hide_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

#[tauri::command]
fn toggle_window(app: AppHandle) {
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
fn is_wayland_session() -> bool {
    is_wayland()
}

#[tauri::command]
fn has_data_control_enabled() -> bool {
    has_data_control()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(ClipboardManager::new())
        .setup(|app| {
            // Log environment info
            let wayland_display = std::env::var("WAYLAND_DISPLAY").ok();
            let xdg_runtime_dir = std::env::var("XDG_RUNTIME_DIR").ok();

            if let Some(display) = wayland_display {
                eprintln!("Running on Wayland: WAYLAND_DISPLAY={}", display);
                if xdg_runtime_dir.is_none() {
                    eprintln!("WARNING: XDG_RUNTIME_DIR is not set. This may cause issues.");
                }
            } else {
                eprintln!("Running on X11");
            }

            let show_item = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let hide_item = MenuItem::with_id(app, "hide", "Hide Window", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show_item, &hide_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
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
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            show_window,
            hide_window,
            toggle_window,
            read_clipboard,
            write_clipboard,
            reinitialize_clipboard,
            is_wayland_session,
            has_data_control_enabled
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
