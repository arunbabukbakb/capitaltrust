import { Database } from '../database';
import bcrypt from 'bcrypt';

const initialUsers = [
  {
    id: 'CT-00001',
    fullName: 'Demo Administrator',
    email: 'admin@capitaltrust.com',
    username: 'admin',
    role: 'admin',
    phoneNumber: '+1 (555) 123-4567',
  },
  {
    id: 'CT-00002',
    fullName: 'Demo Manager',
    email: 'manager@capitaltrust.com',
    username: 'manager',
    role: 'manager',
    phoneNumber: '+1 (555) 234-5678',
  },
  {
    id: 'CT-00003',
    fullName: 'John Doe',
    email: 'john@capitaltrust.com',
    username: 'john',
    role: 'user',
    phoneNumber: '+1 (555) 345-6789',
  },
  {
    id: 'CT-00004',
    fullName: 'Jane Smith',
    email: 'jane@capitaltrust.com',
    username: 'jane',
    role: 'user',
    phoneNumber: '+1 (555) 456-7890',
  },
  {
    id: 'CT-00005',
    fullName: 'Robert Johnson',
    email: 'robert@capitaltrust.com',
    username: 'robert',
    role: 'user',
    phoneNumber: '+1 (555) 567-8901',
  }
];

const initialRoles = [
  { roleName: 'Administrator', roleType: 'admin' },
  { roleName: 'Manager', roleType: 'manager' },
  { roleName: 'Member', roleType: 'user' },
];

