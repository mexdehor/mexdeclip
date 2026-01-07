import { Copy, Trash2 } from "lucide-react";
import { ClipboardItem as ClipboardItemType } from "../types/clipboard";
import { formatTime, truncateText } from "../utils/formatting";

type ClipboardItemProps = {
  item: ClipboardItemType;
  onCopy: (text: string) => void;
  onDelete: (id: string) => void;
};

export const ClipboardItem = ({
  item,
  onCopy,
  onDelete,
}: ClipboardItemProps) => {
  return (
    <li className="flex items-center justify-between rounded-md p-4 bg-neutral-950">
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <p className="wrap-break-word">{truncateText(item.text)}</p>
        <span className="text-xs text-gray-500">
          {formatTime(item.timestamp)}
        </span>
      </div>

      <div className="flex items-center gap-2 ml-4 shrink-0">
        <button
          className="text-sm text-gray-500 hover:text-gray-400"
          onClick={() => onCopy(item.text)}
          title="Copy to clipboard"
        >
          <Copy className="size-4 cursor-pointer" />
        </button>
        <button
          className="text-sm text-gray-500 hover:text-gray-400"
          onClick={() => onDelete(item.id)}
          title="Delete from history"
        >
          <Trash2 className="size-4 cursor-pointer" />
        </button>
      </div>
    </li>
  );
};
