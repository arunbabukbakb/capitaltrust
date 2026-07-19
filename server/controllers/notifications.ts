import { Request, Response } from 'express';
import { sendPushNotification } from '../firebaseAdmin';
import { NotificationModel } from '../models/Notification';

/**
 * POST /api/notifications/send-to-user
 * Body: { userId: string, title: string, body: string }
 *
 * Sends a Firebase push notification to all registered devices of the given user.
 */
export const sendNotificationToUser = async (req: Request, res: Response) => {
  try {
    const { userId, title, body } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'userId, title, and body are required.' });
    }

    // Verify user has at least one registered push token
    const tokens = await NotificationModel.getTokensByUserId(userId);
    if (tokens.length === 0) {
      return res.status(404).json({
        error: `No registered push tokens found for user: ${userId}`
      });
    }

    await sendPushNotification([userId], title, body);

    return res.json({
      success: true,
      message: `Push notification sent to user "${userId}" (${tokens.length} device(s)).`
    });
  } catch (error) {
    console.error('[sendNotificationToUser] Error:', error);
    return res.status(500).json({ error: 'Failed to send push notification to user.' });
  }
};

/**
 * POST /api/notifications/send-to-roles
 * Body: { roles: string[], title: string, body: string }
 *
 * Sends a Firebase push notification to all users that have any of the given roles.
 * `roles` can be an array of role names (e.g. ["admin", "manager"]).
 */
export const sendNotificationToRoles = async (req: Request, res: Response) => {
  try {
    const { roles, title, body } = req.body;

    if (!Array.isArray(roles) || roles.length === 0 || !title || !body) {
      return res.status(400).json({
        error: 'roles (non-empty array), title, and body are required.'
      });
    }

    // Resolve role names → role IDs
    const roleIds = await NotificationModel.getRoleIdsByNames(roles);
    if (roleIds.length === 0) {
      return res.status(404).json({
        error: `None of the provided roles exist: ${roles.join(', ')}`
      });
    }

    // Fetch all matching push token rows
    const tokenRows = await NotificationModel.getTokensByRoleIds(roleIds);
    if (tokenRows.length === 0) {
      return res.status(404).json({
        error: `No registered push tokens found for roles: ${roles.join(', ')}`
      });
    }

    // Deduplicate userIds — sendPushNotification fetches tokens per user internally
    const uniqueUserIds = [...new Set(tokenRows.map(r => r.userId))];

    await sendPushNotification(uniqueUserIds, title, body);

    return res.json({
      success: true,
      message: `Push notification sent to ${uniqueUserIds.length} user(s) across roles [${roles.join(', ')}].`
    });
  } catch (error) {
    console.error('[sendNotificationToRoles] Error:', error);
    return res.status(500).json({ error: 'Failed to send push notification to roles.' });
  }
};
