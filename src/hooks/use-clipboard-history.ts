import { useState, useCallback, useEffect, useRef } from "react";
import { generateKeyBetween } from "jittered-fractional-indexing";
import { ClipboardItem, ClipboardContent } from "@/types/clipboard";
import { clipboardDb } from "@/hooks/use-clipboard-db";

const MAX_HISTORY_ITEMS = 50;

const debugLog = (label: string, items: ClipboardItem[]) => {
  console.group(`[clipboard-history] ${label}`);
  console.table(
    items.map((i) => ({
      id: i.id,
      type: i.content_type,
      sort_order: i.sort_order,
      preview:
        i.content_type === "text"
          ? (i.text_content ?? "").slice(0, 40)
          : `[image ${i.image_width}x${i.image_height}]`,
      copy_count: i.copy_count,
      is_favorite: i.is_favorite,
    })),
  );
  console.groupEnd();
};

export const useClipboardHistory = () => {
  const [history, setHistory] = useState<ClipboardItem[]>([]);
  const [currentContent, setCurrentContent] = useState<ClipboardContent>({
    type: "empty",
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const historyRef = useRef(history);
  historyRef.current = history;

  // Load history from database on mount
  useEffect(() => {
    clipboardDb
      .getAllItems()
      .then((items) => {
        debugLog("LOADED from DB", items);
        setHistory(items);
        setIsLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load clipboard history:", err);
        setIsLoaded(true);
      });
  }, []);

  // Generate a sort key that places a new item at the top (before the current first)
  const getTopSortOrder = useCallback((excludeId?: number) => {
    const items = historyRef.current;
    const first = excludeId ? items.find((i) => i.id !== excludeId) : items[0];
    return generateKeyBetween(null, first?.sort_order ?? null);
  }, []);

  const addTextToHistory = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const items = historyRef.current;
      const existing = items.find(
        (item) => item.content_type === "text" && item.text_content === text,
      );

      if (existing) {
        const newSortOrder = getTopSortOrder(existing.id);
        try {
          const updated = await clipboardDb.bumpItem(existing.id, newSortOrder);
          setHistory((prev) => {
            const next = [updated, ...prev.filter((i) => i.id !== existing.id)];
            debugLog("after BUMP text", next);
            return next;
          });
        } catch (err) {
          console.error("Failed to bump clipboard item:", err);
        }
        return;
      }

      const now = Date.now().toString();
      const sortOrder = getTopSortOrder();
      const charCount = text.length;
      const lineCount = text.split("\n").length;

      try {
        const item = await clipboardDb.insertItem({
          content_type: "text",
          text_content: text,
          image_data: null,
          image_width: null,
          image_height: null,
          char_count: charCount,
          line_count: lineCount,
          source_app: null,
          sort_order: sortOrder,
          created_at: now,
          updated_at: now,
        });

        setHistory((prev) => {
          const next = [item, ...prev];
          if (next.length > MAX_HISTORY_ITEMS) {
            const toDelete = next.slice(MAX_HISTORY_ITEMS);
            toDelete.forEach((i) =>
              clipboardDb.deleteItem(i.id).catch(() => {}),
            );
            const trimmed = next.slice(0, MAX_HISTORY_ITEMS);
            debugLog("after INSERT text (trimmed)", trimmed);
            return trimmed;
          }
          debugLog("after INSERT text", next);
          return next;
        });
      } catch (err) {
        console.error("Failed to insert clipboard item:", err);
      }
    },
    [getTopSortOrder],
  );

  const addImageToHistory = useCallback(
    async (base64Data: string, width: number, height: number) => {
      if (!base64Data) return;

      const items = historyRef.current;
      const existing = items.find(
        (item) =>
          item.content_type === "image" && item.image_data === base64Data,
      );

      if (existing) {
        const newSortOrder = getTopSortOrder(existing.id);
        try {
          const updated = await clipboardDb.bumpItem(existing.id, newSortOrder);
          setHistory((prev) => {
            const next = [updated, ...prev.filter((i) => i.id !== existing.id)];
            debugLog("after BUMP image", next);
            return next;
          });
        } catch (err) {
          console.error("Failed to bump clipboard item:", err);
        }
        return;
      }

      const now = Date.now().toString();
      const sortOrder = getTopSortOrder();

      try {
        const item = await clipboardDb.insertItem({
          content_type: "image",
          text_content: null,
          image_data: base64Data,
          image_width: width,
          image_height: height,
          char_count: null,
          line_count: null,
          source_app: null,
          sort_order: sortOrder,
          created_at: now,
          updated_at: now,
        });

        setHistory((prev) => {
          const next = [item, ...prev];
          if (next.length > MAX_HISTORY_ITEMS) {
            const toDelete = next.slice(MAX_HISTORY_ITEMS);
            toDelete.forEach((i) =>
              clipboardDb.deleteItem(i.id).catch(() => {}),
            );
            const trimmed = next.slice(0, MAX_HISTORY_ITEMS);
            debugLog("after INSERT image (trimmed)", trimmed);
            return trimmed;
          }
          debugLog("after INSERT image", next);
          return next;
        });
      } catch (err) {
        console.error("Failed to insert clipboard item:", err);
      }
    },
    [getTopSortOrder],
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
          break;
      }
    },
    [addTextToHistory, addImageToHistory],
  );

  const deleteItem = useCallback(async (id: number) => {
    try {
      await clipboardDb.deleteItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Failed to delete clipboard item:", err);
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await clipboardDb.clearAll();
      setHistory([]);
    } catch (err) {
      console.error("Failed to clear clipboard history:", err);
    }
  }, []);

  const toggleFavorite = useCallback(async (id: number) => {
    try {
      const updated = await clipboardDb.toggleFavorite(id);
      setHistory((prev) =>
        prev.map((item) => (item.id === id ? updated : item)),
      );
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  }, []);

  const reorderItems = useCallback(async (activeId: number, overId: number) => {
    const items = historyRef.current;
    const oldIndex = items.findIndex((i) => i.id === activeId);
    const newIndex = items.findIndex((i) => i.id === overId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const reordered = [...items];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const before = newIndex > 0 ? reordered[newIndex - 1].sort_order : null;
    const after =
      newIndex < reordered.length - 1
        ? reordered[newIndex + 1].sort_order
        : null;
    const newSortOrder = generateKeyBetween(before, after);

    const updated = { ...moved, sort_order: newSortOrder };
    const newHistory = reordered.map((item) =>
      item.id === activeId ? updated : item,
    );

    debugLog("after REORDER", newHistory);
    setHistory(newHistory);

    try {
      await clipboardDb.updateSortOrders([
        { id: activeId, sort_order: newSortOrder },
      ]);
    } catch (err) {
      console.error("Failed to update sort order:", err);
      setHistory(items);
    }
  }, []);

  return {
    history,
    isLoaded,
    currentContent,
    setCurrentContent,
    addTextToHistory,
    addImageToHistory,
    addContentToHistory,
    deleteItem,
    clearAll,
    toggleFavorite,
    reorderItems,
  };
};
