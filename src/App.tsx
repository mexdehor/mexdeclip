import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import {
  CirclePause,
  CirclePlay,
  Copy,
  Trash2,
  AlertCircle,
  X,
} from "lucide-react";

type ClipboardItem = {
  id: string;
  text: string;
  timestamp: Date;
};

type ClipboardError = {
  id: string;
  message: string;
  timestamp: Date;
  retryable: boolean;
};

function App() {
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardItem[]>([]);
  const [, setCurrentClipboard] = useState<string>("");
  const [isMonitoring, setIsMonitoring] = useState<boolean>(true);
  const [error, setError] = useState<ClipboardError | null>(null);
  const [pollingInterval, setPollingInterval] = useState<number>(750);
  const previousClipboardRef = useRef<string>("");
  const consecutiveErrorsRef = useRef<number>(0);

  const logError = useCallback((context: string, error: unknown) => {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${timestamp}] ${context}:`, error);
    return errorMessage;
  }, []);

  const readClipboard = useCallback(async () => {
    try {
      const text = await invoke<string>("read_clipboard");
      // Reset error count on successful read
      consecutiveErrorsRef.current = 0;
      // Reset polling interval to normal if it was increased due to errors
      if (pollingInterval > 750) {
        setPollingInterval(750);
      }
      return text || "";
    } catch (error) {
      const errorMessage = logError("Failed to read clipboard", error);
      consecutiveErrorsRef.current += 1;

      // Increase polling interval exponentially on consecutive errors (max 5 seconds)
      const newInterval = Math.min(
        750 * Math.pow(2, consecutiveErrorsRef.current - 1),
        5000
      );
      setPollingInterval(newInterval);

      // Show error to user if it's a significant error
      if (consecutiveErrorsRef.current >= 2) {
        setError({
          id: Date.now().toString(),
          message: `Clipboard read failed: ${errorMessage}`,
          timestamp: new Date(),
          retryable: true,
        });
      }
      return "";
    }
  }, [logError, pollingInterval]);

  const writeClipboard = useCallback(
    async (text: string) => {
      try {
        // Try browser Clipboard API first (more reliable)
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          setCurrentClipboard(text);
          setError(null);
          return;
        }
      } catch (error) {
        logError("Browser clipboard API failed", error);
      }

      // Fallback to Rust command
      try {
        await invoke("write_clipboard", { text });
        setCurrentClipboard(text);
        setError(null);
      } catch (rustError) {
        const errorMessage = logError("Rust clipboard write failed", rustError);
        setError({
          id: Date.now().toString(),
          message: `Failed to write to clipboard: ${errorMessage}`,
          timestamp: new Date(),
          retryable: true,
        });
        throw rustError;
      }
    },
    [logError]
  );

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
        // Update ref to prevent re-detection
        previousClipboardRef.current = text;
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

  const handleRetryClipboard = useCallback(async () => {
    try {
      // Reinitialize clipboard on backend
      await invoke("reinitialize_clipboard");
      setError(null);
      consecutiveErrorsRef.current = 0;
      setPollingInterval(750);
      // Try reading immediately after reinitialization
      const text = await readClipboard();
      if (text) {
        previousClipboardRef.current = text;
        setCurrentClipboard(text);
      }
    } catch (error) {
      const errorMessage = logError("Failed to reinitialize clipboard", error);
      setError({
        id: Date.now().toString(),
        message: `Failed to reinitialize clipboard: ${errorMessage}`,
        timestamp: new Date(),
        retryable: true,
      });
    }
  }, [readClipboard, logError]);

  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  // Monitor clipboard changes
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(async () => {
      const text = await readClipboard();
      if (text && text !== previousClipboardRef.current) {
        previousClipboardRef.current = text;
        setCurrentClipboard(text);
        addToHistory(text);
        // Clear error on successful read
        if (error) {
          setError(null);
        }
      } else if (text) {
        // Update current clipboard even if it's the same (for UI consistency)
        setCurrentClipboard(text);
      }
    }, pollingInterval); // Use dynamic polling interval

    return () => clearInterval(interval);
  }, [isMonitoring, readClipboard, addToHistory, pollingInterval, error]);

  // Read initial clipboard
  useEffect(() => {
    const initClipboard = async () => {
      const text = await readClipboard();
      if (text) {
        previousClipboardRef.current = text;
        setCurrentClipboard(text);
      }
    };
    initClipboard();
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            title={isMonitoring ? "Monitoring active" : "Monitoring paused"}
            className="cursor-pointer"
          >
            {isMonitoring ? (
              <CirclePlay className="size-5 text-neutral-600" />
            ) : (
              <CirclePause className="size-5 text-neutral-600" />
            )}
          </button>

          {clipboardHistory.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="size-5 text-neutral-600" />
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="mx-4 mb-4 p-3 bg-red-950/50 border border-red-800 rounded-md flex items-start gap-3">
          <AlertCircle className="size-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-200">{error.message}</p>
            <p className="text-xs text-red-400/70 mt-1">
              {error.timestamp.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {error.retryable && (
              <button
                onClick={handleRetryClipboard}
                className="px-2 py-1 text-xs bg-red-800 hover:bg-red-700 rounded cursor-pointer text-red-100"
                title="Retry clipboard operation"
              >
                Retry
              </button>
            )}
            <button
              onClick={handleDismissError}
              className="cursor-pointer text-red-400 hover:text-red-300"
              title="Dismiss error"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

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
