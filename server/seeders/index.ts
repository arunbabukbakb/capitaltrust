import { Database } from '../database';
import bcrypt from 'bcrypt';

const initialUsers: any[] = [];


const initialRoles = [
  { roleName: 'Administrator', roleType: 'admin' },
  { roleName: 'Manager', roleType: 'manager' },
  { roleName: 'Member', roleType: 'user' },
];

export async function runSeeders(db: Database) {
  // Seed roles first
  for (const role of initialRoles) {
    const exists = await db.get("SELECT id FROM roles WHERE roleType = ?", [role.roleType]);
    if (!exists) {
      await db.run(
        "INSERT INTO roles (roleName, roleType) VALUES (?, ?)",
        [role.roleName, role.roleType]
      );
    }
  }

  // Seed users
  for (const user of initialUsers) {
    const exists = await db.get("SELECT id FROM users WHERE id = ?", [user.id]);
    if (!exists) {
      const role = await db.get<{ id: number }>("SELECT id FROM roles WHERE roleType = ?", [user.role]);
      if (!role) continue;

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash('123', saltRounds);

      await db.run(
        "INSERT INTO users (id, fullName, email, username, role, password, status, phoneNumber, roleId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [user.id, user.fullName, user.email, user.username, user.role, hashedPassword, 1, user.phoneNumber || null, role.id]
      );
    }

    // Map roles in user_roles table
    if (user.id === 'CT-00001') {
      const allRoles = await db.all<{ id: number }[]>("SELECT id FROM roles");
      for (const r of allRoles) {
        await db.run(
          "INSERT IGNORE INTO user_roles (userId, roleId) VALUES (?, ?)",
          [user.id, r.id]
        );
      }
    } else {
      const role = await db.get<{ id: number }>("SELECT id FROM roles WHERE roleType = ?", [user.role]);
      if (role) {
        await db.run(
          "INSERT IGNORE INTO user_roles (userId, roleId) VALUES (?, ?)",
          [user.id, role.id]
        );
      }
    }
  }

  // Seed menus if empty
  const menuCount = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM menus");
  if (menuCount && menuCount.count === 0) {
    const initialMenus = [
      { menuId: 'dashboard', name: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard', parentId: null, menuOrder: 10 },
      { menuId: 'liquidity', name: 'Liquidity Pools', icon: 'Coins', path: null, parentId: null, menuOrder: 20 },
      { menuId: 'collection-types', name: 'Collection Type', icon: 'Shield', path: '/collection-types', parentId: 'liquidity', menuOrder: 21 },
      { menuId: 'fund-collection', name: 'Fund Collection', icon: 'Coins', path: '/fund-collection', parentId: 'liquidity', menuOrder: 22 },
      { menuId: 'fund-collection-audit', name: 'Collection Summary', icon: 'FileText', path: '/fund-collection-audit', parentId: 'liquidity', menuOrder: 23 },
      { menuId: 'credit', name: 'Credit Facilities', icon: 'Calculator', path: null, parentId: null, menuOrder: 30 },
      { menuId: 'loan-repayment', name: 'My Loans', icon: 'Calculator', path: '/loan-repayment', parentId: 'credit', menuOrder: 31 },
      { menuId: 'loan-list', name: 'Loan List', icon: 'FileText', path: '/loan-list', parentId: 'credit', menuOrder: 32 },
      { menuId: 'loan-entry', name: 'Loan Request', icon: 'Users', path: '/loan-entry', parentId: 'credit', menuOrder: 33 },
      { menuId: 'loan-repayments', name: 'Repayment', icon: 'ShieldCheck', path: '/loan-repayments', parentId: 'credit', menuOrder: 34 },
      { menuId: 'users', name: 'Users', icon: 'Users', path: null, parentId: null, menuOrder: 40 },
      { menuId: 'role-management', name: 'Role Management', icon: 'Shield', path: '/roles', parentId: 'users', menuOrder: 41 },
      { menuId: 'user-management', name: 'User Management', icon: 'Users', path: '/users', parentId: 'users', menuOrder: 42 },
      { menuId: 'menu-management', name: 'Menu Management', icon: 'Menu', path: '/menus', parentId: 'users', menuOrder: 43 },
      { menuId: 'permission-management', name: 'Permission Management', icon: 'ShieldCheck', path: '/permissions', parentId: 'users', menuOrder: 44 }
    ];

    for (const menu of initialMenus) {
      await db.run(
        "INSERT INTO menus (menuId, name, icon, path, parentId, menuOrder) VALUES (?, ?, ?, ?, ?, ?)",
        [menu.menuId, menu.name, menu.icon, menu.path, menu.parentId, menu.menuOrder]
      );
    }
  }

  // Seed default permissions for roles if empty
  const permCount = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM role_menu_permissions");
  if (permCount && permCount.count === 0) {
    const memberRole = await db.get<{ id: number }>("SELECT id FROM roles WHERE roleType = 'user'");
    const managerRole = await db.get<{ id: number }>("SELECT id FROM roles WHERE roleType = 'manager'");

    if (memberRole) {
      const memberMenus = ['dashboard', 'liquidity', 'fund-collection', 'credit', 'loan-repayment', 'loan-entry'];
      for (const mId of memberMenus) {
        const menu = await db.get<{ id: number }>("SELECT id FROM menus WHERE menuId = ?", [mId]);
        if (menu) {
          await db.run(
            "INSERT IGNORE INTO role_menu_permissions (roleId, menuId) VALUES (?, ?)",
            [memberRole.id, menu.id]
          );
        }
      }
    }

    if (managerRole) {
      const managerMenus = [
        'dashboard',
        'liquidity', 'collection-types', 'fund-collection', 'fund-collection-audit',
        'credit', 'loan-repayment', 'loan-list', 'loan-entry', 'loan-repayments',
        'users', 'role-management', 'user-management'
      ];
      for (const mId of managerMenus) {
        const menu = await db.get<{ id: number }>("SELECT id FROM menus WHERE menuId = ?", [mId]);
        if (menu) {
          await db.run(
            "INSERT IGNORE INTO role_menu_permissions (roleId, menuId) VALUES (?, ?)",
            [managerRole.id, menu.id]
          );
        }
      }
    }
  }

  // Seed company settings if empty
  const settingsCount = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM company_settings");
  if (settingsCount && settingsCount.count === 0) {
    await db.run(
      "INSERT INTO company_settings (companyName, companyLogo, supportEmail, supportPhone) VALUES (?, ?, ?, ?)",
      ['CapitalTrust', '', 'support@capitaltrust.com', '+1 (555) 555-5555']
    );
  }
}
