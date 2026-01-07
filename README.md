# Oh My Clipboard (ohcp)

A clipboard manager built with Tauri, React, and TypeScript. Tracks your clipboard history and provides quick access to previously copied items.

## Features

- Clipboard history tracking
- Quick copy from history
- System tray integration
- Wayland support (tested on Pop OS 24.04)

## Requirements

### Wayland Environment

This application is designed to work on Wayland environments (e.g., Pop OS 24.04). For proper clipboard functionality on Wayland, ensure:

1. **Environment Variables**: The following environment variables should be set:

   - `WAYLAND_DISPLAY`: Usually set automatically by your Wayland compositor
   - `XDG_RUNTIME_DIR`: Required for Wayland socket access (typically `/run/user/<uid>`)

2. **Wayland Compositor**: Ensure you're running a Wayland compositor (GNOME Wayland, Sway, Hyprland, etc.)

3. **Clipboard Manager**: The application uses the `arboard` crate which supports Wayland through `wl-clipboard`. Ensure Wayland clipboard protocols are available.

### Development Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Troubleshooting

### Clipboard Reading Fails Intermittently

If clipboard reading fails intermittently, especially in production builds:

1. **Check Environment Variables**: Verify that `WAYLAND_DISPLAY` and `XDG_RUNTIME_DIR` are set:

   ```bash
   echo $WAYLAND_DISPLAY
   echo $XDG_RUNTIME_DIR
   ```

2. **Restart the Application**: The application includes automatic retry logic and clipboard reinitialization. If errors persist:

   - Click the "Retry" button in the error notification
   - Or restart the application

3. **Check Wayland Socket Permissions**: Ensure your user has access to the Wayland socket:

   ```bash
   ls -la $XDG_RUNTIME_DIR/wayland-*
   ```

4. **Production Build Issues**: If clipboard works in development but not in production:

   - Ensure the production build has access to Wayland environment variables
   - Check that the application is not being sandboxed in a way that blocks clipboard access
   - Verify that `wl-clipboard` or Wayland clipboard protocols are available

5. **XWayland Compatibility**: If you're running XWayland applications, clipboard synchronization between X11 and Wayland applications may have issues. The application is designed to run natively on Wayland.

### Error Messages

The application displays error messages when clipboard operations fail. Common errors:

- **"Failed to create clipboard instance"**: Wayland environment may not be properly configured
- **"Failed to read clipboard"**: Clipboard may be locked by another application or Wayland socket access denied
- **"Failed to write clipboard"**: Similar to read errors, check Wayland environment

### Manual Recovery

If clipboard operations continue to fail:

1. Use the "Retry" button in the error notification
2. Restart the application
3. Check system logs for Wayland-related errors
4. Verify other Wayland applications can access the clipboard

## Technical Details

### Clipboard Management

The application uses a reusable clipboard instance with:

- Automatic retry logic (3 attempts with exponential backoff)
- Clipboard instance reuse to reduce overhead
- Automatic reinitialization on failure
- Detailed error logging

### Polling Strategy

- Default polling interval: 750ms
- Exponential backoff on errors (up to 5 seconds)
- Automatic recovery when clipboard access is restored
