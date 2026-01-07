export type ClipboardItem = {
  id: string;
  text: string;
  timestamp: Date;
};

export type ClipboardError = {
  id: string;
  message: string;
  timestamp: Date;
  retryable: boolean;
};

export type SystemInfo = {
  isWayland: boolean;
  hasDataControl: boolean;
};