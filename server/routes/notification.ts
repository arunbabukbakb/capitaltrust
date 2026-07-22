import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database';
import { sendNotificationToUser, sendNotificationToRoles } from '../controllers/notifications';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-that-should-be-in-env-vars";

/**
 * @swagger
 * /api/notifications/register-token:
 *   post:
 *     summary: Register a Firebase push notification token for the authenticated user
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Firebase Cloud Messaging (FCM) device token
 *                 example: "fMSomeFirebaseToken123..."
 *     responses:
 *       200:
 *         description: Token registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Token registered successfully"
 *       400:
 *         description: Token is missing from the request body
 *       401:
 *         description: Unauthorized — missing or invalid auth token
 *       500:
 *         description: Internal server error while registering the token
 */
router.post('/register-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const authToken = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!authToken) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    let userId: string;
    try {
      const decoded = jwt.verify(authToken, JWT_SECRET) as { id: string };
      userId = decoded.id;
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const db = getDatabase();

    // Reassign token to current logged-in user and remove stale device token links for other user accounts
    await db.run("DELETE FROM user_push_tokens WHERE token = ? AND userId != ?", [token, userId]);
    await db.run(
      "INSERT OR IGNORE INTO user_push_tokens (userId, token) VALUES (?, ?)",
      [userId, token]
    );

    res.json({ success: true, message: "Token registered successfully" });
  } catch (error) {
    console.error("Register token error:", error);
    res.status(500).json({ error: "Failed to register push token" });
  }
});

/**
 * @swagger
 * /api/notifications/send-to-user:
 *   post:
 *     summary: Send a Firebase push notification to a specific user
 *     description: Dispatches a push notification to all registered FCM devices of the given user ID.
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - title
 *               - body
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the target user
 *                 example: "USR001"
 *               title:
 *                 type: string
 *                 description: Notification title
 *                 example: "Payment Received"
 *               body:
 *                 type: string
 *                 description: Notification body message
 *                 example: "Your loan payment of ₹5,000 has been received."
 *     responses:
 *       200:
 *         description: Notification dispatched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Push notification sent to user \"USR001\" (2 device(s))."
 *       400:
 *         description: Missing required fields — userId, title, or body
 *       404:
 *         description: No registered push tokens found for the given user
 *       500:
 *         description: Internal server error while sending the notification
 */
router.post('/send-to-user', sendNotificationToUser);

/**
 * @swagger
 * /api/notifications/send-to-roles:
 *   post:
 *     summary: Send a Firebase push notification to all users with specified roles
 *     description: Resolves the given role names to users, then dispatches a push notification to all their registered FCM devices.
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roles
 *               - title
 *               - body
 *             properties:
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of role names to target
 *                 example: ["admin", "manager"]
 *               title:
 *                 type: string
 *                 description: Notification title
 *                 example: "System Announcement"
 *               body:
 *                 type: string
 *                 description: Notification body message
 *                 example: "Scheduled maintenance on Sunday at 2 AM."
 *     responses:
 *       200:
 *         description: Notification dispatched successfully to all matching users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Push notification sent to 5 user(s) across roles [admin, manager]."
 *       400:
 *         description: Missing or invalid fields — roles must be a non-empty array; title and body are required
 *       404:
 *         description: No matching roles found, or no registered push tokens for users with those roles
 *       500:
 *         description: Internal server error while sending the notification
 */
router.post('/send-to-roles', sendNotificationToRoles);

export default router;

