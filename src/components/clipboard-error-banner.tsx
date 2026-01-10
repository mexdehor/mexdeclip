import { AlertCircle, X } from "lucide-react";
import { ClipboardError } from "@/types/clipboard";

type ErrorBannerProps = {
  error: ClipboardError;
  onRetry?: () => void;
  onDismiss: () => void;
};

export const ErrorBanner = ({
  error,
  onRetry,
  onDismiss,
}: ErrorBannerProps) => {
  return (
    <div className="mx-4 mb-4 p-3 bg-red-950/50 border border-red-800 rounded-md flex items-start gap-3">
      <AlertCircle className="size-5 text-red-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-200">{error.message}</p>
        <p className="text-xs text-red-400/70 mt-1">
          {error.timestamp.toLocaleTimeString()}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {error.retryable && onRetry && (
          <button
            onClick={onRetry}
            className="px-2 py-1 text-xs bg-red-800 hover:bg-red-700 rounded cursor-pointer text-red-100"
            title="Retry clipboard operation"
          >
            Retry
          </button>
        )}
        <button
          onClick={onDismiss}
          className="cursor-pointer text-red-400 hover:text-red-300"
          title="Dismiss error"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
};
