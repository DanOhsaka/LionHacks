/**
 * Remove Next build dirs without going through Next's recursive-delete (readlink can
 * throw EINVAL on a broken OneDrive-backed `.next`).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const opts = { recursive: true, force: true };

for (const name of [".next", ".next-local"]) {
  const p = path.join(root, name);
  try {
    if (fs.existsSync(p)) {
      fs.rmSync(p, opts);
      console.log("removed", name);
    }
  } catch (e) {
    console.warn(`Could not remove ${p}:`, (e && e.message) || e);
    process.exitCode = 1;
  }
}
