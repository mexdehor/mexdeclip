import { useState, useCallback } from "react";
import { ClipboardItem, ClipboardContent } from "@/types/clipboard";

const MAX_HISTORY_ITEMS = 50;

export const useClipboardHistory = () => {
  const [history, setHistory] = useState<ClipboardItem[]>([]);
  const [currentContent, setCurrentContent] = useState<ClipboardContent>({
    type: "empty",
  });

  const addTextToHistory = useCallback((text: string) => {
    if (!text.trim()) return;

    setHistory((prev) => {
      // Check if this text already exists in history
      const existingIndex = prev.findIndex(
        (item) => item.type === "text" && item.text === text,
      );

      if (existingIndex !== -1) {
        // Move existing item to top
        const existing = prev[existingIndex];
        const updated = {
          ...existing,
          timestamp: new Date(),
        };
        return [updated, ...prev.filter((_, i) => i !== existingIndex)].slice(
          0,
          MAX_HISTORY_ITEMS,
        );
      }

      const newItem: ClipboardItem = {
        id: Date.now().toString(),
        type: "text",
        text,
        timestamp: new Date(),
      };

      return [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS);
    });
  }, []);

  const addImageToHistory = useCallback(
    (base64Data: string, width: number, height: number) => {
      if (!base64Data) return;

      setHistory((prev) => {
        // Check if this exact image already exists (compare base64 data)
        const existingIndex = prev.findIndex(
          (item) => item.type === "image" && item.imageData === base64Data,
        );

        if (existingIndex !== -1) {
          // Move existing item to top
          const existing = prev[existingIndex];
          const updated = {
            ...existing,
            timestamp: new Date(),
          };
          return [updated, ...prev.filter((_, i) => i !== existingIndex)].slice(
            0,
            MAX_HISTORY_ITEMS,
          );
        }

        const newItem: ClipboardItem = {
          id: Date.now().toString(),
          type: "image",
          imageData: base64Data,
          imageWidth: width,
          imageHeight: height,
          timestamp: new Date(),
        };

        return [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS);
      });
    },
    [],
  );

  const addContentToHistory = useCallback(
    (content: ClipboardContent) => {
      switch (content.type) {
        case "text":
          addTextToHistory(content.text);
          break;
        case "image":
          addImageToHistory(content.base64Data, content.width, content.height);
          break;
        case "empty":
          // Do nothing for empty content
          break;
      }
    },
    [addTextToHistory, addImageToHistory],
  );

  const deleteItem = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    currentContent,
    setCurrentContent,
    addTextToHistory,
    addImageToHistory,
    addContentToHistory,
    deleteItem,
    clearAll,
  };
};
