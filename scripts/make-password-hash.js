import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCb);
const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Usage: node scripts/make-password-hash.js 'a-long-unique-password' (minimum 12 characters)");
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
const hash = await scrypt(password, salt, 64);
console.log("scrypt:" + salt + ":" + hash.toString("hex"));
