import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT = "nexus-os-v1"; // static salt — key is the secret

function deriveKey(secret: string): Buffer {
  if (secret.length < 32 || secret === "nexus-default-key-change-in-prod" || secret.includes("GENERATE_WITH_SETUP") || secret.startsWith("change_me")) {
    throw new Error("ENCRYPTION_KEY debe ser un secreto propio de al menos 32 caracteres");
  }
  return scryptSync(secret, SALT, 32);
}

export function encrypt(text: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(hex):tag(hex):data(hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(payload: string, secret: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Invalid encrypted payload");
  const key = deriveKey(secret);
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function encryptConfig(config: Record<string, string>, secret: string): string {
  return encrypt(JSON.stringify(config), secret);
}

export function decryptConfig(payload: string, secret: string): Record<string, string> {
  return JSON.parse(decrypt(payload, secret)) as Record<string, string>;
}

export function getEncryptionKey(): string {
  const secret = process.env.ENCRYPTION_KEY ?? "";
  deriveKey(secret);
  return secret;
}
