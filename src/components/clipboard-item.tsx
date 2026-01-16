import { Copy, Trash2, Image } from "lucide-react";
import { ClipboardItem as ClipboardItemType } from "../types/clipboard";
import { formatTime, truncateText } from "../utils/formatting";

type ClipboardItemProps = {
  item: ClipboardItemType;
  onCopy: (item: ClipboardItemType) => void;
  onDelete: (id: string) => void;
};

export const ClipboardItem = ({
  item,
  onCopy,
  onDelete,
}: ClipboardItemProps) => {
  const isImage = item.type === "image";

  return (
    <li className="flex items-center justify-between rounded-md p-4 bg-neutral-950">
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        {isImage ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-gray-400">
              <Image className="size-4" />
              <span className="text-sm">
                Image ({item.imageWidth}×{item.imageHeight})
              </span>
            </div>
            {item.imageData && (
              <img
                src={`data:image/png;base64,${item.imageData}`}
                alt="Clipboard image"
                className="max-w-full max-h-32 rounded object-contain bg-neutral-900"
                style={{
                  maxWidth: Math.min(item.imageWidth || 200, 200),
                }}
              />
            )}
          </div>
        ) : (
          <p className="wrap-break-word">{truncateText(item.text || "")}</p>
        )}
        <span className="text-xs text-gray-500">
          {formatTime(item.timestamp)}
        </span>
      </div>

      <div className="flex items-center gap-2 ml-4 shrink-0">
        <button
          className="text-sm text-gray-500 hover:text-gray-400"
          onClick={() => onCopy(item)}
          title={isImage ? "Copy image to clipboard" : "Copy to clipboard"}
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
