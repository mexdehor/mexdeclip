import { CirclePause, CirclePlay, Trash2 } from "lucide-react";
import { SystemInfo } from "../types/clipboard";

type ClipboardHeaderProps = {
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  hasHistory: boolean;
  onClearAll: () => void;
  systemInfo: SystemInfo;
};

export const ClipboardHeader = ({
  isMonitoring,
  onToggleMonitoring,
  hasHistory,
  onClearAll,
  systemInfo,
}: ClipboardHeaderProps) => {
  return (
    <header className="flex justify-between items-center p-4">
      <div className="flex items-center gap-2 w-full">
        {systemInfo.isWayland && (
          <span className="text-xs text-neutral-500 ml-2">
            Wayland {systemInfo.hasDataControl && "• Data Control ✓"}
          </span>
        )}

        <button
          onClick={onToggleMonitoring}
          title={isMonitoring ? "Monitoring active" : "Monitoring paused"}
          className="cursor-pointer ml-auto"
        >
          {isMonitoring ? (
            <CirclePlay className="size-5 text-neutral-600" />
          ) : (
            <CirclePause className="size-5 text-neutral-600" />
          )}
        </button>

        {hasHistory && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-2 cursor-pointer"
            title="Clear all history"
          >
            <Trash2 className="size-5 text-neutral-600" />
          </button>
        )}
      </div>
    </header>
  );
};
