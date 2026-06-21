import { Router } from 'express';
import { getRolePermissions, updateRolePermissions } from '../controllers/permissions';

const router = Router();

/**
 * @swagger
 * /api/permissions/roles/{roleId}:
 *   get:
 *     summary: Get list of permitted menu IDs mapped to a role ID
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of menu IDs that are allowed for the role
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 *   post:
 *     summary: Update allowed menu permissions for a role ID
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - menuIds
 *             properties:
 *               menuIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Permissions updated successfully
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 */
router.get('/roles/:roleId', getRolePermissions);
router.post('/roles/:roleId', updateRolePermissions);

export default router;
