import { useState, useCallback } from "react";
import { ClipboardItem } from "../types/clipboard";

const MAX_HISTORY_ITEMS = 50;

export const useClipboardHistory = () => {
  const [history, setHistory] = useState<ClipboardItem[]>([]);
  const [currentClipboard, setCurrentClipboard] = useState<string>("");

  const addToHistory = useCallback((text: string) => {
    if (!text.trim()) return;

    setHistory((prev) => {
      // Remove duplicates
      const filtered = prev.filter((item) => item.text !== text);
      // Add new item at the beginning
      const newItem: ClipboardItem = {
        id: Date.now().toString(),
        text,
        timestamp: new Date(),
      };
      // Keep only last N items
      return [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    });
  }, []);

  const deleteItem = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    currentClipboard,
    setCurrentClipboard,
    addToHistory,
    deleteItem,
    clearAll,
  };
};