import { randomBytes } from "node:crypto";

const publicShareTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function createPublicShareToken() {
  return randomBytes(32).toString("base64url");
}

export function isPublicShareToken(value: string) {
  return publicShareTokenPattern.test(value);
}
