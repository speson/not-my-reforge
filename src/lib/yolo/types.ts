export interface YoloSettings {
  enabled: boolean; // default: true
}

export const DEFAULT_YOLO: YoloSettings = { enabled: true };

export const YOLO_FILE = "yolo-settings.json";
