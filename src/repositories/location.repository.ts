import type { PoolClient } from "pg";

export interface LocationRow {
  id: string;
  name: string;
  timezone: string;
  currencyCode: string;
}

export interface InsertLocationData {
  tenantId: string;
  name: string;
  timezone: string;
  currencyCode: string;
  addressLine1?: string | undefined;
  city?: string | undefined;
  countryCode?: string | undefined;
  phoneE164?: string | undefined;
}

export const insertLocation = async (
  client: PoolClient,
  data: InsertLocationData,
): Promise<LocationRow> => {
  const { rows } = await client.query<LocationRow>(
    `INSERT INTO location
       (tenant_id, name, timezone, currency_code, address_line1, city, country_code, phone_e164)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, name, timezone, currency_code AS "currencyCode"`,
    [
      data.tenantId,
      data.name,
      data.timezone,
      data.currencyCode,
      data.addressLine1 ?? null,
      data.city ?? null,
      data.countryCode ?? null,
      data.phoneE164 ?? null,
    ],
  );
  return rows[0]!;
};
