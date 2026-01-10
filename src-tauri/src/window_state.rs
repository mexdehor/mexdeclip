use std::sync::atomic::{AtomicBool, Ordering};

pub static WINDOW_VISIBLE: AtomicBool = AtomicBool::new(false);

pub fn set_visible(visible: bool) {
    WINDOW_VISIBLE.store(visible, Ordering::Relaxed);
}

pub fn is_visible() -> bool {
    WINDOW_VISIBLE.load(Ordering::Relaxed)
}
