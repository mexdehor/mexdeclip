import { ClipboardItem as ClipboardItemType } from "@/types/clipboard";
import { ClipboardItem } from "@/components/clipboard-item";
import { EmptyState } from "@/components/clipboard-empty-state";

type ClipboardListProps = {
  items: ClipboardItemType[];
  onCopy: (item: ClipboardItemType) => void;
  onDelete: (id: string) => void;
};

export const ClipboardList = ({
  items,
  onCopy,
  onDelete,
}: ClipboardListProps) => {
  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <ul className="flex flex-col gap-6">
      {items.map((item) => (
        <ClipboardItem
          key={item.id}
          item={item}
          onCopy={onCopy}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
};
