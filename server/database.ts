import mysql from 'mysql2/promise';

export interface Database {
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  all<T = any[]>(sql: string, params?: any[]): Promise<T>;
  run(sql: string, params?: any[]): Promise<{ lastID?: number | string; changes?: number }>;
  exec(sql: string): Promise<void>;
}

class MySQLPromiseDatabase implements Database {
  private pool: mysql.Pool;
  private txConn: mysql.PoolConnection | null = null;

  constructor(pool: mysql.Pool) {
    this.pool = pool;
  }

  private getExecutor(): mysql.Pool | mysql.PoolConnection {
    return this.txConn || this.pool;
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const cleanSql = this.translateSql(sql);
    const executor = this.getExecutor();
    const [rows] = await executor.query(cleanSql, params);
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0] as T;
    }
    return undefined;
  }

  async all<T = any[]>(sql: string, params: any[] = []): Promise<T> {
    const cleanSql = this.translateSql(sql);
    const executor = this.getExecutor();
    const [rows] = await executor.query(cleanSql, params);
    return rows as unknown as T;
  }

  async run(sql: string, params: any[] = []): Promise<{ lastID?: number | string; changes?: number }> {
    const cleanSql = this.translateSql(sql);
    
    if (cleanSql.includes('START TRANSACTION') || cleanSql.includes('BEGIN')) {
      if (!this.txConn) {
        this.txConn = await this.pool.getConnection();
      }
      await this.txConn.query(cleanSql, params);
      return {};
    }

    const executor = this.getExecutor();
    const [result] = await executor.query(cleanSql, params);

    if (cleanSql.includes('COMMIT') || cleanSql.includes('ROLLBACK')) {
      if (this.txConn) {
        this.txConn.release();
        this.txConn = null;
      }
    }

    const resHeader = result as mysql.ResultSetHeader;
    return {
      lastID: resHeader ? resHeader.insertId : undefined,
      changes: resHeader ? resHeader.affectedRows : undefined
    };
  }

  async exec(sql: string): Promise<void> {
    const cleanSql = this.translateSql(sql);
    
    if (cleanSql.includes('START TRANSACTION') || cleanSql.includes('BEGIN')) {
      if (!this.txConn) {
        this.txConn = await this.pool.getConnection();
      }
      await this.txConn.query(cleanSql);
      return;
    }

    const executor = this.getExecutor();
    await executor.query(cleanSql);

    if (cleanSql.includes('COMMIT') || cleanSql.includes('ROLLBACK')) {
      if (this.txConn) {
        this.txConn.release();
        this.txConn = null;
      }
    }
  }

  private translateSql(sql: string): string {
    let clean = sql.replace(/BEGIN TRANSACTION/gi, 'START TRANSACTION');
    clean = clean.replace(/INSERT OR IGNORE/gi, 'INSERT IGNORE');
    return clean;
  }
}

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  if (!db) {
    const host = process.env.MYSQL_HOST || '127.0.0.1';
    const user = process.env.MYSQL_USER || 'root';
    const password = process.env.MYSQL_PASSWORD || '';
    const dbName = process.env.MYSQL_DATABASE || 'capitaltrust';
    const port = Number(process.env.MYSQL_PORT) || 3306;

    console.log(`Connecting to MySQL server at ${host}:${port} as user ${user}...`);

    // 1. First connect without a database specified to ensure the database exists
    const initConnection = await mysql.createConnection({
      host,
      user,
      password,
      port
    });
    await initConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await initConnection.end();

    // 2. Create the pool with the database selected and multipleStatements enabled
    const pool = mysql.createPool({
      host,
      user,
      password,
      database: dbName,
      port,
      multipleStatements: true,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    db = new MySQLPromiseDatabase(pool);

    const checkColumnExists = async (tableName: string, columnName: string): Promise<boolean> => {
      const res = await db!.get(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ? AND TABLE_SCHEMA = DATABASE()",
        [tableName, columnName]
      );
      return !!res;
    };

    // Temporarily disable foreign key checks to make table creation order-independent
    await db.exec("SET FOREIGN_KEY_CHECKS = 0;");

    // Clean up legacy MemberCollection schema if it exists
    try {
      const hasCollectionTypeId = await checkColumnExists('MemberCollection', 'CollectionTypeId');
      if (hasCollectionTypeId) {
        await db.exec("DROP TABLE IF EXISTS MemberCollection;");
      }
    } catch (e) {
      // Ignored
    }

    // Drop old single-column unique constraints and set default tenantId to 'default'
    try {
      const hasOldUsername = await db!.get(`
        SELECT COUNT(*) as count 
        FROM information_schema.statistics 
        WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'username'
      `);
      if (hasOldUsername && hasOldUsername.count > 0) {
        await db!.exec("ALTER TABLE users DROP INDEX username;");
      }

      const hasOldEmail = await db!.get(`
        SELECT COUNT(*) as count 
        FROM information_schema.statistics 
        WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'email'
      `);
      if (hasOldEmail && hasOldEmail.count > 0) {
        await db!.exec("ALTER TABLE users DROP INDEX email;");
      }

      // Update null/empty tenantIds to 'default'
      await db!.exec("UPDATE users SET tenantId = 'default' WHERE tenantId IS NULL OR tenantId = '';");
    } catch (e) {
      // Ignored if table or index does not exist yet
    }

    // Create tables if they do not exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        fullName VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        username VARCHAR(255),
        role VARCHAR(255) NOT NULL,
        password VARCHAR(255),
        status INT NOT NULL DEFAULT 0,
        phoneNumber VARCHAR(255),
        roleId INT,
        profileImage VARCHAR(255),
        tenantId VARCHAR(255) NOT NULL,
        FOREIGN KEY(roleId) REFERENCES roles(id),
        UNIQUE(tenantId, username),
        UNIQUE(tenantId, email)
      );

      CREATE TABLE IF NOT EXISTS contributions (
        id VARCHAR(255) PRIMARY KEY,
        date VARCHAR(255) NOT NULL,
        userName VARCHAR(255) NOT NULL,
        amount DOUBLE NOT NULL,
        method VARCHAR(255) NOT NULL,
        status VARCHAR(255) NOT NULL,
        reinvestmentEnabled INT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        roleName VARCHAR(255) NOT NULL UNIQUE,
        roleType VARCHAR(255) NOT NULL CHECK(roleType IN ('admin', 'manager', 'user'))
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expiresAt DATETIME NOT NULL,
        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS Loan (
        Id VARCHAR(255) PRIMARY KEY,
        LoanNo VARCHAR(255) NOT NULL UNIQUE,
        LoanType VARCHAR(255) NOT NULL CHECK(LoanType IN ('Single', 'Group')),
        Amount DOUBLE NOT NULL CHECK(Amount > 0),
        OutstandingPrincipal DOUBLE NOT NULL DEFAULT 0,
        TenureMonths INT NOT NULL CHECK(TenureMonths > 0),
        StartDate VARCHAR(255) NOT NULL,
        EndDate VARCHAR(255) NOT NULL,
        InterestMode VARCHAR(255) NOT NULL CHECK(InterestMode IN ('Fixed', 'Variable')),
        InterestRate DOUBLE,
        Status VARCHAR(255) NOT NULL CHECK(Status IN ('Pending', 'Active', 'Closed', 'Cancelled')),
        CreatedBy VARCHAR(255),
        CreatedDate VARCHAR(255) NOT NULL,
        FOREIGN KEY(CreatedBy) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS LoanMember (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        LoanId VARCHAR(255) NOT NULL,
        UserId VARCHAR(255) NOT NULL,
        LoanShareAmount DOUBLE NOT NULL CHECK(LoanShareAmount > 0),
        OutstandingPrincipal DOUBLE NOT NULL DEFAULT 0,
        CreatedDate VARCHAR(255) NOT NULL,
        Status VARCHAR(255) NOT NULL DEFAULT 'Active' CHECK(Status IN ('Active', 'Closed', 'Cancelled')),
        FOREIGN KEY(LoanId) REFERENCES Loan(Id) ON DELETE CASCADE,
        FOREIGN KEY(UserId) REFERENCES users(id),
        UNIQUE(LoanId, UserId)
      );

      CREATE TABLE IF NOT EXISTS LoanInterestSlab (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        LoanId VARCHAR(255) NOT NULL,
        FromAmount DOUBLE NOT NULL,
        ToAmount DOUBLE NOT NULL,
        InterestRate DOUBLE NOT NULL,
        FOREIGN KEY(LoanId) REFERENCES Loan(Id) ON DELETE CASCADE,
        CHECK (FromAmount >= 0),
        CHECK (ToAmount > FromAmount),
        CHECK (InterestRate >= 0)
      );

      CREATE TABLE IF NOT EXISTS LoanDue (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        LoanMemberId INT NOT NULL,
        DueMonth INT NOT NULL,
        OpeningPrincipal DOUBLE NOT NULL,
        PrincipalDue DOUBLE NOT NULL,
        InterestDue DOUBLE NOT NULL,
        CarryForwardInterest DOUBLE NOT NULL,
        TotalDue DOUBLE NOT NULL,
        PaidAmount DOUBLE NOT NULL DEFAULT 0,
        InterestPaid DOUBLE NOT NULL DEFAULT 0,
        PrincipalPaid DOUBLE NOT NULL DEFAULT 0,
        ClosingPrincipal DOUBLE NOT NULL,
        Status VARCHAR(255) NOT NULL CHECK(Status IN ('Pending', 'Partial', 'Paid')),
        FOREIGN KEY(LoanMemberId) REFERENCES LoanMember(Id) ON DELETE CASCADE,
        UNIQUE(LoanMemberId, DueMonth)
      );

      CREATE TABLE IF NOT EXISTS LoanPayment (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        LoanMemberId INT NOT NULL,
        DueMonth INT NOT NULL,
        PaymentDate VARCHAR(255) NOT NULL,
        Amount DOUBLE NOT NULL CHECK(Amount > 0),
        InterestPaid DOUBLE NOT NULL DEFAULT 0,
        PrincipalPaid DOUBLE NOT NULL DEFAULT 0,
        ApprovedBy VARCHAR(255),
        ApprovedDate VARCHAR(255),
        FOREIGN KEY(LoanMemberId) REFERENCES LoanMember(Id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS CollectionType (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        TypeName VARCHAR(255) NOT NULL,
        Status INT NOT NULL DEFAULT 1,
        tenantId VARCHAR(255) NOT NULL,
        UNIQUE(tenantId, TypeName)
      );

      CREATE TABLE IF NOT EXISTS FundCollectionGroup (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        CollectionTypeId INT NOT NULL,
        CollectionDate VARCHAR(255) NOT NULL,
        tenantId VARCHAR(255) NOT NULL,
        FOREIGN KEY(CollectionTypeId) REFERENCES CollectionType(Id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS MemberCollection (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        CollectionGroupId INT NOT NULL,
        UserId VARCHAR(255) NOT NULL,
        Amount DOUBLE NOT NULL CHECK(Amount >= 0),
        FOREIGN KEY(CollectionGroupId) REFERENCES FundCollectionGroup(Id) ON DELETE CASCADE,
        FOREIGN KEY(UserId) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS menus (
        id INT AUTO_INCREMENT PRIMARY KEY,
        menuId VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(255),
        path VARCHAR(255),
        parentId VARCHAR(255),
        menuOrder INT DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS role_menu_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        roleId INT NOT NULL,
        menuId INT NOT NULL,
        FOREIGN KEY(roleId) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY(menuId) REFERENCES menus(id) ON DELETE CASCADE,
        UNIQUE(roleId, menuId)
      );

      CREATE TABLE IF NOT EXISTS user_roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        roleId INT NOT NULL,
        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(roleId) REFERENCES roles(id) ON DELETE CASCADE,
        UNIQUE(userId, roleId)
      );

      CREATE TABLE IF NOT EXISTS company_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        companyName VARCHAR(255) NOT NULL,
        companyLogo VARCHAR(255),
        supportEmail VARCHAR(255),
        supportPhone VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS tenants (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subdomain VARCHAR(255) UNIQUE NOT NULL,
        adminEmail VARCHAR(255) NOT NULL,
        createdDate VARCHAR(255) NOT NULL
      );
    `);

    // Clean up legacy tables if needed
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
    const hasOutstanding = await checkColumnExists('Loan', 'OutstandingPrincipal');
    if (!hasOutstanding) {
      await db.exec("ALTER TABLE Loan ADD COLUMN OutstandingPrincipal DOUBLE NOT NULL DEFAULT 0");
      await db.exec("UPDATE Loan SET OutstandingPrincipal = Amount WHERE OutstandingPrincipal = 0");
    }

    const hasOutstandingMember = await checkColumnExists('LoanMember', 'OutstandingPrincipal');
    if (!hasOutstandingMember) {
      await db.exec("ALTER TABLE LoanMember ADD COLUMN OutstandingPrincipal DOUBLE NOT NULL DEFAULT 0");
      await db.exec("UPDATE LoanMember SET OutstandingPrincipal = LoanShareAmount WHERE OutstandingPrincipal = 0");
    }
    const hasStatusMember = await checkColumnExists('LoanMember', 'Status');
    if (!hasStatusMember) {
      await db.exec("ALTER TABLE LoanMember ADD COLUMN Status VARCHAR(255) NOT NULL DEFAULT 'Active'");
    }

    const hasProfileImage = await checkColumnExists('users', 'profileImage');
    if (!hasProfileImage) {
      await db.exec("ALTER TABLE users ADD COLUMN profileImage VARCHAR(255)");
    }
    const hasTenantId = await checkColumnExists('users', 'tenantId');
    if (!hasTenantId) {
      await db.exec("ALTER TABLE users ADD COLUMN tenantId VARCHAR(255) NOT NULL DEFAULT 'default'");
    }

    try {
      const hasNewUsername = await db.get(`
        SELECT COUNT(*) as count 
        FROM information_schema.statistics 
        WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'uq_tenant_username'
      `);
      if (!hasNewUsername || hasNewUsername.count === 0) {
        await db.exec("ALTER TABLE users ADD UNIQUE INDEX uq_tenant_username (tenantId, username);");
      }

      const hasNewEmail = await db.get(`
        SELECT COUNT(*) as count 
        FROM information_schema.statistics 
        WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'uq_tenant_email'
      `);
      if (!hasNewEmail || hasNewEmail.count === 0) {
        await db.exec("ALTER TABLE users ADD UNIQUE INDEX uq_tenant_email (tenantId, email);");
      }
    } catch (e) {
      // Ignored
    }

    // Migrate CollectionType and FundCollectionGroup for multi-tenant support
    try {
      const hasTenantIdColType = await checkColumnExists('CollectionType', 'tenantId');
      if (!hasTenantIdColType) {
        await db.exec("ALTER TABLE CollectionType ADD COLUMN tenantId VARCHAR(255) NOT NULL DEFAULT 'default'");
      }
      
      const hasTenantIdColGroup = await checkColumnExists('FundCollectionGroup', 'tenantId');
      if (!hasTenantIdColGroup) {
        await db.exec("ALTER TABLE FundCollectionGroup ADD COLUMN tenantId VARCHAR(255) NOT NULL DEFAULT 'default'");
      }

      // Check if global TypeName index is unique and drop it
      const hasOldTypeName = await db!.get(`
        SELECT COUNT(*) as count 
        FROM information_schema.statistics 
        WHERE table_schema = DATABASE() AND table_name = 'CollectionType' AND index_name = 'TypeName'
      `);
      if (hasOldTypeName && hasOldTypeName.count > 0) {
        await db!.exec("ALTER TABLE CollectionType DROP INDEX TypeName;");
      }

      // Add compound index for tenantId + TypeName
      const hasNewTypeNameIndex = await db!.get(`
        SELECT COUNT(*) as count 
        FROM information_schema.statistics 
        WHERE table_schema = DATABASE() AND table_name = 'CollectionType' AND index_name = 'uq_tenant_typename'
      `);
      if (!hasNewTypeNameIndex || hasNewTypeNameIndex.count === 0) {
        await db!.exec("ALTER TABLE CollectionType ADD UNIQUE INDEX uq_tenant_typename (tenantId, TypeName);");
      }
    } catch (e) {
      // Ignored
    }

    // If LoanPayment has legacy schema, drop and recreate it
    try {
      const hasAmountPaid = await checkColumnExists('LoanPayment', 'AmountPaid');
      const hasRequestId = await checkColumnExists('LoanPayment', 'RequestId');
      if (hasAmountPaid || hasRequestId) {
        await db.exec("DROP TABLE IF EXISTS LoanPayment;");
        await db.exec(`
          CREATE TABLE LoanPayment (
            Id INT AUTO_INCREMENT PRIMARY KEY,
            LoanMemberId INT NOT NULL,
            DueMonth INT NOT NULL,
            PaymentDate VARCHAR(255) NOT NULL,
            Amount DOUBLE NOT NULL CHECK(Amount > 0),
            InterestPaid DOUBLE NOT NULL DEFAULT 0,
            PrincipalPaid DOUBLE NOT NULL DEFAULT 0,
            ApprovedBy VARCHAR(255),
            ApprovedDate VARCHAR(255),
            FOREIGN KEY(LoanMemberId) REFERENCES LoanMember(Id) ON DELETE CASCADE
          );
        `);
      }
    } catch (e) {
      // Ignored
    }

    // Drop legacy loans table if it exists
    try {
      await db.exec("DROP TABLE IF EXISTS loans;");
    } catch (e) {
      // Ignored
    }

    // Re-enable foreign key checks now that creation is complete
    await db.exec("SET FOREIGN_KEY_CHECKS = 1;");
  }
  return db;
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}
