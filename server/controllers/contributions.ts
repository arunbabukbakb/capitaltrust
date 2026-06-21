import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database';

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-that-should-be-in-env-vars";

// Helper to extract user ID from JWT cookie / Authorization header
function getUserIdFromRequest(req: Request): string | null {
  const token = req.cookies?.token ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    return payload.id;
  } catch {
    return null;
  }
}

export const getContributions = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Fetch all fund collections for this user from MemberCollection + FundCollectionGroup + CollectionType
    const rows = await db.all(`
      SELECT
        mc.Id         as id,
        fcg.CollectionDate as date,
        ct.TypeName   as typeName,
        mc.Amount     as amount
      FROM MemberCollection mc
      JOIN FundCollectionGroup fcg ON mc.CollectionGroupId = fcg.Id
      JOIN CollectionType ct        ON fcg.CollectionTypeId = ct.Id
      WHERE mc.UserId = ?
      ORDER BY fcg.CollectionDate DESC, mc.Id DESC
    `, [userId]);

    const mapped = rows.map((r: any) => ({
      id: r.id,
      date: r.date,
      method: r.typeName,
      amount: r.amount,
      status: 'COMPLETED'
    }));

    res.json(mapped);
  } catch (error) {
    console.error("Get contributions error", error);
    res.status(500).json({ error: "Error fetching contributions portfolio" });
  }
};

// Kept for backward compatibility – not actively used
export const createContribution = async (req: Request, res: Response) => {
  res.status(410).json({ error: "This endpoint has been deprecated. Use /api/member-collections instead." });
};
