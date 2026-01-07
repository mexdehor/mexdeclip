# Mexdehor Clipboard Manager

A clipboard manager built with Tauri, React, and TypeScript. Tracks your clipboard history and provides quick access to previously copied items.

## Features

- **Clipboard history tracking** - Automatically tracks all copied text items
- **Quick copy from history** - Click any item to copy it back to clipboard
- **Monitoring toggle** - Pause/resume clipboard monitoring as needed
- **Clear history** - Delete individual items or clear all history at once
- **Automatic environment detection** - Automatically detects and adapts to Wayland or X11
- **Error handling** - Built-in retry logic and error recovery
- **System tray integration** - _Planned feature (not yet implemented)_

## Requirements

### Environment Support

This application automatically detects and supports both **Wayland** and **X11** environments:

- **Wayland**: Uses `wl-clipboard` commands (`wl-paste`, `wl-copy`)
- **X11**: Uses the `arboard` crate for clipboard access

### Wayland Environment

For proper clipboard functionality on Wayland (e.g., Pop OS 24.04, GNOME Wayland, Sway, Hyprland):

1. **Environment Variables**: The following environment variables should be set:

   - `WAYLAND_DISPLAY`: Usually set automatically by your Wayland compositor
   - `XDG_RUNTIME_DIR`: Required for Wayland socket access (typically `/run/user/<uid>`)

2. **Wayland Compositor**: Ensure you're running a Wayland compositor

3. **wl-clipboard**: The application uses `wl-clipboard` commands for Wayland clipboard access. Install if needed:

   ```bash
   # Ubuntu/Debian
   sudo apt install wl-clipboard

   # Fedora
   sudo dnf install wl-clipboard

   # Arch Linux
   sudo pacman -S wl-clipboard
   ```

4. **COSMIC Data Control** (Optional): For background clipboard access on COSMIC desktop without window focus:
   - Set `COSMIC_DATA_CONTROL_ENABLED=1` in `/etc/environment.d/clipboard.conf`
   - Without this, clipboard access requires the application window to be focused

### X11 Environment

For X11 environments, the application uses the `arboard` crate which works out of the box. No additional setup required.

### Development Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Troubleshooting

### Clipboard Reading Fails Intermittently

If clipboard reading fails intermittently:

1. **Check Environment Detection**: The application automatically detects your environment. Check the header to see if it shows "Wayland" or "X11" mode.

2. **Wayland-Specific Issues**:

   - Verify that `WAYLAND_DISPLAY` and `XDG_RUNTIME_DIR` are set:
     ```bash
     echo $WAYLAND_DISPLAY
     echo $XDG_RUNTIME_DIR
     ```
   - Ensure `wl-clipboard` is installed (see Requirements section)
   - Check Wayland socket permissions:
     ```bash
     ls -la $XDG_RUNTIME_DIR/wayland-*
     ```
   - For background clipboard access on COSMIC, ensure `COSMIC_DATA_CONTROL_ENABLED=1` is set

3. **X11-Specific Issues**:

   - Ensure you're running an X11 session (not XWayland)
   - Check that no other application is locking the clipboard
   - Verify X11 clipboard protocols are available

4. **Restart the Application**: The application includes automatic retry logic and clipboard reinitialization. If errors persist:

   - Click the "Retry" button in the error notification
   - Or restart the application

5. **Production Build Issues**: If clipboard works in development but not in production:
   - Ensure the production build has access to environment variables
   - Check that the application is not being sandboxed in a way that blocks clipboard access
   - Verify that `wl-clipboard` is available in the production environment (for Wayland)

### Error Messages

The application displays error messages when clipboard operations fail. Common errors:

- **"Failed to create clipboard instance"** (X11): X11 clipboard may be locked or unavailable
- **"Failed to execute wl-paste"** (Wayland): `wl-clipboard` may not be installed or Wayland socket access denied
- **"Failed to read clipboard"**: Clipboard may be locked by another application or environment not properly configured
- **"Failed to write clipboard"**: Similar to read errors, check environment configuration

### Manual Recovery

If clipboard operations continue to fail:

1. Use the "Retry" button in the error notification
2. Restart the application
3. Check system logs for environment-related errors
4. Verify other applications can access the clipboard in your environment
5. Try toggling monitoring off and on again

## Technical Details

### Environment Detection

The application automatically detects the display server environment:

- **Wayland Detection**: Checks for `WAYLAND_DISPLAY` environment variable
- **X11 Fallback**: If Wayland is not detected, uses X11 clipboard backend
- **Runtime Adaptation**: Automatically selects the appropriate clipboard backend at startup

### Clipboard Management

The application uses different clipboard backends based on the detected environment:

**Wayland Backend:**

- Uses `wl-clipboard` commands (`wl-paste`, `wl-copy`)
- No persistent clipboard instance needed
- Supports COSMIC Data Control for background access

**X11 Backend:**

- Uses the `arboard` crate
- Reusable clipboard instance with automatic retry logic (3 attempts with exponential backoff)
- Automatic reinitialization on failure
- Clipboard instance reuse to reduce overhead

### Polling Strategy

- Default polling interval: 750ms
- Exponential backoff on errors (up to 5 seconds)
- Automatic recovery when clipboard access is restored
- Monitoring can be paused/resumed via UI toggle

### Error Handling

- Automatic retry logic with exponential backoff
- Clipboard reinitialization on failure
- User-friendly error messages with retry button
- Detailed error logging for debugging
