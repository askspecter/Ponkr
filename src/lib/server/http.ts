import "server-only";
import { NextResponse } from "next/server";

export function json(data: unknown, init?: number | ResponseInit) {
  const body = JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  const i = typeof init === "number" ? { status: init } : init;
  return new NextResponse(body, { ...i, headers: { "content-type": "application/json", ...(i?.headers ?? {}) } });
}

export function err(message: string, status = 400) {
  return json({ error: message }, status);
}

export async function handle(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (e) {
    console.error(e);
    return err((e as Error).message || "Internal error", 500);
  }
}
