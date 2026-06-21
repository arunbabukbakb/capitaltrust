import { Router } from 'express';
import { getRoles, createRole, updateRole, deleteRole } from '../controllers/roles';

const router = Router();

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Retrieve list of all user roles
 *     tags: [Roles]
 *     responses:
 *       200:
 *         description: List of roles
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleName
 *               - roleType
 *             properties:
 *               roleName:
 *                 type: string
 *               roleType:
 *                 type: string
 *                 enum: [admin, manager, user]
 *     responses:
 *       201:
 *         description: Created role details
 *       400:
 *         description: Missing fields
 *       409:
 *         description: Role name already exists
 */
router.get('/', getRoles);
router.post('/', createRole);

/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     summary: Update an existing role
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - roleName
 *               - roleType
 *             properties:
 *               roleName:
 *                 type: string
 *               roleType:
 *                 type: string
 *                 enum: [admin, manager, user]
 *     responses:
 *       200:
 *         description: Updated role details
 *       400:
 *         description: Missing fields
 *   delete:
 *     summary: Delete a role
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Role deleted successfully
 */
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);

export default router;
