import { getDatabase } from '../database';

export interface VideoTutorial {
  id: number;
  title: string;
  link: string;
  status: 'Active' | 'Inactive';
  order_number?: number;
  created_at?: string;
  updated_at?: string;
}

export const VideoTutorialModel = {
  async findAll(): Promise<VideoTutorial[]> {
    const db = getDatabase();
    return db.all<VideoTutorial[]>("SELECT * FROM video_tutorials ORDER BY order_number ASC, id DESC");
  },

  async findActive(): Promise<VideoTutorial[]> {
    const db = getDatabase();
    return db.all<VideoTutorial[]>("SELECT * FROM video_tutorials WHERE status = 'Active' ORDER BY order_number ASC, id DESC");
  },

  async findById(id: number): Promise<VideoTutorial | undefined> {
    const db = getDatabase();
    return db.get<VideoTutorial>("SELECT * FROM video_tutorials WHERE id = ?", [id]);
  },

  async create(data: { title: string; link: string; status?: string; order_number?: number }): Promise<{ lastID?: number | string }> {
    const db = getDatabase();
    const status = data.status || 'Active';
    const orderNum = typeof data.order_number === 'number' ? data.order_number : 0;
    const result = await db.run(
      "INSERT INTO video_tutorials (title, link, status, order_number) VALUES (?, ?, ?, ?)",
      [data.title.trim(), data.link.trim(), status, orderNum]
    );
    return result;
  },

  async update(id: number, data: { title: string; link: string; status: string; order_number?: number }): Promise<void> {
    const db = getDatabase();
    const orderNum = typeof data.order_number === 'number' ? data.order_number : 0;
    await db.run(
      "UPDATE video_tutorials SET title = ?, link = ?, status = ?, order_number = ? WHERE id = ?",
      [data.title.trim(), data.link.trim(), data.status, orderNum, id]
    );
  },

  async toggleStatus(id: number, status: string): Promise<void> {
    const db = getDatabase();
    await db.run(
      "UPDATE video_tutorials SET status = ? WHERE id = ?",
      [status, id]
    );
  },

  async delete(id: number): Promise<void> {
    const db = getDatabase();
    await db.run("DELETE FROM video_tutorials WHERE id = ?", [id]);
  }
};
