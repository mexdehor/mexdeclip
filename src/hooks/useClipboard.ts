import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ClipboardError } from "../types/clipboard";

export const useClipboard = () => {
  const [error, setError] = useState<ClipboardError | null>(null);

  const logError = useCallback((context: string, error: unknown): string => {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${timestamp}] ${context}:`, error);
    return errorMessage;
  }, []);

  const read = useCallback(async (): Promise<string> => {
    try {
      const text = await invoke<string>("read_clipboard");
      return text || "";
    } catch (error) {
      const errorMessage = logError("Failed to read clipboard", error);

      // Only show error for persistent failures
      if (!errorMessage.includes("No selection")) {
        setError({
          id: Date.now().toString(),
          message: `Clipboard read failed: ${errorMessage}`,
          timestamp: new Date(),
          retryable: true,
        });
      }
      return "";
    }
  }, [logError]);

  const write = useCallback(
    async (text: string): Promise<void> => {
      try {
        // Try browser Clipboard API first (more reliable)
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          setError(null);
          return;
        }
      } catch (error) {
        logError("Browser clipboard API failed", error);
      }

      // Fallback to Rust command
      try {
        await invoke("write_clipboard", { text });
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

  const reinitialize = useCallback(async (): Promise<void> => {
    try {
      await invoke("reinitialize_clipboard");
      setError(null);
    } catch (error) {
      const errorMessage = logError("Failed to reinitialize clipboard", error);
      setError({
        id: Date.now().toString(),
        message: `Failed to reinitialize: ${errorMessage}`,
        timestamp: new Date(),
        retryable: true,
      });
      throw error;
    }
  }, [logError]);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  return {
    read,
    write,
    reinitialize,
    error,
    dismissError,
  };
};