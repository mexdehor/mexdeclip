use std::process::Command;

pub async fn read() -> Result<String, String> {
    match Command::new("wl-paste").arg("--no-newline").output() {
        Ok(output) => {
            if output.status.success() {
                String::from_utf8(output.stdout)
                    .map_err(|e| format!("Invalid UTF-8 in clipboard: {}", e))
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);

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

pub async fn write(text: String) -> Result<(), String> {
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
