export type ClipboardItemType = "text" | "image";

export type ClipboardItem = {
  id: string;
  type: ClipboardItemType;
  text?: string;
  // For images: base64-encoded PNG data
  imageData?: string;
  // Image dimensions
  imageWidth?: number;
  imageHeight?: number;
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
  isCosmicDataControlEnabled: boolean;
};

// Type for clipboard content read from backend
export type ClipboardContent =
  | { type: "text"; text: string }
  | { type: "image"; base64Data: string; width: number; height: number }
  | { type: "empty" };
