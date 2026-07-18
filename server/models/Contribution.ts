import { getDatabase } from '../database';

export interface Contribution {
  id: string;
  date: string;
  userName: string;
  amount: number;
  method: string;
  status: string;
  reinvestmentEnabled: number;
}

export const ContributionModel = {
  async listAll(): Promise<Contribution[]> {
    const db = getDatabase();
    return db.all<Contribution[]>("SELECT * FROM contributions ORDER BY date DESC");
  },

  async create(contrib: Contribution): Promise<void> {
    const db = getDatabase();
    await db.run(
      "INSERT INTO contributions (id, date, userName, amount, method, status, reinvestmentEnabled) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [contrib.id, contrib.date, contrib.userName, contrib.amount, contrib.method, contrib.status, contrib.reinvestmentEnabled]
    );
  }
};
