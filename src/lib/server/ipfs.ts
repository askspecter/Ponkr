import "server-only";

/** Pins a file to IPFS via Pinata. Set PINATA_JWT. */
export async function pinFile(file: Blob, name: string): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("Image upload is not configured (PINATA_JWT). Paste an ipfs:// URI instead.");
  const fd = new FormData();
  fd.append("file", file, name);
  fd.append("network", "public");
  const r = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: fd,
  });
  if (!r.ok) throw new Error(`IPFS upload failed (${r.status})`);
  const j = (await r.json()) as { data?: { cid?: string } };
  if (!j.data?.cid) throw new Error("IPFS upload returned no CID");
  return `ipfs://${j.data.cid}`;
}

/** Fetches a remote image (e.g. attached to a social post) and pins it. */
export async function pinFromUrl(url: string): Promise<string> {
  const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error("Could not download image");
  const type = r.headers.get("content-type") || "";
  if (!/^image\/(png|jpe?g|gif|webp)/.test(type)) throw new Error("Image must be PNG, JPEG, GIF or WebP");
  const blob = await r.blob();
  if (blob.size > 5 * 1024 * 1024) throw new Error("Image too large (max 5MB)");
  return pinFile(blob, "logo." + type.split("/")[1]);
}
