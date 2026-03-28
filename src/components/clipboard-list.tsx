import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { AnimatePresence } from "motion/react";

import { EmptyState } from "@/components/clipboard-empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardItem as ClipboardItemType } from "@/types/clipboard";
import { SortableItem } from "./sortable-item";

type ClipboardListProps = {
  items: ClipboardItemType[];
  onCopy: (item: ClipboardItemType) => void;
  onDelete: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  onReorder: (activeId: number, overId: number) => void;
};

export const ClipboardList = ({
  items,
  onCopy,
  onDelete,
  onToggleFavorite,
  onReorder,
}: ClipboardListProps) => {
  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        const { source } = event.operation;
        if (!source || !isSortable(source)) return;

        const { index, initialIndex } = source.sortable;
        if (index === initialIndex) return;

        // The source moved from initialIndex to index.
        // Map back to item ids for our reorder handler.
        const sourceId = items[initialIndex]?.id;
        const overId = items[index]?.id;

        if (sourceId != null && overId != null && sourceId !== overId) {
          onReorder(sourceId, overId);
        }
      }}
    >
      <ScrollArea className="h-full">
        <ul className="flex flex-col gap-3 p-4">
          <AnimatePresence initial={false}>
            {items.map((item, index) => (
              <SortableItem
                key={item.id}
                item={item}
                index={index}
                onCopy={onCopy}
                onDelete={onDelete}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </AnimatePresence>
        </ul>
      </ScrollArea>
    </DragDropProvider>
  );
};
