import { Copy, Trash2, Image, Star, GripVertical } from "lucide-react";
import { ClipboardItem as ClipboardItemType } from "@/types/clipboard";
import { formatTime, truncateText, formatCharCount } from "@/utils/formatting";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

type ClipboardItemProps = {
  item: ClipboardItemType;
  onCopy: (item: ClipboardItemType) => void;
  onDelete: (id: number) => void;
  onToggleFavorite: (id: number) => void;
};

export const ClipboardItem = ({
  item,
  onCopy,
  onDelete,
  onToggleFavorite,
}: ClipboardItemProps) => {
  const isImage = item.content_type === "image";
  const timestamp = new Date(parseInt(item.created_at));

  return (
    <Card size="sm" className="gap-2 py-3 group">
      <CardContent className="flex items-start gap-2">
        <div className="flex items-center pt-1 opacity-0 group-hover:opacity-40 transition-opacity cursor-grab active:cursor-grabbing shrink-0">
          <GripVertical className="size-3.5" />
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {isImage ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Image className="size-4" />
                <span className="text-sm">
                  Image ({item.image_width}x{item.image_height})
                </span>
              </div>
              {item.image_data && (
                <img
                  src={`data:image/png;base64,${item.image_data}`}
                  alt="Clipboard image"
                  className="max-w-full max-h-32 rounded-md object-contain bg-muted"
                  style={{
                    maxWidth: Math.min(item.image_width || 200, 200),
                  }}
                />
              )}
            </div>
          ) : (
            <p className="wrap-break-word text-card-foreground text-sm leading-relaxed">
              {truncateText(item.text_content || "")}
            </p>
          )}

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{formatTime(timestamp)}</span>
            {!isImage && item.char_count != null && (
              <>
                <span className="opacity-30">·</span>
                <span>{formatCharCount(item.char_count)}</span>
              </>
            )}
            {!isImage && item.line_count != null && item.line_count > 1 && (
              <>
                <span className="opacity-30">·</span>
                <span>{item.line_count} lines</span>
              </>
            )}
            {item.copy_count > 1 && (
              <>
                <span className="opacity-30">·</span>
                <span>copied {item.copy_count}x</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onToggleFavorite(item.id)}
                />
              }
            >
              <Star
                className={`size-3.5 ${
                  item.is_favorite
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                }`}
              />
            </TooltipTrigger>
            <TooltipContent>
              {item.is_favorite ? "Unfavorite" : "Favorite"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onCopy(item)}
                />
              }
            >
              <Copy className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>
              {isImage ? "Copy image to clipboard" : "Copy to clipboard"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onDelete(item.id)}
                />
              }
            >
              <Trash2 className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Delete from history</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
};
