import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  if (!db) {
    db = await open({
      filename: "./database.db",
      driver: sqlite3.Database
    });

    // Clean up legacy MemberCollection schema if it exists
    try {
      const mcCols = await db.all("PRAGMA table_info(MemberCollection)");
      if (mcCols.some((col: any) => col.name === 'CollectionTypeId')) {
        await db.exec("DROP TABLE IF EXISTS MemberCollection;");
      }
    } catch (e) {
      // Ignored
    }

    // Create tables if they do not exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        fullName TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        username TEXT UNIQUE,
        role TEXT NOT NULL,
        password TEXT,
        status INTEGER NOT NULL DEFAULT 0,
        phoneNumber TEXT,
        roleId INTEGER,
        FOREIGN KEY(roleId) REFERENCES roles(id)
      );

      CREATE TABLE IF NOT EXISTS contributions (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        userName TEXT NOT NULL,
        amount REAL NOT NULL,
        method TEXT NOT NULL,
        status TEXT NOT NULL,
        reinvestmentEnabled INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        roleName TEXT NOT NULL UNIQUE,
        roleType TEXT NOT NULL CHECK(roleType IN ('admin', 'manager', 'user'))
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expiresAt DATETIME NOT NULL,
        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS Loan (
        Id TEXT PRIMARY KEY,
        LoanNo TEXT NOT NULL UNIQUE,
        LoanType TEXT NOT NULL CHECK(LoanType IN ('Single', 'Group')),
        Amount REAL NOT NULL CHECK(Amount > 0),
        OutstandingPrincipal REAL NOT NULL DEFAULT 0,
        TenureMonths INTEGER NOT NULL CHECK(TenureMonths > 0),
        StartDate TEXT NOT NULL,
        EndDate TEXT NOT NULL,
        InterestMode TEXT NOT NULL CHECK(InterestMode IN ('Fixed', 'Variable')),
        InterestRate REAL,
        Status TEXT NOT NULL CHECK(Status IN ('Pending', 'Active', 'Closed', 'Cancelled')),
        CreatedBy TEXT,
        CreatedDate TEXT NOT NULL,
        CHECK (
          (InterestMode = 'Fixed' AND InterestRate IS NOT NULL)
          OR (InterestMode = 'Variable' AND InterestRate IS NULL)
        ),
        FOREIGN KEY(CreatedBy) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS LoanMember (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        LoanId TEXT NOT NULL,
        UserId TEXT NOT NULL,
        LoanShareAmount REAL NOT NULL CHECK(LoanShareAmount > 0),
        OutstandingPrincipal REAL NOT NULL DEFAULT 0,
        CreatedDate TEXT NOT NULL,
        Status TEXT NOT NULL DEFAULT 'Active' CHECK(Status IN ('Active', 'Closed', 'Cancelled')),
        FOREIGN KEY(LoanId) REFERENCES Loan(Id) ON DELETE CASCADE,
        FOREIGN KEY(UserId) REFERENCES users(id),
        UNIQUE(LoanId, UserId)
      );

      CREATE TABLE IF NOT EXISTS LoanInterestSlab (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        LoanId TEXT NOT NULL,
        FromAmount REAL NOT NULL CHECK(FromAmount >= 0),
        ToAmount REAL NOT NULL CHECK(ToAmount > FromAmount),
        InterestRate REAL NOT NULL CHECK(InterestRate >= 0),
        FOREIGN KEY(LoanId) REFERENCES Loan(Id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS LoanDue (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        LoanMemberId INTEGER NOT NULL,
        DueMonth INTEGER NOT NULL,
        OpeningPrincipal REAL NOT NULL,
        PrincipalDue REAL NOT NULL,
        InterestDue REAL NOT NULL,
        CarryForwardInterest REAL NOT NULL,
        TotalDue REAL NOT NULL,
        PaidAmount REAL NOT NULL DEFAULT 0,
        InterestPaid REAL NOT NULL DEFAULT 0,
        PrincipalPaid REAL NOT NULL DEFAULT 0,
        ClosingPrincipal REAL NOT NULL,
        Status TEXT NOT NULL CHECK(Status IN ('Pending', 'Partial', 'Paid')),
        FOREIGN KEY(LoanMemberId) REFERENCES LoanMember(Id) ON DELETE CASCADE,
        UNIQUE(LoanMemberId, DueMonth)
      );

      CREATE TABLE IF NOT EXISTS LoanPayment (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        LoanMemberId INTEGER NOT NULL,
        DueMonth INTEGER NOT NULL,
        PaymentDate TEXT NOT NULL,
        Amount REAL NOT NULL CHECK(Amount > 0),
        InterestPaid REAL NOT NULL DEFAULT 0,
        PrincipalPaid REAL NOT NULL DEFAULT 0,
        ApprovedBy TEXT,
        ApprovedDate TEXT,
        FOREIGN KEY(LoanMemberId) REFERENCES LoanMember(Id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS CollectionType (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        TypeName TEXT NOT NULL UNIQUE,
        Status INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS FundCollectionGroup (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        CollectionTypeId INTEGER NOT NULL,
        CollectionDate TEXT NOT NULL,
        FOREIGN KEY(CollectionTypeId) REFERENCES CollectionType(Id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS MemberCollection (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        CollectionGroupId INTEGER NOT NULL,
        UserId TEXT NOT NULL,
        Amount REAL NOT NULL CHECK(Amount >= 0),
        FOREIGN KEY(CollectionGroupId) REFERENCES FundCollectionGroup(Id) ON DELETE CASCADE,
        FOREIGN KEY(UserId) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS menus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        menuId TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        icon TEXT,
        path TEXT,
        parentId TEXT,
        menuOrder INTEGER DEFAULT 0,
        FOREIGN KEY(parentId) REFERENCES menus(menuId) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS role_menu_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        roleId INTEGER NOT NULL,
        menuId INTEGER NOT NULL,
        FOREIGN KEY(roleId) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY(menuId) REFERENCES menus(id) ON DELETE CASCADE,
        UNIQUE(roleId, menuId)
      );

      CREATE TABLE IF NOT EXISTS user_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        roleId INTEGER NOT NULL,
        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(roleId) REFERENCES roles(id) ON DELETE CASCADE,
        UNIQUE(userId, roleId)
      );

      CREATE TABLE IF NOT EXISTS company_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        companyName TEXT NOT NULL,
        companyLogo TEXT,
        supportEmail TEXT,
        supportPhone TEXT
      );
    `);

    // Clean up legacy tables
    try {
      await db.exec("DROP TABLE IF EXISTS UserDue;");
    } catch (e) {}
    try {
      await db.exec("DROP TABLE IF EXISTS payments;");
    } catch (e) {}
    try {
      await db.exec("DROP TABLE IF EXISTS LoanPaymentRequest;");
    } catch (e) {}

    // Perform migrations for existing databases to add columns if necessary
    const loanCols = await db.all("PRAGMA table_info(Loan)");
    if (!loanCols.some((col: any) => col.name === 'OutstandingPrincipal')) {
      await db.exec("ALTER TABLE Loan ADD COLUMN OutstandingPrincipal REAL NOT NULL DEFAULT 0");
      // Set default outstanding principal to the Loan Amount for active loans
      await db.exec("UPDATE Loan SET OutstandingPrincipal = Amount WHERE OutstandingPrincipal = 0");
    }

    const memberCols = await db.all("PRAGMA table_info(LoanMember)");
    if (!memberCols.some((col: any) => col.name === 'OutstandingPrincipal')) {
      await db.exec("ALTER TABLE LoanMember ADD COLUMN OutstandingPrincipal REAL NOT NULL DEFAULT 0");
      await db.exec("UPDATE LoanMember SET OutstandingPrincipal = LoanShareAmount WHERE OutstandingPrincipal = 0");
    }
    if (!memberCols.some((col: any) => col.name === 'Status')) {
      await db.exec("ALTER TABLE LoanMember ADD COLUMN Status TEXT NOT NULL DEFAULT 'Active'");
    }

    // If LoanPayment has legacy schema, drop and recreate it
    const paymentCols = await db.all("PRAGMA table_info(LoanPayment)");
    if (paymentCols.some((col: any) => col.name === 'AmountPaid' || col.name === 'RequestId' || col.name === 'Source')) {
      await db.exec("DROP TABLE IF EXISTS LoanPayment;");
      await db.exec(`
        CREATE TABLE LoanPayment (
          Id INTEGER PRIMARY KEY AUTOINCREMENT,
          LoanMemberId INTEGER NOT NULL,
          DueMonth INTEGER NOT NULL,
          PaymentDate TEXT NOT NULL,
          Amount REAL NOT NULL CHECK(Amount > 0),
          InterestPaid REAL NOT NULL DEFAULT 0,
          PrincipalPaid REAL NOT NULL DEFAULT 0,
          ApprovedBy TEXT,
          ApprovedDate TEXT,
          FOREIGN KEY(LoanMemberId) REFERENCES LoanMember(Id) ON DELETE CASCADE
        );
      `);
    }

    // Drop legacy loans table if it exists
    try {
      await db.exec("DROP TABLE IF EXISTS loans;");
    } catch (e) {
      // Ignored
    }
  }
  return db;
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}
