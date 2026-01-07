use super::wayland;
use super::x11::X11Clipboard;

/// Check if running on Wayland
fn is_wayland() -> bool {
    std::env::var("WAYLAND_DISPLAY").is_ok()
}

/// Check if COSMIC data control is enabled
pub fn has_data_control() -> bool {
    std::env::var("COSMIC_DATA_CONTROL_ENABLED")
        .map(|v| v == "1")
        .unwrap_or(false)
}

/// Unified clipboard manager that handles both X11 and Wayland
pub struct ClipboardManager {
    x11_clipboard: Option<X11Clipboard>,
    is_wayland: bool,
    has_data_control: bool,
}

impl ClipboardManager {
    pub fn new() -> Self {
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
            x11_clipboard: if is_wayland {
                None
            } else {
                Some(X11Clipboard::new())
            },
            is_wayland,
            has_data_control,
        }
    }

    pub fn is_wayland(&self) -> bool {
        self.is_wayland
    }

    pub fn has_data_control(&self) -> bool {
        self.has_data_control
    }

    pub async fn read(&self) -> Result<String, String> {
        if self.is_wayland {
            wayland::read().await
        } else {
            match &self.x11_clipboard {
                Some(clipboard) => clipboard.read().await,
                None => Err("X11 clipboard not initialized".to_string()),
            }
        }
    }

    pub async fn write(&self, text: String) -> Result<(), String> {
        if self.is_wayland {
            wayland::write(text).await
        } else {
            match &self.x11_clipboard {
                Some(clipboard) => clipboard.write(text).await,
                None => Err("X11 clipboard not initialized".to_string()),
            }
        }
    }

    pub fn reinitialize(&self) -> Result<(), String> {
        if self.is_wayland {
            // Nothing to reinitialize for Wayland
            Ok(())
        } else {
            match &self.x11_clipboard {
                Some(clipboard) => clipboard.reinitialize(),
                None => Err("X11 clipboard not initialized".to_string()),
            }
        }
    }
}
