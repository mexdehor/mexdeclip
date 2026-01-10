// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod clipboard;
mod commands;

use clipboard::ClipboardManager;
use commands::*;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .manage(ClipboardManager::new())
        .setup(|app| {
            let show_item = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let hide_item = MenuItem::with_id(app, "hide", "Hide Window", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show_item, &hide_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
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
                .build(app)?;

            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            show_window,
            hide_window,
            toggle_window,
            read_clipboard,
            write_clipboard,
            reinitialize_clipboard,
            is_wayland_session,
            is_cosmic_data_control_enabled
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
