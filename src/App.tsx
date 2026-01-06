import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { CirclePause, CirclePlay, Copy, Trash2 } from "lucide-react";

type ClipboardItem = {
  id: string;
  text: string;
  timestamp: Date;
};

function App() {
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardItem[]>([]);
  const [currentClipboard, setCurrentClipboard] = useState<string>("");
  const [isMonitoring, setIsMonitoring] = useState<boolean>(true);

  const readClipboard = useCallback(async () => {
    try {
      const text = await invoke<string>("read_clipboard");
      setCurrentClipboard(text);
      return text;
    } catch (error) {
      console.error("Failed to read clipboard:", error);
      return "";
    }
  }, []);

  const writeClipboard = useCallback(async (text: string) => {
    try {
      // Try browser Clipboard API first (more reliable)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setCurrentClipboard(text);
      } else {
        // Fallback to Rust command
        await invoke("write_clipboard", { text });
        setCurrentClipboard(text);
      }
    } catch (error) {
      console.error("Failed to write clipboard:", error);
      // Try Rust fallback if browser API fails
      try {
        await invoke("write_clipboard", { text });
        setCurrentClipboard(text);
      } catch (rustError) {
        console.error("Rust clipboard write also failed:", rustError);
      }
    }
  }, []);

  const addToHistory = useCallback((text: string) => {
    if (!text.trim()) return;

    setClipboardHistory((prev) => {
      // Remove duplicates
      const filtered = prev.filter((item) => item.text !== text);
      // Add new item at the beginning
      const newItem: ClipboardItem = {
        id: Date.now().toString(),
        text,
        timestamp: new Date(),
      };
      // Keep only last 50 items
      return [newItem, ...filtered].slice(0, 50);
    });
  }, []);

  const handleCopy = useCallback(
    async (text: string) => {
      // Temporarily pause monitoring to prevent immediate re-detection
      const wasMonitoring = isMonitoring;
      setIsMonitoring(false);

      try {
        await writeClipboard(text);
        // Small delay to ensure clipboard is set
        await new Promise((resolve) => setTimeout(resolve, 100));
        setCurrentClipboard(text);
      } finally {
        // Restore monitoring state
        if (wasMonitoring) {
          setIsMonitoring(true);
        }
      }

      // Optionally hide window after copying
      await invoke("hide_window");
    },
    [writeClipboard, isMonitoring]
  );

  const handleDelete = useCallback((id: string) => {
    setClipboardHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    setClipboardHistory([]);
  }, []);

  // Monitor clipboard changes
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(async () => {
      const text = await readClipboard();
      if (text && text !== currentClipboard) {
        addToHistory(text);
      }
    }, 500); // Check every 500ms

    return () => clearInterval(interval);
  }, [isMonitoring, readClipboard, currentClipboard, addToHistory]);

  // Read initial clipboard
  useEffect(() => {
    readClipboard();
  }, [readClipboard]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="text-white flex flex-col h-full">
      <header className="flex justify-between items-center p-4">
        <h1>Clipboard Manager</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            title={isMonitoring ? "Monitoring active" : "Monitoring paused"}
          >
            {isMonitoring ? (
              <CirclePlay className="size-4" />
            ) : (
              <CirclePause className="size-4" />
            )}
          </button>

          {clipboardHistory.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {clipboardHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-sm text-gray-500">No clipboard history yet.</p>
            <p className="text-sm text-gray-500">
              Copy something to start tracking your clipboard!
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-6">
            {clipboardHistory.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-md p-4 bg-neutral-950"
              >
                <div className="flex flex-col gap-2">
                  <p className="">{truncateText(item.text)}</p>
                  <span className="text-xs text-gray-500">
                    {formatTime(item.timestamp)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="text-sm text-gray-500"
                    onClick={() => handleCopy(item.text)}
                    title="Copy to clipboard"
                  >
                    <Copy className="size-4 cursor-pointer" />
                  </button>
                  <button
                    className="text-sm text-gray-500"
                    onClick={() => handleDelete(item.id)}
                    title="Delete from history"
                  >
                    <Trash2 className="size-4 cursor-pointer" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
