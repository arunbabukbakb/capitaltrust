import { getDatabase } from '../database';

export interface Tenant {
  id: number;
  name: string;
  subdomain: string;
  adminEmail: string;
  createdDate: string;
  isActive?: number;
  paymentStatus?: string;
  paymentDate?: string;
  address?: string;
  phone?: string;
  invoiceno?: string;
  amount?: number;
  gst?: number;
  gstamount?: number;
  logo?: string;
  gstnumber?: string;
  maxUserLimit?: number;
}

export const TenantModel = {
  async findById(id: number): Promise<Tenant | undefined> {
    const db = getDatabase();
    return db.get<Tenant>("SELECT * FROM tenants WHERE id = ?", [id]);
  },

  async findBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    const db = getDatabase();
    return db.get<Tenant>("SELECT * FROM tenants WHERE LOWER(subdomain) = ?", [subdomain.toLowerCase()]);
  },

  async create(tenant: Omit<Tenant, 'id' | 'createdDate'> & { createdDate?: string; address?: string; phone?: string; gstnumber?: string }): Promise<{ lastID?: number }> {
    const db = getDatabase();
    const createdDate = tenant.createdDate || new Date().toISOString();
    
    const result = await db.run(
      "INSERT INTO tenants (name, subdomain, adminEmail, createdDate, address, phone, gstnumber) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [tenant.name, tenant.subdomain.toLowerCase(), tenant.adminEmail.toLowerCase(), createdDate, tenant.address || '', tenant.phone || '', tenant.gstnumber || '']
    );
    return { lastID: result.lastID as number };
  },

  async updateNameAndEmail(subdomain: string, name: string, adminEmail: string): Promise<void> {
    const db = getDatabase();
    await db.run(
      "UPDATE tenants SET name = ?, adminEmail = ? WHERE subdomain = ?",
      [name, adminEmail, subdomain.toLowerCase()]
    );
  }
};
