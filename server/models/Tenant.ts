import { getDatabase } from '../database';

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  adminEmail: string;
  createdDate: string;
}

export const TenantModel = {
  async findById(id: string): Promise<Tenant | undefined> {
    const db = getDatabase();
    return db.get<Tenant>("SELECT * FROM tenants WHERE id = ?", [id]);
  },

  async findBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    const db = getDatabase();
    return db.get<Tenant>("SELECT * FROM tenants WHERE LOWER(subdomain) = ?", [subdomain.toLowerCase()]);
  },

  async create(tenant: Omit<Tenant, 'id' | 'createdDate'> & { id?: string; createdDate?: string }): Promise<{ lastID?: number | string }> {
    const db = getDatabase();
    const id = tenant.id || `T-${10001 + Math.floor(Math.random() * 90000)}`;
    const createdDate = tenant.createdDate || new Date().toISOString();
    
    return db.run(
      "INSERT INTO tenants (id, name, subdomain, adminEmail, createdDate) VALUES (?, ?, ?, ?, ?)",
      [id, tenant.name, tenant.subdomain.toLowerCase(), tenant.adminEmail.toLowerCase(), createdDate]
    );
  },

  async updateNameAndEmail(subdomain: string, name: string, adminEmail: string): Promise<void> {
    const db = getDatabase();
    await db.run(
      "UPDATE tenants SET name = ?, adminEmail = ? WHERE subdomain = ?",
      [name, adminEmail, subdomain.toLowerCase()]
    );
  }
};
