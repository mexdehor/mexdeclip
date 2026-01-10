import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { SystemInfo } from "@/types/clipboard";

type MonitorOptions = {
  onClipboardChange: (text: string) => void;
  onCurrentClipboardUpdate: (text: string) => void;
  readClipboard: () => Promise<string>;
  isMonitoring: boolean;
};

export const useClipboardMonitor = ({
  onClipboardChange,
  onCurrentClipboardUpdate,
  readClipboard,
  isMonitoring,
}: MonitorOptions) => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    isWayland: false,
    isCosmicDataControlEnabled: false,
  });
  const [hasWindowFocus, setHasWindowFocus] = useState(false);
  const previousClipboardRef = useRef<string>("");
  const pollingIntervalRef = useRef<number | null>(null);
  const isReadingRef = useRef<boolean>(false);

  // Detect system capabilities
  useEffect(() => {
    Promise.all([
      invoke<boolean>("is_wayland_session"),
      invoke<boolean>("is_cosmic_data_control_enabled"),
    ])
      .then(([isWayland, isCosmicDataControlEnabled]) => {
        setSystemInfo({ isWayland, isCosmicDataControlEnabled });

        if (isWayland && isCosmicDataControlEnabled) {
          console.log("Wayland with data-control - background clipboard access available");
        } else if (isWayland) {
          console.log("Wayland without data-control - requires window focus");
        }
      })
      .catch(() => {
        setSystemInfo({ isWayland: false, isCosmicDataControlEnabled: false });
      });
  }, []);

  // Read clipboard with retries (for focus events)
  const readClipboardOnFocus = useCallback(async () => {
    if (isReadingRef.current || !isMonitoring) return;

    isReadingRef.current = true;
    try {
      // Multiple attempts with delays (Wayland may need time)
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
        }

        const text = await readClipboard();

        if (text) {
          onCurrentClipboardUpdate(text);
          if (text !== previousClipboardRef.current) {
            previousClipboardRef.current = text;
            onClipboardChange(text);
          }
          break;
        }
      }
    } finally {
      isReadingRef.current = false;
    }
  }, [isMonitoring, readClipboard, onClipboardChange, onCurrentClipboardUpdate]);

  // Polling effect
  useEffect(() => {
    if (!isMonitoring) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // On Wayland without data-control, only poll when focused
    const { isWayland, isCosmicDataControlEnabled: hasDataControl } = systemInfo;
    if (isWayland && !hasDataControl && !hasWindowFocus) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Poll clipboard
    const interval = setInterval(async () => {
      if (isReadingRef.current) return;

      isReadingRef.current = true;
      try {
        const text = await readClipboard();

        if (text && text !== previousClipboardRef.current) {
          previousClipboardRef.current = text;
          onCurrentClipboardUpdate(text);
          onClipboardChange(text);
        } else if (text) {
          onCurrentClipboardUpdate(text);
        }
      } finally {
        isReadingRef.current = false;
      }
    }, isWayland ? 500 : 750);

    pollingIntervalRef.current = interval;

    return () => {
      if (interval) clearInterval(interval);
      pollingIntervalRef.current = null;
    };
  }, [
    isMonitoring,
    systemInfo,
    hasWindowFocus,
    readClipboard,
    onClipboardChange,
    onCurrentClipboardUpdate,
  ]);

  // Initial clipboard read
  useEffect(() => {
    const initClipboard = async () => {
      const text = await readClipboard();
      if (text) {
        previousClipboardRef.current = text;
        onCurrentClipboardUpdate(text);
      }
    };
    initClipboard();
  }, [readClipboard, onCurrentClipboardUpdate]);

  // Window focus handling
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const { isWayland, isCosmicDataControlEnabled: hasDataControl } = systemInfo;

    const handleFocus = async () => {
      setHasWindowFocus(true);
      if (isWayland && !hasDataControl) {
        await readClipboardOnFocus();
      }
    };

    const handleBlur = () => {
      setHasWindowFocus(false);
    };

    // Tauri focus listener
    let unlistenFocus: (() => void) | null = null;
    const setupFocusListener = async () => {
      try {
        unlistenFocus = await appWindow.onFocusChanged((event) => {
          if (event.payload) {
            handleFocus();
          } else {
            handleBlur();
          }
        });
      } catch (error) {
        console.error("Failed to setup focus listener:", error);
      }
    };

    setupFocusListener();

    // Initialize focus state
    appWindow
      .isFocused()
      .then((focused) => {
        setHasWindowFocus(focused);
        if (focused && isWayland && !hasDataControl && isMonitoring) {
          readClipboardOnFocus();
        }
      })
      .catch(console.error);

    // Browser focus events
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    // Visibility changes (workspace switches)
    const handleVisibilityChange = async () => {
      if (!document.hidden && isMonitoring && isWayland && !hasDataControl) {
        await readClipboardOnFocus();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (unlistenFocus) unlistenFocus();
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [systemInfo, isMonitoring, readClipboardOnFocus]);

  return {
    systemInfo,
    hasWindowFocus,
    previousClipboardRef,
  };
};