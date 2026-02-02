export enum Category {
  CONTENT = "NỘI DUNG",
  ART = "NGHỆ THUẬT",
  LESSON = "BÀI HỌC",
}

export interface GameItemData {
  id: string;
  text: string;
  category: Category;
}

export interface ActiveItem extends GameItemData {
  x: number; // Percentage across screen (0 to 100+)
  y: number; // Random vertical offset percentage
  speed: number;
  isDragging: boolean;
}

export interface PlayerInfo {
  name: string;
  className: string;
}

export type SubmitStatus = "IDLE" | "SENDING" | "SUCCESS" | "ERROR";

export type GameState =
  | "MENU"
  | "PLAYING"
  | "GAME_OVER"
  | "VICTORY"
  | "SETTINGS";
