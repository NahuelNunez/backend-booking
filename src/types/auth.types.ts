export type StaffRole = "owner" | "manager" | "provider";

export interface AccessTokenPayload {
  userId: string;
  tenantId: string;
  staffId: string;
  role: StaffRole;
}
