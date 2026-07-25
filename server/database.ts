import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

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

    // Check if tenants table id is VARCHAR (legacy schema) and requires upgrade
    let schemaUpgradeNeeded = false;
    try {
      const colInfo = await db.get(`
        SELECT DATA_TYPE 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() AND table_name = 'tenants' AND column_name = 'id'
      `);
      if (colInfo && colInfo.DATA_TYPE === 'varchar') {
        schemaUpgradeNeeded = true;
      }
    } catch (e) {
      // Table doesn't exist yet
    }

    try {
      const rolesTableExists = await db.get(`
        SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_NAME = 'roles' AND TABLE_SCHEMA = DATABASE()
      `);
      if (rolesTableExists) {
        const hasTenantIdInRoles = await checkColumnExists('roles', 'tenantId');
        if (!hasTenantIdInRoles) {
          schemaUpgradeNeeded = true;
        }
      }
    } catch (e) {
      // Ignored
    }

    if (schemaUpgradeNeeded) {
      console.log("Upgrading database schema to support auto-increment integer tenant IDs and tenant-specific roles...");
      await db.exec("SET FOREIGN_KEY_CHECKS = 0;");
      const tables = [
        'user_push_tokens', 'user_roles', 'role_menu_permissions', 'MemberCollection',
        'FundCollectionGroup', 'CollectionType', 'LoanPayment', 'LoanDue',
        'LoanInterestSlab', 'LoanMember', 'Loan', 'password_reset_tokens', 'users', 'roles', 'tenants'
      ];
      for (const table of tables) {
        await db.exec(`DROP TABLE IF EXISTS ${table};`);
      }
      await db.exec("SET FOREIGN_KEY_CHECKS = 1;");
    }

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
    } catch (e) {
      // Ignored if table or index does not exist yet
    }

    // Create tables if they do not exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tenants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subdomain VARCHAR(255) UNIQUE NOT NULL,
        adminEmail VARCHAR(255) NOT NULL,
        createdDate VARCHAR(255) NOT NULL,
        isActive TINYINT NOT NULL DEFAULT 1,
        paymentStatus VARCHAR(255) NOT NULL DEFAULT 'Pending',
        paymentDate VARCHAR(255) DEFAULT NULL,
        razorpayOrderId VARCHAR(255) DEFAULT NULL,
        razorpayPaymentId VARCHAR(255) DEFAULT NULL,
        razorpaySignature VARCHAR(255) DEFAULT NULL,
        address TEXT DEFAULT NULL,
        phone VARCHAR(255) DEFAULT NULL,
        invoiceno VARCHAR(255) DEFAULT NULL,
        amount DOUBLE DEFAULT 0,
        gst DOUBLE DEFAULT 0,
        gstamount DOUBLE DEFAULT 0,
        logo LONGTEXT DEFAULT NULL,
        gstnumber VARCHAR(255) DEFAULT NULL
      );

      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenantId INT NOT NULL,
        roleName VARCHAR(255) NOT NULL,
        roleType VARCHAR(255) NOT NULL CHECK(roleType IN ('admin', 'manager', 'user')),
        FOREIGN KEY(tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        UNIQUE(tenantId, roleName)
      );

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
        tenantId INT NOT NULL,
        refreshToken VARCHAR(500) DEFAULT NULL,
        FOREIGN KEY(roleId) REFERENCES roles(id),
        FOREIGN KEY(tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
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
        IsCompound INT DEFAULT 0,
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
        Frequency VARCHAR(50) NOT NULL DEFAULT 'monthly',
        Amount DOUBLE NULL,
        tenantId INT NOT NULL,
        FOREIGN KEY(tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        UNIQUE(tenantId, TypeName)
      );

      CREATE TABLE IF NOT EXISTS FundCollectionGroup (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        CollectionTypeId INT NOT NULL,
        CollectionDate VARCHAR(255) NOT NULL,
        tenantId INT NOT NULL,
        FOREIGN KEY(CollectionTypeId) REFERENCES CollectionType(Id) ON DELETE RESTRICT,
        FOREIGN KEY(tenantId) REFERENCES tenants(id) ON DELETE CASCADE
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
        menuOrder INT DEFAULT 0,
        status TINYINT NOT NULL DEFAULT 1
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

      CREATE TABLE IF NOT EXISTS user_push_tokens (
        userId VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(userId, token),
        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS company_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        companyName VARCHAR(255) NOT NULL,
        companyLogo LONGTEXT,
        supportEmail VARCHAR(255),
        supportPhone VARCHAR(255),
        address TEXT DEFAULT NULL,
        gstno VARCHAR(255) DEFAULT NULL,
        ismaintanance TINYINT(1) DEFAULT 0,
        message TEXT DEFAULT NULL,
        resumetime VARCHAR(255) DEFAULT NULL
      );

      CREATE TABLE IF NOT EXISTS superadmins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        fullName VARCHAR(255) NOT NULL,
        createdDate VARCHAR(255) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS amcdetails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenantId INT NOT NULL,
        amcCharge DOUBLE NOT NULL,
        dueDate DATE NOT NULL,
        paidDate DATETIME DEFAULT NULL,
        paidStatus VARCHAR(255) NOT NULL DEFAULT 'Pending',
        invoiceno VARCHAR(255) DEFAULT NULL,
        gst DOUBLE DEFAULT 0,
        gstamount DOUBLE DEFAULT 0,
        FOREIGN KEY(tenantId) REFERENCES tenants(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS pricedetails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        price DOUBLE NOT NULL DEFAULT 0,
        tax DOUBLE NOT NULL DEFAULT 0,
        amc DOUBLE NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS expenses (
        Id VARCHAR(255) PRIMARY KEY,
        TenantId INT NOT NULL,
        ExpenseDate VARCHAR(255) NOT NULL,
        Amount DOUBLE NOT NULL CHECK(Amount > 0),
        PaymentMode VARCHAR(255) NOT NULL CHECK(PaymentMode IN ('Cash', 'Bank', 'UPI')),
        ReferenceNo VARCHAR(255) NULL,
        Description TEXT NOT NULL,
        ExpenseBy VARCHAR(255) DEFAULT NULL,
        Status VARCHAR(255) NOT NULL CHECK(Status IN ('Draft', 'Approved', 'Cancelled')),
        CreatedBy VARCHAR(255) NOT NULL,
        CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(TenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY(CreatedBy) REFERENCES users(id),
        FOREIGN KEY(ExpenseBy) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        Id VARCHAR(255) PRIMARY KEY,
        TenantId INT NOT NULL,
        TransactionNo VARCHAR(255) NOT NULL,
        TransactionDate VARCHAR(255) NOT NULL,
        TransactionType VARCHAR(255) NOT NULL CHECK(TransactionType IN ('Collection', 'LoanIssue', 'LoanRepayment', 'Expense', 'OpeningBalance', 'Adjustment')),
        Amount DOUBLE NOT NULL CHECK(Amount >= 0),
        ReferenceType VARCHAR(255) NOT NULL,
        ReferenceId VARCHAR(255) NOT NULL,
        Narration TEXT NOT NULL,
        Status VARCHAR(255) NOT NULL DEFAULT 'Completed',
        CreatedBy VARCHAR(255) NOT NULL,
        CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UpdatedBy VARCHAR(255) NULL,
        UpdatedAt DATETIME NULL,
        FOREIGN KEY(TenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY(CreatedBy) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS smtp_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        server VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        port INT NOT NULL DEFAULT 587,
        encryption VARCHAR(50) NOT NULL DEFAULT 'STARTTLS',
        password VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Inactive'
      );
    `);

    // Ensure amcdetails.dueDate and amcdetails.paidDate are DATETIME
    try {
      const amcCol = await db.get(`
        SELECT DATA_TYPE 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() AND table_name = 'amcdetails' AND column_name = 'dueDate'
      `);
      if (amcCol && amcCol.DATA_TYPE !== 'datetime') {
        console.log("Upgrading amcdetails.dueDate and amcdetails.paidDate columns to DATETIME...");
        await db.exec("ALTER TABLE amcdetails MODIFY COLUMN dueDate DATETIME NOT NULL");
        await db.exec("ALTER TABLE amcdetails MODIFY COLUMN paidDate DATETIME DEFAULT NULL");
        console.log("amcdetails date columns successfully upgraded to DATETIME.");
      }
    } catch (err) {
      console.error("Failed to migrate amcdetails date columns to DATETIME:", err);
    }

    // Seed default tenant if not exists and ensure status is active (1) and paid
    try {
      await db.run(
        "UPDATE tenants SET subdomain = 'demo', name = 'CapitalTrust Demo', isActive = 1, paymentStatus = 'Paid' WHERE id = 1 AND subdomain = 'default'"
      );
      const defaultTenant = await db.get("SELECT id FROM tenants WHERE subdomain = 'demo'");
      if (!defaultTenant) {
        await db.run(
          "INSERT INTO tenants (id, name, subdomain, adminEmail, createdDate, isActive, paymentStatus, paymentDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [1, 'CapitalTrust Demo', 'demo', 'admin@capitaltrust.com', new Date().toISOString(), 1, 'Paid', new Date().toISOString()]
        );
        console.log('Seeded demo tenant with ID 1.');
      }
      if (defaultTenant) {
        await db.run(
          "UPDATE tenants SET isActive = 1, paymentStatus = 'Paid' WHERE subdomain = 'demo' OR id = 1"
        );
      }

      // Seed default SMTP settings if empty
      const smtpCount = await db.get("SELECT COUNT(*) as cnt FROM smtp_settings");
      if (smtpCount && (smtpCount.cnt === 0 || smtpCount.cnt === '0')) {
        await db.run(
          "INSERT INTO smtp_settings (server, username, port, encryption, password, status) VALUES (?, ?, ?, ?, ?, ?)",
          ['trustcaps.in', 'contact@trustcaps.in', 587, 'STARTTLS', 'samplepassword123', 'Active']
        );
      }
    } catch (err) {
      console.error('Error seeding default tenant:', err);
    }

    // Seed default price details if empty
    try {
      const priceCount = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM pricedetails");
      if (priceCount && priceCount.count === 0) {
        await db.run(
          "INSERT INTO pricedetails (price, tax, amc) VALUES (?, ?, ?)",
          [0, 0, 0]
        );
        console.log('Seeded default pricing details.');
      }
    } catch (err) {
      console.error('Error seeding default pricing details:', err);
    }

    // Seed default company settings if empty
    try {
      const companyCount = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM company_settings");
      if (!companyCount || companyCount.count === 0) {
        await db.run(
          "INSERT INTO company_settings (companyName, companyLogo, supportEmail, supportPhone, address, gstno) VALUES (?, ?, ?, ?, ?, ?)",
          ['CapitalTrust', '', 'contact@trustcaps.in', '916238920219', '', '']
        );
        console.log('Seeded default company settings.');
      } else {
        const currentSetting = await db.get("SELECT id, supportPhone FROM company_settings LIMIT 1");
        if (currentSetting && !currentSetting.supportPhone) {
          await db.run("UPDATE company_settings SET supportPhone = '916238920219' WHERE id = ?", [currentSetting.id]);
        }
      }
    } catch (err) {
      console.error('Error seeding default company settings:', err);
    }

    // Seed default superadmin if not exists
    try {
      const superAdminCount = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM superadmins");
      if (superAdminCount && superAdminCount.count === 0) {
        const defaultPasswordHash = await bcrypt.hash('superpassword', 10);
        await db.run(
          "INSERT INTO superadmins (username, password, email, fullName, createdDate) VALUES (?, ?, ?, ?, ?)",
          [
            'superadmin',
            defaultPasswordHash,
            'superadmin@capitaltrust.com',
            'Super Administrator',
            new Date().toISOString()
          ]
        );
        console.log('Seeded default superadmin user.');
      }
    } catch (err) {
      console.error('Error seeding default superadmin user:', err);
    }

    // Clean up legacy tables if needed
    try {
      await db.exec("DROP TABLE IF EXISTS UserDue;");
    } catch (e) { }
    try {
      await db.exec("DROP TABLE IF EXISTS payments;");
    } catch (e) { }
    try {
      await db.exec("DROP TABLE IF EXISTS LoanPaymentRequest;");
    } catch (e) { }

    // Perform migrations for existing databases to add columns if necessary
    const hasIsActive = await checkColumnExists('tenants', 'isActive');
    if (!hasIsActive) {
      await db.exec("ALTER TABLE tenants ADD COLUMN isActive TINYINT NOT NULL DEFAULT 1");
    }

    const hasLoanIsCompound = await checkColumnExists('Loan', 'IsCompound');
    if (!hasLoanIsCompound) {
      await db.exec("ALTER TABLE Loan ADD COLUMN IsCompound INT NOT NULL DEFAULT 0");
    }

    const hasPaymentStatus = await checkColumnExists('tenants', 'paymentStatus');
    if (!hasPaymentStatus) {
      await db.exec("ALTER TABLE tenants ADD COLUMN paymentStatus VARCHAR(255) NOT NULL DEFAULT 'Pending'");
    }

    const hasPaymentDate = await checkColumnExists('tenants', 'paymentDate');
    if (!hasPaymentDate) {
      await db.exec("ALTER TABLE tenants ADD COLUMN paymentDate VARCHAR(255) DEFAULT NULL");
    }

    const hasRzpOrderId = await checkColumnExists('tenants', 'razorpayOrderId');
    if (!hasRzpOrderId) {
      await db.exec("ALTER TABLE tenants ADD COLUMN razorpayOrderId VARCHAR(255) DEFAULT NULL");
    }

    const hasRzpPaymentId = await checkColumnExists('tenants', 'razorpayPaymentId');
    if (!hasRzpPaymentId) {
      await db.exec("ALTER TABLE tenants ADD COLUMN razorpayPaymentId VARCHAR(255) DEFAULT NULL");
    }

    const hasRzpSignature = await checkColumnExists('tenants', 'razorpaySignature');
    if (!hasRzpSignature) {
      await db.exec("ALTER TABLE tenants ADD COLUMN razorpaySignature VARCHAR(255) DEFAULT NULL");
    }

    const hasTenantAddress = await checkColumnExists('tenants', 'address');
    if (!hasTenantAddress) {
      await db.exec("ALTER TABLE tenants ADD COLUMN address TEXT DEFAULT NULL");
    }
    const hasTenantPhone = await checkColumnExists('tenants', 'phone');
    if (!hasTenantPhone) {
      await db.exec("ALTER TABLE tenants ADD COLUMN phone VARCHAR(255) DEFAULT NULL");
    }
    const hasTenantInvoiceNo = await checkColumnExists('tenants', 'invoiceno');
    if (!hasTenantInvoiceNo) {
      await db.exec("ALTER TABLE tenants ADD COLUMN invoiceno VARCHAR(255) DEFAULT NULL");
    }
    const hasTenantAmount = await checkColumnExists('tenants', 'amount');
    if (!hasTenantAmount) {
      await db.exec("ALTER TABLE tenants ADD COLUMN amount DOUBLE DEFAULT 0");
    }
    const hasTenantGst = await checkColumnExists('tenants', 'gst');
    if (!hasTenantGst) {
      await db.exec("ALTER TABLE tenants ADD COLUMN gst DOUBLE DEFAULT 0");
    }
    const hasTenantGstAmount = await checkColumnExists('tenants', 'gstamount');
    if (!hasTenantGstAmount) {
      await db.exec("ALTER TABLE tenants ADD COLUMN gstamount DOUBLE DEFAULT 0");
    }
    const hasTenantLogo = await checkColumnExists('tenants', 'logo');
    if (!hasTenantLogo) {
      await db.exec("ALTER TABLE tenants ADD COLUMN logo LONGTEXT DEFAULT NULL");
    }
    const hasTenantGstNumber = await checkColumnExists('tenants', 'gstnumber');
    if (!hasTenantGstNumber) {
      await db.exec("ALTER TABLE tenants ADD COLUMN gstnumber VARCHAR(255) DEFAULT NULL");
    }

    const hasAmcInvoiceNo = await checkColumnExists('amcdetails', 'invoiceno');
    if (!hasAmcInvoiceNo) {
      await db.exec("ALTER TABLE amcdetails ADD COLUMN invoiceno VARCHAR(255) DEFAULT NULL");
    }
    const hasAmcGst = await checkColumnExists('amcdetails', 'gst');
    if (!hasAmcGst) {
      await db.exec("ALTER TABLE amcdetails ADD COLUMN gst DOUBLE DEFAULT 0");
    }
    const hasAmcGstAmount = await checkColumnExists('amcdetails', 'gstamount');
    if (!hasAmcGstAmount) {
      await db.exec("ALTER TABLE amcdetails ADD COLUMN gstamount DOUBLE DEFAULT 0");
    }

    const hasCompanyAddress = await checkColumnExists('company_settings', 'address');
    if (!hasCompanyAddress) {
      await db.exec("ALTER TABLE company_settings ADD COLUMN address TEXT DEFAULT NULL");
    }
    const hasCompanyGstNo = await checkColumnExists('company_settings', 'gstno');
    if (!hasCompanyGstNo) {
      await db.exec("ALTER TABLE company_settings ADD COLUMN gstno VARCHAR(255) DEFAULT NULL");
    }
    const hasCompanyIsMaintanance = await checkColumnExists('company_settings', 'ismaintanance');
    if (!hasCompanyIsMaintanance) {
      await db.exec("ALTER TABLE company_settings ADD COLUMN ismaintanance TINYINT(1) DEFAULT 0");
    }
    const hasCompanyMessage = await checkColumnExists('company_settings', 'message');
    if (!hasCompanyMessage) {
      await db.exec("ALTER TABLE company_settings ADD COLUMN message TEXT DEFAULT NULL");
    }
    const hasCompanyResumetime = await checkColumnExists('company_settings', 'resumetime');
    if (!hasCompanyResumetime) {
      await db.exec("ALTER TABLE company_settings ADD COLUMN resumetime VARCHAR(255) DEFAULT NULL");
    }
    try {
      await db.exec("ALTER TABLE company_settings MODIFY COLUMN companyLogo LONGTEXT DEFAULT NULL");
    } catch (e) {
      // Ignored
    }

    const hasOutstanding = await checkColumnExists('Loan', 'OutstandingPrincipal');
    if (!hasOutstanding) {
      await db.exec("ALTER TABLE Loan ADD COLUMN OutstandingPrincipal DOUBLE NOT NULL DEFAULT 0");
      await db.exec("UPDATE Loan SET OutstandingPrincipal = Amount WHERE OutstandingPrincipal = 0");
    }

    const hasExpenseBy = await checkColumnExists('expenses', 'ExpenseBy');
    if (!hasExpenseBy) {
      await db.exec("ALTER TABLE expenses ADD COLUMN ExpenseBy VARCHAR(255) DEFAULT NULL");
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

    const hasRefreshToken = await checkColumnExists('users', 'refreshToken');
    if (!hasRefreshToken) {
      await db.exec("ALTER TABLE users ADD COLUMN refreshToken VARCHAR(500) DEFAULT NULL");
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

      const hasFrequencyCol = await checkColumnExists('CollectionType', 'Frequency');
      if (!hasFrequencyCol) {
        await db.exec("ALTER TABLE CollectionType ADD COLUMN Frequency VARCHAR(50) NOT NULL DEFAULT 'monthly'");
      }

      const hasAmountCol = await checkColumnExists('CollectionType', 'Amount');
      if (!hasAmountCol) {
        await db.exec("ALTER TABLE CollectionType ADD COLUMN Amount DOUBLE NULL");
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

    // Migrate menus to add status column if it does not exist
    try {
      const hasMenuStatus = await checkColumnExists('menus', 'status');
      if (!hasMenuStatus) {
        await db.exec("ALTER TABLE menus ADD COLUMN status TINYINT NOT NULL DEFAULT 1");
      }
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
