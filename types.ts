export enum Category {
  CONTENT = "NỘI DUNG",
  ART = "NGHỆ THUẬT",
  LESSON = "BÀI HỌC",
}

export interface GameItemData {
  id: string;
  text: string;
  category: Category;
  isCorrect: boolean;
}

export interface ActiveItem extends GameItemData {
  x: number;
  y: number;
  speed: number;
  isDragging: boolean;
}

export interface PlayerInfo {
  name: string;
  className: string;
}

export type GameState = "MENU" | "PLAYING" | "GAME_OVER" | "VICTORY";
