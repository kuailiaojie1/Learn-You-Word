
import Dexie, { Table } from 'dexie';
import { Player, WordItem, Mistake, Book, Unit, AppSettings } from '../types';

export class LearnYourWordDB extends Dexie {
  players!: Table<Player>;
  words!: Table<WordItem>;
  mistakes!: Table<Mistake>;
  books!: Table<Book>;
  units!: Table<Unit>;
  settings!: Table<AppSettings>;

  constructor() {
    super('LearnYourWordDB');
    
    // Schema definition
    (this as any).version(3).stores({
      players: '++id, name, [stats.total_score]',
      words: '++id, bookId, unitId, word',
      mistakes: '++id, player_name, word_id, timestamp',
      books: '++id, title',
      units: '++id, bookId, title',
      settings: '++id'
    });

    (this as any).on('ready', () => this.seedData());
  }

  async seedData() {
    const bookCount = await this.books.count();
    if (bookCount === 0) {
      const bookId = await this.books.add({
        title: "示例词书：生活大爆炸",
        description: "包含一些日常生活和科技相关的基础词汇，用于演示功能。",
        coverEmoji: "🚀",
        createdAt: Date.now()
      });

      const unit1Id = await this.units.add({
        bookId: bookId as number,
        title: "Unit 1: Basics"
      });
      
      const unit2Id = await this.units.add({
        bookId: bookId as number,
        title: "Unit 2: Tech"
      });

      const sampleWords: WordItem[] = [
        {
          bookId: bookId as number,
          unitId: unit1Id as number,
          word: "Ambition",
          correct_meaning: "n. 野心，雄心",
          example: "Her ambition is to become a pilot.",
          options: ["n. 野心，雄心", "n. 救护车", "adj. 模糊的", "v. 放弃"],
          correct_index: 0
        },
        {
          bookId: bookId as number,
          unitId: unit1Id as number,
          word: "Galaxy",
          correct_meaning: "n. 星系，银河",
          example: "The Milky Way is our galaxy.",
          options: ["n. 盖勒克西 (人名)", "n. 星系，银河", "n. 玻璃", "adj. 巨大的"],
          correct_index: 1
        },
        {
          bookId: bookId as number,
          unitId: unit2Id as number,
          word: "Algorithm",
          correct_meaning: "n. 算法",
          example: "The algorithm suggests videos you might like.",
          options: ["n. 节奏", "n. 代数", "n. 算法", "n. 鳄鱼"],
          correct_index: 2
        }
      ];

      await this.words.bulkAdd(sampleWords);
      // Removed sample players to keep roster clean
    }
  }

  // --- NEW: Centralized Action Methods ---

  async deletePlayer(id: number) {
      return this.players.delete(id);
  }

  async deleteWord(id: number) {
      return this.words.delete(id);
  }

  async deleteUnitFull(unitId: number) {
      return (this as any).transaction('rw', this.units, this.words, async () => {
          await this.words.where('unitId').equals(unitId).delete();
          await this.units.delete(unitId);
      });
  }

  async deleteBookFull(bookId: number) {
      return (this as any).transaction('rw', this.books, this.units, this.words, async () => {
          // 1. Find all units
          const units = await this.units.where('bookId').equals(bookId).toArray();
          const unitIds = units.map((u: Unit) => u.id).filter((id: any) => id !== undefined) as number[];
          
          // 2. Delete words in those units
          if (unitIds.length > 0) {
            await this.words.where('unitId').anyOf(unitIds).delete();
          }

          // 3. Delete units
          await this.units.where('bookId').equals(bookId).delete();
          
          // 4. Delete book
          await this.books.delete(bookId);
      });
  }

  async updateMatchStats(p1: Player, score1: number, p2?: Player, score2?: number) {
     if (!p1.id) return;
     return (this as any).transaction('rw', this.players, async () => {
        const freshP1 = await this.players.get(p1.id!);
        if (freshP1) {
            await this.players.update(p1.id!, {
                stats: {
                    total_score: (freshP1.stats?.total_score || 0) + score1,
                    matches_played: (freshP1.stats?.matches_played || 0) + 1
                }
            });
        }
        if (p2 && p2.id && score2 !== undefined) {
            const freshP2 = await this.players.get(p2.id!);
            if (freshP2) {
                await this.players.update(p2.id!, {
                    stats: {
                        total_score: (freshP2.stats?.total_score || 0) + score2,
                        matches_played: (freshP2.stats?.matches_played || 0) + 1
                    }
                });
            }
        }
    });
  }

  async restoreBackup(data: any) {
    return (this as any).transaction('rw', this.players, this.words, this.books, this.units, this.settings, async () => {
        await this.players.clear();
        await this.words.clear();
        await this.books.clear();
        await this.units.clear();
        await this.settings.clear();

        if (data.players) await this.players.bulkAdd(data.players);
        if (data.words) await this.words.bulkAdd(data.words);
        if (data.books) await this.books.bulkAdd(data.books);
        if (data.units) await this.units.bulkAdd(data.units);
        if (data.settings) await this.settings.bulkAdd(data.settings);
    });
  }

  async resetDatabase() {
      (this as any).close();
      await Dexie.delete('LearnYourWordDB');
      return true;
  }
}

export const db = new LearnYourWordDB();
