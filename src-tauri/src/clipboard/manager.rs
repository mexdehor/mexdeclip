use super::wayland;
use super::x11::X11Clipboard;
use crate::commands::is_cosmic_data_control_enabled;

fn is_wayland() -> bool {
    std::env::var("WAYLAND_DISPLAY").is_ok()
}

pub struct ClipboardManager {
    x11_clipboard: Option<X11Clipboard>,
    is_wayland: bool,
    _is_cosmic_data_control_enabled: bool,
}

impl ClipboardManager {
    pub fn new() -> Self {
        let is_wayland = is_wayland();
        let is_cosmic_data_control_enabled = is_cosmic_data_control_enabled();

        Self {
            x11_clipboard: if is_wayland {
                None
            } else {
                Some(X11Clipboard::new())
            },
            is_wayland,
            _is_cosmic_data_control_enabled: is_cosmic_data_control_enabled,
        }
    }

    pub fn is_wayland(&self) -> bool {
        self.is_wayland
    }

    pub fn _is_cosmic_data_control_enabled(&self) -> bool {
        self._is_cosmic_data_control_enabled
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
            Ok(())
        } else {
            match &self.x11_clipboard {
                Some(clipboard) => clipboard.reinitialize(),
                None => Err("X11 clipboard not initialized".to_string()),
            }
        }
    }
}
