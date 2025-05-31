import { createHash } from "crypto";

export const verifyHashedSecret = (
  id: string,
  secret: string,
  hashedSecret: string
): boolean => {
  const hash = createHash("sha256")
    .update(`${id}:${secret}`)
    .digest("hex");
  return hash === hashedSecret;
}; 