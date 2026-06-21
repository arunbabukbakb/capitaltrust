import { Router } from 'express';
import { getUserMenus, getMenus, createMenu, updateMenu, deleteMenu } from '../controllers/menus';

const router = Router();

/**
 * @swagger
 * /api/menus/user-menu:
 *   get:
 *     summary: Retrieve allowed menus for the currently authenticated user
 *     tags: [Menus]
 *     responses:
 *       200:
 *         description: List of allowed menus for the current user session
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: User or role not found
 */
router.get('/user-menu', getUserMenus);

/**
 * @swagger
 * /api/menus:
 *   get:
 *     summary: Retrieve list of all portal menus (Admin/Manager only)
 *     tags: [Menus]
 *     responses:
 *       200:
 *         description: List of all defined menus
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 *   post:
 *     summary: Create a new dynamic menu item (Admin/Manager only)
 *     tags: [Menus]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - menuId
 *               - name
 *             properties:
 *               menuId:
 *                 type: string
 *               name:
 *                 type: string
 *               icon:
 *                 type: string
 *               path:
 *                 type: string
 *               parentId:
 *                 type: string
 *               menuOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Created menu item details
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Menu key already exists
 */
router.get('/', getMenus);
router.post('/', createMenu);

/**
 * @swagger
 * /api/menus/{id}:
 *   put:
 *     summary: Update an existing menu item (Admin/Manager only)
 *     tags: [Menus]
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
 *               - menuId
 *               - name
 *             properties:
 *               menuId:
 *                 type: string
 *               name:
 *                 type: string
 *               icon:
 *                 type: string
 *               path:
 *                 type: string
 *               parentId:
 *                 type: string
 *               menuOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated menu item details
 *       400:
 *         description: Missing fields or invalid request data
 *   delete:
 *     summary: Delete a menu item and its descendants (Admin/Manager only)
 *     tags: [Menus]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Menu item deleted successfully
 */
router.put('/:id', updateMenu);
router.delete('/:id', deleteMenu);

export default router;
