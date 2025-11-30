
export interface Player {
  id?: number;
  name: string;
  stats: {
    total_score: number;
    matches_played: number;
  };
}

export interface Book {
  id?: number;
  title: string;
  description: string;
  coverEmoji: string;
  createdAt: number;
}

export interface Unit {
  id?: number;
  bookId: number;
  title: string;
}

export interface WordItem {
  id?: number;
  bookId: number;
  unitId: number; // Linked to Unit
  word: string;
  // AI Generated
  correct_meaning: string;
  example: string;
  options: string[]; // 4 options total (1 correct + 3 wrong)
  correct_index: number;
}

export interface Mistake {
  id?: number;
  player_name: string;
  word_id: number;
  timestamp: number;
}

export interface AppSettings {
  id?: number; // Singleton, usually id=1
  apiKey?: string;
  apiEndpoint?: string; // For reverse proxies
}

export enum GameMode {
  IDLE = 'IDLE',
  LIBRARY = 'LIBRARY',
  CLASSROOM = 'CLASSROOM', // Roster only now
  GAME_SETUP = 'GAME_SETUP',
  LUCKY_DRAW = 'LUCKY_DRAW',
  BATTLE = 'BATTLE',
  SINGLE_GAME = 'SINGLE_GAME',
  GAME_SUMMARY = 'GAME_SUMMARY', // New
  LIVE_TUTOR = 'LIVE_TUTOR',
  SETTINGS = 'SETTINGS'
}

// Extend Window to support global XLSX
declare global {
  interface Window {
    XLSX: any;
    webkitAudioContext: typeof AudioContext;
  }
}
