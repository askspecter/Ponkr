import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Tiny JSON-file persistence. Good for a single-node deployment (VPS/Docker).
 * Swap for Postgres/Redis when running multiple instances or serverless.
 */
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");

const cache = new Map<string, unknown>();
const timers = new Map<string, NodeJS.Timeout>();

function file(name: string) {
  return path.join(DATA_DIR, `${name}.json`);
}

export function load<T>(name: string, fallback: T): T {
  if (cache.has(name)) return cache.get(name) as T;
  let v = fallback;
  try {
    v = JSON.parse(fs.readFileSync(file(name), "utf8")) as T;
  } catch {
    /* first run */
  }
  cache.set(name, v);
  return v;
}

export function save<T>(name: string, value: T) {
  cache.set(name, value);
  clearTimeout(timers.get(name));
  timers.set(
    name,
    setTimeout(() => {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        const tmp = file(name) + ".tmp";
        fs.writeFileSync(tmp, JSON.stringify(value));
        fs.renameSync(tmp, file(name));
      } catch (e) {
        console.error("store save failed", name, e);
      }
    }, 250),
  );
}
