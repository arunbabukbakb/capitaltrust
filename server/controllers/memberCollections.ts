import { Request, Response } from 'express';
import { getDatabase } from '../database';
import { CollectionModel } from '../models/Collection';
import { sendPushNotification } from '../firebaseAdmin';

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

    const tenantId = req.headers['x-tenant-id'] as string;
    const collectionsToSend: { userId: string; amount: number }[] = [];

    await db.run("BEGIN TRANSACTION");
    try {
      let groupId = id ? Number(id) : null;

      if (groupId) {
        await CollectionModel.updateGroup(groupId, Number(collectionTypeId), date);
        await CollectionModel.clearMemberCollectionsByGroup(groupId);
      } else {
        const result = await CollectionModel.createGroup(Number(collectionTypeId), date, tenantId);
        groupId = result.lastID ? Number(result.lastID) : null;
      }

      if (groupId) {
        for (const p of payments) {
          const amt = parseFloat(p.amount) || 0;
          if (amt > 0) {
            await CollectionModel.addMemberCollection(groupId, p.userId, amt);
            collectionsToSend.push({ userId: p.userId, amount: amt });
          }
        }
      }

      await db.run("COMMIT");

      // Trigger notifications asynchronously
      if (collectionsToSend.length > 0) {
        setImmediate(async () => {
          try {
            const dbConn = getDatabase();
            const typeRow = await dbConn.get<{ typeName: string }>(
              'SELECT typeName FROM collection_types WHERE id = ?',
              [collectionTypeId]
            );
            const typeName = typeRow?.typeName || 'Fund Contribution';

            collectionsToSend.forEach(async (item) => {
              try {
                const notifAmount = new Intl.NumberFormat('en-IN').format(item.amount);
                await sendPushNotification(
                  [item.userId],
                  'New Contribution Recorded',
                  `A new contribution of ₹${notifAmount} has been recorded for "${typeName}".`,
                  '/fund-collection-audit'
                );
              } catch (err) {
                console.error('Failed to send collection push notification:', err);
              }
            });
          } catch (err) {
            console.error('Failed to resolve collection type for notification:', err);
          }
        });
      }

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

export const getCollectionGroups = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const list = await CollectionModel.listGroupsByTenant(tenantId);
    res.json(list);
  } catch (error) {
    console.error("Get collection groups error", error);
    res.status(500).json({ error: "Error fetching collection history list" });
  }
};

export const getCollectionGroupDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "id parameter is required" });
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const group = await CollectionModel.getGroupByIdAndTenant(Number(id), tenantId);

    if (!group) {
      return res.status(404).json({ error: "Collection event not found" });
    }

    const members = await CollectionModel.listGroupDetailsByTenant(Number(id), tenantId);

    res.json({
      ...group,
      members
    });
  } catch (error) {
    console.error("Get collection group details error", error);
    res.status(500).json({ error: "Error fetching collection details" });
  }
};

export const getCollectionSummary = async (req: Request, res: Response) => {
  try {
    const { typeId } = req.params;
    if (!typeId) {
      return res.status(400).json({ error: "typeId is required" });
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const summary = await CollectionModel.getCollectionSummary(Number(typeId), tenantId);

    res.json(summary);
  } catch (error) {
    console.error("Get collection summary error", error);
    res.status(500).json({ error: "Error fetching collection summary" });
  }
};

export const getAuditReport = async (req: Request, res: Response) => {
  try {
    const { collectionTypeId } = req.query;
    if (!collectionTypeId) {
      return res.status(400).json({ error: "collectionTypeId query parameter is required" });
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const list = await CollectionModel.getAuditReport(Number(collectionTypeId), tenantId);

    res.json(list);
  } catch (error) {
    console.error("Get audit report error", error);
    res.status(500).json({ error: "Error fetching audit report" });
  }
};