export async function runSeeders(db: Database) {
  // Seed roles first for tenant 1
  for (const role of initialRoles) {
    const exists = await db.get("SELECT id FROM roles WHERE roleType = ? AND tenantId = 1", [role.roleType]);
    if (!exists) {
      await db.run(
        "INSERT INTO roles (roleName, roleType, tenantId) VALUES (?, ?, 1)",
        [role.roleName, role.roleType]
      );
    }
  }

  // Seed users
  for (const user of initialUsers) {
    const exists = await db.get("SELECT id FROM users WHERE id = ?", [user.id]);
    if (!exists) {
      const role = await db.get<{ id: number }>("SELECT id FROM roles WHERE roleType = ? AND tenantId = 1", [user.role]);
      if (!role) continue;

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash('123', saltRounds);

      await db.run(
        "INSERT INTO users (id, fullName, email, username, role, password, status, phoneNumber, roleId, tenantId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
        [user.id, user.fullName, user.email, user.username, user.role, hashedPassword, 1, user.phoneNumber || null, role.id]
      );
    }

    // Map roles in user_roles table
    if (user.id === 'CT-00001') {
      const allRoles = await db.all<{ id: number }[]>("SELECT id FROM roles WHERE tenantId = 1");
      for (const r of allRoles) {
        await db.run(
          "INSERT IGNORE INTO user_roles (userId, roleId) VALUES (?, ?)",
          [user.id, r.id]
        );
      }
    } else {
      const role = await db.get<{ id: number }>("SELECT id FROM roles WHERE roleType = ? AND tenantId = 1", [user.role]);
      if (role) {
        await db.run(
          "INSERT IGNORE INTO user_roles (userId, roleId) VALUES (?, ?)",
          [user.id, role.id]
        );
      }
    }
  }

  // Seed menus if missing
  const initialMenus = [
    { menuId: 'dashboard', name: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard', parentId: null, menuOrder: 10 },
    { menuId: 'liquidity', name: 'Collection', icon: 'Coins', path: null, parentId: null, menuOrder: 20 },
    { menuId: 'collection-types', name: 'Collection Type', icon: 'Shield', path: '/collection-types', parentId: 'liquidity', menuOrder: 21 },
    { menuId: 'fund-collection', name: 'Fund Collection', icon: 'Coins', path: '/fund-collection', parentId: 'liquidity', menuOrder: 22 },
    { menuId: 'fund-collection-audit', name: 'Collection Summary', icon: 'FileText', path: '/fund-collection-audit', parentId: 'liquidity', menuOrder: 23 },
    { menuId: 'collection-opening-balance', name: 'Opening Balance Entry', icon: 'Coins', path: '/collection-opening-balance', parentId: 'liquidity', menuOrder: 24 },
    { menuId: 'credit', name: 'Loans', icon: 'Calculator', path: null, parentId: null, menuOrder: 30 },
    { menuId: 'loan-repayment', name: 'My Loans', icon: 'Calculator', path: '/loan-repayment', parentId: 'credit', menuOrder: 31 },
    { menuId: 'loan-request', name: 'Loan Request', icon: 'FilePlus', path: '/loan-request', parentId: 'credit', menuOrder: 31.5 },
    { menuId: 'loan-list', name: 'Loan List', icon: 'FileText', path: '/loan-list', parentId: 'credit', menuOrder: 32 },
    { menuId: 'loan-entry', name: 'Loan Entry', icon: 'Users', path: '/loan-entry', parentId: 'credit', menuOrder: 33 },
    { menuId: 'loan-repayments', name: 'Repayment', icon: 'ShieldCheck', path: '/loan-repayments', parentId: 'credit', menuOrder: 34 },
    { menuId: 'expenses', name: 'Expenses', icon: 'Receipt', path: '/expenses', parentId: null, menuOrder: 35 },
    { menuId: 'users', name: 'Users', icon: 'Users', path: null, parentId: null, menuOrder: 40 },
    { menuId: 'role-management', name: 'Role Management', icon: 'Shield', path: '/roles', parentId: 'users', menuOrder: 41 },
    { menuId: 'user-management', name: 'User Management', icon: 'Users', path: '/users', parentId: 'users', menuOrder: 42 },
    { menuId: 'menu-management', name: 'Menu Management', icon: 'Menu', path: '/menus', parentId: 'users', menuOrder: 43 },
    { menuId: 'permission-management', name: 'Permission Management', icon: 'ShieldCheck', path: '/permissions', parentId: 'users', menuOrder: 44 },
    { menuId: 'reports', name: 'Reports', icon: 'FileSpreadsheet', path: null, parentId: null, menuOrder: 50 },
    { menuId: 'transactions', name: 'Transactions', icon: 'Receipt', path: '/reports/transactions', parentId: 'reports', menuOrder: 51 },
    { menuId: 'member-ledger', name: 'Member Ledger', icon: 'FileText', path: '/reports/member-ledger', parentId: 'reports', menuOrder: 52 },
    { menuId: 'due-report', name: 'Due Report', icon: 'Calendar', path: '/reports/due-report', parentId: 'reports', menuOrder: 53 }
  ];

  for (const menu of initialMenus) {
    const existing = await db.get<{ id: number }>("SELECT id FROM menus WHERE menuId = ?", [menu.menuId]);
    if (!existing) {
      await db.run(
        "INSERT INTO menus (menuId, name, icon, path, parentId, menuOrder) VALUES (?, ?, ?, ?, ?, ?)",
        [menu.menuId, menu.name, menu.icon, menu.path, menu.parentId, menu.menuOrder]
      );
    }
  }

  // Ensure due-report permission for manager roles across all tenants
  const dueReportMenu = await db.get<{ id: number }>("SELECT id FROM menus WHERE menuId = 'due-report'");
  if (dueReportMenu) {
    const managerRoles = await db.all<{ id: number }[]>("SELECT id FROM roles WHERE roleType = 'manager'");
    for (const r of managerRoles) {
      await db.run(
        "INSERT IGNORE INTO role_menu_permissions (roleId, menuId) VALUES (?, ?)",
        [r.id, dueReportMenu.id]
      );
    }
  }

  // Seed company settings if empty
  const settingsCount = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM company_settings");
  if (settingsCount && settingsCount.count === 0) {
    await db.run(
      "INSERT INTO company_settings (companyName, companyLogo, supportEmail, supportPhone) VALUES (?, ?, ?, ?)",
      ['CapitalTrust', '', 'contact@trustcaps.in', '+1 (555) 555-5555']
    );
  }

  // Seed Collection Types
  const collectionTypesCount = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM CollectionType WHERE tenantId = 1");
  if (collectionTypesCount && collectionTypesCount.count === 0) {
    await db.run("INSERT INTO CollectionType (TypeName, Status, Frequency, Amount, tenantId) VALUES (?, ?, ?, ?, ?)", ["Monthly Contribution", 1, "monthly", 5000, 1]);
    await db.run("INSERT INTO CollectionType (TypeName, Status, Frequency, Amount, tenantId) VALUES (?, ?, ?, ?, ?)", ["Festival Special Fund", 1, "yearly", null, 1]);
    console.log("Seeded default collection types.");
  }

  // Seed Collection Groups and Member Collections
  const groupsCount = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM FundCollectionGroup WHERE tenantId = 1");
  if (groupsCount && groupsCount.count === 0) {
    const monthlyType = await db.get<{ Id: number }>("SELECT Id FROM CollectionType WHERE TypeName = ? AND tenantId = 1", ["Monthly Contribution"]);
    const festivalType = await db.get<{ Id: number }>("SELECT Id FROM CollectionType WHERE TypeName = ? AND tenantId = 1", ["Festival Special Fund"]);

    if (monthlyType && festivalType) {
      // May 2026 Monthly Contribution
      const group1 = await db.run("INSERT INTO FundCollectionGroup (CollectionTypeId, CollectionDate, tenantId) VALUES (?, ?, ?)", [monthlyType.Id, "2026-05-10", 1]);
      if (group1.lastID) {
        await db.run("INSERT INTO MemberCollection (CollectionGroupId, UserId, Amount) VALUES (?, ?, ?)", [group1.lastID, "CT-00003", 5000]);
        await db.run("INSERT INTO MemberCollection (CollectionGroupId, UserId, Amount) VALUES (?, ?, ?)", [group1.lastID, "CT-00004", 5000]);
        await db.run("INSERT INTO MemberCollection (CollectionGroupId, UserId, Amount) VALUES (?, ?, ?)", [group1.lastID, "CT-00005", 5000]);
      }

      // June 2026 Monthly Contribution
      const group2 = await db.run("INSERT INTO FundCollectionGroup (CollectionTypeId, CollectionDate, tenantId) VALUES (?, ?, ?)", [monthlyType.Id, "2026-06-10", 1]);
      if (group2.lastID) {
        await db.run("INSERT INTO MemberCollection (CollectionGroupId, UserId, Amount) VALUES (?, ?, ?)", [group2.lastID, "CT-00003", 5000]);
        await db.run("INSERT INTO MemberCollection (CollectionGroupId, UserId, Amount) VALUES (?, ?, ?)", [group2.lastID, "CT-00004", 5000]);
        await db.run("INSERT INTO MemberCollection (CollectionGroupId, UserId, Amount) VALUES (?, ?, ?)", [group2.lastID, "CT-00005", 5000]);
      }

      // July 2026 Monthly Contribution
      const group3 = await db.run("INSERT INTO FundCollectionGroup (CollectionTypeId, CollectionDate, tenantId) VALUES (?, ?, ?)", [monthlyType.Id, "2026-07-10", 1]);
      if (group3.lastID) {
        await db.run("INSERT INTO MemberCollection (CollectionGroupId, UserId, Amount) VALUES (?, ?, ?)", [group3.lastID, "CT-00003", 5000]);
        await db.run("INSERT INTO MemberCollection (CollectionGroupId, UserId, Amount) VALUES (?, ?, ?)", [group3.lastID, "CT-00004", 5000]);
        await db.run("INSERT INTO MemberCollection (CollectionGroupId, UserId, Amount) VALUES (?, ?, ?)", [group3.lastID, "CT-00005", 5000]);
      }

      // June 2026 Festival Special Fund
      const group4 = await db.run("INSERT INTO FundCollectionGroup (CollectionTypeId, CollectionDate, tenantId) VALUES (?, ?, ?)", [festivalType.Id, "2026-06-15", 1]);
      if (group4.lastID) {
        await db.run("INSERT INTO MemberCollection (CollectionGroupId, UserId, Amount) VALUES (?, ?, ?)", [group4.lastID, "CT-00003", 10000]);
        await db.run("INSERT INTO MemberCollection (CollectionGroupId, UserId, Amount) VALUES (?, ?, ?)", [group4.lastID, "CT-00004", 10000]);
        await db.run("INSERT INTO MemberCollection (CollectionGroupId, UserId, Amount) VALUES (?, ?, ?)", [group4.lastID, "CT-00005", 10000]);
      }
      console.log("Seeded default collection groups and member payments.");
    }
  }

  // Seed Loans, Slabs, Dues and Payments
  const loansCount = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM Loan");
  if (loansCount && loansCount.count === 0) {
    // --- LOAN 1: John Doe (Active) ---
    const loan1Id = 'LN-DEMO-00001';
    await db.run(`
      INSERT INTO Loan (Id, LoanNo, LoanType, Amount, OutstandingPrincipal, TenureMonths, StartDate, EndDate, InterestMode, InterestRate, Status, CreatedBy, CreatedDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [loan1Id, 'LN-2026-00001', 'Single', 50000, 20000, 10, '2026-01-15', '2026-10-15', 'Fixed', 12.0, 'Active', 'CT-00001', '2026-01-10']);

    const lm1 = await db.run(`
      INSERT INTO LoanMember (LoanId, UserId, LoanShareAmount, OutstandingPrincipal, CreatedDate, Status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [loan1Id, 'CT-00003', 50000, 20000, '2026-01-10', 'Active']);

    if (lm1.lastID) {
      // Create dues for months 1-10
      for (let month = 1; month <= 10; month++) {
        const openingPrincipal = 50000 - (month - 1) * 5000;
        const principalDue = 5000;
        const interestDue = (openingPrincipal * 0.12) / 12;
        const totalDue = principalDue + interestDue;
        const isPaid = month <= 6;

        const status = isPaid ? 'Paid' : 'Pending';
        const paidAmount = isPaid ? totalDue : 0;
        const interestPaid = isPaid ? interestDue : 0;
        const principalPaid = isPaid ? principalDue : 0;
        const closingPrincipal = isPaid ? (openingPrincipal - principalPaid) : openingPrincipal;

        await db.run(`
          INSERT INTO LoanDue (LoanMemberId, DueMonth, OpeningPrincipal, PrincipalDue, InterestDue, CarryForwardInterest, TotalDue, PaidAmount, InterestPaid, PrincipalPaid, ClosingPrincipal, Status)
          VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
        `, [lm1.lastID, month, openingPrincipal, principalDue, interestDue, totalDue, paidAmount, interestPaid, principalPaid, closingPrincipal, status]);

        // Add actual payment records for paid months
        if (isPaid) {
          const pad = String(month).padStart(2, '0');
          const paymentDate = `2026-${pad}-20`;
          await db.run(`
            INSERT INTO LoanPayment (LoanMemberId, DueMonth, PaymentDate, Amount, InterestPaid, PrincipalPaid, ApprovedBy, ApprovedDate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [lm1.lastID, month, paymentDate, totalDue, interestDue, principalPaid, 'CT-00001', paymentDate]);
        }
      }
    }

    // --- LOAN 2: Jane Smith (Pending) ---
    const loan2Id = 'LN-DEMO-00002';
    await db.run(`
      INSERT INTO Loan (Id, LoanNo, LoanType, Amount, OutstandingPrincipal, TenureMonths, StartDate, EndDate, InterestMode, InterestRate, Status, CreatedBy, CreatedDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [loan2Id, 'LN-2026-00002', 'Single', 100000, 100000, 12, '2026-08-01', '2027-07-31', 'Fixed', 10.0, 'Pending', 'CT-00002', '2026-07-10']);

    await db.run(`
      INSERT INTO LoanMember (LoanId, UserId, LoanShareAmount, OutstandingPrincipal, CreatedDate, Status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [loan2Id, 'CT-00004', 100000, 100000, '2026-07-10', 'Active']);

    // --- LOAN 3: Robert Johnson (Closed) ---
    const loan3Id = 'LN-DEMO-00003';
    await db.run(`
      INSERT INTO Loan (Id, LoanNo, LoanType, Amount, OutstandingPrincipal, TenureMonths, StartDate, EndDate, InterestMode, InterestRate, Status, CreatedBy, CreatedDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [loan3Id, 'LN-2025-00003', 'Single', 30000, 0, 6, '2025-06-01', '2025-11-30', 'Fixed', 12.0, 'Closed', 'CT-00001', '2025-05-25']);

    const lm3 = await db.run(`
      INSERT INTO LoanMember (LoanId, UserId, LoanShareAmount, OutstandingPrincipal, CreatedDate, Status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [loan3Id, 'CT-00005', 30000, 0, '2025-05-25', 'Closed']);

    if (lm3.lastID) {
      for (let month = 1; month <= 6; month++) {
        const openingPrincipal = 30000 - (month - 1) * 5000;
        const principalDue = 5000;
        const interestDue = (openingPrincipal * 0.12) / 12;
        const totalDue = principalDue + interestDue;
        const closingPrincipal = openingPrincipal - principalDue;

        await db.run(`
          INSERT INTO LoanDue (LoanMemberId, DueMonth, OpeningPrincipal, PrincipalDue, InterestDue, CarryForwardInterest, TotalDue, PaidAmount, InterestPaid, PrincipalPaid, ClosingPrincipal, Status)
          VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'Paid')
        `, [lm3.lastID, month, openingPrincipal, principalDue, interestDue, totalDue, totalDue, interestDue, principalDue, closingPrincipal]);

        const pad = String(5 + month).padStart(2, '0');
        const paymentDate = `2025-${pad}-20`;
        await db.run(`
          INSERT INTO LoanPayment (LoanMemberId, DueMonth, PaymentDate, Amount, InterestPaid, PrincipalPaid, ApprovedBy, ApprovedDate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [lm3.lastID, month, paymentDate, totalDue, interestDue, principalDue, 'CT-00001', paymentDate]);
      }
    }
    console.log("Seeded default loans and transaction history.");
  }
}
