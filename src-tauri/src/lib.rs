use arboard::Clipboard;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager, State};

// Clipboard manager that reuses a single Clipboard instance
struct ClipboardManager {
    clipboard: Arc<Mutex<Option<Clipboard>>>,
}

impl ClipboardManager {
    fn new() -> Self {
        Self {
            clipboard: Arc::new(Mutex::new(None)),
        }
    }

    fn ensure_clipboard(&self) -> Result<(), String> {
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

    fn reinitialize(&self) -> Result<(), String> {
        let mut clipboard_guard = self
            .clipboard
            .lock()
            .map_err(|e| format!("Failed to acquire clipboard lock: {}", e))?;
        *clipboard_guard = None;
        drop(clipboard_guard);
        self.ensure_clipboard()?;
        Ok(())
    }

    async fn read_with_retry(&self) -> Result<String, String> {
        const MAX_RETRIES: u32 = 3;
        const INITIAL_DELAY_MS: u64 = 50;

        for attempt in 0..MAX_RETRIES {
            // Ensure clipboard instance exists
            if let Err(e) = self.ensure_clipboard() {
                let error_msg = format!(
                    "Failed to ensure clipboard instance (attempt {}/{}): {}",
                    attempt + 1,
                    MAX_RETRIES,
                    e
                );
                eprintln!("{}", error_msg);

                if attempt < MAX_RETRIES - 1 {
                    let delay_ms = INITIAL_DELAY_MS * (1 << attempt);
                    tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                    continue;
                } else {
                    return Err(format!(
                        "Failed to ensure clipboard instance after {} attempts. Last error: {}",
                        MAX_RETRIES, e
                    ));
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
                        return Err("Clipboard instance is None after ensure_clipboard".to_string());
                    }
                }
            };

            match result {
                Ok(text) => return Ok(text),
                Err(e) => {
                    let error_msg = format!(
                        "Failed to read clipboard (attempt {}/{}): {}",
                        attempt + 1,
                        MAX_RETRIES,
                        e
                    );
                    eprintln!("{}", error_msg);

                    // Invalidate the clipboard instance
                    if let Ok(mut guard) = self.clipboard.lock() {
                        *guard = None;
                    }

                    if attempt < MAX_RETRIES - 1 {
                        // Exponential backoff: 50ms, 100ms, 200ms
                        let delay_ms = INITIAL_DELAY_MS * (1 << attempt);
                        tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                        continue;
                    } else {
                        return Err(format!(
                            "Failed to read clipboard after {} attempts. Last error: {}",
                            MAX_RETRIES, e
                        ));
                    }
                }
            }
        }

        Err("Unexpected error in read_with_retry".to_string())
    }

    async fn write_with_retry(&self, text: String) -> Result<(), String> {
        const MAX_RETRIES: u32 = 3;
        const INITIAL_DELAY_MS: u64 = 50;

        for attempt in 0..MAX_RETRIES {
            // Ensure clipboard instance exists
            if let Err(e) = self.ensure_clipboard() {
                let error_msg = format!(
                    "Failed to ensure clipboard instance (attempt {}/{}): {}",
                    attempt + 1,
                    MAX_RETRIES,
                    e
                );
                eprintln!("{}", error_msg);

                if attempt < MAX_RETRIES - 1 {
                    let delay_ms = INITIAL_DELAY_MS * (1 << attempt);
                    tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                    continue;
                } else {
                    return Err(format!(
                        "Failed to ensure clipboard instance after {} attempts. Last error: {}",
                        MAX_RETRIES, e
                    ));
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
                        return Err("Clipboard instance is None after ensure_clipboard".to_string());
                    }
                }
            };

            match result {
                Ok(_) => return Ok(()),
                Err(e) => {
                    let error_msg = format!(
                        "Failed to write clipboard (attempt {}/{}): {}",
                        attempt + 1,
                        MAX_RETRIES,
                        e
                    );
                    eprintln!("{}", error_msg);

                    // Invalidate the clipboard instance
                    if let Ok(mut guard) = self.clipboard.lock() {
                        *guard = None;
                    }

                    if attempt < MAX_RETRIES - 1 {
                        let delay_ms = INITIAL_DELAY_MS * (1 << attempt);
                        tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                        continue;
                    } else {
                        return Err(format!(
                            "Failed to write clipboard after {} attempts. Last error: {}",
                            MAX_RETRIES, e
                        ));
                    }
                }
            }
        }

        Err("Unexpected error in write_with_retry".to_string())
    }
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn read_clipboard(
    manager: State<'_, ClipboardManager>,
) -> Result<String, String> {
    manager.read_with_retry().await
}

#[tauri::command]
async fn write_clipboard(
    text: String,
    manager: State<'_, ClipboardManager>,
) -> Result<(), String> {
    manager.write_with_retry(text).await
}

#[tauri::command]
async fn reinitialize_clipboard(
    manager: State<'_, ClipboardManager>,
) -> Result<(), String> {
    manager.reinitialize()
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(ClipboardManager::new())
        .setup(|app| {
            // Check Wayland environment
            let wayland_display = std::env::var("WAYLAND_DISPLAY").ok();
            let xdg_runtime_dir = std::env::var("XDG_RUNTIME_DIR").ok();
            
            if wayland_display.is_some() {
                eprintln!("Wayland environment detected: WAYLAND_DISPLAY={:?}", wayland_display);
            }
            if xdg_runtime_dir.is_some() {
                eprintln!("XDG_RUNTIME_DIR is set: {:?}", xdg_runtime_dir);
            } else {
                eprintln!("WARNING: XDG_RUNTIME_DIR is not set. This may cause clipboard issues on Wayland.");
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
            reinitialize_clipboard
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
