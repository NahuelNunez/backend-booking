import { withTransaction } from "../config/database.js";
import { insertLocation } from "../repositories/location.repository.js";
import { assignStaffToLocation, insertStaff } from "../repositories/staff.repository.js";
import { insertTenant } from "../repositories/tenant.repository.js";
import { insertUserAccount } from "../repositories/userAccount.repository.js";
import { signAccessToken } from "../utils/jwt.js";
import { hashPassword } from "../utils/password.js";
import type { RegisterBusinessInput } from "../validators/business.validator.js";

export interface RegisterBusinessResult {
  token: string;
  user: { id: string; email: string };
  tenant: { id: string; name: string; slug: string };
  location: { id: string; name: string };
}

export const registerBusiness = async (
  input: RegisterBusinessInput,
): Promise<RegisterBusinessResult> => {
  // Hash outside the transaction so a slow hash doesn't hold a DB connection open.
  const passwordHash = await hashPassword(input.owner.password);

  const { user, tenant, location, staff } = await withTransaction(async (client) => {
    const tenant = await insertTenant(client, input.business);
    const user = await insertUserAccount(client, { email: input.owner.email, passwordHash });
    const location = await insertLocation(client, { tenantId: tenant.id, ...input.location });
    const staff = await insertStaff(client, {
      tenantId: tenant.id,
      userAccountId: user.id,
      displayName: input.owner.fullName,
      role: "owner",
    });

    // A staff_location row is what makes someone bookable at a branch.
    if (input.owner.takesAppointments) {
      await assignStaffToLocation(client, { staffId: staff.id, locationId: location.id });
    }

    return { user, tenant, location, staff };
  });

  const token = signAccessToken({
    userId: user.id,
    tenantId: tenant.id,
    staffId: staff.id,
    role: staff.role,
  });

  return {
    token,
    user: { id: user.id, email: user.email },
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    location: { id: location.id, name: location.name },
  };
};
