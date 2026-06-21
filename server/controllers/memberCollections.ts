import { Request, Response } from 'express';
import { getDatabase } from '../database';

// Submit new or update existing fund collection session
export const submitMemberCollections = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { id, collectionTypeId, date, payments } = req.body;
    if (!collectionTypeId) {
      return res.status(400).json({ error: "collectionTypeId is required" });
    }
    if (!date) {
      return res.status(400).json({ error: "date is required" });
    }
    if (!Array.isArray(payments)) {
      return res.status(400).json({ error: "payments must be an array" });
    }

    await db.run("BEGIN TRANSACTION");

    try {
      let groupId = id ? Number(id) : null;

      if (groupId) {
        // Update existing group
        await db.run(
          "UPDATE FundCollectionGroup SET CollectionTypeId = ?, CollectionDate = ? WHERE Id = ?",
          [collectionTypeId, date, groupId]
        );
        // Clear previous contributions for this group
        await db.run("DELETE FROM MemberCollection WHERE CollectionGroupId = ?", [groupId]);
      } else {
        // Create new group
        const result = await db.run(
          "INSERT INTO FundCollectionGroup (CollectionTypeId, CollectionDate) VALUES (?, ?)",
          [collectionTypeId, date]
        );
        groupId = result.lastID ?? null;
      }

      // Insert new positive allocations
      for (const p of payments) {
        const amt = parseFloat(p.amount) || 0;
        if (amt > 0) {
          await db.run(
            "INSERT INTO MemberCollection (CollectionGroupId, UserId, Amount) VALUES (?, ?, ?)",
            [groupId, p.userId, amt]
          );
        }
      }

      await db.run("COMMIT");
      res.json({ id: groupId, message: "Collections saved successfully." });
    } catch (txError) {
      await db.run("ROLLBACK");
      throw txError;
    }
  } catch (error) {
    console.error("Submit collections error", error);
    res.status(500).json({ error: "Error submitting member collections" });
  }
};

// Get list of all collection groups with type, date, and sum total
export const getCollectionGroups = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const list = await db.all(`
      SELECT 
        fcg.Id as id, 
        fcg.CollectionTypeId as collectionTypeId,
        ct.TypeName as typeName, 
        fcg.CollectionDate as date, 
        COALESCE(SUM(mc.Amount), 0) as totalAmount
      FROM FundCollectionGroup fcg
      JOIN CollectionType ct ON fcg.CollectionTypeId = ct.Id
      LEFT JOIN MemberCollection mc ON fcg.Id = mc.CollectionGroupId
      GROUP BY fcg.Id
      ORDER BY fcg.Id DESC
    `);
    res.json(list);
  } catch (error) {
    console.error("Get collection groups error", error);
    res.status(500).json({ error: "Error fetching collection history list" });
  }
};

// Get specific collection group header and member allocations
export const getCollectionGroupDetails = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "id parameter is required" });
    }

    const group = await db.get(`
      SELECT Id as id, CollectionTypeId as collectionTypeId, CollectionDate as date
      FROM FundCollectionGroup
      WHERE Id = ?
    `, [id]);

    if (!group) {
      return res.status(404).json({ error: "Collection event not found" });
    }

    // Retrieve active members, joining their collection amount for this group
    const members = await db.all(`
      SELECT 
        u.id as userId, 
        u.fullName, 
        u.email,
        COALESCE(mc.Amount, 0) as amount
      FROM users u
      LEFT JOIN MemberCollection mc ON u.id = mc.UserId AND mc.CollectionGroupId = ?
      ORDER BY u.fullName
    `, [id]);

    res.json({
      ...group,
      members
    });
  } catch (error) {
    console.error("Get collection group details error", error);
    res.status(500).json({ error: "Error fetching collection details" });
  }
};

// Retrieve collection summary aggregates (either for a type or generally)
export const getCollectionSummary = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { typeId } = req.params;
    if (!typeId) {
      return res.status(400).json({ error: "typeId is required" });
    }

    // Returns sum and count of contributors for all groups of this type
    const summary = await db.get(`
      SELECT 
        COALESCE(SUM(mc.Amount), 0) as totalAmount,
        COUNT(DISTINCT mc.UserId) as membersCount
      FROM MemberCollection mc
      JOIN FundCollectionGroup fcg ON mc.CollectionGroupId = fcg.Id
      WHERE fcg.CollectionTypeId = ?
    `, [typeId]);

    res.json(summary);
  } catch (error) {
    console.error("Get collection summary error", error);
    res.status(500).json({ error: "Error fetching collection summary" });
  }
};

// Get the consolidated audit report grouping all collection amounts per member
export const getAuditReport = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { collectionTypeId } = req.query;
    if (!collectionTypeId) {
      return res.status(400).json({ error: "collectionTypeId query parameter is required" });
    }

    const list = await db.all(`
      SELECT 
        u.id as userId, 
        u.fullName, 
        u.email, 
        u.phoneNumber,
        COALESCE(sub.totalAmount, 0) as amount,
        sub.lastDate as date
      FROM users u
      LEFT JOIN (
        SELECT 
          mc.UserId,
          SUM(mc.Amount) as totalAmount,
          MAX(fcg.CollectionDate) as lastDate
        FROM MemberCollection mc
        JOIN FundCollectionGroup fcg ON mc.CollectionGroupId = fcg.Id
        WHERE fcg.CollectionTypeId = ?
        GROUP BY mc.UserId
      ) sub ON u.id = sub.UserId
      ORDER BY u.fullName
    `, [collectionTypeId]);

    res.json(list);
  } catch (error) {
    console.error("Get audit report error", error);
    res.status(500).json({ error: "Error fetching audit report" });
  }
};
