import type { PoolClient } from "pg";

export interface UserAccountRow {
  id: string;
  email: string;
}

export const insertUserAccount = async (
  client: PoolClient,
  data: { email: string; passwordHash: string },
): Promise<UserAccountRow> => {
  const { rows } = await client.query<UserAccountRow>(
    `INSERT INTO user_account (email, password_hash) VALUES ($1, $2) RETURNING id, email`,
    [data.email, data.passwordHash],
  );
  return rows[0]!;
};
