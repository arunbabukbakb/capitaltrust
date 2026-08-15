import { getDatabase } from '../database';

export interface OrganizationType {
  id: number;
  typeName: string;
  code: string;
  description?: string;
  status: 'Active' | 'Inactive';
  orderNumber: number;
  createdAt?: string;
  updatedAt?: string;
  tenantCount?: number;
}

export const OrganizationTypeModel = {
  async findAll(): Promise<OrganizationType[]> {
    const db = getDatabase();
    const sql = `
      SELECT ot.*, COUNT(t.id) as tenantCount
      FROM organization_types ot
      LEFT JOIN tenants t ON t.organizationTypeId = ot.id
      GROUP BY ot.id
      ORDER BY ot.orderNumber ASC, ot.id ASC
    `;
    return db.all<OrganizationType[]>(sql);
  },

  async findActive(): Promise<OrganizationType[]> {
    const db = getDatabase();
    const sql = `
      SELECT ot.*, COUNT(t.id) as tenantCount
      FROM organization_types ot
      LEFT JOIN tenants t ON t.organizationTypeId = ot.id
      WHERE ot.status = 'Active'
      GROUP BY ot.id
      ORDER BY ot.orderNumber ASC, ot.id ASC
    `;
    return db.all<OrganizationType[]>(sql);
  },

  async findById(id: number): Promise<OrganizationType | undefined> {
    const db = getDatabase();
    return db.get<OrganizationType>("SELECT * FROM organization_types WHERE id = ?", [id]);
  },

  async findByCode(code: string, excludeId?: number): Promise<OrganizationType | undefined> {
    const db = getDatabase();
    if (excludeId) {
      return db.get<OrganizationType>(
        "SELECT * FROM organization_types WHERE UPPER(code) = UPPER(?) AND id != ?",
        [code.trim(), excludeId]
      );
    }
    return db.get<OrganizationType>(
      "SELECT * FROM organization_types WHERE UPPER(code) = UPPER(?)",
      [code.trim()]
    );
  },

  async findByTypeName(typeName: string, excludeId?: number): Promise<OrganizationType | undefined> {
    const db = getDatabase();
    if (excludeId) {
      return db.get<OrganizationType>(
        "SELECT * FROM organization_types WHERE LOWER(typeName) = LOWER(?) AND id != ?",
        [typeName.trim(), excludeId]
      );
    }
    return db.get<OrganizationType>(
      "SELECT * FROM organization_types WHERE LOWER(typeName) = LOWER(?)",
      [typeName.trim()]
    );
  },

  async create(data: {
    typeName: string;
    code: string;
    description?: string;
    status?: 'Active' | 'Inactive';
    orderNumber?: number;
  }): Promise<{ lastID?: number | string }> {
    const db = getDatabase();
    const status = data.status || 'Active';
    const orderNum = typeof data.orderNumber === 'number' ? data.orderNumber : 0;
    const result = await db.run(
      "INSERT INTO organization_types (typeName, code, description, status, orderNumber) VALUES (?, ?, ?, ?, ?)",
      [data.typeName.trim(), data.code.trim().toUpperCase(), data.description ? data.description.trim() : null, status, orderNum]
    );
    return result;
  },

  async update(id: number, data: {
    typeName: string;
    code: string;
    description?: string;
    status?: 'Active' | 'Inactive';
    orderNumber?: number;
  }): Promise<void> {
    const db = getDatabase();
    const status = data.status || 'Active';
    const orderNum = typeof data.orderNumber === 'number' ? data.orderNumber : 0;
    await db.run(
      "UPDATE organization_types SET typeName = ?, code = ?, description = ?, status = ?, orderNumber = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      [data.typeName.trim(), data.code.trim().toUpperCase(), data.description ? data.description.trim() : null, status, orderNum, id]
    );
  },

  async toggleStatus(id: number, status: 'Active' | 'Inactive'): Promise<void> {
    const db = getDatabase();
    await db.run(
      "UPDATE organization_types SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      [status, id]
    );
  },

  async delete(id: number): Promise<void> {
    const db = getDatabase();
    await db.run("DELETE FROM organization_types WHERE id = ?", [id]);
  },

  async getTenantCount(id: number): Promise<number> {
    const db = getDatabase();
    const res = await db.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM tenants WHERE organizationTypeId = ?",
      [id]
    );
    return res?.count || 0;
  }
};
