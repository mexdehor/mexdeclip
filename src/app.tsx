import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import "@/main.css";

import { ClipboardHeader } from "@/components/clipboard-window-header";
import { ClipboardList } from "@/components/clipboard-list";
import { ErrorBanner } from "@/components/clipboard-error-banner";

import { useClipboard } from "@/hooks/use-clipboard";
import { useClipboardHistory } from "@/hooks/use-clipboard-history";
import { useClipboardMonitor } from "@/hooks/use-clipboard-monitor";

function App() {
  const [isMonitoring, setIsMonitoring] = useState(true);

  const { read, write, reinitialize, error, dismissError } = useClipboard();

  const { history, setCurrentClipboard, addToHistory, deleteItem, clearAll } =
    useClipboardHistory();

  const { systemInfo, previousClipboardRef } = useClipboardMonitor({
    onClipboardChange: addToHistory,
    onCurrentClipboardUpdate: setCurrentClipboard,
    readClipboard: read,
    isMonitoring,
  });

  const handleCopy = useCallback(
    async (text: string) => {
      const wasMonitoring = isMonitoring;
      setIsMonitoring(false);

      try {
        await write(text);
        previousClipboardRef.current = text;
        setCurrentClipboard(text);
      } finally {
        setTimeout(() => {
          if (wasMonitoring) {
            setIsMonitoring(true);
          }
        }, 200);
      }

      await invoke("hide_window");
    },
    [write, isMonitoring, previousClipboardRef, setCurrentClipboard],
  );

  const handleRetry = useCallback(async () => {
    await reinitialize();

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
