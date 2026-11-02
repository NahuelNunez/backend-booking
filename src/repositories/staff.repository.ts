import type { PoolClient } from "pg";
import type { StaffRole } from "../types/auth.types.js";

export interface StaffRow {
  id: string;
  displayName: string;
  role: StaffRole;
}

export const insertStaff = async (
  client: PoolClient,
  data: { tenantId: string; userAccountId: string; displayName: string; role: StaffRole },
): Promise<StaffRow> => {
  const { rows } = await client.query<StaffRow>(
    `INSERT INTO staff (tenant_id, user_account_id, display_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, display_name AS "displayName", role`,
    [data.tenantId, data.userAccountId, data.displayName, data.role],
  );
  return rows[0]!;
};

export const assignStaffToLocation = async (
  client: PoolClient,
  data: { tenantId: string; staffId: string; locationId: string },
): Promise<void> => {
  await client.query(
    `INSERT INTO staff_location (tenant_id, staff_id, location_id) VALUES ($1, $2, $3)`,
    [data.tenantId, data.staffId, data.locationId],
  );
};
