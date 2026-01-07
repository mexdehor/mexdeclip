import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

import { ClipboardHeader } from "./components/ClipboardHeader";
import { ClipboardList } from "./components/ClipboardList";
import { ErrorBanner } from "./components/ErrorBanner";

import { useClipboard } from "./hooks/useClipboard";
import { useClipboardHistory } from "./hooks/useClipboardHistory";
import { useClipboardMonitor } from "./hooks/useClipboardMonitor";

function App() {
  const [isMonitoring, setIsMonitoring] = useState(true);

  // Clipboard operations
  const { read, write, reinitialize, error, dismissError } = useClipboard();

  // History management
  const {
    history,
    // currentClipboard,
    setCurrentClipboard,
    addToHistory,
    deleteItem,
    clearAll,
  } = useClipboardHistory();

  // Monitor clipboard changes
  const { systemInfo, previousClipboardRef } = useClipboardMonitor({
    onClipboardChange: addToHistory,
    onCurrentClipboardUpdate: setCurrentClipboard,
    readClipboard: read,
    isMonitoring,
  });

  // Handle copy from history
  const handleCopy = useCallback(
    async (text: string) => {
      // Temporarily pause monitoring
      const wasMonitoring = isMonitoring;
      setIsMonitoring(false);

      try {
        await write(text);
        // Update ref to prevent re-detection
        previousClipboardRef.current = text;
        setCurrentClipboard(text);
      } finally {
        // Restore monitoring after delay
        setTimeout(() => {
          if (wasMonitoring) {
            setIsMonitoring(true);
          }
        }, 200);
      }

      // Hide window after copying
      await invoke("hide_window");
    },
    [write, isMonitoring, previousClipboardRef, setCurrentClipboard]
  );

  // Handle retry on error
  const handleRetry = useCallback(async () => {
    await reinitialize();
    // Try reading after reinitialize
    await new Promise((resolve) => setTimeout(resolve, 200));
    const text = await read();
    if (text) {
      previousClipboardRef.current = text;
      setCurrentClipboard(text);
    }
  }, [reinitialize, read, previousClipboardRef, setCurrentClipboard]);

  return (
    <div className="text-white flex flex-col h-full">
      <ClipboardHeader
        isMonitoring={isMonitoring}
        onToggleMonitoring={() => setIsMonitoring(!isMonitoring)}
        hasHistory={history.length > 0}
        onClearAll={clearAll}
        systemInfo={systemInfo}
      />

      {error && (
        <ErrorBanner
          error={error}
          onRetry={handleRetry}
          onDismiss={dismissError}
        />
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <ClipboardList
          items={history}
          onCopy={handleCopy}
          onDelete={deleteItem}
        />
      </div>
    </div>
  );
}

export default App;
