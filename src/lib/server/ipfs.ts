import "server-only";
import crypto from "node:crypto";
import { put } from "@vercel/blob";

/**
 * Stores a token logo and returns a permanent public URL for it.
 *
 * - Pinata (PINATA_JWT): pins to IPFS and returns an ipfs:// URI. Most portable option.
 * - Vercel Blob (BLOB_READ_WRITE_TOKEN, added from Vercel Storage): returns an https URL.
 */
export function uploadsEnabled() {
  return Boolean(process.env.PINATA_JWT || process.env.BLOB_READ_WRITE_TOKEN);
}

async function pinToIpfs(file: Blob, name: string, jwt: string) {
  const auth = { Authorization: `Bearer ${jwt.trim()}` };

  // Current Files API (needs a JWT with Files write access).
  const fd = new FormData();
  fd.append("file", file, name);
  fd.append("network", "public");
  const r = await fetch("https://uploads.pinata.cloud/v3/files", { method: "POST", headers: auth, body: fd });
  if (r.ok) {
    const j = (await r.json()) as { data?: { cid?: string } };
    if (j.data?.cid) return `ipfs://${j.data.cid}`;
  } else {
    console.error("[upload] pinata v3 failed", r.status, (await r.text()).slice(0, 300));
  }

  // Legacy pinning API (works with keys scoped to pinFileToIPFS).
  const legacy = new FormData();
  legacy.append("file", file, name);
  const r2 = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", { method: "POST", headers: auth, body: legacy });
  if (r2.ok) {
    const j = (await r2.json()) as { IpfsHash?: string };
    if (j.IpfsHash) return `ipfs://${j.IpfsHash}`;
  } else {
    console.error("[upload] pinata legacy failed", r2.status, (await r2.text()).slice(0, 300));
  }

  if (r.status === 401 || r.status === 403 || r2.status === 401 || r2.status === 403) {
    throw new Error("Logo upload is temporarily unavailable. Please try again later.");
  }
  throw new Error("Logo upload failed. Please try again.");
}

async function putToBlob(file: Blob, name: string) {
  const ext = (name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const { url } = await put(`logos/${crypto.randomUUID()}.${ext}`, file, {
    access: "public",
    contentType: file.type || undefined,
    addRandomSuffix: false,
  });
  return url;
}

export async function pinFile(file: Blob, name: string): Promise<string> {
  if (process.env.PINATA_JWT) return pinToIpfs(file, name, process.env.PINATA_JWT);
  if (process.env.BLOB_READ_WRITE_TOKEN) return putToBlob(file, name);
  throw new Error("Logo upload is not available yet. Please try again later.");
}

/** Fetches a remote image (for example one attached to a post) and stores it. */
export async function pinFromUrl(url: string): Promise<string> {
  const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error("Could not download the image.");
  const type = r.headers.get("content-type") || "";
  if (!/^image\/(png|jpe?g|gif|webp|svg\+xml)/.test(type)) throw new Error("Image must be PNG, JPEG, GIF or WebP.");
  const blob = await r.blob();
  if (blob.size > 5 * 1024 * 1024) throw new Error("Image too large (max 5 MB).");
  return pinFile(blob, "logo." + type.split("/")[1].replace("+xml", ""));
}
