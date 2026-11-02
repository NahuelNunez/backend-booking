import { hash, verify } from "@node-rs/argon2";

// @node-rs/argon2 defaults to Argon2id.
export const hashPassword = (password: string): Promise<string> => hash(password);

export const verifyPassword = (passwordHash: string, password: string): Promise<boolean> =>
  verify(passwordHash, password);
