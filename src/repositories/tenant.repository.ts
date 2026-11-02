import type { PoolClient } from "pg";

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
}

export const insertTenant = async (
  client: PoolClient,
  data: { name: string; slug: string },
): Promise<TenantRow> => {
  const { rows } = await client.query<TenantRow>(
    `INSERT INTO tenant (name, slug) VALUES ($1, $2) RETURNING id, name, slug`,
    [data.name, data.slug],
  );
  return rows[0]!;
};
